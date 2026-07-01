import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import { getDependencies } from "../../lib/api";
import { Loader2 } from "lucide-react";

function layoutNodes(nodes) {
  // Simple grid layout, group by dir
  const byDir = new Map();
  nodes.forEach((n) => {
    const dir = n.path.split("/").slice(0, -1).join("/") || "(root)";
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(n);
  });
  const dirs = [...byDir.keys()].sort();
  const out = [];
  const colW = 240;
  const rowH = 46;
  dirs.forEach((dir, ci) => {
    const list = byDir.get(dir);
    list.forEach((n, ri) => {
      out.push({
        id: n.id,
        position: { x: ci * colW, y: ri * rowH },
        data: { label: n.label, kind: n.kind, path: n.path, in: n.in_degree, out: n.out_degree },
        className: `rf-node ${n.kind}`,
      });
    });
  });
  return out;
}

export default function DependencyGraphView({ repoId, onOpenFile }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    getDependencies(repoId).then(setData);
  }, [repoId]);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    const filteredNodes = filter
      ? data.nodes.filter((n) => n.path.toLowerCase().includes(filter.toLowerCase()))
      : data.nodes;
    const nodeSet = new Set(filteredNodes.map((n) => n.id));
    const rfNodes = layoutNodes(filteredNodes).map((n) => ({
      ...n,
      data: {
        ...n.data,
        label: (
          <div>
            <div className="truncate max-w-[200px]">{n.data.label}</div>
            <div className="text-[9px] text-zinc-500 mt-0.5">
              in {n.data.in} · out {n.data.out}
            </div>
          </div>
        ),
      },
    }));
    const rfEdges = data.edges
      .filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target))
      .map((e) => ({
        id: `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        style: { stroke: "#3f3f46", strokeWidth: 1 },
      }));
    return { nodes: rfNodes, edges: rfEdges };
  }, [data, filter]);

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> analyzing dependencies…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="dep-graph-view">
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-4 shrink-0">
        <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
          dependency graph
        </div>
        <div className="text-[10px] font-mono text-zinc-500">
          {data.nodes.length} nodes · {data.edges.length} edges
        </div>
        <input
          data-testid="dep-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter by path…"
          className="ml-auto bg-[#09090b] border border-zinc-800 focus:border-yellow-400 focus:outline-none px-2 py-1 text-[11px] font-mono text-zinc-100 w-64"
        />
      </div>
      <div className="flex-1 relative bg-[#0d0d0f]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => onOpenFile(node.data.path)}
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#27272a" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => (n.className?.includes("python") ? "#38bdf8" : "#facc15")}
            maskColor="rgba(9,9,11,0.7)"
            style={{ background: "#121214", border: "1px solid #27272a" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
