import { useEffect, useState } from "react";
import { getGitDiff } from "../../lib/api";
import { Loader2, GitCommit, GitBranch, FilePlus, FileMinus, FileCode } from "lucide-react";

const CHANGE_ICON = {
  A: FilePlus,
  D: FileMinus,
  M: FileCode,
  U: FilePlus,
  R: FileCode,
};

const CHANGE_LABEL = {
  A: "added",
  D: "deleted",
  M: "modified",
  U: "untracked",
  R: "renamed",
};

export default function GitDiffView({ repoId, onOpenFile }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getGitDiff(repoId).then(setData);
  }, [repoId]);

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> reading git…
      </div>
    );
  }

  if (data.error === "not_a_git_repo") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs gap-2">
        <GitBranch className="w-6 h-6 text-zinc-700" />
        <div>not a git repository</div>
        <div className="text-[10px] text-zinc-600">
          init a git repo inside your project to see diffs here
        </div>
      </div>
    );
  }

  const selectedFile = data.changed_files.find((c) => c.path === selected);

  return (
    <div className="h-full flex flex-col" data-testid="git-diff-view">
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-3 shrink-0">
        <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
          git diff
        </div>
        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          {data.branch}
        </span>
        <div className="text-[10px] font-mono text-zinc-500">
          {data.changed_files.length} changed
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-zinc-800 overflow-auto">
          <div className="border-b border-zinc-800 px-3 py-1.5 bg-[#0d0d0f]">
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-yellow-400">
              changed files
            </div>
          </div>
          {data.changed_files.length === 0 ? (
            <div className="p-6 text-xs font-mono text-zinc-500">working tree clean</div>
          ) : (
            data.changed_files.map((c, i) => {
              const Icon = CHANGE_ICON[c.change_type] || FileCode;
              return (
                <button
                  key={i}
                  data-testid={`diff-file-${i}`}
                  onClick={() => setSelected(c.path)}
                  className={`w-full text-left px-3 py-2 border-b border-zinc-800 hover:bg-[#18181b] border-l-2 ${
                    selected === c.path
                      ? "border-l-yellow-400 bg-[#18181b]"
                      : "border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-yellow-400/70 shrink-0" />
                    <span className="font-mono text-xs text-zinc-100 truncate">
                      {c.path}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-0.5 pl-5">
                    {CHANGE_LABEL[c.change_type] || c.change_type}
                    {c.staged ? " · staged" : ""}
                  </div>
                </button>
              );
            })
          )}

          <div className="border-t border-zinc-800 px-3 py-1.5 mt-2 bg-[#0d0d0f]">
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-yellow-400">
              recent commits
            </div>
          </div>
          {data.recent_commits.map((c, i) => (
            <div
              key={i}
              className="px-3 py-2 border-b border-zinc-800"
              data-testid={`commit-${i}`}
            >
              <div className="flex items-center gap-2">
                <GitCommit className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="font-mono text-[10px] text-yellow-400">{c.sha}</span>
                <span className="font-mono text-[10px] text-zinc-500 truncate">{c.author}</span>
              </div>
              <div className="font-mono text-xs text-zinc-200 mt-1 pl-5 truncate">
                {c.message}
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-[#09090b]">
          {!selectedFile ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-600">
              select a file to view diff
            </div>
          ) : (
            <div>
              <div className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between sticky top-0 bg-[#0d0d0f]">
                <button
                  onClick={() => onOpenFile(selectedFile.path)}
                  className="font-mono text-xs text-zinc-100 hover:text-yellow-400"
                >
                  {selectedFile.path}
                </button>
                <div className="text-[10px] font-mono text-zinc-500">
                  {CHANGE_LABEL[selectedFile.change_type] || selectedFile.change_type}
                </div>
              </div>
              {selectedFile.diff ? (
                <pre className="font-mono text-xs whitespace-pre p-0 overflow-x-auto">
                  {selectedFile.diff.split("\n").map((ln, i) => {
                    let cls = "text-zinc-300";
                    if (ln.startsWith("+") && !ln.startsWith("+++")) cls = "diff-add";
                    else if (ln.startsWith("-") && !ln.startsWith("---")) cls = "diff-remove";
                    else if (ln.startsWith("@@")) cls = "diff-hunk";
                    return (
                      <div key={i} className={`px-4 ${cls}`}>
                        {ln || " "}
                      </div>
                    );
                  })}
                </pre>
              ) : (
                <div className="p-6 text-xs font-mono text-zinc-500">
                  {selectedFile.change_type === "U"
                    ? "untracked file — no diff available"
                    : "no diff content"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
