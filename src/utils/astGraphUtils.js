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

    const LAYER_GAP_Y = 180;
    const NODE_GAP_X = 160;

    Object.keys(byDepth).forEach((d) => {
        const layer = byDepth[d];
        const totalWidth = (layer.length - 1) * NODE_GAP_X;
        layer.forEach((n, i) => {
            n.x = -totalWidth / 2 + i * NODE_GAP_X;
            n.y = -(Number(d) * LAYER_GAP_Y);
        });
    });

    // Give every node a fixed size
    nodes.forEach((n) => {
        n.size = 18;
    });

    return { nodes, edges, orGroups };
}
