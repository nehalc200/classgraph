import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export const CourseGraph = ({ data }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const containerWidth = containerRef.current?.clientWidth || 500;
    const containerHeight = containerRef.current?.clientHeight || 600;
    const margin = { top: 60, right: 40, bottom: 40, left: 40 };

    // Use a large virtual canvas for better spacing
    const virtualWidth = 2000;
    const virtualHeight = 2000;

    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .attr("viewBox", `0 0 ${virtualWidth} ${virtualHeight}`)
      .style("background", "#fafafa");

    const g = svg.append("g")
      .attr("transform", `translate(${virtualWidth / 2},${100})`);

    // Convert the AST data into a hierarchical structure for D3
    // Only show first 3 courses to keep the graph clean
    const convertToHierarchy = (courses) => {
      return {
        name: "MATH Courses",
        children: courses.slice(0, 3).map(course => convertNodeToHierarchy(course, 0))
      };
    };

    const convertNodeToHierarchy = (node, depth) => {
      const result = {
        name: node.code,
        type: node.type
      };

      // Special handling for OR nodes - always include their children to avoid OR leaf nodes
      const isOrNode = node.code === "OR";
      const shouldIncludeChildren = (depth < 3) || isOrNode;

      if (node.children && node.children.length > 0 && shouldIncludeChildren) {
        // For OR nodes, include all children; for other nodes, limit to 3
        const childLimit = isOrNode ? node.children.length : 3;
        result.children = node.children.slice(0, childLimit).map(child => convertNodeToHierarchy(child, depth + 1));
      }

      return result;
    };

    const hierarchyData = convertToHierarchy(data);
    
    // Create vertical tree layout (top to bottom) with much more space
    const treeLayout = d3.tree()
      .size([virtualWidth - 400, virtualHeight - 300])
      .separation((a, b) => (a.parent === b.parent ? 2.5 : 3));

    const root = d3.hierarchy(hierarchyData);
    treeLayout(root);

    // Create links (connections between nodes)
    const link = g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('g')
      .attr('class', 'link');

    link.append('path')
      .attr('d', d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y))
      .style('fill', 'none')
      .style('stroke', d => {
        if (d.target.data.name === "OR") return '#ff9800';
        return '#555';
      })
      .style('stroke-width', 3)
      .style('opacity', 0.7);

    // Create nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    // Add circles for each node
    node.append('circle')
      .attr('r', d => {
        if (d.data.name === "MATH Courses") return 55;
        if (d.data.name === "OR") return 28;
        return 45;
      })
      .style('fill', d => {
        if (d.data.name === "MATH Courses") return '#673AB7';
        if (d.data.name === "OR") return '#ff9800';
        if (d.data.type === 'ROOT') return '#4CAF50';
        return '#2196F3';
      })
      .style('stroke', '#fff')
      .style('stroke-width', 2.5)
      .style('cursor', 'pointer');

    // Add text labels inside circles
    node.append('text')
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', d => {
        if (d.data.name === "MATH Courses") return '16px';
        if (d.data.name === "OR") return '16px';
        // Smaller font for longer course names
        const nameLength = d.data.name.length;
        if (nameLength > 8) return '13px';
        return '14px';
      })
      .style('font-family', 'Inter, sans-serif')
      .style('font-weight', d => d.data.type === 'ROOT' ? '600' : '500')
      .style('fill', '#fff')
      .style('pointer-events', 'none')
      .text(d => d.data.name);

    // Add zoom and pan behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => {
        g.attr('transform', `translate(${virtualWidth / 2 + event.transform.x},${100 + event.transform.y}) scale(${event.transform.k})`);
      });

    svg.call(zoom);

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(50, 50)`);

    const legendData = [
      { color: '#673AB7', label: 'Root', size: 15 },
      { color: '#4CAF50', label: 'Course (Root)', size: 13 },
      { color: '#2196F3', label: 'Prerequisite', size: 13 },
      { color: '#ff9800', label: 'OR operator', size: 10 }
    ];

    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 35})`);

      legendItem.append('circle')
        .attr('r', item.size)
        .style('fill', item.color)
        .style('stroke', '#fff')
        .style('stroke-width', 2.5);

      legendItem.append('text')
        .attr('x', 25)
        .attr('dy', '.35em')
        .style('font-size', '14px')
        .style('font-family', 'Inter, sans-serif')
        .style('fill', '#333')
        .text(item.label);
    });

  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};
