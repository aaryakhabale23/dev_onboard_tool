"""Static code analysis for JS/TS/Python.
Regex-based, best-effort. Extracts:
- File tree
- Imports & dependencies
- API endpoints (FastAPI/Flask/Express)
- Database models (Pydantic/SQLAlchemy/Mongoose)
- React components
"""
import os
import re
from pathlib import Path
from typing import Dict, List, Any, Set, Optional

IGNORE_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".cache", "coverage", ".pytest_cache",
    ".mypy_cache", ".idea", ".vscode", "target", "out", ".turbo"
}
CODE_EXTS = {".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}
VIEW_EXTS = CODE_EXTS | {
    ".json", ".md", ".txt", ".yaml", ".yml", ".toml", ".env",
    ".html", ".css", ".scss", ".sql", ".sh", ".ini", ".xml"
}
MAX_FILE_BYTES = 1_500_000


def build_tree(root: str) -> Dict[str, Any]:
    """Recursive folder tree."""
    root_path = Path(root)
    file_count = 0

    def walk(p: Path) -> Optional[Dict[str, Any]]:
        nonlocal file_count
        rel = str(p.relative_to(root_path)) if p != root_path else ""
        if p.is_dir():
            if p.name in IGNORE_DIRS and p != root_path:
                return None
            children = []
            try:
                entries = sorted(p.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
            except PermissionError:
                return None
            for c in entries:
                node = walk(c)
                if node:
                    children.append(node)
            return {"type": "dir", "name": p.name or root_path.name, "path": rel, "children": children}
        else:
            file_count += 1
            return {"type": "file", "name": p.name, "path": rel, "size": p.stat().st_size, "ext": p.suffix}

    tree = walk(root_path)
    return {"tree": tree, "file_count": file_count}


def read_file(root: str, rel_path: str) -> Dict[str, Any]:
    p = Path(root) / rel_path
    if not p.exists() or not p.is_file():
        return {"error": "not_found"}
    if p.suffix not in VIEW_EXTS and p.stat().st_size > 200_000:
        return {"error": "binary_or_large", "size": p.stat().st_size}
    if p.stat().st_size > MAX_FILE_BYTES:
        return {"error": "too_large", "size": p.stat().st_size}
    try:
        content = p.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return {"error": str(e)}
    return {"path": rel_path, "content": content, "ext": p.suffix, "size": p.stat().st_size}


def iter_code_files(root: str):
    root_path = Path(root)
    for dirpath, dirnames, filenames in os.walk(root_path):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for f in filenames:
            fp = Path(dirpath) / f
            if fp.suffix in CODE_EXTS:
                try:
                    if fp.stat().st_size > MAX_FILE_BYTES:
                        continue
                except OSError:
                    continue
                yield fp, str(fp.relative_to(root_path))


PY_FROM_RE = re.compile(r"^\s*from\s+([\w\.]+)\s+import\s", re.M)
PY_IMPORT_RE = re.compile(r"^\s*import\s+([^\n#]+)", re.M)
JS_IMPORT_RE = re.compile(
    r"""(?:^|\n)\s*(?:import\s+(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"]|(?:const|let|var)\s+[^=]+=\s*require\(\s*['"]([^'"]+)['"]\s*\))""",
    re.M,
)


def extract_imports(root: str) -> Dict[str, List[str]]:
    """Return { relPath: [importedTargets] }."""
    result: Dict[str, List[str]] = {}
    for fp, rel in iter_code_files(root):
        try:
            content = fp.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        imports: List[str] = []
        if fp.suffix == ".py":
            for m in PY_FROM_RE.finditer(content):
                mod = m.group(1).strip()
                if mod:
                    imports.append(mod)
            for m in PY_IMPORT_RE.finditer(content):
                raw = m.group(1)
                # strip trailing ' as X' and split by comma
                for piece in raw.split(","):
                    piece = piece.strip().split(" as ")[0].strip()
                    if piece and not piece.startswith("from"):
                        imports.append(piece)
        else:
            for m in JS_IMPORT_RE.finditer(content):
                target = m.group(1) or m.group(2) or ""
                if target:
                    imports.append(target)
        result[rel] = imports
    return result


def build_dependency_graph(root: str) -> Dict[str, Any]:
    imports_map = extract_imports(root)
    all_files = list(imports_map.keys())
    # Map: filename (no ext) and rel path variants -> resolved rel path
    lookup: Dict[str, str] = {}
    for rel in all_files:
        stem = Path(rel).stem
        lookup.setdefault(stem, rel)
        lookup[rel] = rel
        lookup[rel.replace("\\", "/")] = rel
        # without ext
        no_ext = str(Path(rel).with_suffix(""))
        lookup.setdefault(no_ext.replace("\\", "/"), rel)

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    node_id: Dict[str, int] = {}
    for i, rel in enumerate(all_files):
        node_id[rel] = i
        ext = Path(rel).suffix
        kind = "python" if ext == ".py" else "js"
        nodes.append({
            "id": rel,
            "label": Path(rel).name,
            "kind": kind,
            "path": rel,
            "in_degree": 0,
            "out_degree": 0,
        })

    def resolve(source_rel: str, target: str) -> Optional[str]:
        # relative import js ./ or ../
        if target.startswith("."):
            base = Path(source_rel).parent
            candidate = (base / target).as_posix()
            # try candidate as file with ext
            for ext in [".js", ".jsx", ".ts", ".tsx", ".py"]:
                key = candidate + ext
                if key in lookup:
                    return lookup[key]
            # try index in dir
            for ext in [".js", ".jsx", ".ts", ".tsx"]:
                key = candidate + "/index" + ext
                if key in lookup:
                    return lookup[key]
            if candidate in lookup:
                return lookup[candidate]
            return None
        # python module a.b.c -> try match by last part
        if "." in target:
            last = target.split(".")[-1]
            if last in lookup:
                return lookup[last]
        # simple name (module) — match stem
        if target in lookup:
            return lookup[target]
        return None

    for src, targets in imports_map.items():
        for t in targets:
            resolved = resolve(src, t)
            if resolved and resolved != src:
                edges.append({"source": src, "target": resolved, "raw": t})
                nodes[node_id[src]]["out_degree"] += 1
                nodes[node_id[resolved]]["in_degree"] += 1

    return {"nodes": nodes, "edges": edges}


# --- Endpoints extraction ---
FASTAPI_ROUTE_RE = re.compile(
    r"@(?:\w+)\.(get|post|put|delete|patch|options|head)\(\s*['\"]([^'\"]+)['\"]",
    re.I,
)
FASTAPI_ROUTER_PREFIX_RE = re.compile(
    r"APIRouter\([^)]*prefix\s*=\s*['\"]([^'\"]+)['\"]"
)
FLASK_ROUTE_RE = re.compile(
    r"@(?:\w+)\.route\(\s*['\"]([^'\"]+)['\"](?:[^)]*methods\s*=\s*\[([^\]]+)\])?",
    re.I,
)
EXPRESS_ROUTE_RE = re.compile(
    r"(?:app|router)\.(get|post|put|delete|patch|options|head)\(\s*['\"]([^'\"]+)['\"]",
    re.I,
)
FETCH_CALL_RE = re.compile(
    r"""(?:fetch|axios(?:\.(?:get|post|put|delete|patch))?|api(?:\.(?:get|post|put|delete|patch))?)\s*\(\s*[`'"]([^`'"]+)[`'"]""",
    re.I,
)


def extract_endpoints(root: str) -> List[Dict[str, Any]]:
    endpoints: List[Dict[str, Any]] = []
    for fp, rel in iter_code_files(root):
        try:
            content = fp.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        if fp.suffix == ".py":
            # find router prefix
            prefix_m = FASTAPI_ROUTER_PREFIX_RE.search(content)
            prefix = prefix_m.group(1) if prefix_m else ""
            for m in FASTAPI_ROUTE_RE.finditer(content):
                method = m.group(1).upper()
                path = m.group(2)
                full = prefix + path if not path.startswith(prefix) else path
                line = content[: m.start()].count("\n") + 1
                endpoints.append({"method": method, "path": full, "file": rel, "line": line, "framework": "FastAPI"})
            for m in FLASK_ROUTE_RE.finditer(content):
                path = m.group(1)
                methods_raw = m.group(2) or "'GET'"
                for meth in re.findall(r"['\"](\w+)['\"]", methods_raw):
                    line = content[: m.start()].count("\n") + 1
                    endpoints.append({"method": meth.upper(), "path": path, "file": rel, "line": line, "framework": "Flask"})
        else:
            for m in EXPRESS_ROUTE_RE.finditer(content):
                method = m.group(1).upper()
                path = m.group(2)
                line = content[: m.start()].count("\n") + 1
                endpoints.append({"method": method, "path": path, "file": rel, "line": line, "framework": "Express"})
    return endpoints


def extract_frontend_calls(root: str) -> List[Dict[str, Any]]:
    calls: List[Dict[str, Any]] = []
    for fp, rel in iter_code_files(root):
        if fp.suffix == ".py":
            continue
        try:
            content = fp.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for m in FETCH_CALL_RE.finditer(content):
            url = m.group(1)
            if not url.startswith(("/", "http", "$", "`")):
                continue
            line = content[: m.start()].count("\n") + 1
            calls.append({"url": url, "file": rel, "line": line})
    return calls


# --- Models extraction ---
PYDANTIC_CLASS_RE = re.compile(
    r"class\s+(\w+)\s*\(\s*([\w\.,\s]*BaseModel[\w\.,\s]*)\)\s*:",
)
SQLA_CLASS_RE = re.compile(
    r"class\s+(\w+)\s*\(\s*([\w\.,\s]*(?:Base|db\.Model)[\w\.,\s]*)\)\s*:",
)
CLASS_FIELD_RE = re.compile(r"^\s{2,}(\w+)\s*:\s*([^\n=]+?)(?:\s*=\s*.+)?$", re.M)
MONGOOSE_SCHEMA_RE = re.compile(
    r"(?:const|let|var)\s+(\w+)\s*=\s*(?:new\s+)?(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*\)",
)


def extract_models(root: str) -> List[Dict[str, Any]]:
    models: List[Dict[str, Any]] = []
    for fp, rel in iter_code_files(root):
        try:
            content = fp.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        if fp.suffix == ".py":
            # Track (name, line) to avoid double-matching (Pydantic classes contain "Base" in "BaseModel")
            matched: Set[tuple] = set()
            for regex, kind in [(PYDANTIC_CLASS_RE, "Pydantic"), (SQLA_CLASS_RE, "SQLAlchemy")]:
                for m in regex.finditer(content):
                    name = m.group(1)
                    line = content[: m.start()].count("\n") + 1
                    key = (rel, name, line)
                    if key in matched:
                        continue
                    matched.add(key)
                    start = m.end()
                    # get class body up to next class or eof (naive)
                    next_class = re.search(r"\nclass\s+\w+", content[start:])
                    body = content[start:start + (next_class.start() if next_class else len(content) - start)]
                    fields = []
                    for fm in CLASS_FIELD_RE.finditer(body):
                        fname = fm.group(1)
                        ftype = fm.group(2).strip()
                        if fname.startswith("_") or fname in {"model_config", "Config"}:
                            continue
                        fields.append({"name": fname, "type": ftype})
                    models.append({
                        "name": name,
                        "kind": kind,
                        "file": rel,
                        "line": line,
                        "fields": fields[:30],
                    })
        else:
            for m in MONGOOSE_SCHEMA_RE.finditer(content):
                name = m.group(1)
                body = m.group(2)
                fields = []
                for fm in re.finditer(r"(\w+)\s*:\s*(\{[^}]*type\s*:\s*(\w+)[^}]*\}|(\w+))", body):
                    fname = fm.group(1)
                    ftype = fm.group(3) or fm.group(4) or "unknown"
                    fields.append({"name": fname, "type": ftype})
                line = content[: m.start()].count("\n") + 1
                models.append({
                    "name": name,
                    "kind": "Mongoose",
                    "file": rel,
                    "line": line,
                    "fields": fields[:30],
                })
    return models


# --- React components ---
COMPONENT_FUNC_RE = re.compile(
    r"(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z]\w+)\s*(?:=\s*(?:\([^)]*\)|[^=]+)\s*=>|\()",
)
JSX_USAGE_RE = re.compile(r"<([A-Z]\w+)")


def extract_components(root: str) -> Dict[str, Any]:
    components: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    seen: Set[str] = set()
    file_to_components: Dict[str, List[str]] = {}

    for fp, rel in iter_code_files(root):
        if fp.suffix not in {".jsx", ".tsx", ".js", ".ts"}:
            continue
        try:
            content = fp.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        if "return" not in content or ("<" not in content and "jsx" not in content.lower()):
            # skip non-jsx files
            if fp.suffix not in {".jsx", ".tsx"}:
                continue
        found_here: List[str] = []
        for m in COMPONENT_FUNC_RE.finditer(content):
            name = m.group(1)
            # heuristic: must be followed somewhere by JSX return
            found_here.append(name)
            if name not in seen:
                line = content[: m.start()].count("\n") + 1
                components.append({"name": name, "file": rel, "line": line})
                seen.add(name)
        if found_here:
            file_to_components[rel] = found_here
        used = set(m.group(1) for m in JSX_USAGE_RE.finditer(content))
        for parent in found_here:
            for child in used:
                if child != parent and child in seen:
                    edges.append({"source": parent, "target": child, "file": rel})

    return {"components": components, "edges": edges}


def build_overview(root: str) -> Dict[str, Any]:
    """High-level architecture summary."""
    stats = {"python_files": 0, "js_files": 0, "ts_files": 0, "jsx_files": 0, "tsx_files": 0}
    frameworks: Set[str] = set()
    has_backend = False
    has_frontend = False
    package_json_path = None
    requirements_path = None

    root_path = Path(root)
    for fp, rel in iter_code_files(root):
        ext = fp.suffix
        if ext == ".py":
            stats["python_files"] += 1
            has_backend = True
        elif ext == ".js":
            stats["js_files"] += 1
        elif ext == ".ts":
            stats["ts_files"] += 1
        elif ext == ".jsx":
            stats["jsx_files"] += 1
        elif ext == ".tsx":
            stats["tsx_files"] += 1

    # scan for package.json / requirements
    for dirpath, dirnames, filenames in os.walk(root_path):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for f in filenames:
            if f == "package.json":
                package_json_path = str(Path(dirpath).relative_to(root_path) / f)
                has_frontend = True
                try:
                    import json
                    pkg = json.loads((Path(dirpath) / f).read_text(errors="replace"))
                    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                    for name in deps:
                        low = name.lower()
                        if "react" == low or low.startswith("react-"):
                            frameworks.add("React")
                        if low == "vue" or low.startswith("vue-"):
                            frameworks.add("Vue")
                        if low.startswith("next"):
                            frameworks.add("Next.js")
                        if low == "express":
                            frameworks.add("Express")
                        if low == "svelte":
                            frameworks.add("Svelte")
                        if low == "mongoose":
                            frameworks.add("Mongoose")
                        if low == "tailwindcss":
                            frameworks.add("Tailwind")
                except Exception:
                    pass
            elif f in ("requirements.txt", "pyproject.toml"):
                requirements_path = str(Path(dirpath).relative_to(root_path) / f)
                try:
                    text = (Path(dirpath) / f).read_text(errors="replace").lower()
                    if "fastapi" in text:
                        frameworks.add("FastAPI")
                    if "flask" in text:
                        frameworks.add("Flask")
                    if "django" in text:
                        frameworks.add("Django")
                    if "sqlalchemy" in text:
                        frameworks.add("SQLAlchemy")
                    if "motor" in text or "pymongo" in text:
                        frameworks.add("MongoDB")
                except Exception:
                    pass

    return {
        "stats": stats,
        "frameworks": sorted(frameworks),
        "has_backend": has_backend,
        "has_frontend": has_frontend,
        "package_json": package_json_path,
        "requirements": requirements_path,
    }
