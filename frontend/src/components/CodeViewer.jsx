import { useEffect, useRef, useState } from "react";
import { getFile } from "../lib/api";
import { Loader2, FileText } from "lucide-react";

export default function CodeViewer({ repoId, path, gotoLine }) {
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const preRef = useRef(null);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    setError(null);
    getFile(repoId, path)
      .then((res) => {
        if (res.error) {
          setError(res.error);
          setContent("");
        } else {
          setContent(res.content || "");
          setMeta(res);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoId, path]);

  useEffect(() => {
    if (gotoLine && preRef.current) {
      const el = preRef.current.querySelector(`[data-line="${gotoLine}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [gotoLine, content]);

  if (!path) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-600">
        <FileText className="w-8 h-8 mb-3" />
        <div className="text-xs font-mono uppercase tracking-wider">select a file to view</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        loading {path}
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs">
        <div className="text-red-400 mb-2">unable to display</div>
        <div>{error}</div>
      </div>
    );
  }

  const lines = content.split("\n");
  return (
    <div className="h-full flex flex-col" data-testid="code-viewer">
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="font-mono text-xs text-zinc-300 truncate">{path}</div>
        <div className="text-[10px] font-mono text-zinc-500">
          {lines.length} lines · {(meta?.size || content.length) / 1024 < 1
            ? `${meta?.size || content.length} B`
            : `${((meta?.size || content.length) / 1024).toFixed(1)} KB`}
        </div>
      </div>
      <div ref={preRef} className="flex-1 overflow-auto bg-[#09090b]">
        <table className="w-full font-mono text-xs">
          <tbody>
            {lines.map((line, i) => {
              const num = i + 1;
              const highlighted = gotoLine === num;
              return (
                <tr
                  key={i}
                  data-line={num}
                  className={highlighted ? "bg-yellow-400/10" : ""}
                >
                  <td className="w-12 text-right pr-3 text-zinc-600 select-none border-r border-zinc-900 align-top">
                    {num}
                  </td>
                  <td className="pl-3 pr-4 py-0 whitespace-pre text-zinc-200">
                    {line || " "}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
