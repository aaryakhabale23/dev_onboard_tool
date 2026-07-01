import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  FolderTree,
  Network,
  Route as RouteIcon,
  Database,
  Component,
  GitPullRequest,
  Search,
  Boxes,
  MessageSquare,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { getRepo, searchRepo, setWatch, refreshRepo } from "../lib/api";
import Overview from "../components/views/Overview";
import ExplorerView from "../components/views/ExplorerView";
import DependencyGraphView from "../components/views/DependencyGraphView";
import EndpointsView from "../components/views/EndpointsView";
import ModelsView from "../components/views/ModelsView";
import ComponentsView from "../components/views/ComponentsView";
import GitDiffView from "../components/views/GitDiffView";
import AnnotationsPanel from "../components/AnnotationsPanel";
import { toast } from "sonner";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "explorer", label: "File Tree", icon: FolderTree },
  { id: "dependencies", label: "Dependencies", icon: Network },
  { id: "endpoints", label: "Endpoints", icon: RouteIcon },
  { id: "models", label: "Models", icon: Database },
  { id: "components", label: "Components", icon: Component },
  { id: "git", label: "Git Diff", icon: GitPullRequest },
];

export default function RepoDashboard() {
  const { repoId, view = "overview" } = useParams();
  const nav = useNavigate();
  const [repo, setRepo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAnn, setShowAnn] = useState(true);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewKey, setViewKey] = useState(0);

  useEffect(() => {
    getRepo(repoId).then(setRepo).catch(() => nav("/"));
  }, [repoId, nav]);

  // Poll repo status to detect auto-syncs from watch loop
  useEffect(() => {
    if (!repo?.watch_enabled) return;
    let lastSync = repo.last_synced_at;
    const t = setInterval(async () => {
      try {
        const fresh = await getRepo(repoId);
        if (fresh.last_synced_at && fresh.last_synced_at !== lastSync) {
          lastSync = fresh.last_synced_at;
          setRepo(fresh);
          setViewKey((k) => k + 1);
          toast.success("Repo changed — re-analyzed", { id: "watch-sync" });
        }
      } catch (e) {
        // ignore
      }
    }, 3000);
    return () => clearInterval(t);
  }, [repo?.watch_enabled, repo?.last_synced_at, repoId]);

  useEffect(() => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await searchRepo(repoId, q);
        setSearchResults(r.results || []);
      } catch (e) {
        // noop
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, repoId]);

  const openFile = (path, line = null) => {
    setSelectedFile({ path, line });
    if (view !== "explorer") nav(`/repo/${repoId}/explorer`);
    setSearchOpen(false);
  };

  if (!repo) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b] text-zinc-500 font-mono text-sm">
        loading repo…
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Top bar */}
      <header className="h-12 border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0">
        <button
          data-testid="back-to-import"
          onClick={() => nav("/")}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-xs font-mono uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
          <div className="w-5 h-5 border border-yellow-400 flex items-center justify-center">
            <Boxes className="w-3 h-3 text-yellow-400" />
          </div>
          <div className="font-mono text-xs uppercase tracking-wider text-yellow-400">
            CODELENS
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-zinc-600 font-mono text-xs">/</span>
          <span className="font-mono text-sm text-zinc-100 truncate" data-testid="repo-name">
            {repo.name}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono border border-zinc-800 px-1.5 py-0.5 ml-2">
            {repo.source}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-[#121214] border border-zinc-800 focus-within:border-yellow-400 px-2.5 py-1.5 w-72">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input
              data-testid="search-input"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              placeholder="search files & code…"
              className="bg-transparent w-full text-xs font-mono outline-none text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div
              data-testid="search-results"
              className="absolute right-0 top-full mt-1 w-96 max-h-96 overflow-auto bg-[#121214] border border-zinc-800 z-50"
            >
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onMouseDown={() => openFile(r.file, r.line)}
                  className="w-full text-left px-3 py-2 hover:bg-[#18181b] border-b border-zinc-800 last:border-b-0"
                >
                  <div className="text-xs font-mono text-zinc-100 truncate">{r.file}</div>
                  <div className="text-[11px] font-mono text-zinc-500 truncate">
                    :{r.line} · {r.snippet}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          data-testid="toggle-annotations"
          onClick={() => setShowAnn((s) => !s)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider border ${
            showAnn
              ? "border-yellow-400 text-yellow-400"
              : "border-zinc-800 text-zinc-400 hover:text-zinc-100"
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          Notes
        </button>

        {repo.source === "local" && (
          <>
            <button
              data-testid="refresh-repo"
              onClick={async () => {
                setRefreshing(true);
                try {
                  const fresh = await refreshRepo(repoId);
                  setRepo(fresh);
                  setViewKey((k) => k + 1);
                  toast.success("Re-analyzed");
                } catch (e) {
                  toast.error("Refresh failed");
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing}
              title="Re-analyze source directory"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              data-testid="toggle-watch"
              onClick={async () => {
                try {
                  const next = !repo.watch_enabled;
                  const fresh = await setWatch(repoId, next);
                  setRepo(fresh);
                  toast.success(next ? "Watch mode ON" : "Watch mode OFF");
                } catch (e) {
                  toast.error("Toggle failed");
                }
              }}
              title="Auto re-analyze on file changes"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider border ${
                repo.watch_enabled
                  ? "border-emerald-400 text-emerald-400"
                  : "border-zinc-800 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {repo.watch_enabled ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
              {repo.watch_enabled ? "Watching" : "Watch"}
            </button>
          </>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-zinc-800 shrink-0 flex flex-col bg-[#09090b]">
          <div className="p-3 border-b border-zinc-800">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">
              views
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto" data-testid="sidebar-nav">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = view === n.id;
              return (
                <button
                  key={n.id}
                  data-testid={`nav-${n.id}`}
                  onClick={() => nav(`/repo/${repoId}/${n.id}`)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-mono border-l-2 ${
                    active
                      ? "border-l-yellow-400 bg-[#121214] text-zinc-50"
                      : "border-l-transparent text-zinc-400 hover:text-zinc-100 hover:bg-[#18181b]/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="uppercase tracking-wider">{n.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-zinc-800 text-[10px] font-mono text-zinc-600">
            {repo.file_count} files
            {repo.has_git && " · .git"}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-hidden flex flex-col" data-testid="main-view" key={viewKey}>
          {view === "overview" && <Overview repoId={repoId} onOpenFile={openFile} />}
          {view === "explorer" && (
            <ExplorerView
              repoId={repoId}
              selectedFile={selectedFile}
              onSelect={setSelectedFile}
            />
          )}
          {view === "dependencies" && (
            <DependencyGraphView repoId={repoId} onOpenFile={openFile} />
          )}
          {view === "endpoints" && <EndpointsView repoId={repoId} onOpenFile={openFile} />}
          {view === "models" && <ModelsView repoId={repoId} onOpenFile={openFile} />}
          {view === "components" && <ComponentsView repoId={repoId} onOpenFile={openFile} />}
          {view === "git" && <GitDiffView repoId={repoId} onOpenFile={openFile} />}
        </main>

        {/* Annotations */}
        {showAnn && (
          <aside className="w-80 border-l border-zinc-800 shrink-0 bg-[#121214] flex flex-col">
            <AnnotationsPanel repoId={repoId} selectedFile={selectedFile?.path} />
          </aside>
        )}
      </div>
    </div>
  );
}
