
import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { VectorData } from '../types';
import { cosineSimilarity } from '../utils/math';

interface Props {
  data: VectorData[];
  width?: number;
  height?: number;
}

const PositionalEncodingChart: React.FC<Props> = ({ data, width = 800, height = 500 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<VectorData | null>(null);
  
  // Layer visibility controls
  const [showBase, setShowBase] = useState(true);
  const [showPositional, setShowPositional] = useState(true);
  const [showAttention, setShowAttention] = useState(true);

  // Filter data to group the triplet: Base -> Positional -> Attention
  const chains = useMemo(() => {
    const result: { base: VectorData; pos: VectorData; attn: VectorData; token: string; pIdx: number; sourceId: 'A'|'B' }[] = [];
    const bases = data.filter(d => d.type === 'base');
    
    bases.forEach(base => {
      const pos = data.find(d => d.type === 'positional' && d.position === base.position && d.token === base.token && d.sourceId === base.sourceId);
      const attn = data.find(d => d.type === 'attention' && d.position === base.position && d.token === base.token && d.sourceId === base.sourceId);
      
      if (pos && attn) {
        result.push({ base, pos, attn, token: base.token, pIdx: base.position, sourceId: base.sourceId });
      }
    });
    return result;
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    const margin = { top: 40, right: 40, bottom: 40, left: 40 }; // Adjusted margins
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const xExtent = d3.extent(data, d => d.coords2D[0]) as [number, number];
    const yExtent = d3.extent(data, d => d.coords2D[1]) as [number, number];
    
    const xRange = xExtent[1] - xExtent[0] || 1;
    const yRange = yExtent[1] - yExtent[0] || 1;
    const paddingFactor = 0.15; // Slightly reduced padding

    const xScale = d3.scaleLinear()
      .domain([xExtent[0] - xRange * paddingFactor, xExtent[1] + xRange * paddingFactor])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - yRange * paddingFactor, yExtent[1] + yRange * paddingFactor])
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Definitions for markers
    const defs = svg.append("defs");
    
    // Arrow for Step 1 (Base -> Pos)
    defs.append("marker")
      .attr("id", "arrow-pos-A")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8).attr("refY", 0).attr("markerWidth", 4).attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#6366F1"); // Indigo

    defs.append("marker")
      .attr("id", "arrow-pos-B")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8).attr("refY", 0).attr("markerWidth", 4).attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#10B981"); // Emerald

    // Arrow for Step 2 (Pos -> Attn)
    defs.append("marker")
      .attr("id", "arrow-attn")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 9).attr("refY", 0).attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#F59E0B"); // Amber

    // --- VISUAL OFFSET LOGIC (JITTER) ---
    // Shift Phrase A slightly Left-Up, Phrase B slightly Right-Down
    // This prevents identical words from stacking on top of each other
    const getX = (val: number, source: string) => xScale(val) + (source === 'A' ? -8 : 8);
    const getY = (val: number, source: string) => yScale(val) + (source === 'A' ? -8 : 8);


    // --- 1. DRAW BASE LAYER (Squares) ---
    if (showBase) {
        // Labels for Base
        g.selectAll(".label-base")
            .data(chains)
            .enter()
            .append("text")
            .text(d => d.token)
            .attr("x", d => getX(d.base.coords2D[0], d.sourceId))
            .attr("y", d => getY(d.base.coords2D[1], d.sourceId) - 12)
            .attr("text-anchor", "middle")
            .attr("fill", d => d.sourceId === 'A' ? "#818cf8" : "#34d399") // Match Phrase Color (Light)
            .attr("font-size", "10px")
            .attr("font-weight", "bold")
            .attr("opacity", 0.9);

        // Square Shapes - NOW DISTINCTLY COLORED
        g.selectAll(".node-base")
            .data(chains)
            .enter()
            .append("rect")
            .attr("x", d => getX(d.base.coords2D[0], d.sourceId) - 6) // Centered (12px width)
            .attr("y", d => getY(d.base.coords2D[1], d.sourceId) - 6)
            .attr("width", 12) // Larger
            .attr("height", 12)
            // Phrase A: Dark Indigo Fill / Light Indigo Border
            // Phrase B: Dark Emerald Fill / Light Emerald Border
            .attr("fill", d => d.sourceId === 'A' ? "#312e81" : "#064e3b") 
            .attr("stroke", d => d.sourceId === 'A' ? "#818cf8" : "#34d399")
            .attr("stroke-width", 2)
            .attr("opacity", hoveredNode ? 0.3 : 0.9);
    }

    // --- 2. DRAW CONNECTORS STEP 1 (Base -> Pos) ---
    if (showBase && showPositional) {
        g.selectAll(".line-step1")
            .data(chains)
            .enter()
            .append("line")
            .attr("x1", d => getX(d.base.coords2D[0], d.sourceId))
            .attr("y1", d => getY(d.base.coords2D[1], d.sourceId))
            .attr("x2", d => getX(d.pos.coords2D[0], d.sourceId))
            .attr("y2", d => getY(d.pos.coords2D[1], d.sourceId))
            .attr("stroke", d => d.sourceId === 'A' ? "#6366F1" : "#10B981")
            .attr("stroke-width", 1.5) // Slightly thicker
            .attr("stroke-dasharray", "3 2")
            .attr("opacity", hoveredNode ? 0.1 : 0.5)
            .attr("marker-end", d => d.sourceId === 'A' ? "url(#arrow-pos-A)" : "url(#arrow-pos-B)");
    }

    // --- 3. DRAW POSITIONAL NODES (Small dots) ---
    if (showPositional) {
        g.selectAll(".node-pos")
            .data(chains)
            .enter()
            .append("circle")
            .attr("cx", d => getX(d.pos.coords2D[0], d.sourceId))
            .attr("cy", d => getY(d.pos.coords2D[1], d.sourceId))
            .attr("r", 3)
            .attr("fill", d => d.sourceId === 'A' ? "#6366F1" : "#10B981")
            .attr("opacity", hoveredNode ? 0.1 : 0.6);
    }

    // --- 4. DRAW CONNECTORS STEP 2 (Pos -> Attn) ---
    if (showPositional && showAttention) {
        g.selectAll(".line-step2")
            .data(chains)
            .enter()
            .append("line")
            .attr("x1", d => getX(d.pos.coords2D[0], d.sourceId))
            .attr("y1", d => getY(d.pos.coords2D[1], d.sourceId))
            .attr("x2", d => getX(d.attn.coords2D[0], d.sourceId))
            .attr("y2", d => getY(d.attn.coords2D[1], d.sourceId))
            .attr("stroke", "#F59E0B")
            .attr("stroke-width", 2)
            .attr("opacity", hoveredNode ? 0.2 : 0.8)
            .attr("marker-end", "url(#arrow-attn)");
    }

    // --- 5. HOVER INTERACTIONS (Distance Lines) ---
    if (hoveredNode && showAttention) {
       // Draw lines from hovered node to ALL other 'attention' nodes
       const otherNodes = chains.map(c => c.attn).filter(n => n !== hoveredNode);
       
       otherNodes.forEach(target => {
          const sim = cosineSimilarity(hoveredNode.vector, target.vector);
          
          // Color based on similarity
          const colorScale = d3.scaleLinear<string>()
             .domain([0, 0.5, 1])
             .range(["#ef4444", "#fbbf24", "#10b981"]);
          
          const x1 = getX(hoveredNode.coords2D[0], hoveredNode.sourceId);
          const y1 = getY(hoveredNode.coords2D[1], hoveredNode.sourceId);
          const x2 = getX(target.coords2D[0], target.sourceId);
          const y2 = getY(target.coords2D[1], target.sourceId);

          // Dashed connection line
          g.append("line")
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2)
            .attr("stroke", colorScale(sim))
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "2 2")
            .attr("opacity", 0.6);

          // Calculate midpoint for text
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          
          // Background rect for text readability
          g.append("rect")
            .attr("x", midX - 12)
            .attr("y", midY - 6)
            .attr("width", 24)
            .attr("height", 12)
            .attr("rx", 2)
            .attr("fill", "#0f172a")
            .attr("opacity", 0.8);

          // Similarity Label
          g.append("text")
            .text(sim.toFixed(2))
            .attr("x", midX)
            .attr("y", midY + 3)
            .attr("text-anchor", "middle")
            .attr("fill", colorScale(sim))
            .attr("font-size", "9px")
            .attr("font-family", "monospace")
            .attr("font-weight", "bold");
       });
    }

    // --- 6. DRAW FINAL ATTENTION NODES (Circles) ---
    if (showAttention) {
        const finalGroup = g.selectAll(".node-final")
        .data(chains)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${getX(d.attn.coords2D[0], d.sourceId)},${getY(d.attn.coords2D[1], d.sourceId)})`)
        .style("cursor", "pointer")
        .on("mouseenter", (event, d) => setHoveredNode(d.attn))
        .on("mouseleave", () => setHoveredNode(null));

        // Selection Glow
        finalGroup.append("circle")
            .attr("r", d => (hoveredNode && hoveredNode === d.attn) ? 15 : 0)
            .attr("fill", "#F59E0B")
            .attr("opacity", 0.3)
            .transition().duration(200);

        // Main Dot
        finalGroup.append("circle")
        .attr("r", d => (hoveredNode && hoveredNode === d.attn) ? 8 : 6)
        .attr("fill", "#F59E0B") // Amber fill
        .attr("stroke", d => d.sourceId === 'A' ? "#6366F1" : "#10B981") // Border matches Source color
        .attr("stroke-width", 2);

        // Token Label
        finalGroup.append("text")
        .text(d => d.token)
        .attr("x", 12)
        .attr("y", 4)
        .attr("fill", "#FCD34D") // Amber light
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .style("text-shadow", "0px 1px 2px rgba(0,0,0,0.8)")
        .style("opacity", d => (hoveredNode && hoveredNode !== d.attn) ? 0.7 : 1);
        
        // Phrase Index Label
        finalGroup.append("text")
        .text(d => `(${d.sourceId}:${d.pIdx})`)
        .attr("x", 12)
        .attr("y", 15)
        .attr("fill", "#94a3b8")
        .attr("font-size", "9px")
        .style("opacity", 0.8);
    }

  }, [data, width, height, chains, hoveredNode, showBase, showPositional, showAttention]);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        {/* HEADER CONTROLS */}
        <div className="flex flex-wrap items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700 gap-4">
            
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={showBase} onChange={e => setShowBase(e.target.checked)} className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500" />
                    <span className="flex items-center gap-1 text-sm text-slate-300 group-hover:text-white transition-colors">
                        <span className="w-3 h-3 bg-indigo-900 border border-indigo-500 inline-block"></span> Base
                    </span>
                </label>
                <span className="text-slate-600">→</span>
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={showPositional} onChange={e => setShowPositional(e.target.checked)} className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500" />
                    <span className="flex items-center gap-1 text-sm text-slate-300 group-hover:text-white transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span> Pos
                    </span>
                </label>
                <span className="text-slate-600">→</span>
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={showAttention} onChange={e => setShowAttention(e.target.checked)} className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500" />
                    <span className="flex items-center gap-1 text-sm text-slate-300 group-hover:text-white transition-colors">
                         <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Attention
                    </span>
                </label>
            </div>

            <div className="text-xs text-slate-400 italic">
                {hoveredNode ? 'Hovering...' : 'Hover over circles to measure distances'}
            </div>
        </div>

        <div className="flex-1 relative bg-slate-900 w-full overflow-hidden">
            {/* Chart Area */}
            <svg ref={svgRef} width={width} height={height} className="block w-full h-full" />
        </div>

        {/* FOOTER LEGEND (Moved out of chart area) */}
        <div className="bg-slate-800/90 border-t border-slate-700 p-3 flex flex-wrap gap-x-6 gap-y-2 justify-center items-center text-xs text-slate-300 z-10">
            <div className="font-bold text-slate-400 uppercase tracking-wide mr-2">Legend</div>
            
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-indigo-400 bg-indigo-900"></div>
                <span>Base (A)</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-emerald-400 bg-emerald-900"></div>
                <span>Base (B)</span>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="w-4 h-0 border-t border-dashed border-indigo-500"></div>
                <span>Pos Shift (A)</span>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="w-4 h-0 border-t border-dashed border-emerald-500"></div>
                <span>Pos Shift (B)</span>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="w-4 h-0 border-t-2 border-amber-500"></div>
                <span>Self-Attention Shift</span>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-indigo-500"></div>
                <span>Output (A)</span>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-emerald-500"></div>
                <span>Output (B)</span>
            </div>
        </div>
    </div>
  );
};

export default PositionalEncodingChart;
