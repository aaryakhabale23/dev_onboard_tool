import { useEffect, useState } from "react";
import { getEndpoints } from "../../lib/api";
import { Loader2 } from "lucide-react";

const METHOD_COLOR = {
  GET: "text-emerald-400 border-emerald-400/40",
  POST: "text-yellow-400 border-yellow-400/40",
  PUT: "text-sky-400 border-sky-400/40",
  DELETE: "text-red-400 border-red-400/40",
  PATCH: "text-purple-400 border-purple-400/40",
};

export default function EndpointsView({ repoId, onOpenFile }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    getEndpoints(repoId).then(setData);
  }, [repoId]);

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> extracting endpoints…
      </div>
    );
  }

  const endpoints = data.endpoints.filter(
    (e) =>
      !filter ||
      e.path.toLowerCase().includes(filter.toLowerCase()) ||
      e.file.toLowerCase().includes(filter.toLowerCase()),
  );
  const calls = data.frontend_calls.filter(
    (c) =>
      !filter ||
      c.url.toLowerCase().includes(filter.toLowerCase()) ||
      c.file.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col overflow-hidden" data-testid="endpoints-view">
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-3 shrink-0">
        <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
          api endpoints
        </div>
        <div className="text-[10px] font-mono text-zinc-500">
          {data.endpoints.length} backend · {data.frontend_calls.length} frontend calls
        </div>
        <input
          data-testid="endpoints-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          className="ml-auto bg-[#09090b] border border-zinc-800 focus:border-yellow-400 focus:outline-none px-2 py-1 text-[11px] font-mono text-zinc-100 w-64"
        />
      </div>

      <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 gap-0">
        <div className="border-r border-zinc-800">
          <SectionHeader title="backend routes" count={endpoints.length} />
          {endpoints.length === 0 ? (
            <Empty text="no endpoints detected" />
          ) : (
            <table className="w-full font-mono text-xs">
              <tbody>
                {endpoints.map((ep) => (
                  <tr
                    key={`${ep.method}-${ep.path}-${ep.file}-${ep.line}`}
                    onClick={() => onOpenFile(ep.file, ep.line)}
                    className="border-b border-zinc-800 hover:bg-[#18181b] cursor-pointer"
                    data-testid={`endpoint-${ep.method}-${ep.path}`}
                  >
                    <td className="px-3 py-2 align-top w-16">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 border ${
                          METHOD_COLOR[ep.method] || "text-zinc-300 border-zinc-700"
                        }`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-100">{ep.path}</td>
                    <td className="px-3 py-2 text-zinc-500 truncate">
                      {ep.file}:{ep.line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <SectionHeader title="frontend api calls" count={calls.length} />
          {calls.length === 0 ? (
            <Empty text="no fetch/axios calls detected" />
          ) : (
            <table className="w-full font-mono text-xs">
              <tbody>
                {calls.map((c, i) => (
                  <tr
                    key={i}
                    onClick={() => onOpenFile(c.file, c.line)}
                    className="border-b border-zinc-800 hover:bg-[#18181b] cursor-pointer"
                    data-testid={`call-${i}`}
                  >
                    <td className="px-3 py-2 text-zinc-100 truncate max-w-md">{c.url}</td>
                    <td className="px-3 py-2 text-zinc-500 truncate">
                      {c.file}:{c.line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, count }) {
  return (
    <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2 bg-[#0d0d0f] sticky top-0">
      <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-yellow-400">
        {title}
      </div>
      <div className="text-[10px] font-mono text-zinc-500">({count})</div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="p-6 text-xs font-mono text-zinc-500">{text}</div>;
}
