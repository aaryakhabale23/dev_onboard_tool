"""Repo ingestion: upload zip, local path, github clone."""
import os
import shutil
import uuid
import zipfile
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

STORAGE_ROOT = Path(os.environ.get("STORAGE_ROOT", "/app/storage/repos"))
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


def new_repo_dir(repo_id: str) -> Path:
    p = STORAGE_ROOT / repo_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def repo_dir(repo_id: str) -> Path:
    return STORAGE_ROOT / repo_id


def delete_repo(repo_id: str) -> None:
    p = repo_dir(repo_id)
    if p.exists():
        shutil.rmtree(p, ignore_errors=True)


def ingest_zip(repo_id: str, zip_path: Path) -> Path:
    dest = new_repo_dir(repo_id)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest)
    # If single top folder, collapse into dest
    entries = [e for e in dest.iterdir()]
    if len(entries) == 1 and entries[0].is_dir():
        inner = entries[0]
        for item in inner.iterdir():
            shutil.move(str(item), str(dest / item.name))
        inner.rmdir()
    return dest


def ingest_local(repo_id: str, source_path: str) -> Path:
    src = Path(source_path).expanduser().resolve()
    if not src.exists() or not src.is_dir():
        raise ValueError(f"Local path does not exist or is not a directory: {source_path}")
    dest = new_repo_dir(repo_id)
    storage_abs = STORAGE_ROOT.resolve()

    def _ignore(dirname, entries):
        skip = set()
        for name in entries:
            if name in {"node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".next", ".cache"}:
                skip.add(name)
                continue
            full = Path(dirname) / name
            try:
                if full.resolve().is_relative_to(storage_abs):
                    skip.add(name)
            except (OSError, ValueError):
                pass
        return skip

    for item in src.iterdir():
        if item.name in {"node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".next"}:
            continue
        try:
            if item.resolve().is_relative_to(storage_abs):
                continue
        except (OSError, ValueError):
            pass
        target = dest / item.name
        if item.is_dir():
            shutil.copytree(item, target, ignore=_ignore, dirs_exist_ok=True, symlinks=False)
        else:
            shutil.copy2(item, target)
    return dest


def ingest_github(repo_id: str, url: str) -> Path:
    from git import Repo as GitRepo
    dest = new_repo_dir(repo_id)
    # clone shallow
    GitRepo.clone_from(url, dest, depth=50)
    return dest


def has_git(path: Path) -> bool:
    return (path / ".git").exists()


def git_diff(path: Path) -> Dict[str, Any]:
    from git import Repo as GitRepo, InvalidGitRepositoryError
    try:
        repo = GitRepo(path)
    except InvalidGitRepositoryError:
        return {"error": "not_a_git_repo", "changed_files": [], "recent_commits": []}

    changed_files: List[Dict[str, Any]] = []

    # Unstaged
    for item in repo.index.diff(None):
        try:
            diff_text = ""
            try:
                diff_text = repo.git.diff(item.a_path)
            except Exception:
                pass
            changed_files.append({
                "path": item.a_path,
                "change_type": item.change_type,
                "staged": False,
                "diff": diff_text[:20000],
            })
        except Exception:
            continue

    # Staged
    try:
        for item in repo.index.diff("HEAD"):
            diff_text = ""
            try:
                diff_text = repo.git.diff("--cached", item.a_path)
            except Exception:
                pass
            changed_files.append({
                "path": item.a_path,
                "change_type": item.change_type,
                "staged": True,
                "diff": diff_text[:20000],
            })
    except Exception:
        pass

    # Untracked
    for u in repo.untracked_files:
        changed_files.append({"path": u, "change_type": "U", "staged": False, "diff": ""})

    # Recent commits
    commits = []
    try:
        for c in list(repo.iter_commits(max_count=15)):
            commits.append({
                "sha": c.hexsha[:8],
                "message": c.message.strip().split("\n")[0][:200],
                "author": c.author.name if c.author else "",
                "date": c.committed_datetime.isoformat(),
                "files": list(c.stats.files.keys())[:20],
            })
    except Exception:
        pass

    branch = ""
    try:
        branch = repo.active_branch.name
    except Exception:
        branch = "(detached)"

    return {"branch": branch, "changed_files": changed_files, "recent_commits": commits}
