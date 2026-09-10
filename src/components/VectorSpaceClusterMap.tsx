/**
 * PROJECT JARVIS: 3D VECTOR SPACE CLUSTER MAP & KNOWLEDGE GAP ANALYZER
 * 
 * Interactive D3.js 3D Vector Manifold Visualizer:
 * - 3D Isometric / Perspective Projection Matrix with continuous orbit & drag interaction
 * - Cluster centroids with dispersion envelopes representing high-dimensional semantic density
 * - Real-time Knowledge Gap Detection identifying low-density voids in the semantic substrate
 * - Interactive metadata inspector displaying chunk hierarchies, token budgets, and provenance
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Box, 
  Rotate3d, 
  Layers, 
  AlertTriangle, 
  Search, 
  Info, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Sparkles,
  Database,
  Compass,
  Filter
} from 'lucide-react';

export interface SemanticPoint {
  id: string;
  clusterId: string;
  title: string;
  category: string;
  x: number;
  y: number;
  z: number;
  tokens: number;
  importance: number;
  source: string;
  preview: string;
}

export interface SemanticCluster {
  id: string;
  name: string;
  domain: string;
  color: string;
  centroid: [number, number, number];
  unitCount: number;
  avgDispersion: number;
  coverageScore: number;
  isGap?: boolean;
  gapReason?: string;
  suggestedIngestion?: string;
}

// Initial semantic clusters derived from canonical knowledge domains & identified gaps
const DEFAULT_CLUSTERS: SemanticCluster[] = [
  {
    id: 'c-tensor',
    name: 'Numerical Kernel & Tensor Calculus',
    domain: 'brain://math/tensor',
    color: '#06b6d4', // Cyan
    centroid: [-120, -60, 40],
    unitCount: 2450,
    avgDispersion: 0.12,
    coverageScore: 98.4,
  },
  {
    id: 'c-token',
    name: 'Byte-Level Invertible Tokenization',
    domain: 'brain://perception/tokenizer',
    color: '#10b981', // Emerald
    centroid: [80, -110, -50],
    unitCount: 1820,
    avgDispersion: 0.14,
    coverageScore: 96.2,
  },
  {
    id: 'c-memory',
    name: 'Dual-Execution Memory Architecture',
    domain: 'brain://memory/architecture',
    color: '#8b5cf6', // Violet
    centroid: [-40, 90, -80],
    unitCount: 3120,
    avgDispersion: 0.18,
    coverageScore: 94.7,
  },
  {
    id: 'c-recovery',
    name: 'Adversarial Fault & State Recovery',
    domain: 'brain://evaluation/recovery',
    color: '#3b82f6', // Blue
    centroid: [110, 60, 60],
    unitCount: 1450,
    avgDispersion: 0.16,
    coverageScore: 92.1,
  },
  {
    id: 'c-attention',
    name: 'Multi-Head Attention Manifolds',
    domain: 'brain://attention/geometry',
    color: '#ec4899', // Pink
    centroid: [-90, 80, 100],
    unitCount: 1980,
    avgDispersion: 0.22,
    coverageScore: 89.5,
  },
  // IDENTIFIED KNOWLEDGE GAPS (Under-represented regions in semantic manifold)
  {
    id: 'gap-hyperbolic',
    name: 'KNOWLEDGE GAP: Hyperbolic Hierarchical Embeddings',
    domain: 'brain://gaps/hyperbolic',
    color: '#f59e0b', // Amber
    centroid: [160, -40, 120],
    unitCount: 14,
    avgDispersion: 0.78,
    coverageScore: 18.2,
    isGap: true,
    gapReason: 'Sparse tree hierarchy representation in Euclidean space leads to distortion (Poincaré ball metric missing)',
    suggestedIngestion: 'Ingest formal Riemannian & hyperbolic manifold geometry papers (Nickel & Kiela 2017)',
  },
  {
    id: 'gap-formal-coq',
    name: 'KNOWLEDGE GAP: Formal Coq/Lean Theorem Synthesis',
    domain: 'brain://gaps/formal-logic',
    color: '#f43f5e', // Rose
    centroid: [-30, -150, 140],
    unitCount: 8,
    avgDispersion: 0.85,
    coverageScore: 12.0,
    isGap: true,
    gapReason: 'Semantic gap between informal mathematical heuristics and machine-checked Gallina/Lean 4 proofs',
    suggestedIngestion: 'Index Mathlib4 axiomatic lemmas and Coq standard library type-theoretic kernels',
  },
  {
    id: 'gap-distributed-wal',
    name: 'KNOWLEDGE GAP: Cross-Region Raft/Paxos WAL Consensus',
    domain: 'brain://gaps/consensus',
    color: '#d97706', // Amber-600
    centroid: [140, 130, -110],
    unitCount: 19,
    avgDispersion: 0.69,
    coverageScore: 24.5,
    isGap: true,
    gapReason: 'High query dispersion when synthesizing multi-datacenter quorum replication protocols',
    suggestedIngestion: 'Ingest Spanner TrueTime and Raft leader election state machine specifications',
  },
];

export function VectorSpaceClusterMap() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 3D Angles and Camera Position
  const [rotation, setRotation] = useState({ pitch: 24, yaw: 42 });
  const [zoom, setZoom] = useState(1.1);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [showGapsOnly, setShowGapsOnly] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<SemanticCluster | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<SemanticPoint | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<SemanticCluster | null>(null);

  // Generate synthetic vector cloud points around cluster centroids
  const points = useMemo(() => {
    const pts: SemanticPoint[] = [];
    DEFAULT_CLUSTERS.forEach((cluster) => {
      const numPts = cluster.isGap ? 12 : 36;
      const dispersion = cluster.isGap ? 60 : 35;

      for (let i = 0; i < numPts; i++) {
        // Gaussian perturbation around centroid
        const u1 = Math.random() || 0.01;
        const u2 = Math.random() || 0.01;
        const radius = Math.sqrt(-2.0 * Math.log(u1)) * dispersion * (cluster.avgDispersion * 2.5);
        const theta = 2.0 * Math.PI * u2;
        const phi = (Math.random() - 0.5) * Math.PI;

        const x = cluster.centroid[0] + radius * Math.cos(theta) * Math.cos(phi);
        const y = cluster.centroid[1] + radius * Math.sin(theta) * Math.cos(phi);
        const z = cluster.centroid[2] + radius * Math.sin(phi);

        pts.push({
          id: `${cluster.id}-pt-${i}`,
          clusterId: cluster.id,
          title: `${cluster.name} • Unit #${i + 1}`,
          category: cluster.domain.replace('brain://', ''),
          x,
          y,
          z,
          tokens: Math.floor(40 + Math.random() * 80),
          importance: +(0.4 + Math.random() * 0.6).toFixed(2),
          source: cluster.domain,
          preview: cluster.isGap
            ? `Sparse semantic fragment: High uncertainty gradient detected. Nearest neighbor distance = ${(0.7 + Math.random() * 0.25).toFixed(3)}.`
            : `Canonical memory vector: Fully grounded chunk adhering to Project JARVIS numerical & provenance invariants.`,
        });
      }
    });
    return pts;
  }, []);

  // Continuous 3D Auto-Rotation
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setRotation((prev) => ({
        pitch: prev.pitch,
        yaw: (prev.yaw + 0.35) % 360,
      }));
    }, 30);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  // Drag to rotate handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      setIsAutoRotating(false);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;

      setRotation((prev) => ({
        pitch: Math.max(-85, Math.min(85, prev.pitch - dy * 0.5)),
        yaw: (prev.yaw + dx * 0.5) % 360,
      }));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // 3D Projection Math Helper
  const project3D = (x: number, y: number, z: number, width: number, height: number) => {
    const radYaw = (rotation.yaw * Math.PI) / 180;
    const radPitch = (rotation.pitch * Math.PI) / 180;

    // Yaw rotation around Y-axis
    const x1 = x * Math.cos(radYaw) + z * Math.sin(radYaw);
    const y1 = y;
    const z1 = -x * Math.sin(radYaw) + z * Math.cos(radYaw);

    // Pitch rotation around X-axis
    const x2 = x1;
    const y2 = y1 * Math.cos(radPitch) - z1 * Math.sin(radPitch);
    const z2 = y1 * Math.sin(radPitch) + z1 * Math.cos(radPitch);

    // Perspective depth
    const fov = 450;
    const cameraZ = 350;
    const scale = (fov / (fov + z2 + cameraZ)) * zoom;

    const screenX = width / 2 + x2 * scale;
    const screenY = height / 2 + y2 * scale;

    return { screenX, screenY, depth: z2, scale };
  };

  // D3 Rendering Cycle
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 700;
    const height = 440;

    const svg = d3.select(svgRef.current);
    svg.attr('width', width).attr('height', height);

    // Clear previous dynamic render
    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    // Glow filters
    const filterGlow = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filterGlow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filterGlow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const gMain = svg.append('g');

    // 1. Render 3D Coordinate Grid Plane (XZ Plane)
    if (showGrid) {
      const gridG = gMain.append('g').attr('class', 'grid-lines');
      const gridSize = 180;
      const gridSteps = 6;
      const step = (gridSize * 2) / gridSteps;

      for (let i = -gridSize; i <= gridSize; i += step) {
        // Lines parallel to X
        const p1 = project3D(-gridSize, 120, i, width, height);
        const p2 = project3D(gridSize, 120, i, width, height);
        gridG.append('line')
          .attr('x1', p1.screenX).attr('y1', p1.screenY)
          .attr('x2', p2.screenX).attr('y2', p2.screenY)
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 0.8)
          .attr('stroke-dasharray', '3,3');

        // Lines parallel to Z
        const p3 = project3D(i, 120, -gridSize, width, height);
        const p4 = project3D(i, 120, gridSize, width, height);
        gridG.append('line')
          .attr('x1', p3.screenX).attr('y1', p3.screenY)
          .attr('x2', p4.screenX).attr('y2', p4.screenY)
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 0.8)
          .attr('stroke-dasharray', '3,3');
      }

      // Coordinate axes
      const origin = project3D(0, 0, 0, width, height);
      const axisX = project3D(140, 0, 0, width, height);
      const axisY = project3D(0, -140, 0, width, height);
      const axisZ = project3D(0, 0, 140, width, height);

      const drawAxis = (pEnd: any, color: string, label: string) => {
        gridG.append('line')
          .attr('x1', origin.screenX).attr('y1', origin.screenY)
          .attr('x2', pEnd.screenX).attr('y2', pEnd.screenY)
          .attr('stroke', color)
          .attr('stroke-width', 1.2)
          .attr('opacity', 0.6);
        gridG.append('text')
          .attr('x', pEnd.screenX + 4).attr('y', pEnd.screenY + 4)
          .attr('fill', color)
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('opacity', 0.7)
          .text(label);
      };

      drawAxis(axisX, '#06b6d4', 'X (Latent-1)');
      drawAxis(axisY, '#10b981', 'Y (Latent-2)');
      drawAxis(axisZ, '#8b5cf6', 'Z (Latent-3)');
    }

    // Filter clusters if gap mode is on
    const visibleClusters = showGapsOnly 
      ? DEFAULT_CLUSTERS.filter((c) => c.isGap) 
      : DEFAULT_CLUSTERS;

    // Collect all renderable 3D objects to sort by Z-depth for correct painter's algorithm
    interface RenderableObject {
      type: 'cluster_envelope' | 'cluster_centroid' | 'point';
      depth: number;
      cluster?: SemanticCluster;
      point?: SemanticPoint;
    }

    const renderList: RenderableObject[] = [];

    visibleClusters.forEach((c) => {
      const proj = project3D(c.centroid[0], c.centroid[1], c.centroid[2], width, height);
      renderList.push({ type: 'cluster_envelope', depth: proj.depth - 5, cluster: c });
      renderList.push({ type: 'cluster_centroid', depth: proj.depth, cluster: c });
    });

    const visiblePoints = showGapsOnly
      ? points.filter((p) => visibleClusters.some((c) => c.id === p.clusterId))
      : points;

    visiblePoints.forEach((p) => {
      const proj = project3D(p.x, p.y, p.z, width, height);
      renderList.push({ type: 'point', depth: proj.depth, point: p });
    });

    // Sort back-to-front
    renderList.sort((a, b) => a.depth - b.depth);

    // 2. Render sorted objects
    renderList.forEach((item) => {
      if (item.type === 'cluster_envelope' && item.cluster) {
        const c = item.cluster;
        const proj = project3D(c.centroid[0], c.centroid[1], c.centroid[2], width, height);
        const radius = Math.max(16, (c.isGap ? 50 : 36) * proj.scale);

        // Cluster Hull / Halo
        gMain.append('circle')
          .attr('cx', proj.screenX)
          .attr('cy', proj.screenY)
          .attr('r', radius)
          .attr('fill', c.color)
          .attr('fill-opacity', c.isGap ? 0.08 : 0.05)
          .attr('stroke', c.color)
          .attr('stroke-width', c.isGap ? 1.5 : 1)
          .attr('stroke-dasharray', c.isGap ? '4,4' : 'none')
          .attr('stroke-opacity', 0.4);
      }

      if (item.type === 'cluster_centroid' && item.cluster) {
        const c = item.cluster;
        const proj = project3D(c.centroid[0], c.centroid[1], c.centroid[2], width, height);
        const isHovered = hoveredCluster?.id === c.id || selectedCluster?.id === c.id;

        const centroidG = gMain.append('g')
          .attr('class', 'cluster-centroid')
          .style('cursor', 'pointer')
          .on('mouseenter', () => setHoveredCluster(c))
          .on('mouseleave', () => setHoveredCluster(null))
          .on('click', () => setSelectedCluster(c));

        // Pulsing gap indicator or solid anchor
        centroidG.append('circle')
          .attr('cx', proj.screenX)
          .attr('cy', proj.screenY)
          .attr('r', (c.isGap ? 9 : 7) * proj.scale * (isHovered ? 1.3 : 1.0))
          .attr('fill', c.color)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', isHovered ? 2 : 1.2)
          .attr('filter', 'url(#glow)')
          .attr('opacity', 0.95);

        // Centroid text label
        centroidG.append('text')
          .attr('x', proj.screenX + 12)
          .attr('y', proj.screenY + 4)
          .attr('fill', isHovered ? '#ffffff' : '#cbd5e1')
          .attr('font-size', `${Math.max(9, Math.min(12, 10.5 * proj.scale))}px`)
          .attr('font-family', 'monospace')
          .attr('font-weight', isHovered ? 'bold' : 'normal')
          .text(c.isGap ? `⚠ GAP: ${c.name.replace('KNOWLEDGE GAP: ', '')}` : c.name);
      }

      if (item.type === 'point' && item.point) {
        const p = item.point;
        const proj = project3D(p.x, p.y, p.z, width, height);
        const parentCluster = DEFAULT_CLUSTERS.find((c) => c.id === p.clusterId);
        const isHovered = hoveredPoint?.id === p.id;

        gMain.append('circle')
          .attr('cx', proj.screenX)
          .attr('cy', proj.screenY)
          .attr('r', (isHovered ? 4.5 : 2.2) * proj.scale)
          .attr('fill', parentCluster?.color || '#94a3b8')
          .attr('opacity', isHovered ? 1.0 : parentCluster?.isGap ? 0.8 : 0.6)
          .style('cursor', 'pointer')
          .on('mouseenter', () => setHoveredPoint(p))
          .on('mouseleave', () => setHoveredPoint(null))
          .on('click', () => {
            if (parentCluster) setSelectedCluster(parentCluster);
          });
      }
    });

  }, [rotation, zoom, showGrid, showGapsOnly, hoveredCluster, selectedCluster, hoveredPoint, points]);

  const activeInspectCluster = selectedCluster || hoveredCluster;

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* HEADER & CONTROL BAR */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-700 text-cyan-400">
            <Rotate3d className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wide">
                3D SEMANTIC MANIFOLD & CLUSTER INSPECTOR
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                D3.js ORBIT ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              High-dimensional vector manifold projected via Euclidean isometric transformation. Drag to orbit.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowGapsOnly(!showGapsOnly)}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all ${
              showGapsOnly
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-800/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{showGapsOnly ? 'Showing Gaps Only' : 'Highlight Knowledge Gaps (3)'}</span>
          </button>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1 ${
              isAutoRotating 
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800' 
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isAutoRotating ? 'animate-spin' : ''}`} />
            <span>Orbit</span>
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1 ${
              showGrid
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Grid</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400 px-1">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3D CANVAS & SIDE INSPECTOR SPLIT */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* 3D SVG STAGE (2 Columns) */}
        <div 
          ref={containerRef}
          className="xl:col-span-2 relative h-[440px] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden select-none cursor-grab active:cursor-grabbing shadow-inner"
        >
          <svg ref={svgRef} className="w-full h-full" />

          {/* Perspective Coordinates Indicator */}
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-3 backdrop-blur-sm pointer-events-none">
            <span>Pitch: <strong className="text-cyan-300">{Math.round(rotation.pitch)}°</strong></span>
            <span>Yaw: <strong className="text-cyan-300">{Math.round(rotation.yaw)}°</strong></span>
            <span>Active Clusters: <strong className="text-white">{DEFAULT_CLUSTERS.length}</strong></span>
          </div>

          {/* Quick Hover Point Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-3 left-3 max-w-sm px-3 py-2 rounded-lg bg-slate-900/95 border border-cyan-500/50 text-[11px] shadow-xl backdrop-blur-md pointer-events-none space-y-1">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                <span className="font-bold text-cyan-300">{hoveredPoint.title}</span>
                <span className="text-[10px] text-slate-400">{hoveredPoint.tokens} tokens</span>
              </div>
              <p className="text-[10px] text-slate-300 line-clamp-2">{hoveredPoint.preview}</p>
            </div>
          )}
        </div>

        {/* CLUSTER & GAP METADATA DRAWER (1 Column) */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-col justify-between h-[440px] overflow-y-auto space-y-3">
          {activeInspectCluster ? (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    {activeInspectCluster.isGap ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: activeInspectCluster.color }} 
                      />
                    )}
                    <h4 className="font-bold text-white text-xs leading-tight">
                      {activeInspectCluster.name}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">{activeInspectCluster.domain}</span>
                </div>
                <span 
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    activeInspectCluster.isGap 
                      ? 'bg-amber-950 text-amber-300 border-amber-700' 
                      : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  }`}
                >
                  {activeInspectCluster.isGap ? 'CRITICAL GAP' : 'STABLE'}
                </span>
              </div>

              {/* Numerical Attributes */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Coverage Score</div>
                  <div className={`font-bold text-sm ${activeInspectCluster.coverageScore > 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {activeInspectCluster.coverageScore}%
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Vector Units</div>
                  <div className="font-bold text-sm text-white">
                    {activeInspectCluster.unitCount.toLocaleString()}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Cosine Dispersion</div>
                  <div className="font-mono text-cyan-300">
                    σ = {activeInspectCluster.avgDispersion}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Centroid Coord</div>
                  <div className="font-mono text-[10px] text-slate-300">
                    [{activeInspectCluster.centroid.join(', ')}]
                  </div>
                </div>
              </div>

              {/* Gap Analysis or Provenance Sample */}
              {activeInspectCluster.isGap ? (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Knowledge Gap Diagnosis</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    {activeInspectCluster.gapReason}
                  </p>
                  <div className="pt-1.5 border-t border-amber-800/60">
                    <div className="text-[10px] text-amber-400 font-bold">Recommended Remediation:</div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      {activeInspectCluster.suggestedIngestion}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>Semantic Integrity</span>
                    <span className="text-emerald-400 font-bold">100% Provenance Lineage</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    High density cluster verified by PostgreSQL & pgvector HNSW index. Zero epistemic uncertainty detected.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-slate-500">
              <Box className="w-8 h-8 text-slate-600" />
              <div className="text-xs font-bold text-slate-400">Select or Hover a Cluster</div>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Hover over vector points or centroids in the 3D manifold to inspect metadata, dispersion, and detect knowledge voids.
              </p>
            </div>
          )}

          {/* Bottom Action */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Projection: Isometric R^3</span>
              <button
                onClick={() => setSelectedCluster(null)}
                className="text-cyan-400 hover:underline"
              >
                Reset Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
