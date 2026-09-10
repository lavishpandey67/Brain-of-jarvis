import React, { useState } from 'react';
import { CriticHistoryPoint } from '../types/brain';
import { Activity, TrendingUp, TrendingDown, BarChart3, LineChart } from 'lucide-react';

interface CriticScoreChartProps {
  history: CriticHistoryPoint[];
  currentScore?: number;
  mode?: 'sparkline' | 'bars' | 'both';
  height?: number;
  className?: string;
  showDetails?: boolean;
}

export const CriticScoreChart: React.FC<CriticScoreChartProps> = ({
  history,
  currentScore,
  mode = 'both',
  height = 54,
  className = '',
  showDetails = true,
}) => {
  const [activeMode, setActiveMode] = useState<'sparkline' | 'bars'>(
    mode === 'bars' ? 'bars' : 'sparkline'
  );
  const [hoveredPoint, setHoveredPoint] = useState<CriticHistoryPoint | null>(null);

  // If no history, render empty state placeholder
  if (!history || history.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-xs font-mono text-slate-500 ${className}`}>
        <Activity className="w-3.5 h-3.5 text-slate-600" />
        <span>No cycle history recorded</span>
      </div>
    );
  }

  const latestScore = currentScore ?? history[history.length - 1]?.score ?? 0;
  const prevScore = history.length > 1 ? history[history.length - 2]?.score ?? latestScore : latestScore;
  const delta = +(latestScore - prevScore).toFixed(1);
  const isUp = delta >= 0;

  // Chart coordinate calculations
  const chartWidth = 180;
  const chartHeight = height;
  const padX = 8;
  const padY = 6;
  const innerW = chartWidth - padX * 2;
  const innerH = chartHeight - padY * 2;

  // Max score 100, min score 0 (or bounded to 30..100)
  const minScore = 0;
  const maxScore = 100;

  const points = history.map((item, idx) => {
    const x = padX + (idx / Math.max(1, history.length - 1)) * innerW;
    const y = padY + innerH - ((Math.min(100, Math.max(0, item.score)) - minScore) / (maxScore - minScore)) * innerH;
    return { ...item, x, y };
  });

  const pathD = points.length > 1
    ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '')
    : '';

  // Area path for gradient fill
  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1]?.x} ${chartHeight - padY} L ${points[0]?.x} ${chartHeight - padY} Z`
    : '';

  const thresholdY = padY + innerH - ((75 - minScore) / (maxScore - minScore)) * innerH;

  const getScoreColor = (score: number) => {
    if (score >= 85) return { stroke: '#10b981', fill: '#059669', bg: 'bg-emerald-400', text: 'text-emerald-400' };
    if (score >= 60) return { stroke: '#f59e0b', fill: '#d97706', bg: 'bg-amber-400', text: 'text-amber-400' };
    return { stroke: '#f43f5e', fill: '#e11d48', bg: 'bg-rose-400', text: 'text-rose-400' };
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      {/* Header telemetry summary */}
      {showDetails && (
        <div className="flex items-center justify-between gap-2 mb-1.5 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-semibold">CRITIC HISTORY:</span>
            <span className={`font-bold text-xs ${getScoreColor(latestScore).text}`}>
              {latestScore.toFixed(1)}%
            </span>
            <span className={`flex items-center text-[10px] ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
              {isUp ? `+${delta}%` : `${delta}%`}
            </span>
          </div>

          {/* Toggle between Sparkline & Bars */}
          {mode === 'both' && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
              <button
                type="button"
                onClick={() => setActiveMode('sparkline')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activeMode === 'sparkline' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Sparkline Line Chart"
              >
                <LineChart className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('bars')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activeMode === 'bars' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Bar Chart"
              >
                <BarChart3 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chart Visualizer */}
      <div className="relative bg-slate-950/80 rounded border border-slate-800/80 p-1 overflow-hidden">
        {activeMode === 'sparkline' ? (
          /* SVG Sparkline Mode */
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto max-h-[70px] overflow-visible"
            style={{ minHeight: `${height}px` }}
          >
            <defs>
              <linearGradient id="criticAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Threshold line at 75% */}
            <line
              x1={padX}
              y1={thresholdY}
              x2={chartWidth - padX}
              y2={thresholdY}
              stroke="#334155"
              strokeDasharray="2,2"
              strokeWidth="1"
            />

            {/* Fill area */}
            {areaD && <path d={areaD} fill="url(#criticAreaGrad)" />}

            {/* Line stroke */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data points */}
            {points.map((p, idx) => {
              const isLast = idx === points.length - 1;
              const col = getScoreColor(p.score);
              const isHovered = hoveredPoint?.cycle === p.cycle;

              return (
                <g key={p.cycle}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 4.5 : isLast ? 3.5 : 2.5}
                    fill={p.outcome === 'PASS' ? col.stroke : '#f43f5e'}
                    stroke="#020617"
                    strokeWidth={isHovered ? 2 : 1.5}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}
          </svg>
        ) : (
          /* Bar Chart Mode */
          <div
            className="w-full flex items-end gap-1.5 px-2 py-1 justify-between"
            style={{ height: `${height}px` }}
          >
            {history.map((pt) => {
              const barHeightPercent = Math.max(8, Math.min(100, pt.score));
              const col = getScoreColor(pt.score);
              const isHovered = hoveredPoint?.cycle === pt.cycle;

              return (
                <div
                  key={pt.cycle}
                  className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      pt.outcome === 'PASS'
                        ? pt.score >= 85
                          ? 'bg-emerald-500/80 hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : 'bg-amber-500/80 hover:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                        : 'bg-rose-500/80 hover:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                    } ${isHovered ? 'ring-1 ring-white' : ''}`}
                    style={{ height: `${barHeightPercent}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-500 mt-1 scale-90 origin-top">
                    #{pt.cycle}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Hover Tooltip Popup */}
        {hoveredPoint && (
          <div className="absolute top-1 right-2 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded shadow-lg flex items-center gap-2 pointer-events-none z-10">
            <span className="text-cyan-400 font-bold">CYCLE #{hoveredPoint.cycle}:</span>
            <span className={getScoreColor(hoveredPoint.score).text}>
              {hoveredPoint.score.toFixed(1)}%
            </span>
            <span className={`px-1 py-0.1 rounded text-[9px] font-bold ${
              hoveredPoint.outcome === 'PASS' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
            }`}>
              {hoveredPoint.outcome}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
