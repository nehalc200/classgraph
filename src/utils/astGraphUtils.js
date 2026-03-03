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
 * Given a root AST node, extract a layered TREE limited to `maxDepth` layers.
 *
 * Returns { nodes, edges, orGroups } ready for the Sigma renderer.
 *   nodes  : [{ id, label, x, y, depth, isExpandable, size }]
 *   edges  : [{ source, target, id }]
 *   orGroups : [{ id, memberNodeIds, fill, border }]
 */
export function extractLayers(rootNode, maxDepth = 3, options = {}) {
  _colorIndex = 0; // reset per extraction

  const { expandedOrGroups = new Set(), orPreviewLimit = 3 } = options;

  const nodes = [];
  const edges = [];
  const orGroups = [];
  const seenNodes = new Set();
  const seenEdges = new Set();

  function walk(astNode, parentId, depth) {
    if (!astNode) return;

    // ---- OR handling (preview first N + "+N" expander) ----
    if (astNode.code === 'OR') {
      const { fill, border } = nextOrColor();
      const groupId = `or_${parentId}_${orGroups.length}`;

      const children = astNode.children || [];
      const isExpanded = expandedOrGroups.has(groupId);

      const visibleChildren = isExpanded ? children : children.slice(0, orPreviewLimit);
      const hiddenCount = Math.max(0, children.length - visibleChildren.length);

      const memberIds = [];

      // walk visible OR members
      visibleChildren.forEach((child) => {
        walk(child, parentId, depth);

        if (child.code !== 'OR') {
          const childId = nodeId(child, parentId, depth);
          if (seenNodes.has(childId)) memberIds.push(childId);
        }
      });

      // add "+N" node inside this OR group if some are hidden
      if (hiddenCount > 0) {
        const moreId = `OR_MORE::${groupId}::${depth}`;

        if (!seenNodes.has(moreId)) {
          seenNodes.add(moreId);
          nodes.push({
            id: moreId,
            label: `+${hiddenCount}`,
            depth,
            isExpandable: true,
            isOrMore: true,
            orGroupId: groupId,
          });
        }

        if (parentId) {
          const eid = `${parentId}→${moreId}`;
          if (!seenEdges.has(eid)) {
            seenEdges.add(eid);
            edges.push({ source: parentId, target: moreId, id: eid });
          }
        }

        memberIds.push(moreId);
      }

      if (memberIds.length > 0) {
        orGroups.push({ id: groupId, memberNodeIds: memberIds, fill, border });
      }
      return;
    }

    // ---- normal node handling (your existing logic) ----
    const nid = nodeId(astNode, parentId, depth);
    if (!seenNodes.has(nid)) {
      const hasChildren = (astNode.children || []).length > 0;
      const isExpandable = hasChildren && depth >= maxDepth - 1;
      seenNodes.add(nid);
      nodes.push({ id: nid, label: astNode.code, depth, isExpandable });
    }

    if (parentId) {
      const eid = `${parentId}→${nid}`;
      if (!seenEdges.has(eid)) {
        seenEdges.add(eid);
        edges.push({ source: parentId, target: nid, id: eid });
      }
    }

    if (depth < maxDepth - 1) {
      (astNode.children || []).forEach((child) => {
        walk(child, nid, depth + 1);
      });
    }
  }

  function nodeId(astNode, parentId, depth) {
    return `${astNode.code}::${depth}`;
  }

  walk(rootNode, null, 0);

  // ---- layout: barycenter ordering to minimise edge crossings ----

  // Group nodes by depth
  const byDepth = {};
  nodes.forEach((n) => {
    if (!byDepth[n.depth]) byDepth[n.depth] = [];
    byDepth[n.depth].push(n);
  });

  // Build parent lookup: child id → list of parent ids (from edges)
  const parentsOf = {};
  edges.forEach(({ source, target }) => {
    if (!parentsOf[target]) parentsOf[target] = [];
    parentsOf[target].push(source);
  });

  // Mapping from OR-group index for within-group cohesion (keep OR siblings together)
  const nodeOrGroup = {};
  orGroups.forEach((g, gi) => {
    g.memberNodeIds.forEach((nid) => {
      if (nodeOrGroup[nid] === undefined) nodeOrGroup[nid] = gi;
    });
  });

  const LAYER_GAP_Y = 180;
  const NODE_GAP_X = 160;

  // Temporary x map used during barycenter computation (assigned incrementally)
  const tempX = {};

  const depthKeys = Object.keys(byDepth).map(Number).sort((a, b) => a - b);

  depthKeys.forEach((d) => {
    const layer = byDepth[d];

    if (d === 0) {
      // Root layer: single node, just center it
      layer.forEach((n, i) => {
        const totalWidth = (layer.length - 1) * NODE_GAP_X;
        tempX[n.id] = -totalWidth / 2 + i * NODE_GAP_X;
      });
    } else {
      // Sort by barycenter of parents, with OR-group cohesion as a tiebreaker
      layer.sort((a, b) => {
        const baryA = barycenter(a.id);
        const baryB = barycenter(b.id);
        if (Math.abs(baryA - baryB) > 0.001) return baryA - baryB;
        // tiebreak: keep OR siblings contiguous
        const gA = nodeOrGroup[a.id] ?? Infinity;
        const gB = nodeOrGroup[b.id] ?? Infinity;
        return gA - gB;
      });

      // Assign evenly spaced x positions centred at 0
      const totalWidth = (layer.length - 1) * NODE_GAP_X;
      layer.forEach((n, i) => {
        tempX[n.id] = -totalWidth / 2 + i * NODE_GAP_X;
      });
    }

    // Commit y position
    layer.forEach((n) => {
      n.y = d * LAYER_GAP_Y;
      n.x = tempX[n.id];
    });
  });

  function barycenter(nodeId) {
    const pids = parentsOf[nodeId];
    if (!pids || pids.length === 0) return 0;
    const known = pids.filter((pid) => tempX[pid] !== undefined);
    if (known.length === 0) return 0;
    return known.reduce((sum, pid) => sum + tempX[pid], 0) / known.length;
  }

  nodes.forEach((n) => (n.size = 18));
  return { nodes, edges, orGroups };
}