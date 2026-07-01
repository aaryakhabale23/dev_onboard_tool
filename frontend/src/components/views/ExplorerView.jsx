import { useEffect, useState } from "react";
import { getTree, getGitDiff } from "../../lib/api";
import FileTree from "../FileTree";
import CodeViewer from "../CodeViewer";

export default function ExplorerView({ repoId, selectedFile, onSelect }) {
  const [tree, setTree] = useState(null);
  const [changedPaths, setChangedPaths] = useState(new Set());

  useEffect(() => {
    getTree(repoId).then((d) => setTree(d.tree));
    getGitDiff(repoId)
      .then((d) => {
        const s = new Set((d.changed_files || []).map((c) => c.path));
        setChangedPaths(s);
      })
      .catch(() => {});
  }, [repoId]);

  return (
    <div className="h-full flex" data-testid="explorer-view">
      <div className="w-72 border-r border-zinc-800 overflow-auto shrink-0 bg-[#09090b]">
        <div className="px-3 py-2 border-b border-zinc-800 sticky top-0 bg-[#09090b]">
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-500">
            file tree
          </div>
        </div>
        <FileTree
          node={tree}
          selectedPath={selectedFile?.path}
          onSelect={(p) => onSelect({ path: p })}
          changedPaths={changedPaths}
        />
      </div>
      <div className="flex-1 min-w-0">
        <CodeViewer
          repoId={repoId}
          path={selectedFile?.path}
          gotoLine={selectedFile?.line}
        />
      </div>
    </div>
  );
}
