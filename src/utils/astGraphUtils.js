/**
 * Utilities for working with the MATH_ast.json tree format.
 *
 * AST shape (each entry):
 *   { code: string, type: "ROOT"|"CHILD", children: ASTNode[] }
 *
 * An OR node has code === "OR" and its children are the alternatives.
 * All other sibling children at the same parent are implicit AND prerequisites.
 */

// ── Colour palette for OR-group boxes ────────────────────────────────────────
const OR_COLORS = [
    'rgba(99, 102, 241, 0.15)',   // indigo
    'rgba(236, 72, 153, 0.15)',   // pink
    'rgba(16, 185, 129, 0.15)',   // emerald
    'rgba(245, 158, 11, 0.15)',   // amber
    'rgba(139, 92, 246, 0.15)',   // violet
    'rgba(6, 182, 212, 0.15)',    // cyan
    'rgba(239, 68, 68, 0.15)',    // red
    'rgba(34, 197, 94, 0.15)',    // green
];

const OR_BORDER_COLORS = [
    'rgba(99, 102, 241, 0.7)',
    'rgba(236, 72, 153, 0.7)',
    'rgba(16, 185, 129, 0.7)',
    'rgba(245, 158, 11, 0.7)',
    'rgba(139, 92, 246, 0.7)',
    'rgba(6, 182, 212, 0.7)',
    'rgba(239, 68, 68, 0.7)',
    'rgba(34, 197, 94, 0.7)',
];

let _colorIndex = 0;
function nextOrColor() {
    const fill = OR_COLORS[_colorIndex % OR_COLORS.length];
    const border = OR_BORDER_COLORS[_colorIndex % OR_BORDER_COLORS.length];
    _colorIndex++;
    return { fill, border };
}

// ── Public helpers ───────────────────────────────────────────────────────────

/**
 * Return a sorted list of every root course code in the AST.
 */
export function getAllCourses(astData) {
    return astData
        .filter((n) => n.type === 'ROOT')
        .map((n) => n.code)
        .sort();
}

/**
 * Find the root AST node for a given course code.
 */
export function findRootNode(courseCode, astData) {
    const upper = courseCode.trim().toUpperCase();
    return astData.find(
        (n) => n.type === 'ROOT' && n.code.trim().toUpperCase() === upper,
    );
}

/**
 * Given a root AST node, extract a layered graph limited to `maxDepth` layers.
 *
 * Returns { nodes, edges, orGroups } ready for the Sigma renderer.
 *   nodes  : [{ id, label, x, y, depth, isExpandable, size }]
 *   edges  : [{ source, target, id }]
 *   orGroups : [{ id, memberNodeIds, fill, border }]
 */
export function extractLayers(rootNode, maxDepth = 3) {
    _colorIndex = 0; // reset per extraction

    const nodesMap = {};    // id → { id, label, depth, isExpandable }
    const edges = [];
    const orGroups = [];
    const seenEdges = new Set();

    // We walk the AST tree.  `depth` counts from 0 (the root course).
    // OR nodes do NOT consume a depth level — their children stay at the
    // same depth as the OR node itself.

    function walk(astNode, parentId, depth) {
        if (!astNode) return;

        if (astNode.code === 'OR') {
            // OR node: group its children, don't create a graph node for "OR" itself
            const { fill, border } = nextOrColor();
            const groupId = `or_${parentId}_${orGroups.length}`;
            const memberIds = [];

            (astNode.children || []).forEach((child) => {
                walk(child, parentId, depth);
                if (child.code !== 'OR') {
                    const childId = child.code;
                    if (nodesMap[childId]) {
                        memberIds.push(childId);
                    }
                }
            });

            if (memberIds.length > 0) {
                orGroups.push({ id: groupId, memberNodeIds: memberIds, fill, border });
            }
            return;
        }

        // Regular course node — use course code as the unique ID (graph, not tree)
        const nid = astNode.code;

        if (!nodesMap[nid]) {
            const hasChildren = (astNode.children || []).length > 0;
            const isExpandable = hasChildren && depth >= maxDepth - 1;
            nodesMap[nid] = {
                id: nid,
                label: astNode.code,
                depth,
                isExpandable,
            };
        } else {
            // Node already seen — use the shallowest depth for layout
            if (depth < nodesMap[nid].depth) {
                nodesMap[nid].depth = depth;
            }
        }

        // Edge from parent → this node
        if (parentId) {
            const eid = `${parentId}→${nid}`;
            if (!seenEdges.has(eid)) {
                seenEdges.add(eid);
                edges.push({ source: parentId, target: nid, id: eid });
            }
        }

        // Recurse into children if within depth
        if (depth < maxDepth - 1) {
            (astNode.children || []).forEach((child) => {
                walk(child, nid, depth + 1);
            });
        }
    }

    walk(rootNode, null, 0);

    const nodes = Object.values(nodesMap);

    // ── Assign x, y positions (layered layout, top-to-bottom) ───────────────
    // Group nodes by depth, then spread horizontally.
    const byDepth = {};
    nodes.forEach((n) => {
        if (!byDepth[n.depth]) byDepth[n.depth] = [];
        byDepth[n.depth].push(n);
    });

    const depthKeys = Object.keys(byDepth).map(Number).sort((a, b) => a - b);

    // Build adjacency lookup: nodeId → set of connected nodeIds
    const neighbors = {};
    edges.forEach((e) => {
        if (!neighbors[e.source]) neighbors[e.source] = new Set();
        if (!neighbors[e.target]) neighbors[e.target] = new Set();
        neighbors[e.source].add(e.target);
        neighbors[e.target].add(e.source);
    });

    // Build OR-group membership: nodeId → primary OR-group index
    const nodeOrGroup = {};
    orGroups.forEach((g, gi) => {
        g.memberNodeIds.forEach((nid) => {
            if (nodeOrGroup[nid] === undefined) nodeOrGroup[nid] = gi;
        });
    });

    const LAYER_GAP_Y = 180;
    const NODE_GAP_X = 160;

    // Initial placement: just sequentially assign x per layer
    depthKeys.forEach((d) => {
        const layer = byDepth[d];
        const totalWidth = (layer.length - 1) * NODE_GAP_X;
        layer.forEach((n, i) => {
            n.x = -totalWidth / 2 + i * NODE_GAP_X;
            n.y = -(d * LAYER_GAP_Y);
        });
    });

    // ── Barycenter heuristic: sweep up and down to reduce crossings ─────────
    // For each node, compute the average x of its neighbours in the adjacent
    // layer, then re-sort the layer by that value. Repeat several passes.
    const SWEEPS = 4;

    for (let sweep = 0; sweep < SWEEPS; sweep++) {
        // Downward pass (layer 0 → deepest)
        for (let li = 1; li < depthKeys.length; li++) {
            reorderLayer(byDepth[depthKeys[li]], byDepth[depthKeys[li - 1]]);
        }
        // Upward pass (deepest → layer 0)
        for (let li = depthKeys.length - 2; li >= 0; li--) {
            reorderLayer(byDepth[depthKeys[li]], byDepth[depthKeys[li + 1]]);
        }
    }

    // After barycenter sweeps, enforce OR-group adjacency
    depthKeys.forEach((d) => {
        enforceOrGroupAdjacency(byDepth[d]);
    });

    // Final position assignment after ordering
    depthKeys.forEach((d) => {
        const layer = byDepth[d];
        const totalWidth = (layer.length - 1) * NODE_GAP_X;
        layer.forEach((n, i) => {
            n.x = -totalWidth / 2 + i * NODE_GAP_X;
            n.y = -(d * LAYER_GAP_Y);
        });
    });

    // ── Helper: reorder `layer` based on barycenter of neighbours in `refLayer`
    function reorderLayer(layer, refLayer) {
        // Build a position lookup for the reference layer
        const refPos = {};
        refLayer.forEach((n, i) => { refPos[n.id] = i; });

        // Compute barycenter for each node in `layer`
        const bary = {};
        layer.forEach((n) => {
            const nbrs = neighbors[n.id] || new Set();
            let sum = 0, count = 0;
            nbrs.forEach((nbrId) => {
                if (refPos[nbrId] !== undefined) {
                    sum += refPos[nbrId];
                    count++;
                }
            });
            bary[n.id] = count > 0 ? sum / count : Infinity;
        });

        layer.sort((a, b) => bary[a.id] - bary[b.id]);
    }

    // ── Helper: ensure OR-group members are adjacent within a layer
    function enforceOrGroupAdjacency(layer) {
        // Group nodes by their OR-group, preserving relative order
        const groups = {};     // groupIdx → [nodes]
        const ungrouped = [];
        const seen = new Set();

        layer.forEach((n) => {
            if (nodeOrGroup[n.id] !== undefined) {
                const gi = nodeOrGroup[n.id];
                if (!groups[gi]) groups[gi] = [];
                groups[gi].push(n);
                seen.add(n.id);
            }
        });

        // Rebuild the layer: insert groups at the position of their first member
        const result = [];
        const insertedGroups = new Set();
        layer.forEach((n) => {
            if (nodeOrGroup[n.id] !== undefined) {
                const gi = nodeOrGroup[n.id];
                if (!insertedGroups.has(gi)) {
                    insertedGroups.add(gi);
                    result.push(...groups[gi]);
                }
            } else {
                result.push(n);
            }
        });

        // Replace layer contents in-place
        for (let i = 0; i < result.length; i++) {
            layer[i] = result[i];
        }
    }

    // Give every node a fixed size
    nodes.forEach((n) => {
        n.size = 18;
    });

    return { nodes, edges, orGroups };
}
