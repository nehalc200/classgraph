import React, { useEffect, useRef } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { EdgeArrowProgram, NodePointProgram } from 'sigma/rendering';
import { extractLayers } from '../utils/astGraphUtils';

// Colour palette
const ROOT_COLOR = '#1e1e1e';
const NORMAL_COLOR = '#555555';
const EXPANDABLE_COLOR = '#6366f1';

export const SigmaGraph = ({ rootAstNode, onNodeExpand }) => {
    const containerRef = useRef(null);
    const sigmaRef = useRef(null);

    // Stable callback ref
    const onNodeExpandRef = useRef(onNodeExpand);
    onNodeExpandRef.current = onNodeExpand;

    useEffect(() => {
        if (!rootAstNode || !containerRef.current) {
            if (sigmaRef.current) {
                sigmaRef.current.kill();
                sigmaRef.current = null;
            }
            return;
        }

        // Tear down previous
        if (sigmaRef.current) {
            sigmaRef.current.kill();
            sigmaRef.current = null;
        }

        // Extract 3-layer data
        const layerData = extractLayers(rootAstNode, 3);
        const graph = new Graph();

        // Add nodes
        layerData.nodes.forEach((n) => {
            const isRoot = n.depth === 0;
            graph.addNode(n.id, {
                x: n.x,
                y: n.y,
                size: 15,
                label: n.label,
                // Use background color so the WebGL circle is invisible;
                // the custom label drawing handles all visuals.
                color: 'rgba(0,0,0,0)',
                isExpandable: n.isExpandable,
                depth: n.depth,
                courseCode: n.label,
                // Store the display color for the label renderer
                borderColor: isRoot ? ROOT_COLOR : n.isExpandable ? EXPANDABLE_COLOR : NORMAL_COLOR,
            });
        });

        // Add edges
        layerData.edges.forEach((e) => {
            try {
                graph.addEdge(e.source, e.target, {
                    size: 2,
                    color: '#c4c4c4',
                    type: 'arrow',
                });
            } catch (_) { /* dup */ }
        });

        // Custom label
        function drawNodeLabel(context, data, settings) {
            if (!data.label) return;
            const fontSize = settings.labelSize || 13;
            context.font = `600 ${fontSize}px Inter, sans-serif`;

            const label = data.label;
            const tw = context.measureText(label).width;
            const px = 10, py = 6;
            const bw = tw + px * 2, bh = fontSize + py * 2;
            const bx = data.x - bw / 2, by = data.y - bh / 2;
            const cr = 7;

            context.save();
            context.shadowColor = 'rgba(0,0,0,0.08)';
            context.shadowBlur = 4;
            context.shadowOffsetY = 1;
            roundedRect(context, bx, by, bw, bh, cr);
            context.fillStyle = '#ffffff';
            context.fill();
            context.restore();

            context.strokeStyle = data.borderColor || NORMAL_COLOR;
            context.lineWidth = 2;
            context.stroke();

            if (data.isExpandable) {
                const br = 7;
                const cx = bx + bw, cy = by;
                context.beginPath();
                context.arc(cx, cy, br, 0, Math.PI * 2);
                context.fillStyle = EXPANDABLE_COLOR;
                context.fill();
                context.fillStyle = '#fff';
                context.font = 'bold 10px Inter, sans-serif';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText('+', cx, cy);
            }

            context.fillStyle = data.borderColor || NORMAL_COLOR;
            context.font = `600 ${fontSize}px Inter, sans-serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(label, data.x, data.y);
        }

        // No-op hover — we don't want the default circle/highlight
        function drawNodeHover() { }

        // Create Sigma
        const sigma = new Sigma(graph, containerRef.current, {
            allowInvalidContainer: true,
            renderLabels: true,
            renderEdgeLabels: false,
            defaultEdgeColor: '#c4c4c4',
            defaultEdgeType: 'arrow',
            labelFont: 'Inter, sans-serif',
            labelSize: 13,
            labelWeight: '600',
            labelColor: { color: '#333' },
            labelDensity: 10,
            labelRenderedSizeThreshold: 0,
            stagePadding: 80,
            defaultDrawNodeLabel: drawNodeLabel,
            defaultDrawNodeHover: drawNodeHover,
            edgeProgramClasses: {
                arrow: EdgeArrowProgram,
            },
            defaultNodeType: 'point',
            nodeProgramClasses: {
                point: NodePointProgram,
            },
            nodeReducer: (node, data) => {
                const attrs = graph.getNodeAttributes(node);
                return {
                    ...data,
                    isExpandable: attrs.isExpandable,
                    courseCode: attrs.courseCode,
                    depth: attrs.depth,
                    borderColor: attrs.borderColor,
                };
            },
        });

        sigmaRef.current = sigma;

        // ── OR-group boxes: draw on a dedicated canvas layer ──────────────────
        // We manually create a canvas and append it to the container, positioned
        // behind the Sigma canvases for labels/hovers but above the edges.
        const orCanvas = document.createElement('canvas');
        orCanvas.style.position = 'absolute';
        orCanvas.style.top = '0';
        orCanvas.style.left = '0';
        orCanvas.style.pointerEvents = 'none';
        orCanvas.style.zIndex = '1';  // above edges (z=0), below labels
        containerRef.current.insertBefore(orCanvas, containerRef.current.firstChild);

        function drawOrBoxes() {
            if (!containerRef.current) return;
            const w = containerRef.current.offsetWidth;
            const h = containerRef.current.offsetHeight;
            const ratio = window.devicePixelRatio || 1;
            orCanvas.width = w * ratio;
            orCanvas.height = h * ratio;
            orCanvas.style.width = w + 'px';
            orCanvas.style.height = h + 'px';

            const ctx = orCanvas.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.clearRect(0, 0, w, h);

            layerData.orGroups.forEach((group) => {
                const positions = group.memberNodeIds
                    .map((nid) => {
                        try {
                            const a = graph.getNodeAttributes(nid);
                            return sigma.graphToViewport({ x: a.x, y: a.y });
                        } catch (_) {
                            return null;
                        }
                    })
                    .filter(Boolean);

                if (positions.length === 0) return;

                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                positions.forEach((p) => {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                });

                const padX = 55;
                const padY = 35;
                const rx = minX - padX;
                const ry = minY - padY;
                const rw = Math.max(maxX - minX + padX * 2, 80);
                const rh = Math.max(maxY - minY + padY * 2, 55);
                const cr = 10;

                roundedRect(ctx, rx, ry, rw, rh, cr);
                ctx.fillStyle = group.fill;
                ctx.fill();
                ctx.strokeStyle = group.border;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                // "OR" badge
                ctx.fillStyle = group.border;
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText('OR', rx + 8, ry + 6);
            });
        }

        sigma.on('afterRender', drawOrBoxes);
        // Also draw once initially after a tick
        requestAnimationFrame(drawOrBoxes);

        // Click handler
        sigma.on('clickNode', ({ node }) => {
            const attrs = graph.getNodeAttributes(node);
            if (attrs.isExpandable && onNodeExpandRef.current) {
                onNodeExpandRef.current(attrs.courseCode);
            }
        });

        return () => {
            if (sigmaRef.current) {
                sigmaRef.current.kill();
                sigmaRef.current = null;
            }
            // Remove OR canvas
            if (orCanvas.parentNode) {
                orCanvas.parentNode.removeChild(orCanvas);
            }
        };
    }, [rootAstNode]);

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

// ── Helper ───────────────────────────────────────────────────────────────────
function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
