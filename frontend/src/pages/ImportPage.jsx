import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Upload,
  FolderOpen,
  Github,
  Trash2,
  ArrowRight,
  Boxes,
  GitBranch,
  Loader2,
} from "lucide-react";
import { listRepos, importZip, importLocal, importGithub, deleteRepo } from "../lib/api";

const TABS = [
  { id: "upload", label: "Upload ZIP", icon: Upload },
  { id: "local", label: "Local Path", icon: FolderOpen },
  { id: "github", label: "GitHub URL", icon: Github },
];

export default function ImportPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState("upload");
  const [repos, setRepos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [zipFile, setZipFile] = useState(null);
  const [zipName, setZipName] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [localName, setLocalName] = useState("");
  const [ghUrl, setGhUrl] = useState("");
  const [ghName, setGhName] = useState("");

  const refresh = async () => {
    try {
      const r = await listRepos();
      setRepos(r);
    } catch (e) {
      console.error("failed to list repos:", e);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onImport = async () => {
    setBusy(true);
    try {
      let repo;
      if (tab === "upload") {
        if (!zipFile) return toast.error("Select a .zip file");
        repo = await importZip(zipFile, zipName || null);
      } else if (tab === "local") {
        if (!localPath) return toast.error("Enter a local path");
        repo = await importLocal(localPath, localName || null);
      } else {
        if (!ghUrl) return toast.error("Enter a GitHub URL");
        repo = await importGithub(ghUrl, ghName || null);
      }
      toast.success(`Imported ${repo.name}`);
      nav(`/repo/${repo.id}/overview`);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Import failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteRepo(id);
      toast.success("Repo deleted");
      refresh();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="min-h-screen w-full grid-bg" data-testid="import-page">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-yellow-400 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <div className="font-mono text-sm font-semibold tracking-tight">CODELENS</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 -mt-0.5">
                repo visualizer
              </div>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">
            v0.1 · onboarding companion
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="mb-16 max-w-3xl">
          <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-mono mb-4">
            [ 001 / codebase intelligence ]
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-semibold leading-[1.05] text-zinc-50">
            See your codebase.
            <br />
            <span className="text-zinc-500">Understand it in minutes.</span>
          </h1>
          <p className="mt-6 text-base text-zinc-400 max-w-xl leading-relaxed">
            Import a repository once. Explore the file tree, dependency graph, API endpoints,
            database models, React components, and live git diffs — all in one dense IDE-grade
            dashboard.
          </p>
        </div>

        {/* Import panel */}
        <div className="border border-zinc-800 bg-[#121214]" data-testid="import-panel">
          <div className="border-b border-zinc-800 flex">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  data-testid={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-mono uppercase tracking-wider border-r border-zinc-800 last:border-r-0 transition-colors ${
                    active
                      ? "text-yellow-400 border-b-2 border-b-yellow-400 bg-[#09090b]"
                      : "text-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-8">
            {tab === "upload" && (
              <div className="space-y-4">
                <label className="block">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-2">
                    zip file
                  </div>
                  <div className="border border-dashed border-zinc-700 hover:border-yellow-400 transition-colors">
                    <input
                      type="file"
                      accept=".zip"
                      data-testid="zip-input"
                      onChange={(e) => setZipFile(e.target.files?.[0])}
                      className="block w-full text-sm text-zinc-300 file:mr-4 file:py-3 file:px-4 file:border-0 file:bg-zinc-800 file:text-zinc-100 file:font-mono file:text-xs file:uppercase file:tracking-wider hover:file:bg-zinc-700 cursor-pointer"
                    />
                  </div>
                  {zipFile && (
                    <div className="text-xs font-mono text-zinc-400 mt-2">
                      {zipFile.name} · {(zipFile.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                </label>
                <TextInput
                  label="project name (optional)"
                  value={zipName}
                  onChange={setZipName}
                  placeholder="my-awesome-app"
                  testId="zip-name"
                />
              </div>
            )}

            {tab === "local" && (
              <div className="space-y-4">
                <TextInput
                  label="absolute path on server"
                  value={localPath}
                  onChange={setLocalPath}
                  placeholder="/app or /home/user/project"
                  testId="local-path"
                />
                <TextInput
                  label="project name (optional)"
                  value={localName}
                  onChange={setLocalName}
                  placeholder="my-app"
                  testId="local-name"
                />
                <div className="text-[11px] text-zinc-500 font-mono leading-relaxed">
                  Reads a directory accessible to the backend. Ideal when running CodeLens on your
                  dev machine.
                </div>
              </div>
            )}

            {tab === "github" && (
              <div className="space-y-4">
                <TextInput
                  label="repository url"
                  value={ghUrl}
                  onChange={setGhUrl}
                  placeholder="https://github.com/vercel/next.js.git"
                  testId="github-url"
                />
                <TextInput
                  label="project name (optional)"
                  value={ghName}
                  onChange={setGhName}
                  placeholder="nextjs"
                  testId="github-name"
                />
                <div className="text-[11px] text-zinc-500 font-mono leading-relaxed">
                  Clones public repositories (shallow, depth=50). Private repos require configured
                  credentials on the host.
                </div>
              </div>
            )}

            <button
              data-testid="import-submit"
              onClick={onImport}
              disabled={busy}
              className="mt-8 group inline-flex items-center gap-3 px-5 py-2.5 bg-yellow-400 text-black text-xs font-mono uppercase tracking-wider font-semibold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-400 transition-all"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  Import & Analyze
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent repos */}
        <div className="mt-16">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-mono">
                [ 002 / imported repos ]
              </div>
              <h2 className="text-2xl tracking-tight font-medium text-zinc-50 mt-1">
                Recent projects
              </h2>
            </div>
            <div className="text-xs font-mono text-zinc-500">{repos.length} total</div>
          </div>

          {repos.length === 0 ? (
            <div className="border border-zinc-800 border-dashed p-12 text-center">
              <div className="text-sm text-zinc-500 font-mono">
                No repositories yet — import one above.
              </div>
            </div>
          ) : (
            <div className="border border-zinc-800 divide-y divide-zinc-800" data-testid="repo-list">
              {repos.map((r) => (
                <div
                  key={r.id}
                  data-testid={`repo-row-${r.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[#18181b] group"
                >
                  <button
                    onClick={() => nav(`/repo/${r.id}/overview`)}
                    className="flex-1 flex items-center gap-4 text-left"
                    data-testid={`open-repo-${r.id}`}
                  >
                    <SourceBadge source={r.source} />
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-zinc-100 truncate">{r.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">
                        {r.source_ref}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 shrink-0">
                    <span>{r.file_count} files</span>
                    {r.has_git && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <GitBranch className="w-3 h-3" /> git
                      </span>
                    )}
                    <button
                      data-testid={`delete-repo-${r.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(r.id);
                      }}
                      className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, testId }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-2">
        {label}
      </div>
      <input
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#09090b] border border-zinc-800 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 rounded-none px-3 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-600"
      />
    </label>
  );
}

function SourceBadge({ source }) {
  const map = {
    upload: { label: "ZIP", color: "text-yellow-400 border-yellow-400/40" },
    local: { label: "LOCAL", color: "text-sky-400 border-sky-400/40" },
    github: { label: "GITHUB", color: "text-emerald-400 border-emerald-400/40" },
  };
  const m = map[source] || { label: source, color: "text-zinc-400 border-zinc-700" };
  return (
    <span
      className={`px-2 py-0.5 border ${m.color} bg-zinc-950 text-[10px] uppercase tracking-wider font-mono`}
    >
      {m.label}
    </span>
  );
}
