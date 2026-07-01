import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, MessageSquare } from "lucide-react";
import { listAnnotations, createAnnotation, deleteAnnotation } from "../lib/api";

export default function AnnotationsPanel({ repoId, selectedFile }) {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [line, setLine] = useState("");
  const [scope, setScope] = useState("file"); // 'file' or 'all'

  const refresh = () => {
    listAnnotations(repoId, scope === "file" ? selectedFile : null)
      .then(setItems)
      .catch(() => setItems([]));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, [repoId, selectedFile, scope]);

  const add = async () => {
    if (!selectedFile) {
      toast.error("Select a file first");
      return;
    }
    if (!text.trim()) return;
    try {
      await createAnnotation(repoId, {
        file_path: selectedFile,
        line: line ? parseInt(line, 10) : null,
        text: text.trim(),
      });
      setText("");
      setLine("");
      refresh();
    } catch (e) {
      toast.error("Failed to add note");
    }
  };

  const remove = async (id) => {
    try {
      await deleteAnnotation(repoId, id);
      refresh();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="annotations-panel">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
            annotations
          </div>
        </div>
        <div className="flex">
          {["file", "all"].map((s) => (
            <button
              key={s}
              data-testid={`scope-${s}`}
              onClick={() => setScope(s)}
              className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
                scope === s
                  ? "border-yellow-400 text-yellow-400"
                  : "border-zinc-800 text-zinc-500 hover:text-zinc-200"
              } -ml-px`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-b border-zinc-800 shrink-0">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
          {selectedFile ? (
            <span>on: <span className="text-zinc-300 normal-case">{selectedFile}</span></span>
          ) : (
            "select a file to add note"
          )}
        </div>
        <textarea
          data-testid="ann-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note for future devs…"
          rows={3}
          className="w-full bg-[#09090b] border border-zinc-800 focus:border-yellow-400 focus:outline-none px-2 py-1.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 resize-none"
        />
        <div className="flex items-center gap-2 mt-2">
          <input
            data-testid="ann-line"
            value={line}
            onChange={(e) => setLine(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="line#"
            className="w-16 bg-[#09090b] border border-zinc-800 focus:border-yellow-400 focus:outline-none px-2 py-1 text-xs font-mono text-zinc-100 placeholder:text-zinc-600"
          />
          <button
            data-testid="ann-add"
            onClick={add}
            disabled={!selectedFile || !text.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-yellow-400 text-black text-[10px] font-mono uppercase tracking-wider font-semibold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" /> Add note
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto" data-testid="ann-list">
        {items.length === 0 ? (
          <div className="p-6 text-center text-[11px] font-mono text-zinc-600">
            no notes yet
          </div>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="border-b border-zinc-800 p-3 hover:bg-[#18181b]/40 group"
              data-testid={`ann-item-${a.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-[10px] font-mono text-zinc-500 truncate">
                  {a.file_path}
                  {a.line ? `:${a.line}` : ""}
                </div>
                <button
                  onClick={() => remove(a.id)}
                  className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                  data-testid={`ann-delete-${a.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="text-xs text-zinc-200 whitespace-pre-wrap">{a.text}</div>
              <div className="text-[10px] font-mono text-zinc-600 mt-1">
                {new Date(a.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
