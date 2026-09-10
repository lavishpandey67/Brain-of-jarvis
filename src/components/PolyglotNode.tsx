import React, { useState, useMemo } from 'react';
import { 
  ChamberId, 
  BrainChamberState, 
  PolyglotEnvironmentId 
} from '../types/brain';
import { 
  Terminal, 
  Cpu, 
  Database, 
  Zap, 
  ShieldCheck, 
  Activity, 
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Binary,
  Layers,
  Code2
} from 'lucide-react';

export interface PolyglotNodeProps {
  state: BrainChamberState;
  activeChamberId: ChamberId;
  onSelectChamber: (id: ChamberId) => void;
  isRunning: boolean;
}

/**
 * Maps any chamber ID in the cognitive pipeline to its primary execution runtime.
 */
export function getChamberEnvironment(chamberId: ChamberId, state: BrainChamberState): PolyglotEnvironmentId {
  if (chamberId === 'execution') {
    return state.execution.activeEnvironment || 'node';
  }
  if (['tokenization', 'numerical', 'attention'].includes(chamberId)) {
    return 'python';
  }
  if (['memory', 'learning'].includes(chamberId)) {
    return 'sql';
  }
  return 'node';
}

export const PolyglotNode: React.FC<PolyglotNodeProps> = ({
  state,
  activeChamberId,
  onSelectChamber,
  isRunning,
}) => {
  // Operator can pin an environment, or null for auto-sync with chamber state
  const [manualEnv, setManualEnv] = useState<PolyglotEnvironmentId | null>(null);

  // Automatically detected runtime from the currently active chamber
  const chamberEnv = useMemo(
    () => getChamberEnvironment(activeChamberId, state),
    [activeChamberId, state]
  );

  // Effective active environment for visualization
  const activeEnv = manualEnv ?? chamberEnv;
  const isAutoSynced = manualEnv === null;
  const isExecutionChamberActive = activeChamberId === 'execution';

  // Dynamic visual styling classes based on active environment
  const envTheme = useMemo(() => {
    switch (activeEnv) {
      case 'node':
        return {
          name: 'Node.js / tsx',
          subtitle: 'V8 Orchestration & Subprocess Dispatch',
          primaryColor: 'emerald',
          badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
          activeGlow: 'shadow-[0_0_25px_rgba(16,185,129,0.25)] border-emerald-500/80',
          accentText: 'text-emerald-400',
          accentBg: 'bg-emerald-950/40',
          borderClass: 'border-emerald-500/50',
          ringClass: 'ring-emerald-400/40',
          icon: <Terminal className="w-4 h-4 text-emerald-400" />,
          targetChamber: 'execution' as ChamberId,
          targetChamberLabel: 'Chamber 10 (Execution)',
        };
      case 'python':
        return {
          name: 'Python 3.12 / PyTorch',
          subtitle: 'Numerical Tensors & SIMD Attention',
          primaryColor: 'blue',
          badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-600/60',
          activeGlow: 'shadow-[0_0_25px_rgba(59,130,246,0.25)] border-blue-500/80',
          accentText: 'text-blue-400',
          accentBg: 'bg-blue-950/40',
          borderClass: 'border-blue-500/50',
          ringClass: 'ring-blue-400/40',
          icon: <Cpu className="w-4 h-4 text-blue-400" />,
          targetChamber: 'numerical' as ChamberId,
          targetChamberLabel: 'Chamber 03 (Numerical)',
        };
      case 'sql':
        return {
          name: 'SQL / pgvector',
          subtitle: 'HNSW Vector Cosine RAG & Rule Storage',
          primaryColor: 'violet',
          badgeBg: 'bg-violet-950/80 text-violet-300 border-violet-600/60',
          activeGlow: 'shadow-[0_0_25px_rgba(139,92,246,0.25)] border-violet-500/80',
          accentText: 'text-violet-400',
          accentBg: 'bg-violet-950/40',
          borderClass: 'border-violet-500/50',
          ringClass: 'ring-violet-400/40',
          icon: <Database className="w-4 h-4 text-violet-400" />,
          targetChamber: 'memory' as ChamberId,
          targetChamberLabel: 'Chamber 04 (Memory)',
        };
    }
  }, [activeEnv]);

  return (
    <div
      id="flow-node-polyglot"
      className={`w-full max-w-md rounded-lg border transition-all duration-300 bg-slate-900/90 relative overflow-hidden ${
        isExecutionChamberActive
          ? 'border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
          : envTheme.activeGlow
      }`}
    >
      {/* Top Header Strip */}
      <div className="p-3 pb-2 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div 
            onClick={() => onSelectChamber('execution')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded bg-slate-900 border border-slate-700 text-cyan-400 text-xs font-mono group-hover:border-cyan-400 transition-colors">
              {envTheme.icon}
            </span>
            <div>
              <div className="font-mono text-xs font-bold tracking-wider uppercase text-slate-100 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                <span>10. POLYGLOT EXECUTION</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                  NODE
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isExecutionChamberActive && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700 text-[10px] font-mono font-semibold animate-pulse">
                ACTIVE
              </span>
            )}
            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${envTheme.badgeBg}`}>
              {activeEnv.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Subtitle & Chamber Sync Status */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
          <div className="flex items-center gap-1 truncate">
            <span className="text-slate-500">Substrate:</span>
            <span className="text-slate-300 font-semibold truncate">{envTheme.subtitle}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {isAutoSynced ? (
              <span className="text-[9px] text-cyan-400 flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" />
                <span>Chamber Sync</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setManualEnv(null)}
                className="text-[9px] px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 transition-colors"
                title="Reset to automatic chamber synchronization"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset Auto</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tri-Environment Selector Tabs */}
      <div className="p-2.5 bg-slate-950/40 border-b border-slate-800">
        <div className="text-[9px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
          <span className="uppercase tracking-wider font-semibold text-slate-500">Execution Environments:</span>
          <span className="text-slate-500">
            Current Driver: <span className={envTheme.accentText}>{chamberEnv.toUpperCase()}</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* Node.js Environment Tab */}
          <button
            type="button"
            id="polyglot-tab-node"
            onClick={() => setManualEnv('node')}
            className={`p-2 rounded border text-left font-mono transition-all relative ${
              activeEnv === 'node'
                ? 'bg-emerald-950/50 border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/40 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                <span>Node.js</span>
              </span>
              {chamberEnv === 'node' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <div className="text-[9px] text-slate-400 truncate">V8 • TypeScript</div>
            <div className="text-[9px] text-emerald-300/80 mt-0.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
              <span>{activeEnv === 'node' ? 'ACTIVE' : 'READY'}</span>
            </div>
          </button>

          {/* Python Environment Tab */}
          <button
            type="button"
            id="polyglot-tab-python"
            onClick={() => setManualEnv('python')}
            className={`p-2 rounded border text-left font-mono transition-all relative ${
              activeEnv === 'python'
                ? 'bg-blue-950/50 border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-blue-500/40 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                <span>Python</span>
              </span>
              {chamberEnv === 'python' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              )}
            </div>
            <div className="text-[9px] text-slate-400 truncate">3.12 • PyTorch</div>
            <div className="text-[9px] text-blue-300/80 mt-0.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-blue-500"></span>
              <span>{activeEnv === 'python' ? 'ACTIVE' : 'READY'}</span>
            </div>
          </button>

          {/* SQL Environment Tab */}
          <button
            type="button"
            id="polyglot-tab-sql"
            onClick={() => setManualEnv('sql')}
            className={`p-2 rounded border text-left font-mono transition-all relative ${
              activeEnv === 'sql'
                ? 'bg-violet-950/50 border-violet-500/80 shadow-[0_0_12px_rgba(139,92,246,0.3)] ring-1 ring-violet-500/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-violet-500/40 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-violet-400 flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>SQL</span>
              </span>
              {chamberEnv === 'sql' && (
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
              )}
            </div>
            <div className="text-[9px] text-slate-400 truncate">pgvector • HNSW</div>
            <div className="text-[9px] text-violet-300/80 mt-0.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-violet-500"></span>
              <span>{activeEnv === 'sql' ? 'ACTIVE' : 'READY'}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Selected Environment Detailed Telemetry Card */}
      <div className="p-3 font-mono text-xs space-y-2.5">
        {/* Node.js Detailed Telemetry */}
        {activeEnv === 'node' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Node.js v22.13.0 (V8 Isolate)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-semibold">
                PROVEN
              </span>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">V8 Heap Allocation:</span>
                <span className="text-slate-200 font-semibold">
                  {Math.round(state.execution.resourceUsage.memMb * 0.44)} MB
                </span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Libuv Loop Lag:</span>
                <span className="text-emerald-400 font-semibold">0.12 ms (Stable)</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">CPU Core Slice:</span>
                <span className="text-slate-200 font-semibold">
                  {(state.execution.resourceUsage.cpuPct * 0.4).toFixed(1)}%
                </span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Microtask Backlog:</span>
                <span className="text-emerald-400 font-semibold">0 tasks</span>
              </div>
            </div>

            {/* Active Command Snippet */}
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-500 uppercase mb-0.5">Dispatched Subprocess:</div>
              <code className="text-[10px] text-emerald-300 block truncate">
                tsx server.ts --cluster=worker --seccomp=strict
              </code>
            </div>

            {/* Associated Chambers */}
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span className="text-slate-500">Pipeline Stages:</span>
              <span className="text-slate-300">01 Ingest • 05 Understand • 07 Plan • 09 Workforce</span>
            </div>
          </div>
        )}

        {/* Python Detailed Telemetry */}
        {activeEnv === 'python' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-300 font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>Python 3.12.3 (PyTorch + NumPy)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 border border-blue-700 text-blue-300 font-semibold">
                PROVEN
              </span>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Active Tensor Shape:</span>
                <span className="text-blue-300 font-semibold">
                  {state.numerical.tensorShape || '[1, 128, 768]'}
                </span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Vector Dimension:</span>
                <span className="text-slate-200 font-semibold">
                  {state.numerical.dim || 768}d Float32
                </span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Activation Func:</span>
                <span className="text-amber-400 font-semibold">
                  {state.numerical.activationFunction || 'SwiGLU'}
                </span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">GIL / Autograd Norm:</span>
                <span className="text-blue-400 font-semibold">
                  L2: {state.numerical.normL2 ? state.numerical.normL2.toFixed(3) : '1.000'}
                </span>
              </div>
            </div>

            {/* Active Command Snippet */}
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-500 uppercase mb-0.5">Dispatched Subprocess:</div>
              <code className="text-[10px] text-blue-300 block truncate">
                python3 -m torch.inference --tensor-shape={state.numerical.tensorShape || '[1, 128, 768]'} --swiglu
              </code>
            </div>

            {/* Associated Chambers */}
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span className="text-slate-500">Pipeline Stages:</span>
              <span className="text-slate-300">02 Tokenize • 03 Represent • 06 Attention</span>
            </div>
          </div>
        )}

        {/* SQL Detailed Telemetry */}
        {activeEnv === 'sql' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-violet-300 font-bold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-violet-400" />
                <span>PostgreSQL 16 + pgvector HNSW</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-950 border border-violet-700 text-violet-300 font-semibold">
                PROVEN
              </span>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Index Specification:</span>
                <span className="text-violet-300 font-semibold">HNSW(m=16, ef=64)</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Indexed Chunks:</span>
                <span className="text-slate-200 font-semibold">
                  {state.memory.semanticMemory.length || 5} chunks (768d)
                </span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Query Latency:</span>
                <span className="text-violet-400 font-semibold">2.14 ms (Cosine)</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Grounding Verification:</span>
                <span className="text-emerald-400 font-semibold">
                  {(state.memory.groundingConfidence * 100).toFixed(0)}% verified
                </span>
              </div>
            </div>

            {/* Active Command Snippet */}
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-500 uppercase mb-0.5">Dispatched Query:</div>
              <code className="text-[10px] text-violet-300 block truncate">
                {state.memory.pgvectorSql 
                  ? state.memory.pgvectorSql.slice(0, 52) + '...'
                  : 'SELECT chunk, 1-(embedding<=>$1) FROM memory LIMIT 5'}
              </code>
            </div>

            {/* Associated Chambers */}
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span className="text-slate-500">Pipeline Stages:</span>
              <span className="text-slate-300">04 Memory RAG • 14 Learning & Rules</span>
            </div>
          </div>
        )}

        {/* Footer Jump & Sandbox Security Boundary */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate">gVisor + seccomp-bpf</span>
          </div>

          <button
            type="button"
            onClick={() => onSelectChamber(envTheme.targetChamber)}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
          >
            <span>Jump to {envTheme.targetChamberLabel}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
