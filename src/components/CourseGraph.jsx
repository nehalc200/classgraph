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
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .style("background", "#fafafa");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Convert the AST data into a hierarchical structure for D3
    // Only show first 10 courses to keep the graph manageable
    const convertToHierarchy = (courses) => {
      return {
        name: "MATH Courses",
        children: courses.slice(0, 10).map(course => convertNodeToHierarchy(course))
      };
    };

    const convertNodeToHierarchy = (node) => {
      const result = {
        name: node.code,
        type: node.type
      };

      if (node.children && node.children.length > 0) {
        // Limit depth to avoid overcrowding
        result.children = node.children.slice(0, 5).map(child => convertNodeToHierarchy(child));
      }

      return result;
    };

    const hierarchyData = convertToHierarchy(data);
    
    // Create tree layout with more space
    const treeLayout = d3.tree()
      .size([containerHeight - margin.top - margin.bottom, containerWidth - margin.left - margin.right - 150])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    const root = d3.hierarchy(hierarchyData);
    treeLayout(root);

    // Create links (connections between nodes)
    const link = g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('g')
      .attr('class', 'link');

    link.append('path')
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x))
      .style('fill', 'none')
      .style('stroke', d => {
        if (d.target.data.name === "OR") return '#ff9800';
        return '#999';
      })
      .style('stroke-width', 1.5)
      .style('opacity', 0.6);

    // Create nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // Add circles for each node
    node.append('circle')
      .attr('r', d => {
        if (d.data.name === "MATH Courses") return 8;
        if (d.data.name === "OR") return 5;
        return 7;
      })
      .style('fill', d => {
        if (d.data.name === "MATH Courses") return '#673AB7';
        if (d.data.name === "OR") return '#ff9800';
        if (d.data.type === 'ROOT') return '#4CAF50';
        return '#2196F3';
      })
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function() {
        d3.select(this).transition().duration(200).attr('r', d => {
          if (d.data.name === "MATH Courses") return 10;
          if (d.data.name === "OR") return 7;
          return 9;
        });
      })
      .on('mouseleave', function() {
        d3.select(this).transition().duration(200).attr('r', d => {
          if (d.data.name === "MATH Courses") return 8;
          if (d.data.name === "OR") return 5;
          return 7;
        });
      });

    // Add text labels
    node.append('text')
      .attr('dy', '.31em')
      .attr('x', d => d.children ? -12 : 12)
      .style('text-anchor', d => d.children ? 'end' : 'start')
      .style('font-size', d => {
        if (d.data.name === "MATH Courses") return '14px';
        if (d.data.name === "OR") return '10px';
        return '12px';
      })
      .style('font-family', 'Inter, sans-serif')
      .style('font-weight', d => d.data.type === 'ROOT' ? '600' : '400')
      .style('fill', '#333')
      .text(d => d.data.name);

    // Add zoom and pan behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', `translate(${margin.left},${margin.top}) ${event.transform}`);
      });

    svg.call(zoom);

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(20, 20)`);

    const legendData = [
      { color: '#673AB7', label: 'Root', size: 8 },
      { color: '#4CAF50', label: 'Course (Root)', size: 7 },
      { color: '#2196F3', label: 'Prerequisite', size: 7 },
      { color: '#ff9800', label: 'OR operator', size: 5 }
    ];

    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendItem.append('circle')
        .attr('r', item.size)
        .style('fill', item.color)
        .style('stroke', '#fff')
        .style('stroke-width', 2);

      legendItem.append('text')
        .attr('x', 15)
        .attr('dy', '.35em')
        .style('font-size', '11px')
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
