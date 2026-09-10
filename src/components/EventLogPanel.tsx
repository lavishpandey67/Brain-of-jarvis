import React, { useState, useEffect, useRef } from 'react';
import { BrainEventLog, ChamberId } from '../types/brain';
import { 
  Terminal, 
  Trash2, 
  ArrowDown, 
  Filter, 
  Search, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface EventLogPanelProps {
  logs: BrainEventLog[];
  onClearLogs: () => void;
  onSelectChamber?: (chamberId: ChamberId) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const EventLogPanel: React.FC<EventLogPanelProps> = ({
  logs,
  onClearLogs,
  onSelectChamber,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}) => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'info' | 'success' | 'warning' | 'error'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filter logs based on search and level
  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.title.toLowerCase().includes(q) ||
        log.chamberId.toLowerCase().includes(q) ||
        log.category.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getLevelBadge = (level: BrainEventLog['level']) => {
    switch (level) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
          cls: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
          cls: 'bg-amber-950 text-amber-300 border-amber-800',
        };
      case 'error':
        return {
          icon: <ShieldAlert className="w-3 h-3 text-rose-400" />,
          cls: 'bg-rose-950 text-rose-300 border-rose-800',
        };
      default:
        return {
          icon: <Info className="w-3 h-3 text-cyan-400" />,
          cls: 'bg-cyan-950 text-cyan-300 border-cyan-800',
        };
    }
  };

  const getCategoryColor = (cat: BrainEventLog['category']) => {
    switch (cat) {
      case 'TRANSITION': return 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40';
      case 'GATE': return 'text-amber-400 border-amber-800/60 bg-amber-950/40';
      case 'ASSERTION': return 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40';
      case 'INFERENCE': return 'text-purple-400 border-purple-800/60 bg-purple-950/40';
      case 'MEMORY': return 'text-blue-400 border-blue-800/60 bg-blue-950/40';
      case 'SESSION': return 'text-indigo-400 border-indigo-800/60 bg-indigo-950/40';
      case 'CRITIC': return 'text-rose-400 border-rose-800/60 bg-rose-950/40';
      default: return 'text-slate-400 border-slate-800 bg-slate-900';
    }
  };

  const handleExportLogs = () => {
    const text = JSON.stringify(logs, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis_brain_event_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col bg-slate-950 border-t border-slate-800 text-xs font-mono select-none ${className}`}>
      {/* Header Bar */}
      <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Title & Live indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-200 tracking-wide flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>REAL-TIME EVENT LOG</span>
            </span>
          </div>

          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-semibold">
            {filteredLogs.length} / {logs.length} EVENTS
          </span>
        </div>

        {/* Center: Search & Level Filter */}
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter events, chamber, category..."
                className="w-full pl-6 pr-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Level selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
              {(['ALL', 'info', 'success', 'warning', 'error'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                    filterLevel === lvl
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right: Actions (Auto-scroll, Export, Clear, Collapse) */}
        <div className="flex items-center gap-1">
          {!isCollapsed && (
            <>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1 transition-colors ${
                  autoScroll
                    ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Lock view to latest incoming events"
              >
                <ArrowDown className="w-3 h-3" />
                <span className="hidden sm:inline">Auto-scroll</span>
              </button>

              <button
                onClick={handleExportLogs}
                className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-300 transition-colors"
                title="Export Logs as JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onClearLogs}
                className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition-colors"
                title="Clear Event History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
              title={isCollapsed ? 'Expand Log Panel' : 'Collapse Log Panel'}
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Log Feed Body */}
      {!isCollapsed && (
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-900/60 font-mono"
          style={{ maxHeight: '220px', minHeight: '130px' }}
        >
          {filteredLogs.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs">
              No events match the active criteria. Telemetry active.
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const badge = getLevelBadge(entry.level);
              const isExpanded = expandedLogId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="pt-1 first:pt-0 hover:bg-slate-900/40 rounded px-1.5 py-0.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {/* Timestamp */}
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {entry.timestamp}
                      </span>

                      {/* Level icon */}
                      <span className="shrink-0">{badge.icon}</span>

                      {/* Cycle */}
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        #{String(entry.cycleNumber).padStart(4, '0')}
                      </span>

                      {/* Chamber link */}
                      <button
                        type="button"
                        onClick={() => onSelectChamber && onSelectChamber(entry.chamberId)}
                        className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 shrink-0 hover:border-cyan-600 transition-colors"
                        title={`Jump to Chamber ${entry.chamberNumber}`}
                      >
                        CH-{entry.chamberNumber}
                      </button>

                      {/* Category */}
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${getCategoryColor(entry.category)}`}>
                        {entry.category}
                      </span>

                      {/* Title */}
                      <span className="text-xs text-slate-200 font-medium truncate">
                        {entry.title}
                      </span>
                    </div>

                    {/* Details toggle */}
                    {entry.details && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                        className="text-[10px] text-slate-500 hover:text-cyan-400 shrink-0"
                      >
                        {isExpanded ? 'Less' : 'Details'}
                      </button>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && entry.details && (
                    <div className="mt-1.5 p-2 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                      {entry.details}
                      {entry.metadata && (
                        <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
