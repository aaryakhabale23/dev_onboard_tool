import { useEffect, useMemo, useState } from "react";
import { getComponents } from "../../lib/api";
import { Loader2, Component } from "lucide-react";

export default function ComponentsView({ repoId, onOpenFile }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getComponents(repoId).then(setData);
  }, [repoId]);

  const children = useMemo(() => {
    if (!data || !selected) return [];
    return data.edges
      .filter((e) => e.source === selected)
      .map((e) => e.target);
  }, [data, selected]);

  const parents = useMemo(() => {
    if (!data || !selected) return [];
    return data.edges
      .filter((e) => e.target === selected)
      .map((e) => e.source);
  }, [data, selected]);

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> analyzing components…
      </div>
    );
  }

  const list = data.components.filter(
    (c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col" data-testid="components-view">
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-3 shrink-0">
        <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
          react components
        </div>
        <div className="text-[10px] font-mono text-zinc-500">
          {data.components.length} components · {data.edges.length} uses
        </div>
        <input
          data-testid="components-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          className="ml-auto bg-[#09090b] border border-zinc-800 focus:border-yellow-400 focus:outline-none px-2 py-1 text-[11px] font-mono text-zinc-100 w-64"
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-zinc-800 overflow-auto">
          {list.length === 0 ? (
            <div className="p-6 text-xs font-mono text-zinc-500">no components detected</div>
          ) : (
            list.map((c) => (
              <button
                key={c.name + c.file}
                data-testid={`component-${c.name}`}
                onClick={() => setSelected(c.name)}
                className={`w-full text-left px-3 py-2 border-b border-zinc-800 hover:bg-[#18181b] border-l-2 ${
                  selected === c.name
                    ? "border-l-yellow-400 bg-[#18181b]"
                    : "border-l-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Component className="w-3.5 h-3.5 text-yellow-400/70" />
                  <span className="font-mono text-xs text-zinc-100 truncate">{c.name}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 truncate mt-0.5 pl-5">
                  {c.file}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!selected ? (
            <div className="text-xs font-mono text-zinc-500">select a component</div>
          ) : (
            <div className="max-w-2xl">
              <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-mono mb-2">
                [ component ]
              </div>
              <h2 className="text-2xl font-mono text-zinc-100 mb-1">{selected}</h2>
              {(() => {
                const meta = data.components.find((c) => c.name === selected);
                return meta ? (
                  <button
                    onClick={() => onOpenFile(meta.file, meta.line)}
                    className="text-[11px] font-mono text-zinc-500 hover:text-yellow-400 underline underline-offset-2"
                  >
                    {meta.file}:{meta.line}
                  </button>
                ) : null;
              })()}

              <div className="mt-6 grid grid-cols-2 gap-0 border border-zinc-800">
                <div className="border-r border-zinc-800 p-4">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 mb-2">
                    used by ({parents.length})
                  </div>
                  {parents.length === 0 ? (
                    <div className="text-xs font-mono text-zinc-600">— none —</div>
                  ) : (
                    parents.map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelected(p)}
                        className="block text-left font-mono text-xs text-zinc-200 hover:text-yellow-400 py-0.5"
                      >
                        ← {p}
                      </button>
                    ))
                  )}
                </div>
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 mb-2">
                    renders ({children.length})
                  </div>
                  {children.length === 0 ? (
                    <div className="text-xs font-mono text-zinc-600">— none —</div>
                  ) : (
                    children.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelected(c)}
                        className="block text-left font-mono text-xs text-zinc-200 hover:text-yellow-400 py-0.5"
                      >
                        → {c}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
