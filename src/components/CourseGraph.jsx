
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { transformDataToGraph } from '../utils/graphUtils';

export const CourseGraph = ({ courseCode, allData }) => {
    const svgRef = useRef(null);
    const [graphData, setGraphData] = useState(null);

    useEffect(() => {
        if (courseCode && allData) {
            const data = transformDataToGraph(courseCode, allData);
            setGraphData(data);
        }
    }, [courseCode, allData]);

    useEffect(() => {
        if (!graphData || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const width = svgRef.current.clientWidth || 800;
        const height = svgRef.current.clientHeight || 600;

        const gObj = svg.append("g");

        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                gObj.attr("transform", event.transform);
            });
        svg.call(zoom);

        // Define Arrow Markers
        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 38) // Position at edge of circle (r=30) + buffer
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#999");

        // Prepare Data
        const nodes = graphData.nodes.map(d => ({ ...d }));
        const links = graphData.links.map(d => ({ ...d }));

        // Simulation Setup
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(120))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(60));

        // Render Group Boxes (Background)
        const orGroups = nodes.filter(d => d.type === 'OR');
        const groupBox = gObj.append("g")
            .selectAll("rect")
            .data(orGroups)
            .enter().append("rect")
            .style("fill", "rgba(59, 130, 246, 0.05)")
            .style("stroke", "#3b82f6")
            .style("stroke-width", 2)
            .style("stroke-dasharray", "5,5")
            .attr("rx", 15)
            .attr("ry", 15);

        // Render Links
        const link = gObj.append("g")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("stroke", "#999")
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrowhead)"); // Add Arrowhead

        // Render Nodes
        const node = gObj.append("g")
            .selectAll("g")
            .data(nodes)
            .enter().append("g")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Course Nodes
        node.filter(d => d.type === 'course')
            .append("circle")
            .attr("r", 30)
            .attr("fill", d => d.id === courseCode ? "#fee2e2" : "#fff") // Target: Light Red, Others: White
            .attr("stroke", d => d.id === courseCode ? "#ef4444" : "#333") // Target: Red Stroke
            .attr("stroke-width", d => d.id === courseCode ? 3 : 2)
            .style("cursor", "pointer");

        node.filter(d => d.type === 'course')
            .append("text")
            .attr("dy", 4)
            .attr("text-anchor", "middle")
            .text(d => d.name)
            .style("font-family", "Inter, sans-serif")
            .style("font-weight", "bold")
            .style("font-size", "10px")
            .style("pointer-events", "none");

        // OR Nodes (Invisible Hubs)
        node.filter(d => d.type === 'OR')
            .append("circle")
            .attr("r", 5)
            .attr("fill", "transparent")
            .attr("stroke", "none");

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x},${d.y})`);

            groupBox.each(function (d) {
                if (!d.children || d.children.length === 0) return;

                let minX = d.x, maxX = d.x, minY = d.y, maxY = d.y;

                d.children.forEach(childId => {
                    const childNode = nodes.find(n => n.id === childId);
                    if (childNode) {
                        if (childNode.x < minX) minX = childNode.x;
                        if (childNode.x > maxX) maxX = childNode.x;
                        if (childNode.y < minY) minY = childNode.y;
                        if (childNode.y > maxY) maxY = childNode.y;
                    }
                });

                const padding = 35;
                d3.select(this)
                    .attr("x", minX - padding)
                    .attr("y", minY - padding)
                    .attr("width", (maxX - minX) + (padding * 2))
                    .attr("height", (maxY - minY) + (padding * 2));
            });
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

    }, [graphData]);

    return (
        <div className="w-full h-full border border-gray-200 rounded-lg overflow-hidden bg-white relative">
            <svg ref={svgRef} className="w-full h-full block cursor-move" />
            {!graphData && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    {courseCode ? "Loading or course not found..." : "Select a course"}
                </div>
            )}
        </div>
    );
};
