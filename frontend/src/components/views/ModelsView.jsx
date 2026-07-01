import { useEffect, useState } from "react";
import { getModels } from "../../lib/api";
import { Loader2, Database } from "lucide-react";

export default function ModelsView({ repoId, onOpenFile }) {
  const [models, setModels] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    getModels(repoId).then((d) => setModels(d.models));
  }, [repoId]);

  if (!models) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> parsing models…
      </div>
    );
  }

  const list = models.filter(
    (m) =>
      !filter ||
      m.name.toLowerCase().includes(filter.toLowerCase()) ||
      m.file.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col" data-testid="models-view">
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-3 shrink-0">
        <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
          data models
        </div>
        <div className="text-[10px] font-mono text-zinc-500">{models.length} detected</div>
        <input
          data-testid="models-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          className="ml-auto bg-[#09090b] border border-zinc-800 focus:border-yellow-400 focus:outline-none px-2 py-1 text-[11px] font-mono text-zinc-100 w-64"
        />
      </div>

      <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0">
        {list.length === 0 ? (
          <div className="col-span-full text-xs font-mono text-zinc-500 text-center py-12">
            no models detected. supported: pydantic, sqlalchemy, mongoose.
          </div>
        ) : (
          list.map((m) => (
            <button
              key={`${m.file}-${m.name}-${m.line}`}
              data-testid={`model-${m.name}`}
              onClick={() => onOpenFile(m.file, m.line)}
              className="text-left border border-zinc-800 -ml-px -mt-px hover:border-yellow-400 bg-[#121214] hover:bg-[#18181b] transition-colors"
            >
              <div className="border-b border-zinc-800 px-3 py-2 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-yellow-400" />
                <div className="font-mono text-sm text-zinc-100 truncate flex-1">{m.name}</div>
                <span className="text-[9px] font-mono uppercase text-zinc-500 border border-zinc-700 px-1 py-0.5">
                  {m.kind}
                </span>
              </div>
              <div className="px-3 py-2">
                {m.fields.length === 0 ? (
                  <div className="text-[10px] font-mono text-zinc-500">no fields extracted</div>
                ) : (
                  m.fields.map((f) => (
                    <div key={f.name} className="flex items-baseline gap-2 py-0.5">
                      <span className="font-mono text-[11px] text-zinc-200">{f.name}</span>
                      <span className="font-mono text-[11px] text-zinc-500 truncate">
                        : {f.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-zinc-800 px-3 py-1.5 text-[10px] font-mono text-zinc-500 truncate">
                {m.file}:{m.line}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
