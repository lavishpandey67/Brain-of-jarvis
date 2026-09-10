import React from 'react';
import { 
  ChamberId, 
  BrainChamberState 
} from '../types/brain';
import { CHAMBERS } from '../data/chambers';
import { PolyglotNode } from './PolyglotNode';
import { 
  ArrowDown, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  RotateCcw,
  ShieldCheck,
  Binary,
  Layers,
  Database,
  Brain,
  Grid,
  Route,
  GitFork,
  Users,
  Terminal,
  Search,
  BookOpen,
  Sliders
} from 'lucide-react';

interface FlowGraphProps {
  state: BrainChamberState;
  activeChamberId: ChamberId;
  onSelectChamber: (id: ChamberId) => void;
  isRunning: boolean;
}

export const FlowGraph: React.FC<FlowGraphProps> = ({
  state,
  activeChamberId,
  onSelectChamber,
  isRunning,
}) => {
  const isFail = state.gateDecision === 'FAIL';

  // Helper to render chamber card in ASCII/HUD aesthetic
  const renderNode = (
    id: ChamberId,
    numberStr: string,
    title: string,
    sublines: string[],
    icon: React.ReactNode,
    categoryColor = 'cyan'
  ) => {
    const isActive = activeChamberId === id;
    const isGateFail = id === 'recover' && isFail;
    const isGatePass = id === 'result' && !isFail;
    const isDimmed = (id === 'recover' && !isFail) || (id === 'result' && isFail);

    let borderClass = 'border-slate-800 hover:border-slate-700 bg-slate-900/80';
    let textClass = 'text-slate-200';
    let ringClass = '';

    if (isActive) {
      borderClass = 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]';
      textClass = 'text-cyan-200';
      ringClass = 'ring-1 ring-cyan-400';
    } else if (isGatePass) {
      borderClass = 'border-emerald-500/60 bg-emerald-950/30';
      textClass = 'text-emerald-300';
    } else if (isGateFail) {
      borderClass = 'border-rose-500/60 bg-rose-950/30';
      textClass = 'text-rose-300';
    } else if (isDimmed) {
      borderClass = 'border-slate-900 bg-slate-950/40 opacity-40';
      textClass = 'text-slate-500';
    }

    return (
      <button
        type="button"
        id={`flow-node-${id}`}
        onClick={() => onSelectChamber(id)}
        className={`w-full max-w-md text-left transition-all duration-200 rounded-lg border p-3 cursor-pointer group relative ${borderClass} ${ringClass}`}
      >
        {/* Top bar: Stage number & title */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded bg-slate-950 border border-slate-800 text-cyan-400 text-xs font-mono">
              {icon}
            </span>
            <span className="font-mono text-xs font-bold tracking-wider uppercase text-slate-100 group-hover:text-cyan-300 transition-colors">
              {numberStr}. {title}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isActive && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700 text-[10px] font-mono font-semibold animate-pulse">
                ACTIVE
              </span>
            )}
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 uppercase">
              {id === 'result' ? '13a' : id === 'recover' ? '13b' : id}
            </span>
          </div>
        </div>

        {/* Sublines description matching user's ASCII prompt */}
        <div className="text-[11px] font-mono text-slate-400 pl-8 space-y-0.5">
          {sublines.map((line, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-slate-600">•</span>
              <span className={isActive ? 'text-slate-300 font-medium' : ''}>{line}</span>
            </div>
          ))}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full flex flex-col items-center py-6 px-4 select-none">
      {/* Top Banner / ASCII Header */}
      <div 
        onClick={() => onSelectChamber('constitution')}
        className="w-full max-w-md text-center p-3 rounded-lg border border-cyan-500/30 bg-slate-900/90 shadow-[0_0_25px_rgba(6,182,212,0.15)] mb-3 cursor-pointer hover:border-cyan-400 transition-colors group"
      >
        <div className="flex items-center justify-center gap-2 text-cyan-400 mb-0.5">
          <Cpu className="w-4 h-4" />
          <span className="font-mono text-xs font-bold tracking-widest uppercase">JARVIS BRAIN ARCHITECTURE</span>
        </div>
        <div className="font-mono text-sm font-extrabold text-white tracking-wider flex items-center justify-center gap-2">
          <span>BRAIN-001 CHAMBER</span>
          <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-slate-950 border border-slate-700 text-cyan-300">
            15 STAGES
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 mt-1">
          Rule 06: Runtime is Truth • Polyglot Execution Substrate
        </div>
      </div>

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-gradient-to-b from-cyan-500 to-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-cyan-400 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 1. PERCEIVE / INPUT */}
      {renderNode(
        'input',
        '1',
        'PERCEIVE / INPUT',
        ['text • image • voice • files • events', `Active Modality: ${state.input.modality.toUpperCase()} (${state.input.byteSize} bytes)`],
        <Search className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 2. TOKENIZE */}
      {renderNode(
        'tokenization',
        '2',
        'TOKENIZE',
        ['normalize → tokenize → token IDs', `${state.tokenization.sequenceLength} tokens (${state.tokenization.tokenizationLatencyMs}ms) • Vocab: 32k`],
        <Binary className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 3. REPRESENT */}
      {renderNode(
        'numerical',
        '3',
        'REPRESENT',
        ['embeddings • vectors • tensors • positions', `Tensor: ${state.numerical.tensorShape} • ${state.numerical.dtype.toUpperCase()} • ${state.numerical.activationFunction}`],
        <Layers className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 4. MEMORY + CONTEXT */}
      {renderNode(
        'memory',
        '4',
        'MEMORY + CONTEXT',
        ['working memory • semantic memory • episodic memory', 'retrieval → ranking → grounding (pgvector)'],
        <Database className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 5. UNDERSTAND */}
      {renderNode(
        'cognition',
        '5',
        'UNDERSTAND',
        ['intent • entities • constraints • state', `Intent: ${state.cognition.intent.slice(0, 32)}... (${(state.cognition.intentConfidence * 100).toFixed(1)}%)`],
        <Brain className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 6. REASON */}
      {renderNode(
        'attention',
        '6',
        'REASON & ATTENTION',
        ['probability • attention • inference • uncertainty', `Attention: softmax(QKᵀ / √dₖ)V • ${state.attention.numHeads} heads`],
        <Grid className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 7. PLAN */}
      {renderNode(
        'planning',
        '7',
        'PLAN',
        ['goal → subtasks • dependencies → DAG', `Critical Path: ${state.planning.criticalPath.join(' → ')} (${state.planning.totalEstimatedDurationMs}ms)`],
        <GitFork className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 8. MODEL ROUTER */}
      {renderNode(
        'model_intelligence',
        '8',
        'MODEL ROUTER',
        ['choose best model • quality / cost / latency / risk', `Selected: ${state.model_intelligence.selectedModel} (${state.model_intelligence.candidates.find(c => c.selected)?.qualityScore} quality)`],
        <Route className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 9. WORKFORCE */}
      {renderNode(
        'workforce',
        '9',
        'WORKFORCE',
        ['Research • Strategy • Builder • Critic • Executor', `+ Adaptive Generalist A/B • Consensus: ${(state.workforce.consensusRate * 100).toFixed(1)}%`],
        <Users className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 10. POLYGLOT EXECUTION SUBSTRATE */}
      <PolyglotNode
        state={state}
        activeChamberId={activeChamberId}
        onSelectChamber={onSelectChamber}
        isRunning={isRunning}
      />

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 11. OBSERVE */}
      {renderNode(
        'observe_verify',
        '11',
        'OBSERVE & RUNTIME EVIDENCE',
        ['actual output • logs • state • diff', `${state.observe_verify.stateDiff.slice(0, 48)}...`],
        <Search className="w-3.5 h-3.5" />
      )}

      {/* Down Connector to Verification Branch */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 12. VERIFY */}
      {renderNode(
        'observe_verify',
        '12',
        'VERIFY',
        ['tests • assertions • benchmark • critic', `Assertions: ${state.observe_verify.assertions.filter(a => a.passed).length}/${state.observe_verify.assertions.length} Passed • Critic: ${state.observe_verify.criticScore}/100`],
        <ShieldCheck className="w-3.5 h-3.5" />
      )}

      {/* BIFURCATION FORK (PASS / FAIL) */}
      <div className="w-full max-w-md my-3 flex flex-col items-center">
        {/* Fork Lines */}
        <div className="w-full flex items-center justify-between px-16 relative">
          <div className="h-4 w-0.5 bg-emerald-500 relative">
            <span className="absolute -top-4 -left-3 text-[10px] font-mono font-bold text-emerald-400 bg-slate-950 px-1 border border-emerald-800 rounded">
              PASS
            </span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-700 mx-1"></div>
          <div className="h-4 w-0.5 bg-rose-500 relative">
            <span className="absolute -top-4 -right-3 text-[10px] font-mono font-bold text-rose-400 bg-slate-950 px-1 border border-rose-800 rounded">
              FAIL
            </span>
          </div>
        </div>

        {/* Dual Branch Cards */}
        <div className="w-full grid grid-cols-2 gap-3 mt-1">
          {/* Branch 13a: RESULT */}
          <button
            type="button"
            id="flow-node-result"
            onClick={() => onSelectChamber('result')}
            className={`text-left p-2.5 rounded-lg border transition-all ${
              !isFail
                ? 'border-emerald-500/80 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'border-slate-800 bg-slate-950/40 opacity-40 hover:opacity-80'
            }`}
          >
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>13. RESULT</span>
            </div>
            <div className="text-[10px] font-mono text-slate-300">
              synthesize • response • audit hash
            </div>
          </button>

          {/* Branch 13b: RECOVER */}
          <button
            type="button"
            id="flow-node-recover"
            onClick={() => onSelectChamber('recover')}
            className={`text-left p-2.5 rounded-lg border transition-all ${
              isFail
                ? 'border-rose-500/80 bg-rose-950/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                : 'border-slate-800 bg-slate-950/40 opacity-40 hover:opacity-80'
            }`}
          >
            <div className="flex items-center gap-1.5 text-rose-400 font-mono text-xs font-bold mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>13. RECOVER</span>
            </div>
            <div className="text-[10px] font-mono text-slate-300">
              diagnose • retry/repair • re-execute
            </div>
          </button>
        </div>

        {/* Merge Lines back into 14. LEARN */}
        <div className="w-full flex items-center justify-between px-16 my-1">
          <div className="h-4 w-0.5 bg-slate-700"></div>
          <div className="flex-1 h-0.5 bg-slate-700 mx-1"></div>
          <div className="h-4 w-0.5 bg-slate-700"></div>
        </div>
        <div className="h-4 w-0.5 bg-slate-700 relative">
          <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
        </div>
      </div>

      {/* 14. LEARN */}
      {renderNode(
        'learning',
        '14',
        'LEARN',
        ['observation → evaluation → lesson → memory', `Synthesized: ${state.learning.rulesFormulated[0]?.id || 'Rule #0042'}`],
        <BookOpen className="w-3.5 h-3.5" />
      )}

      {/* Down Connector */}
      <div className="h-6 w-0.5 bg-slate-700 my-0.5 relative">
        <ArrowDown className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1.5 -left-1.5" />
      </div>

      {/* 15. SELF-MODEL / IMPROVEMENT */}
      {renderNode(
        'self_model',
        '15',
        'SELF-MODEL / IMPROVEMENT',
        ['capability state • failures • benchmarks', 'bounded improvement proposals (Autonomous vs Gated)'],
        <Sliders className="w-3.5 h-3.5" />
      )}

      {/* Loopback Arrow to NEXT CYCLE -> PERCEIVE */}
      <div className="w-full max-w-md flex flex-col items-center mt-3 pt-3 border-t border-dashed border-slate-800">
        <button
          onClick={() => onSelectChamber('controlled_improvement')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-mono text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-cyan-400 ${isRunning ? 'animate-spin' : ''}`} />
          <span>NEXT CYCLE ────────────────► PERCEIVE</span>
        </button>
      </div>
    </div>
  );
};
