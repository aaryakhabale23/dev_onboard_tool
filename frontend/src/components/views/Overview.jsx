import { useEffect, useState } from "react";
import { getOverview } from "../../lib/api";
import {
  Layers,
  Server,
  Database,
  Monitor,
  FileCode,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

export default function Overview({ repoId, onOpenFile }) {
  const [data, setData] = useState(null);
  const nav = useNavigate();
  const { repoId: rid } = useParams();

  useEffect(() => {
    getOverview(repoId).then(setData);
  }, [repoId]);

  if (!data) return <Loading />;

  const stats = data.stats || {};
  const totalCode =
    (stats.python_files || 0) +
    (stats.js_files || 0) +
    (stats.ts_files || 0) +
    (stats.jsx_files || 0) +
    (stats.tsx_files || 0);

  return (
    <div className="h-full overflow-auto p-8" data-testid="overview-view">
      <div className="max-w-5xl">
        <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-mono mb-2">
          [ overview / architecture snapshot ]
        </div>
        <h1 className="text-3xl tracking-tighter font-semibold text-zinc-50 mb-1">
          {data.repo?.name}
        </h1>
        <div className="text-xs font-mono text-zinc-500 mb-8">
          {data.repo?.source} · {data.repo?.source_ref} · {data.repo?.file_count} files
        </div>

        {/* Frameworks */}
        <SectionTitle number="01" label="tech stack detected" />
        <div className="border border-zinc-800 bg-[#121214] p-4 mb-8">
          {data.frameworks?.length ? (
            <div className="flex flex-wrap gap-2">
              {data.frameworks.map((f) => (
                <span
                  key={f}
                  data-testid={`framework-${f}`}
                  className="px-2 py-1 border border-zinc-700 bg-zinc-900 text-[11px] font-mono text-zinc-200"
                >
                  {f}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs font-mono text-zinc-500">
              no known frameworks detected
            </div>
          )}
        </div>

        {/* Stats */}
        <SectionTitle number="02" label="code composition" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border border-zinc-800 mb-8">
          <StatCell label="Python" value={stats.python_files} color="text-sky-400" />
          <StatCell label="JS" value={stats.js_files} color="text-yellow-400" />
          <StatCell label="JSX" value={stats.jsx_files} color="text-yellow-400" />
          <StatCell label="TS" value={stats.ts_files} color="text-blue-400" />
          <StatCell label="TSX" value={stats.tsx_files} color="text-blue-400" />
        </div>

        {/* Architecture diagram */}
        <SectionTitle number="03" label="architecture layers" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-zinc-800 mb-8">
          <ArchCell
            active={data.has_frontend}
            icon={Monitor}
            title="Frontend"
            subtitle={data.package_json || "no package.json"}
            note={
              data.frameworks?.filter((f) =>
                ["React", "Next.js", "Vue", "Svelte", "Tailwind"].includes(f),
              ).join(" · ") || "—"
            }
          />
          <ArchCell
            active={data.has_backend}
            icon={Server}
            title="Backend"
            subtitle={data.requirements || "no requirements.txt"}
            note={
              data.frameworks?.filter((f) =>
                ["FastAPI", "Flask", "Django", "Express"].includes(f),
              ).join(" · ") || "—"
            }
          />
          <ArchCell
            active={data.frameworks?.some((f) =>
              ["MongoDB", "SQLAlchemy", "Mongoose"].includes(f),
            )}
            icon={Database}
            title="Data Layer"
            subtitle="models & drivers"
            note={
              data.frameworks?.filter((f) =>
                ["MongoDB", "SQLAlchemy", "Mongoose"].includes(f),
              ).join(" · ") || "—"
            }
          />
        </div>

        {/* Quick jump */}
        <SectionTitle number="04" label="start exploring" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-zinc-800">
          <JumpCard
            testId="jump-explorer"
            icon={FileCode}
            title="File tree"
            desc={`${totalCode} code files across the repo`}
            onClick={() => nav(`/repo/${rid}/explorer`)}
          />
          <JumpCard
            testId="jump-dependencies"
            icon={Layers}
            title="Dependency graph"
            desc="Visualize imports between files"
            onClick={() => nav(`/repo/${rid}/dependencies`)}
          />
          <JumpCard
            testId="jump-endpoints"
            icon={Boxes}
            title="API endpoints"
            desc="Backend routes ↔ frontend calls"
            onClick={() => nav(`/repo/${rid}/endpoints`)}
          />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ number, label }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <span className="text-[10px] font-mono text-yellow-400">[{number}]</span>
      <span className="text-[11px] uppercase tracking-[0.2em] font-mono text-zinc-400">
        {label}
      </span>
      <div className="flex-1 border-b border-zinc-800" />
    </div>
  );
}

function StatCell({ label, value, color }) {
  return (
    <div className="border-r last:border-r-0 border-zinc-800 p-4 bg-[#121214]">
      <div className={`text-2xl font-mono font-medium ${color}`}>{value ?? 0}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mt-1">
        {label}
      </div>
    </div>
  );
}

function ArchCell({ active, icon: Icon, title, subtitle, note }) {
  return (
    <div
      className={`border-r last:border-r-0 border-zinc-800 p-5 relative ${
        active ? "bg-[#121214]" : "bg-[#0d0d0f] diagonal-hatch"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${active ? "text-yellow-400" : "text-zinc-600"}`} />
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        {active ? (
          <span className="ml-auto text-[9px] font-mono text-emerald-400 uppercase tracking-wider">
            ● live
          </span>
        ) : (
          <span className="ml-auto text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
            n/a
          </span>
        )}
      </div>
      <div className="text-[11px] font-mono text-zinc-500 truncate">{subtitle}</div>
      <div className="text-[11px] font-mono text-zinc-300 mt-1">{note}</div>
    </div>
  );
}

function JumpCard({ testId, icon: Icon, title, desc, onClick }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="border-r last:border-r-0 border-zinc-800 p-5 bg-[#121214] hover:bg-[#18181b] group text-left"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-yellow-400" />
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        <ArrowRight className="w-3 h-3 text-zinc-500 ml-auto group-hover:text-yellow-400 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className="text-[11px] font-mono text-zinc-500">{desc}</div>
    </button>
  );
}

function Loading() {
  return (
    <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
      loading overview…
    </div>
  );
}
