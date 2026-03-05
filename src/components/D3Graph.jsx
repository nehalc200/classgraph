import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { extractLayers } from '../utils/astGraphUtils';
import { loadCourseInfo, getCourseInfo } from '../utils/courseInfo';

// Colour palette (matching the Sigma version)
const ROOT_COLOR = '#1e1e1e';
const NORMAL_COLOR = '#555555';
const EXPANDABLE_COLOR = '#6366f1';

export const D3Graph = ({
    rootAstNode,
    onNodeExpand,
    completedCourses = new Set(),
    inProgressCourses = new Set(),
  }) => {
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    const [expandedOrGroups, setExpandedOrGroups] = useState(() => new Set());
    const [courseInfoReady, setCourseInfoReady] = useState(false);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Stable callback ref
    const onNodeExpandRef = useRef(onNodeExpand);
    onNodeExpandRef.current = onNodeExpand;

    // Load course info metadata once
    useEffect(() => {
        loadCourseInfo().then(() => setCourseInfoReady(true));
    }, []);

    // Watch the container for resize events and update containerSize
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setContainerSize({ width: Math.round(width), height: Math.round(height) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!rootAstNode || !containerRef.current) return;

        // Clear previous render
        d3.select(containerRef.current).select('svg').remove();
        // Remove any stale tooltip
        d3.select(containerRef.current).select('.node-tooltip').remove();

        // Extract 3-layer tree data
        const layerData = extractLayers(rootAstNode, 3, {
            expandedOrGroups,
            orPreviewLimit: 3,
        });

        const container = containerRef.current;
        const width = container.offsetWidth || containerSize.width || 800;
        const height = container.offsetHeight || containerSize.height || 500;

        // Create SVG — use 100%/100% so it fills the container on resize
        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('font-family', 'Inter, sans-serif');

        svgRef.current = svg.node();

        // ── Tooltip div (HTML, positioned absolutely inside container) ─────────
        const tooltip = d3.select(container)
            .append('div')
            .attr('class', 'node-tooltip')
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('background', '#fff')
            .style('border', '1.5px solid #1e1e1e')
            .style('border-radius', '8px')
            .style('padding', '10px 14px')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '13px')
            .style('max-width', '260px')
            .style('box-shadow', '0 4px 16px rgba(0,0,0,0.10)')
            .style('z-index', 200)
            .style('line-height', '1.5');

        // Zoom container
        const g = svg.append('g');

        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Center the graph: find bounding box and compute initial transform
        const xs = layerData.nodes.map((n) => n.x);
        const ys = layerData.nodes.map((n) => n.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const graphWidth = maxX - minX + 200;
        const graphHeight = maxY - minY + 200;
        const scale = Math.min(width / graphWidth, height / graphHeight, 1);
        const tx = width / 2 - ((minX + maxX) / 2) * scale;
        const ty = height / 2 - ((minY + maxY) / 2) * scale;

        svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

        // ── Arrow marker definitions ────────────────────────────────────────
        const defs = svg.append('defs');

        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-4L8,0L0,4')
            .attr('fill', '#c4c4c4');

        defs.append('marker')
            .attr('id', 'arrowhead-glow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-4L8,0L0,4')
            .attr('fill', '#14b8a6'); // Teal-500

        // ── OR-group boxes (behind everything else) ─────────────────────────
        const orGroupLayer = g.append('g').attr('class', 'or-groups');

        layerData.orGroups.forEach((group) => {
            const positions = group.memberNodeIds
                .map((nid) => {
                    const node = layerData.nodes.find((n) => n.id === nid);
                    return node ? { x: node.x, y: node.y } : null;
                })
                .filter(Boolean);

            if (positions.length === 0) return;

            let minGX = Infinity, maxGX = -Infinity, minGY = Infinity, maxGY = -Infinity;
            positions.forEach((p) => {
                if (p.x < minGX) minGX = p.x;
                if (p.x > maxGX) maxGX = p.x;
                if (p.y < minGY) minGY = p.y;
                if (p.y > maxGY) maxGY = p.y;
            });

            const padX = 74, padY = 35;
            const rx = minGX - padX;
            const ry = minGY - padY;
            const rw = Math.max(maxGX - minGX + padX * 2, 100);
            const rh = Math.max(maxGY - minGY + padY * 2, 60);

            const orG = orGroupLayer.append('g');

            orG.append('rect')
                .attr('x', rx)
                .attr('y', ry)
                .attr('width', rw)
                .attr('height', rh)
                .attr('rx', 10)
                .attr('ry', 10)
                .attr('fill', group.fill)
                .attr('stroke', group.border)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,4');

            // "OR" badge
            orG.append('text')
                .attr('x', rx + 8)
                .attr('y', ry + 14)
                .attr('fill', group.border)
                .attr('font-size', 11)
                .attr('font-weight', 'bold')
                .text('OR');
        });

        // ── Edges ───────────────────────────────────────────────────────────
        const edgeLayer = g.append('g').attr('class', 'edges');

        edgeLayer.selectAll('line')
            .data(layerData.edges)
            .enter()
            .append('line')
            .attr('x1', (d) => {
                const n = layerData.nodes.find((n) => n.id === d.source);
                return n ? n.x : 0;
            })
            .attr('y1', (d) => {
                const n = layerData.nodes.find((n) => n.id === d.source);
                return n ? n.y + 14 : 0;  // offset below the source node box
            })
            .attr('x2', (d) => {
                const n = layerData.nodes.find((n) => n.id === d.target);
                return n ? n.x : 0;
            })
            .attr('y2', (d) => {
                const n = layerData.nodes.find((n) => n.id === d.target);
                return n ? n.y - 14 : 0;  // offset above the target node box
            })
            .attr('stroke', '#c4c4c4')
            .attr('opacity', 0.78)
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');

        const edgeSel = edgeLayer.selectAll('line')
        edgeSel
            .attr('pointer-events', 'stroke')
            .attr('stroke-linecap', 'round')
            .style('cursor', 'default')
            .on('mouseenter', function (event, d) {
                d3.select(this)
                    .transition().duration(120)
                    .attr('opacity', 0.9)
                    .attr('stroke-width', 3)
                    .attr('stroke', '#14b8a6')
                    .attr('marker-end', 'url(#arrowhead-glow)')
                    .style('filter', 'drop-shadow(0 0 4px rgba(20, 184, 166, 0.8))');
            })
            .on('mouseleave', function () {
                d3.select(this)
                    .transition().duration(120)
                    .attr('opacity', 0.78)
                    .attr('stroke-width', 2)
                    .attr('stroke', '#c4c4c4')
                    .attr('marker-end', 'url(#arrowhead)')
                    .style('filter', 'none');
            });

        // ── Nodes ───────────────────────────────────────────────────────────
        const nodeLayer = g.append('g').attr('class', 'nodes');
        function normalizeCourseCode(s) {
            return (s || "")
              .toUpperCase()
              .replace(/\s+/g, " ")
              .replace(/^([A-Z]{2,5})\s*(\d)/, "$1 $2") // "MATH154" -> "MATH 154"
              .trim();
          }
          
          function getCourseStatus(labelOrCode) {
            const code = normalizeCourseCode(labelOrCode);
            if (completedCourses.has(code)) return "completed";
            if (inProgressCourses.has(code)) return "inProgress";
            return "none";
          }

        const nodeGroups = nodeLayer.selectAll('g.node')
            .data(layerData.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
            .style('cursor', (d) => d.isExpandable ? 'pointer' : 'default')
            .on('click', (event, d) => {
                // OR "+N" expander: toggle locally
                if (d.isOrMore && d.orGroupId) {
                  setExpandedOrGroups((prev) => {
                    const next = new Set(prev);
                    if (next.has(d.orGroupId)) next.delete(d.orGroupId);
                    else next.add(d.orGroupId);
                    return next;
                  });
                  return;
                }
              
                // existing behavior for course expand
                if (d.isExpandable && onNodeExpandRef.current) {
                  onNodeExpandRef.current(d.label);
                }
              });
        

        // Measure text widths for sizing
        const tempSvg = d3.select('body').append('svg').style('visibility', 'hidden');
        const textWidths = {};
        layerData.nodes.forEach((n) => {
            const t = tempSvg.append('text')
                .attr('font-family', 'Inter, sans-serif')
                .attr('font-size', 13)
                .attr('font-weight', 600)
                .text(n.label);
            textWidths[n.id] = t.node().getComputedTextLength();
            t.remove();
        });
        tempSvg.remove();

        const paddingX = 12, paddingY = 8;

        // Drop shadow filter
        const filter = svg.select('defs').append('filter')
            .attr('id', 'node-shadow')
            .attr('x', '-20%').attr('y', '-20%')
            .attr('width', '140%').attr('height', '140%');
        filter.append('feDropShadow')
            .attr('dx', 0).attr('dy', 1)
            .attr('stdDeviation', 2)
            .attr('flood-color', 'rgba(0,0,0,0.08)');

        // Node background rect
        nodeGroups.append('rect')
            .attr('x', (d) => -(textWidths[d.id] / 2 + paddingX))
            .attr('y', -(13 / 2 + paddingY))
            .attr('width', (d) => textWidths[d.id] + paddingX * 2)
            .attr('height', 13 + paddingY * 2)
            .attr('rx', 7)
            .attr('ry', 7)
            .attr("fill", (d) => {
                const code = d.label;   // <-- use label as fallback
                const status = getCourseStatus(code);
              
                if (status === "completed") return "#86efac";   // green
                if (status === "inProgress") return "#fde68a";  // yellow
                return "#ffffff";
              })
            .attr('stroke', (d) => {
                if (d.depth === 0) return ROOT_COLOR;
                return d.isExpandable ? EXPANDABLE_COLOR : NORMAL_COLOR;
            })
            .attr('stroke-width', 2)
            .attr('filter', 'url(#node-shadow)');

        // Node label text
        nodeGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', 13)
            .attr('font-weight', 600)
            .attr('fill', (d) => {
                if (d.depth === 0) return ROOT_COLOR;
                return d.isExpandable ? EXPANDABLE_COLOR : NORMAL_COLOR;
            })
            .text((d) => d.label);

        // Expandable "+" badge (top-right corner)
        nodeGroups.filter((d) => d.isExpandable && !d.isOrMore)
            .append('circle')
            .attr('cx', (d) => textWidths[d.id] / 2 + paddingX)
            .attr('cy', -(13 / 2 + paddingY))
            .attr('r', 7)
            .attr('fill', EXPANDABLE_COLOR);

            nodeGroups.filter((d) => d.isExpandable && !d.isOrMore)
            .append('text')
            .attr('x', (d) => textWidths[d.id] / 2 + paddingX)
            .attr('y', -(13 / 2 + paddingY))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', 10)
            .attr('font-weight', 'bold')
            .attr('fill', '#ffffff')
            .text('+');

        // Special-requirement "!" badge (top-left corner, yellow)
        const specialNodes = nodeGroups.filter((d) => {
            const info = getCourseInfo(d.label);
            return info?.specialReq?.length > 0;
        });

        specialNodes
            .append('circle')
            .attr('cx', (d) => -(textWidths[d.id] / 2 + paddingX))
            .attr('cy', -(13 / 2 + paddingY))
            .attr('r', 7)
            .attr('fill', '#f59e0b');   // amber-400

        specialNodes
            .append('text')
            .attr('x', (d) => -(textWidths[d.id] / 2 + paddingX))
            .attr('y', -(13 / 2 + paddingY))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', 10)
            .attr('font-weight', 'bold')
            .attr('fill', '#ffffff')
            .text('!');

        // ── Hover: stroke effect + tooltip ─────────────────────────────────
        nodeGroups
            .on('mouseenter', function (event, d) {
                // Stroke highlight
                if (d.isExpandable) {
                    d3.select(this).select('rect')
                        .transition().duration(150)
                        .attr('stroke-width', 3)
                        .attr('stroke', EXPANDABLE_COLOR);
                }

                edgeSel
                    .transition().duration(150)
                    .attr('opacity', (e) =>
                        e.source === d.id || e.target === d.id ? 0.9 : 0.35
                    )
                    .attr('stroke-width', (e) =>
                        e.source === d.id || e.target === d.id ? 3 : 2
                    )
                    .attr('stroke', (e) =>
                        e.source === d.id || e.target === d.id ? '#14b8a6' : '#c4c4c4'
                    )
                    .attr('marker-end', (e) =>
                        e.source === d.id || e.target === d.id ? 'url(#arrowhead-glow)' : 'url(#arrowhead)'
                    )
                    .style('filter', (e) =>
                        e.source === d.id || e.target === d.id ? 'drop-shadow(0 0 4px rgba(20, 184, 166, 0.8))' : 'none'
                    );

                // Build tooltip content
                const info = getCourseInfo(d.label);
                const title = info?.title || '';
                const specialReq = info?.specialReq || '';

                // Always show course code + title; skip tooltip if nothing useful
                const notes = info?.notes || [];
                if (!title && notes.length === 0) return;

                // Severity → visual style
                const SEVERITY_STYLE = {
                    high: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '🚫' },
                    medium: { bg: '#ffedd5', border: '#f97316', text: '#9a3412', icon: '⚠️' },
                    low: { bg: '#fef9c3', border: '#eab308', text: '#854d0e', icon: '📋' },
                    info: { bg: '#e0f2fe', border: '#38bdf8', text: '#075985', icon: 'ℹ️' },
                };

                let html = `<strong style="font-size:14px;color:#1e1e1e">${d.label}</strong>`;
                if (title) {
                    html += `<div style="color:#555;margin-top:3px">${title}</div>`;
                }
                if (notes.length > 0) {
                    html += `<div style="margin-top:7px;display:flex;flex-direction:column;gap:5px">`;
                    notes.forEach(({ text, severity }) => {
                        const s = SEVERITY_STYLE[severity] || SEVERITY_STYLE.info;
                        html += `<div style="padding:5px 8px;background:${s.bg};border-radius:5px;border:1px solid ${s.border};color:${s.text};font-size:12px">${s.icon} ${text}</div>`;
                    });
                    html += `</div>`;
                }

                // Set HTML first so we can measure the rendered size
                tooltip.html(html).style('opacity', 0).style('left', '0px').style('top', '0px');

                const containerW = container.offsetWidth;
                const containerH = container.offsetHeight;
                const containerRect = container.getBoundingClientRect();
                const mouseX = event.clientX - containerRect.left;
                const mouseY = event.clientY - containerRect.top;

                const tipNode = tooltip.node();
                const tipW = tipNode.offsetWidth;
                const tipH = tipNode.offsetHeight;

                const margin = 8;
                // Prefer right of cursor; flip left if it would overflow
                let tipX = mouseX + 14;
                if (tipX + tipW + margin > containerW) tipX = mouseX - tipW - 14;
                tipX = Math.max(margin, tipX);

                // Prefer above cursor; flip down if it would overflow top
                let tipY = mouseY - 10;
                if (tipY + tipH + margin > containerH) tipY = containerH - tipH - margin;
                if (tipY < margin) tipY = margin;

                tooltip
                    .style('left', `${tipX}px`)
                    .style('top', `${tipY}px`)
                    .transition().duration(120)
                    .style('opacity', 1);
            })
            .on('mousemove', function (event) {
                const containerW = container.offsetWidth;
                const containerH = container.offsetHeight;
                const containerRect = container.getBoundingClientRect();
                const mouseX = event.clientX - containerRect.left;
                const mouseY = event.clientY - containerRect.top;
                const tipNode = tooltip.node();
                const tipW = tipNode.offsetWidth;
                const tipH = tipNode.offsetHeight;
                const margin = 8;
                let tipX = mouseX + 14;
                if (tipX + tipW + margin > containerW) tipX = mouseX - tipW - 14;
                tipX = Math.max(margin, tipX);
                let tipY = mouseY - 10;
                if (tipY + tipH + margin > containerH) tipY = containerH - tipH - margin;
                if (tipY < margin) tipY = margin;
                tooltip.style('left', `${tipX}px`).style('top', `${tipY}px`);
            })
            .on('mouseleave', function (event, d) {
                // Restore stroke
                d3.select(this).select('rect')
                    .transition().duration(150)
                    .attr('stroke-width', 2)
                    .attr('stroke', () => {
                        if (d.depth === 0) return ROOT_COLOR;
                        return d.isExpandable ? EXPANDABLE_COLOR : NORMAL_COLOR;
                    });
                edgeSel
                    .transition().duration(150)
                    .attr('opacity', 0.78)
                    .attr('stroke-width', 2)
                    .attr('stroke', '#c4c4c4')
                    .attr('marker-end', 'url(#arrowhead)')
                    .style('filter', 'none');

                // Hide tooltip
                tooltip.transition().duration(100).style('opacity', 0);
            });

        // Cleanup
        return () => {
            d3.select(container).select('svg').remove();
            d3.select(container).select('.node-tooltip').remove();
        };
    }, [
        rootAstNode,
        courseInfoReady,
        containerSize,
        expandedOrGroups,
        completedCourses,
        inProgressCourses,
      ]);
    
    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                minHeight: 480,
                position: 'relative',
                background: '#FAF6F4',
                border: '2px solid #1e1e1e',
                borderRadius: '0 0 12px 12px',
                overflow: 'hidden',
            }}
        />
    );
};
