import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { extractLayers } from '../utils/astGraphUtils';
import { loadCourseInfo, getCourseInfo } from '../utils/courseInfo';

// Colour palette (matching the Sigma version)
const ROOT_COLOR = '#1e1e1e';
const NORMAL_COLOR = '#555555';
const EXPANDABLE_COLOR = '#6366f1';

export const D3Graph = ({ rootAstNode, onNodeExpand }) => {
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    const [courseInfoReady, setCourseInfoReady] = useState(false);

    // Stable callback ref
    const onNodeExpandRef = useRef(onNodeExpand);
    onNodeExpandRef.current = onNodeExpand;

    // Load course info metadata once
    useEffect(() => {
        loadCourseInfo().then(() => setCourseInfoReady(true));
    }, []);

    useEffect(() => {
        if (!rootAstNode || !containerRef.current) return;

        // Clear previous render
        d3.select(containerRef.current).select('svg').remove();
        // Remove any stale tooltip
        d3.select(containerRef.current).select('.node-tooltip').remove();

        // Extract 3-layer tree data
        const layerData = extractLayers(rootAstNode, 3);

        const container = containerRef.current;
        const width = container.offsetWidth;
        const height = container.offsetHeight || 500;

        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
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

        // ── Arrow marker definition ─────────────────────────────────────────
        svg.append('defs').append('marker')
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

            const padX = 60, padY = 35;
            const rx = minGX - padX;
            const ry = minGY - padY;
            const rw = Math.max(maxGX - minGX + padX * 2, 90);
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
                .attr('x', rx + 10)
                .attr('y', ry + 16)
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
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');

        // ── Nodes ───────────────────────────────────────────────────────────
        const nodeLayer = g.append('g').attr('class', 'nodes');

        const nodeGroups = nodeLayer.selectAll('g.node')
            .data(layerData.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
            .style('cursor', (d) => d.isExpandable ? 'pointer' : 'default')
            .on('click', (event, d) => {
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
            .attr('fill', '#ffffff')
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
        nodeGroups.filter((d) => d.isExpandable)
            .append('circle')
            .attr('cx', (d) => textWidths[d.id] / 2 + paddingX)
            .attr('cy', -(13 / 2 + paddingY))
            .attr('r', 7)
            .attr('fill', EXPANDABLE_COLOR);

        nodeGroups.filter((d) => d.isExpandable)
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

                // Build tooltip content
                const info = getCourseInfo(d.label);
                const title = info?.title || '';
                const specialReq = info?.specialReq || '';

                // Always show course code + title; skip tooltip if nothing useful
                if (!title && !specialReq) return;

                let html = `<strong style="font-size:14px;color:#1e1e1e">${d.label}</strong>`;
                if (title) {
                    html += `<div style="color:#555;margin-top:3px">${title}</div>`;
                }
                if (specialReq) {
                    html += `<div style="margin-top:7px;padding:6px 8px;background:#fef3c7;border-radius:5px;border:1px solid #f59e0b;color:#92400e;font-size:12px">
                        ⚠️ <strong>Special requirement:</strong><br/>${specialReq}
                    </div>`;
                }

                // Position: offset from the node's screen position
                const containerRect = container.getBoundingClientRect();
                const mouseX = event.clientX - containerRect.left;
                const mouseY = event.clientY - containerRect.top;

                // Nudge right/left depending on available space
                const tipX = mouseX + 14;
                const tipY = mouseY - 10;

                tooltip
                    .html(html)
                    .style('left', `${tipX}px`)
                    .style('top', `${tipY}px`)
                    .transition().duration(120)
                    .style('opacity', 1);
            })
            .on('mousemove', function (event) {
                const containerRect = container.getBoundingClientRect();
                const mouseX = event.clientX - containerRect.left;
                const mouseY = event.clientY - containerRect.top;
                tooltip
                    .style('left', `${mouseX + 14}px`)
                    .style('top', `${mouseY - 10}px`);
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

                // Hide tooltip
                tooltip.transition().duration(100).style('opacity', 0);
            });

        // Cleanup
        return () => {
            d3.select(container).select('svg').remove();
            d3.select(container).select('.node-tooltip').remove();
        };
    }, [rootAstNode, courseInfoReady]);

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
