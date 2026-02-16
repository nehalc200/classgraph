import React, { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";

const MAX_DEPTH = 3; // show 2–3 levels (0,1,2)

function cloneLimited(node, maxDepth, depth = 0) {
  const out = { code: node.code, type: node.type };
  if (depth >= maxDepth - 1) return out;

  if (node.children?.length) {
    out.children = node.children.map((ch) => cloneLimited(ch, maxDepth, depth + 1));
  }
  return out;
}

export default function PrereqTree({
  jsonPath = "/data/MATH_ast.json",
  initialRoot = "MATH 20A",
  width = 900,
  height = 700,
}) {
  const [ast, setAst] = useState(null);
  const [rootCode, setRootCode] = useState(initialRoot);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let alive = true;
    fetch(jsonPath)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${jsonPath}: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        setAst(data);
      })
      .catch((e) => {
        console.error(e);
        if (!alive) return;
        setAst([]);
      });

    return () => {
      alive = false;
    };
  }, [jsonPath]);

  const byCode = useMemo(() => {
    if (!ast) return new Map();
    return new Map(ast.map((d) => [d.code, d]));
  }, [ast]);

  const { nodes, links } = useMemo(() => {
    if (!ast || !byCode.size) return { nodes: [], links: [] };

    const rootNode = byCode.get(rootCode) ?? ast[0];
    if (!rootNode) return { nodes: [], links: [] };

    const viewTree = cloneLimited(rootNode, MAX_DEPTH);
    const root = d3.hierarchy(viewTree);

    // layout
    const tree = d3.tree().nodeSize([52, 170]); // [vertical, horizontal]
    tree(root);

    // center vertically
    const xs = root.descendants().map((d) => d.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const xOffset = (height - (xMax - xMin)) / 2 - xMin;

    root.descendants().forEach((d) => (d.x += xOffset));

    return { nodes: root.descendants(), links: root.links() };
  }, [ast, byCode, rootCode, height]);

  const pathGen = d3
    .linkHorizontal()
    .x((d) => d.y)
    .y((d) => d.x);

  function reroot(code) {
    setHistory((h) => [...h, rootCode]);
    setRootCode(code);
  }

  function goBack() {
    setHistory((h) => {
      if (!h.length) return h;
      const next = [...h];
      const prev = next.pop();
      setRootCode(prev);
      return next;
    });
  }

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <button
          className="px-3 py-1 rounded-lg bg-white/80 hover:bg-white text-sm border border-black/10"
          onClick={goBack}
          disabled={!history.length}
          title="Back"
        >
          ← Back
        </button>
        <div className="px-3 py-1 rounded-lg bg-white/80 text-sm border border-black/10">
          Root: <span className="font-semibold">{rootCode}</span>
        </div>
      </div>

      <svg width={width} height={height} className="block">
        <g transform="translate(30,0)">
          {/* links */}
          {links.map((lk, i) => (
            <path
              key={i}
              d={pathGen(lk)}
              fill="none"
              stroke="#9ca3af"
              strokeWidth={2}
              opacity={0.9}
            />
          ))}

          {/* nodes */}
          {nodes.map((n, i) => {
            const code = n.data.code;
            const isOr = code === "OR";
            const canReroot = !isOr && byCode.has(code);

            return (
              <g
                key={i}
                transform={`translate(${n.y},${n.x})`}
                onClick={() => {
                  if (canReroot && code !== rootCode) reroot(code);
                }}
                style={{ cursor: canReroot ? "pointer" : "default" }}
              >
                <circle
                  r={11}
                  fill={isOr ? "#F472B6" : "#34D399"}
                  stroke="#111827"
                  strokeWidth={1.5}
                />
                <text
                  x={16}
                  y={5}
                  fontSize={12}
                  fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
                  fill="#111827"
                >
                  {code}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
