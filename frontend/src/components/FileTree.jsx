import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";

const EXT_COLOR = {
  ".py": "text-sky-400",
  ".js": "text-yellow-400",
  ".jsx": "text-yellow-400",
  ".ts": "text-blue-400",
  ".tsx": "text-blue-400",
  ".json": "text-emerald-400",
  ".md": "text-zinc-400",
  ".css": "text-pink-400",
  ".scss": "text-pink-400",
  ".html": "text-orange-400",
};

// Flatten tree to list of {node, depth, hasChildren}
function flatten(root, openMap, autoOpenDepth = 1) {
  const out = [];
  const stack = [{ node: root, depth: 0 }];
  while (stack.length) {
    const { node, depth } = stack.shift();
    if (!node) continue;
    if (node.type === "dir") {
      const isOpen = openMap[node.path] ?? depth < autoOpenDepth;
      out.push({ node, depth, isOpen, hasChildren: (node.children || []).length > 0 });
      if (isOpen && node.children) {
        // insert children at front so we go depth-first
        const kids = node.children.map((c) => ({ node: c, depth: depth + 1 }));
        stack.unshift(...kids);
      }
    } else {
      out.push({ node, depth, isOpen: false, hasChildren: false });
    }
  }
  return out;
}

function dirHasChanges(dirPath, changedPaths) {
  for (const p of changedPaths) {
    if (p.startsWith(dirPath + "/") || p === dirPath) return true;
  }
  return false;
}

export default function FileTree({ node, selectedPath, onSelect, changedPaths = new Set() }) {
  const [openMap, setOpenMap] = useState({});

  const rows = useMemo(() => (node ? flatten(node, openMap, 1) : []), [node, openMap]);

  if (!node) return null;

  const toggle = (path) => setOpenMap((m) => ({ ...m, [path]: !(m[path] ?? false) }));

  return (
    <div className="font-mono text-xs" data-testid="file-tree">
      {rows.map(({ node: n, depth, isOpen, hasChildren }) => {
        const indent = { paddingLeft: `${depth * 12 + 8}px` };
        if (n.type === "dir") {
          const changed = dirHasChanges(n.path, changedPaths);
          return (
            <button
              key={"d-" + (n.path || "root")}
              data-testid={`tree-dir-${n.path || "root"}`}
              onClick={() => toggle(n.path)}
              className="w-full flex items-center gap-1 py-1 hover:bg-[#18181b]/70 text-left"
              style={indent}
            >
              {isOpen ? (
                <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
              )}
              {isOpen ? (
                <FolderOpen className="w-3.5 h-3.5 text-yellow-400/70 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-yellow-400/70 shrink-0" />
              )}
              <span
                className={`truncate ${changed ? "text-yellow-400" : "text-zinc-200"}`}
                title={n.path}
              >
                {n.name}
              </span>
              {changed && <span className="ml-auto mr-1 text-[9px] text-yellow-400">●</span>}
            </button>
          );
        }
        const selected = selectedPath === n.path;
        const color = EXT_COLOR[n.ext] || "text-zinc-300";
        const isChanged = changedPaths.has(n.path);
        return (
          <button
            key={"f-" + n.path}
            data-testid={`tree-file-${n.path}`}
            onClick={() => onSelect(n.path)}
            className={`w-full flex items-center gap-1 py-1 hover:bg-[#18181b]/70 text-left border-l-2 ${
              selected ? "bg-[#18181b] border-l-yellow-400" : "border-l-transparent"
            }`}
            style={indent}
            title={n.path}
          >
            <span className="w-3 shrink-0" />
            <File className={`w-3.5 h-3.5 shrink-0 ${color}`} />
            <span className={`truncate ${selected ? "text-zinc-50" : "text-zinc-300"}`}>
              {n.name}
            </span>
            {isChanged && <span className="ml-auto mr-1 text-[9px] text-yellow-400">●</span>}
          </button>
        );
      })}
    </div>
  );
}
