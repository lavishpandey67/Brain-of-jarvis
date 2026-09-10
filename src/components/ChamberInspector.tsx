import React, { useState } from 'react';
import { 
  ChamberId, 
  BrainChamberState,
  EvidenceClass,
  Modality,
  CriticHistoryPoint
} from '../types/brain';
import { CHAMBERS } from '../data/chambers';
import { executeCognitiveInference, CognitiveModelResponse } from '../lib/modelClient';
import { RagEngine, RagQueryResult } from '../lib/ragEngine';
import { CriticScoreChart } from './CriticScoreChart';
import { VectorSpaceClusterMap } from './VectorSpaceClusterMap';
import { 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Layers, 
  Database, 
  Brain, 
  Grid, 
  Route, 
  GitFork, 
  Users, 
  Binary, 
  Search, 
  BookOpen, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink,
  Code2,
  Lock,
  Zap,
  Activity,
  Scale,
  Sparkles,
  RefreshCw,
  BookmarkCheck
} from 'lucide-react';

interface ChamberInspectorProps {
  chamberId: ChamberId;
  state: BrainChamberState;
  onUpdateState?: (updater: (prev: BrainChamberState) => BrainChamberState) => void;
  onSelectChamber: (id: ChamberId) => void;
  onOpenMathTruth?: () => void;
  criticHistory?: CriticHistoryPoint[];
}

export const ChamberInspector: React.FC<ChamberInspectorProps> = ({
  chamberId,
  state,
  onUpdateState,
  onSelectChamber,
  onOpenMathTruth,
  criticHistory = [],
}) => {
  const chamberMeta = CHAMBERS.find((c) => c.id === chamberId) || CHAMBERS[0];
  const [copied, setCopied] = useState(false);
  const [activeHead, setActiveHead] = useState(0);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'contract' | 'evidence'>('telemetry');

  // Interactive router sliders
  const [routerWeights, setRouterWeights] = useState({
    quality: 0.45,
    cost: 0.15,
    latency: 0.20,
    reliability: 0.20,
  });

  // Live Model Inference State
  const [isInferring, setIsInferring] = useState(false);
  const [liveInferenceResult, setLiveInferenceResult] = useState<CognitiveModelResponse | null>(null);

  const handleRunLiveInference = async () => {
    setIsInferring(true);
    try {
      const selectedModel = state.model_intelligence.candidates.find((c) => c.selected)?.id || 'gemini-3.6-flash';
      const result = await executeCognitiveInference({
        prompt: state.input.rawPayload,
        model: selectedModel,
        systemInstruction: 'You are PROJECT JARVIS, a rigorous engineering AI. Provide direct, verifiable, high-precision technical answers with zero hallucination.',
      });
      setLiveInferenceResult(result);
      if (result.success && onUpdateState) {
        onUpdateState((prev) => ({
          ...prev,
          result: {
            ...prev.result,
            finalResponse: result.text,
            synthesizedOutput: result.text,
            executionMetrics: {
              ...prev.result.executionMetrics,
              durationMs: result.latencyMs,
              tokensConsumed: result.usage.totalTokens,
            },
          },
        }));
      }
    } finally {
      setIsInferring(false);
    }
  };

  // Live RAG & Memory State (Vertical Slice 2)
  const [ragQuery, setRagQuery] = useState('How does Project JARVIS prevent numerical overflow in norm calculation?');
  const [isRagRunning, setIsRagRunning] = useState(false);
  const [ragResult, setRagResult] = useState<RagQueryResult | null>(null);
  const [ragEngineInstance] = useState(() => new RagEngine(768));

  const handleRunLiveRag = async () => {
    setIsRagRunning(true);
    try {
      await ragEngineInstance.initialize();
      const res = await ragEngineInstance.executeQuery(ragQuery, {
        topK: 3,
        minScore: 0.1,
        alpha: 0.7,
      });
      setRagResult(res);

      if (onUpdateState) {
        onUpdateState((prev) => ({
          ...prev,
          memory: {
            ...prev.memory,
            semanticMemory: res.retrievedChunks.map((c) => ({
              id: c.record.id,
              chunk: c.record.text,
              metadata: {
                source: c.record.metadata.source,
                timestamp: new Date().toISOString(),
                category: c.record.metadata.headingHierarchy[0] || 'Knowledge',
              },
              similarity: c.denseScore,
              rerankScore: c.hybridScore,
            })),
            pgvectorSql: res.pgvectorSqlEquivalent,
            contextTokensAllocated: res.metrics.contextTokens,
            groundingConfidence: res.groundingConfidence,
          },
          result: {
            ...prev.result,
            finalResponse: res.answer,
            synthesizedOutput: res.answer,
            executionMetrics: {
              ...prev.result.executionMetrics,
              durationMs: res.metrics.totalLatencyMs,
              tokensConsumed: res.metrics.contextTokens + res.metrics.queryTokens,
            },
          },
        }));
      }
    } catch (err) {
      console.error('RAG Execution Error:', err);
    } finally {
      setIsRagRunning(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getEvidenceBadge = (ev: EvidenceClass) => {
    switch (ev) {
      case 'PROVEN':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700/80';
      case 'REAL-BUT-INCOMPLETE':
        return 'bg-amber-950 text-amber-300 border-amber-700/80';
      case 'IMPLEMENTED-UNVERIFIED':
        return 'bg-cyan-950 text-cyan-300 border-cyan-700/80';
      case 'FALLBACK':
        return 'bg-orange-950 text-orange-300 border-orange-700/80';
      case 'SIMULATED':
        return 'bg-purple-950 text-purple-300 border-purple-700/80';
      case 'FAILED':
        return 'bg-rose-950 text-rose-300 border-rose-700/80';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'typescript': return 'text-blue-400 border-blue-800 bg-blue-950/40';
      case 'python': return 'text-amber-400 border-amber-800 bg-amber-950/40';
      case 'sql': return 'text-cyan-400 border-cyan-800 bg-cyan-950/40';
      case 'html_css_js': return 'text-orange-400 border-orange-800 bg-orange-950/40';
      case 'bash': return 'text-emerald-400 border-emerald-800 bg-emerald-950/40';
      case 'rust_go': return 'text-purple-400 border-purple-800 bg-purple-950/40';
      default: return 'text-slate-400 border-slate-800 bg-slate-900';
    }
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              CHAMBER {chamberMeta.chamberNumber}
            </span>
            <span className="text-slate-600">/</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${getLanguageColor(chamberMeta.primaryLanguage)}`}>
              {chamberMeta.primaryLanguage.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getEvidenceBadge(chamberMeta.evidenceClass)}`}>
              RULE 10: {chamberMeta.evidenceClass}
            </span>
          </div>

          <h2 className="text-base font-bold text-white font-mono tracking-wide flex items-center gap-2">
            {chamberMeta.title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {chamberMeta.subtitle}
          </p>
        </div>

        {/* Real-time Critic Score Sparkline Monitor in Header */}
        {criticHistory.length > 0 && (
          <div className="hidden xl:flex items-center px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
            <CriticScoreChart
              history={criticHistory}
              currentScore={state.observe_verify.criticScore}
              mode="sparkline"
              height={32}
              showDetails={true}
            />
          </div>
        )}

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              activeTab === 'telemetry' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            Telemetry & Data
          </button>
          <button
            onClick={() => setActiveTab('contract')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              activeTab === 'contract' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stable Contract
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              activeTab === 'evidence' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            Constitution & Evidence
          </button>
        </div>
      </div>

      {/* Main Chamber Body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* CONTRACT VIEW TAB */}
        {activeTab === 'contract' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <div className="text-slate-400 text-[11px]">Primary Language Fabric:</div>
                <div className="text-cyan-300 font-bold mt-0.5">{chamberMeta.primaryLanguage.toUpperCase()}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Contract Type:</div>
                <div className="text-white font-bold mt-0.5">{chamberMeta.contractType}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Boundary Protocol:</div>
                <div className="text-emerald-400 font-bold mt-0.5">Strict Schema Enforced</div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-slate-300 font-bold flex items-center justify-between">
                <span>Contract Interface Definition:</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(chamberMeta, null, 2))}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300"
                >
                  <Copy className="w-3 h-3" /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto">
{`interface ChamberContract_${chamberMeta.chamberNumber} {
  chamberId: "${chamberMeta.id}";
  primaryLanguage: "${chamberMeta.primaryLanguage}";
  contractType: "${chamberMeta.contractType}";
  evidenceClass: "${chamberMeta.evidenceClass}";
  runtimeVerification: {
    seccompProfile: "strict_bpf";
    schemaValidation: "json_schema_draft_2020";
    telemetryStreaming: true;
  };
}`}
              </pre>
            </div>
          </div>
        )}

        {/* EVIDENCE TAB */}
        {activeTab === 'evidence' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
              <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Rule 10 — Evidence Classification</span>
              </h3>
              <p className="text-slate-400 text-xs mb-3">
                Current chamber classification:{' '}
                <span className={`px-2 py-0.5 rounded font-bold border ${getEvidenceBadge(chamberMeta.evidenceClass)}`}>
                  {chamberMeta.evidenceClass}
                </span>
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="font-bold text-emerald-400">PROVEN</span>: Validated against runtime execution evidence with zero mock components.
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400">REAL-BUT-INCOMPLETE</span>: Real algorithm or code executing under partial constraints.
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="font-bold text-cyan-400">IMPLEMENTED-UNVERIFIED</span>: Fully coded but pending formal test suite pass.
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="font-bold text-orange-400">FALLBACK</span>: Explicit fallback triggered; measured for latency penalty.
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="font-bold text-purple-400">SIMULATED</span>: Sandboxed test vector without production environment side-effects.
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="font-bold text-rose-400">FAILED</span>: Anomaly or invariant violation triggered recovery workflow.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TELEMETRY VIEW TAB (SPECIFIC TO EACH CHAMBER) */}
        {activeTab === 'telemetry' && (
          <div>
            {/* 00. CONSTITUTION */}
            {chamberId === 'constitution' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-950 border border-cyan-500/30">
                  <h3 className="text-sm font-bold text-cyan-300 font-mono mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    PROJECT JARVIS: 10 CONSTITUTIONAL RULES
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 01 — Capability first:</span> Every component must provide a real capability.
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 02 — Polyglot by purpose:</span> Use the best language/runtime for the job.
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 03 — Stable contracts:</span> Languages communicate via typed JSON/HTTP/CLI/SQL contracts.
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 04 — No fake intelligence:</span> No hardcoded responses or fake embeddings.
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 05 — Fallback ≠ capability:</span> Every fallback must be identified & measured.
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 06 — Runtime is truth:</span> Compilation or mocked tests are NOT proof.
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 07 — Independently testable:</span> Unit tests, integration tests & benchmarks.
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 08 — Replaceability:</span> Models & vector stores behind stable interfaces.
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 09 — Security by boundary:</span> Sandboxing & permissions are foundational.
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">RULE 10 — Evidence classification:</span> Rigorous 6-tier proof hierarchy.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 01. INPUT / PERCEIVE */}
            {chamberId === 'input' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Modality:</div>
                    <div className="text-sm font-mono font-bold text-cyan-300 mt-1 uppercase">{state.input.modality}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Payload Size:</div>
                    <div className="text-sm font-mono font-bold text-white mt-1">{state.input.byteSize} Bytes</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Signal-to-Noise:</div>
                    <div className="text-sm font-mono font-bold text-emerald-400 mt-1">{state.input.signalToNoiseDb} dB</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">MIME Ingest:</div>
                    <div className="text-xs font-mono font-semibold text-slate-300 mt-1 truncate">{state.input.mimeType}</div>
                  </div>
                </div>

                {/* Raw Input vs Normalized */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-slate-400 font-bold">Raw Payload Buffer:</div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200">
                    {state.input.rawPayload}
                  </div>
                </div>

                {/* Multimodal Specifics */}
                {state.input.imagePatches && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs font-mono text-cyan-300 font-bold">Vision Transformer Patch Grid:</div>
                    <div className="text-xs font-mono text-slate-400">
                      Grid: {state.input.imagePatches.rows}x{state.input.imagePatches.cols} ({state.input.imagePatches.totalPatches} patches, {state.input.imagePatches.patchDimension}px per patch)
                    </div>
                    <div className="grid grid-cols-16 gap-0.5 p-2 bg-slate-900 rounded border border-slate-800 max-w-sm">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className={`h-2.5 rounded-xs ${i % 7 === 0 ? 'bg-cyan-400' : i % 5 === 0 ? 'bg-cyan-600' : 'bg-slate-800'}`} />
                      ))}
                    </div>
                  </div>
                )}

                {state.input.audioSpectrogram && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs font-mono text-cyan-300 font-bold">Acoustic MFCC Spectrogram:</div>
                    <div className="text-xs font-mono text-slate-400">
                      Sample Rate: {state.input.audioSpectrogram.sampleRateHz} Hz • Duration: {state.input.audioSpectrogram.durationSec}s
                    </div>
                    <div className="flex items-end gap-1.5 h-16 p-2 bg-slate-900 rounded border border-slate-800">
                      {state.input.audioSpectrogram.mfccBins.map((bin, i) => (
                        <div
                          key={i}
                          style={{ height: `${Math.min(100, Math.max(15, Math.abs(bin) * 4))}%` }}
                          className="flex-1 bg-cyan-400/80 rounded-t-xs hover:bg-cyan-300 transition-all"
                          title={`MFCC Bin #${i}: ${bin}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 02. TOKENIZATION */}
            {chamberId === 'tokenization' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Sequence Length:</div>
                    <div className="text-sm font-mono font-bold text-cyan-300 mt-1">{state.tokenization.sequenceLength} Tokens</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Latency:</div>
                    <div className="text-sm font-mono font-bold text-emerald-400 mt-1">{state.tokenization.tokenizationLatencyMs} ms</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Compression:</div>
                    <div className="text-sm font-mono font-bold text-white mt-1">{state.tokenization.compressionRatio}x</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Vocab Size:</div>
                    <div className="text-xs font-mono font-semibold text-slate-300 mt-1">32,000 (BPE)</div>
                  </div>
                </div>

                {/* Token Chips */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-slate-400 font-bold">Subword Token Stream (Hover for Token ID):</div>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded bg-slate-900 border border-slate-800">
                    {state.tokenization.tokens.map((tok, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-all ${
                          tok.isSpecial
                            ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                            : tok.text.startsWith('##')
                            ? 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200'
                        }`}
                        title={`Token ID: ${tok.id} | Byte Offset: [${tok.byteOffset.join(', ')}]`}
                      >
                        <span>{tok.text}</span>
                        <span className="text-[9px] text-slate-500 font-mono">#{tok.id}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Token IDs Array */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-xs font-mono text-slate-400 font-bold">Constructed Token IDs Tensor:</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-300 break-all">
                    [{state.tokenization.tokenIds.join(', ')}]
                  </div>
                </div>
              </div>
            )}

            {/* 03. NUMERICAL */}
            {chamberId === 'numerical' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Tensor Shape:</div>
                    <div className="text-sm font-bold text-cyan-300 mt-1">{state.numerical.tensorShape}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Dtype Precision:</div>
                    <div className="text-sm font-bold text-white mt-1 uppercase">{state.numerical.dtype}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Activation:</div>
                    <div className="text-sm font-bold text-emerald-400 mt-1">{state.numerical.activationFunction}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Condition Number:</div>
                    <div className="text-sm font-bold text-slate-200 mt-1">{state.numerical.conditionNumber} (Stable)</div>
                  </div>
                </div>

                {/* Vector Sample */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Continuous Vector Projection (x ∈ ℝ^4096 Sample):</div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800 text-cyan-300 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {state.numerical.vectorSample.map((val, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                        <span className="text-slate-500">dim[{idx}]:</span>
                        <span className={val >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{val.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Linear Layer Matrix Math: y = Wx + b */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Linear Transformation Kernel: y = Wx + b</div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[11px]">Weight Matrix Sub-Block W ∈ ℝ^(4×4):</div>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {state.numerical.weightMatrixSample.flatMap((row, r) =>
                        row.map((val, c) => (
                          <div key={`${r}-${c}`} className="p-1 bg-slate-950 rounded text-center text-slate-300">
                            {val.toFixed(2)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 04. MEMORY */}
            {chamberId === 'memory' && (
              <div className="space-y-4 font-mono text-xs">
                {/* LIVE RAG CONTROLLER (VERTICAL SLICE 2) */}
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white tracking-wide">
                        CHAMBER 04: LIVE RAG & CANONICAL VECTOR ENGINE
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                        VERTICAL SLICE 2
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Embedding Model:</span>
                      <span className="text-cyan-300 font-bold">gemini-embedding-2-preview</span>
                      <span className="text-slate-600">|</span>
                      <span>Dim:</span>
                      <span className="text-white font-bold">768</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Query Context / Memory Retrieval Prompt:</span>
                      <span className="text-slate-500">Dense + BM25 Lexical Hybrid Search (α = 0.70)</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ragQuery}
                        onChange={(e) => setRagQuery(e.target.value)}
                        placeholder="Enter technical query for memory retrieval..."
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={handleRunLiveRag}
                        disabled={isRagRunning || !ragQuery.trim()}
                        className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                          isRagRunning
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                        }`}
                      >
                        {isRagRunning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Retrieving & Inferring...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Execute Real RAG</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Query Quick Presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 py-0.5">Presets:</span>
                      {[
                        { label: 'Norm Stability', q: 'How does Project JARVIS prevent numerical overflow in norm calculation?' },
                        { label: 'Tokenizer Invertibility', q: 'What guarantees the Invertibility Theorem for arbitrary byte payloads?' },
                        { label: 'Memory Tiers', q: 'Explain the difference between working, episodic, and semantic memory.' },
                        { label: 'Fault Recovery', q: 'What are the recovery steps when an execution node encounters NaN?' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => setRagQuery(preset.q)}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Real RAG Results Panel */}
                  {ragResult && (
                    <div className="mt-3 p-3.5 rounded-lg bg-slate-900/90 border border-emerald-500/30 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Embedding Latency:</div>
                          <div className="text-xs font-bold text-cyan-300 mt-0.5">{ragResult.metrics.embeddingLatencyMs} ms</div>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Retrieval Latency:</div>
                          <div className="text-xs font-bold text-emerald-300 mt-0.5">{ragResult.metrics.retrievalLatencyMs} ms</div>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Inference Latency:</div>
                          <div className="text-xs font-bold text-purple-300 mt-0.5">{ragResult.metrics.inferenceLatencyMs} ms</div>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Grounding Score:</div>
                          <div className="text-xs font-bold text-amber-300 mt-0.5">{(ragResult.groundingConfidence * 100).toFixed(1)}%</div>
                        </div>
                      </div>

                      {/* Retrieved Chunks with Citations */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                          <span>Retrieved Knowledge Chunks ({ragResult.retrievedChunks.length}):</span>
                          <span className="text-[10px] text-slate-500">Ranked by Hybrid Score</span>
                        </div>
                        <div className="space-y-2">
                          {ragResult.retrievedChunks.map((res, i) => (
                            <div key={i} className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-cyan-300 flex items-center gap-1">
                                  <BookmarkCheck className="w-3 h-3 text-emerald-400" />
                                  REF-{i + 1} ({res.record.metadata.source})
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Dense Cosine: <b className="text-emerald-400">{res.denseScore.toFixed(4)}</b></span>
                                  <span className="text-slate-400">Hybrid: <b className="text-cyan-400">{res.hybridScore.toFixed(4)}</b></span>
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-300 line-clamp-3">
                                {res.record.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Grounded Synthesis */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-800">
                        <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Grounded Cognitive Model Synthesis:
                        </div>
                        <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                          {ragResult.answer}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3D VECTOR SPACE CLUSTER MAP & KNOWLEDGE GAP ANALYZER (D3.JS) */}
                <VectorSpaceClusterMap />

                {/* Context Token Budget Bar */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Context Window Allocation:</span>
                    <span className="text-cyan-300 font-bold">
                      {state.memory.contextTokensAllocated.toLocaleString()} / {state.memory.contextBudgetMax.toLocaleString()} Tokens
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${Math.min(100, (state.memory.contextTokensAllocated / state.memory.contextBudgetMax) * 100)}%` }}
                      className="h-full bg-cyan-400 rounded-full"
                    />
                  </div>
                </div>

                {/* Tri-tier Memory Tabs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Working Memory */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" /> Working Memory
                    </div>
                    <div className="space-y-1 text-slate-300 text-[11px]">
                      {state.memory.workingMemory.map((line, i) => (
                        <div key={i} className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Episodic Memory */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="font-bold text-purple-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Episodic Memory
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      {state.memory.episodicMemory.map((ep, i) => (
                        <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800">
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-300">{ep.cycleId}</span>
                            <span className={ep.outcome === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}>
                              {ep.outcome}
                            </span>
                          </div>
                          <div className="text-slate-400 mt-1">{ep.keyLesson}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Semantic pgvector Memory */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" /> Semantic pgvector RAG
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      {state.memory.semanticMemory.map((rec) => (
                        <div key={rec.id} className="p-2 rounded bg-slate-900 border border-slate-800">
                          <div className="flex justify-between text-slate-400">
                            <span className="font-bold text-cyan-300">{rec.id}</span>
                            <span className="text-emerald-400">cos: {rec.similarity.toFixed(3)}</span>
                          </div>
                          <div className="text-slate-300 mt-1 line-clamp-2">{rec.chunk}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PostgreSQL pgvector SQL Statement */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-slate-400 font-bold flex items-center justify-between">
                    <span>PostgreSQL 16 + pgvector Cosine Query:</span>
                    <button
                      onClick={() => handleCopy(ragResult ? ragResult.pgvectorSqlEquivalent : state.memory.pgvectorSql)}
                      className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy SQL
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-cyan-200 overflow-x-auto">
                    {ragResult ? ragResult.pgvectorSqlEquivalent : state.memory.pgvectorSql}
                  </pre>
                </div>
              </div>
            )}

            {/* 05. COGNITION */}
            {chamberId === 'cognition' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[11px]">Parsed Cognitive Intent:</div>
                    <div className="text-sm font-bold text-cyan-300 mt-0.5">{state.cognition.intent}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-[11px]">Confidence:</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {(state.cognition.intentConfidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Named Entities */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Extracted Named Entities (NER):</div>
                  <div className="flex flex-wrap gap-2">
                    {state.cognition.entities.map((ent, i) => (
                      <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
                        <span className="font-bold text-white">{ent.text}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] text-cyan-400 border border-slate-700">
                          {ent.type}
                        </span>
                        <span className="text-[10px] text-slate-500">{(ent.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hard & Soft Constraints */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="font-bold text-rose-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Hard Invariant Constraints
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {state.cognition.hardConstraints.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-400">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Soft Optimization Constraints
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {state.cognition.softConstraints.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-cyan-400">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Uncertainty & Reasoning Path */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold">Epistemic vs Aleatoric Uncertainty:</span>
                    <span>Epistemic: {state.cognition.epistemicUncertainty} | Aleatoric: {state.cognition.aleatoricUncertainty}</span>
                  </div>
                  <div className="space-y-1 pt-2">
                    <div className="text-slate-400 text-[11px] font-bold">Reasoning Trace:</div>
                    {state.cognition.reasoningPath.map((step, i) => (
                      <div key={i} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 06. ATTENTION */}
            {chamberId === 'attention' && (
              <div className="space-y-4 font-mono text-xs">
                {/* Math Header */}
                <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/30">
                  <div className="text-cyan-300 font-bold mb-1 font-mono text-sm">
                    {"Attention(Q, K, V) = softmax( (Q · Kᵀ) / √d_k ) · V"}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Heads: {state.attention.numHeads} • Head Dim d_k: {state.attention.headDim} • Hidden Dim: {state.attention.hiddenDim} • RoPE Step: {state.attention.ropeAngleStep}
                  </div>
                </div>

                {/* Mathematical Truth & Dependency Integrity Rule Enforcement Panel */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-indigo-500/40 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-white text-xs">
                        DEPENDENCY INTEGRITY RULE: PROOF INHERITANCE
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                        5/5 PRIMITIVES PROVEN
                      </span>
                    </div>

                    {onOpenMathTruth && (
                      <button
                        onClick={onOpenMathTruth}
                        className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <GitFork className="w-3 h-3" />
                        <span>Interactive DAG & Cross-Check Console</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    "Do not declare ATTENTION proven if matrix multiplication, scaling, masking, softmax, or tensor shapes are unverified. Higher-level proof inherits the evidence of its dependencies."
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                      <div className="text-slate-400 text-[10px] font-bold">1. Tensor Shapes</div>
                      <div className="text-cyan-300 text-[10px] font-mono">[B, S, D]</div>
                      <div className="text-emerald-400 text-[10px] font-bold">PROVEN (Δ=0.0)</div>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                      <div className="text-slate-400 text-[10px] font-bold">2. Matrix Mul</div>
                      <div className="text-cyan-300 text-[10px] font-mono">Q · Kᵀ</div>
                      <div className="text-emerald-400 text-[10px] font-bold">PROVEN (Δ&le;1e-15)</div>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                      <div className="text-slate-400 text-[10px] font-bold">3. Scaling Factor</div>
                      <div className="text-cyan-300 text-[10px] font-mono">1/√d_k = 0.125</div>
                      <div className="text-emerald-400 text-[10px] font-bold">PROVEN (Δ=0.0)</div>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                      <div className="text-slate-400 text-[10px] font-bold">4. Causal Mask</div>
                      <div className="text-cyan-300 text-[10px] font-mono">M_ij (lower tri)</div>
                      <div className="text-emerald-400 text-[10px] font-bold">PROVEN (Δ=0.0)</div>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                      <div className="text-slate-400 text-[10px] font-bold">5. Softmax</div>
                      <div className="text-cyan-300 text-[10px] font-mono">Σ p_i = 1.000</div>
                      <div className="text-emerald-400 text-[10px] font-bold">PROVEN (Δ&le;4e-16)</div>
                    </div>
                  </div>
                </div>

                {/* Head Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-slate-400 text-[11px] mr-1">Select Head:</span>
                  {Array.from({ length: state.attention.numHeads }).map((_, h) => (
                    <button
                      key={h}
                      onClick={() => setActiveHead(h)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        activeHead === h ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold' : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Head #{h + 1}
                    </button>
                  ))}
                </div>

                {/* Attention Weight Matrix Heatmap */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Self-Attention Weights Heatmap:</div>
                  <div className="overflow-x-auto">
                    <table className="border-collapse">
                      <thead>
                        <tr>
                          <th className="p-1 text-[10px] text-slate-500 font-mono">Q \ K</th>
                          {state.attention.tokens.map((tok, c) => (
                            <th key={c} className="p-1 text-[10px] font-mono text-slate-400 max-w-[60px] truncate">
                              {tok}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {state.attention.attentionMatrix.map((row, r) => (
                          <tr key={r}>
                            <td className="p-1 text-[10px] font-mono text-slate-400 font-semibold max-w-[60px] truncate">
                              {state.attention.tokens[r]}
                            </td>
                            {row.map((val, c) => {
                              const opacity = Math.min(1, Math.max(0.1, val * 3));
                              return (
                                <td
                                  key={c}
                                  className="p-1 text-center font-mono text-[10px] transition-colors cursor-pointer"
                                  style={{
                                    backgroundColor: `rgba(6, 182, 212, ${opacity})`,
                                    color: opacity > 0.5 ? '#000' : '#fff',
                                  }}
                                  title={`Q: ${state.attention.tokens[r]} -> K: ${state.attention.tokens[c]} | Attention: ${(val * 100).toFixed(1)}%`}
                                >
                                  {val.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Q, K, V Vector Projections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold">Query Vector $Q[0]$:</div>
                    <div className="text-[11px] text-slate-300">
                      [{state.attention.qVectorSample.map((v) => v.toFixed(2)).join(', ')}]
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold">Key Vector $K[0]$:</div>
                    <div className="text-[11px] text-slate-300">
                      [{state.attention.kVectorSample.map((v) => v.toFixed(2)).join(', ')}]
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold">Value Vector $V[0]$:</div>
                    <div className="text-[11px] text-slate-300">
                      [{state.attention.vVectorSample.map((v) => v.toFixed(2)).join(', ')}]
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 07. MODEL INTELLIGENCE */}
            {chamberId === 'model_intelligence' && (
              <div className="space-y-4 font-mono text-xs">
                {/* Weight Sliders */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Pareto Metric Balancing Weights:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Quality:</span>
                        <span>{routerWeights.quality.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={0.8}
                        step={0.05}
                        value={routerWeights.quality}
                        onChange={(e) => setRouterWeights({ ...routerWeights, quality: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Cost:</span>
                        <span>{routerWeights.cost.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.6}
                        step={0.05}
                        value={routerWeights.cost}
                        onChange={(e) => setRouterWeights({ ...routerWeights, cost: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Latency:</span>
                        <span>{routerWeights.latency.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.6}
                        step={0.05}
                        value={routerWeights.latency}
                        onChange={(e) => setRouterWeights({ ...routerWeights, latency: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Reliability:</span>
                        <span>{routerWeights.reliability.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.6}
                        step={0.05}
                        value={routerWeights.reliability}
                        onChange={(e) => setRouterWeights({ ...routerWeights, reliability: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Candidate Models Table */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Candidates Evaluation & Selection Matrix:</div>
                  <div className="space-y-2">
                    {state.model_intelligence.candidates.map((model) => (
                      <div
                        key={model.id}
                        className={`p-3 rounded-lg border transition-all ${
                          model.selected
                            ? 'bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{model.name}</span>
                            <span className="text-[10px] text-slate-400">({model.provider})</span>
                          </div>
                          {model.selected ? (
                            <span className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold text-[10px]">
                              ROUTED (SELECTED)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Standby</span>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-300">
                          <div>Quality: <span className="font-bold text-emerald-400">{model.qualityScore}/100</span></div>
                          <div>Cost: <span className="font-bold text-slate-200">${model.costPer1m}/1M</span></div>
                          <div>Latency: <span className="font-bold text-cyan-300">{model.latencyP95Ms}ms</span></div>
                          <div>Score: <span className="font-bold text-purple-300">{model.compositeScore}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Routing Rationale */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 font-bold mb-1">Routing Rationale:</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {state.model_intelligence.routingRationale}
                  </p>
                </div>

                {/* Live Model Inference Execution (Real Gemini API) */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-cyan-900/60 shadow-inner space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white text-xs">Live Cognitive Gateway Execution</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      LIVE GEMINI RUNTIME
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dispatches the current stimulus payload through the server-side proxy to Google Gemini, measuring exact latency and real token consumption.
                  </p>

                  <button
                    onClick={handleRunLiveInference}
                    disabled={isInferring}
                    className={`w-full py-2.5 px-4 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      isInferring
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-950/50'
                    }`}
                  >
                    {isInferring ? (
                      <>
                        <Activity className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Awaiting Neural Gateway Response...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-cyan-300" />
                        <span>Dispatch Live Model Inference</span>
                      </>
                    )}
                  </button>

                  {liveInferenceResult && (
                    <div className="mt-3 p-3 rounded bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Model: <strong className="text-cyan-300">{liveInferenceResult.model}</strong></span>
                        <span className="text-slate-400">Latency: <strong className="text-emerald-400">{liveInferenceResult.latencyMs}ms</strong></span>
                        <span className="text-slate-400">Tokens: <strong className="text-purple-300">{liveInferenceResult.usage.totalTokens}</strong></span>
                      </div>
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed">
                        {liveInferenceResult.text}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 08. PLANNING */}
            {chamberId === 'planning' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                  <div>
                    <div className="text-slate-400 text-[11px]">Primary Goal:</div>
                    <div className="text-sm font-bold text-cyan-300 mt-0.5">{state.planning.goal}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-[11px]">Compute FLOPs Budget:</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{state.planning.flopsBudget}</div>
                  </div>
                </div>

                {/* Critical Path */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-slate-400 font-bold">Critical Path (Total: {state.planning.totalEstimatedDurationMs}ms):</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {state.planning.criticalPath.map((nodeId, i) => (
                      <React.Fragment key={nodeId}>
                        <span className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-300 font-bold">
                          {nodeId}
                        </span>
                        {i < state.planning.criticalPath.length - 1 && (
                          <span className="text-slate-600">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Subtask DAG Table */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Decomposed DAG Task Nodes:</div>
                  <div className="space-y-1.5">
                    {state.planning.dagNodes.map((task) => (
                      <div key={task.id} className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-700 font-bold">
                            {task.id}
                          </span>
                          <span className="text-slate-200">{task.label}</span>
                          <span className="text-[10px] text-slate-500">[{task.assignedRole}]</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-400">{task.estimatedMs}ms</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            task.risk === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-950 text-slate-400'
                          }`}>
                            {task.risk} RISK
                          </span>
                          <span className="text-emerald-400 font-semibold">{task.status.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 09. WORKFORCE */}
            {chamberId === 'workforce' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                  <div>
                    <div className="text-slate-400 text-[11px]">Consensus Agreement Rate:</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {(state.workforce.consensusRate * 100).toFixed(1)}% Agreement
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Squad Formation:</div>
                    <div className="text-sm font-bold text-cyan-300 mt-0.5">
                      {state.workforce.squad.length} Autonomous Agents
                    </div>
                  </div>
                </div>

                {/* Squad Members */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {state.workforce.squad.map((agent) => (
                    <div key={agent.role} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-cyan-300">{agent.role}</div>
                        <span className="text-[10px] text-slate-400 font-semibold">{agent.modelAssigned}</span>
                      </div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">
                        {agent.workOutput}
                      </div>
                      <div className="text-right text-[10px] text-emerald-400 font-semibold">
                        Agreement: {(agent.agreementScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. EXECUTION */}
            {chamberId === 'execution' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[11px] mb-1">Sandbox Security Boundary:</div>
                  <div className="text-cyan-300 font-bold">{state.execution.sandboxProfile}</div>
                </div>

                {/* Tool Actions */}
                <div className="space-y-2">
                  <div className="text-slate-400 font-bold">Executed Sandboxed Tool Actions:</div>
                  {state.execution.actions.map((act) => (
                    <div key={act.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-700 font-bold">
                          {act.toolName}
                        </span>
                        <code className="text-slate-200 text-[11px]">{act.command}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{act.executionTimeMs}ms</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                          EXIT {act.exitCode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* System Logs */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-bold">POSIX Execution Console Logs:</div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-0.5 text-[11px] text-slate-300 font-mono">
                    {state.execution.systemLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 11. OBSERVE + VERIFY */}
            {chamberId === 'observe_verify' && (
              <div className="space-y-4 font-mono text-xs">
                {/* Bifurcation Banner */}
                <div className={`p-4 rounded-lg border ${
                  state.observe_verify.gateDecision === 'PASS'
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {state.observe_verify.gateDecision === 'PASS' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      )}
                      <span className="text-sm font-bold tracking-wide text-white">
                        GATE VERDICT: {state.observe_verify.gateDecision} → BIFURCATING TO{' '}
                        {state.observe_verify.gateDecision === 'PASS' ? 'CHAMBER 13. RESULT' : 'CHAMBER 13. RECOVER'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-300">
                      Critic: {state.observe_verify.criticScore}/100
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1">
                    {state.observe_verify.gateRationale}
                  </p>
                </div>

                {/* Real-time Critic Score Fluctuation Chart across Previous Cycles */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span>Critic Score Fluctuations Across Cycles</span>
                    </span>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      Evaluator Threshold: &ge; 75.0% for PASS
                    </span>
                  </div>
                  <CriticScoreChart
                    history={criticHistory}
                    currentScore={state.observe_verify.criticScore}
                    mode="both"
                    height={62}
                    showDetails={true}
                  />
                </div>

                {/* Assertions Table */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Runtime Assertions Checklist:</div>
                  <div className="space-y-1.5">
                    {state.observe_verify.assertions.map((ast) => (
                      <div key={ast.id} className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-white font-bold">{ast.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Expected: <span className="text-slate-300">{ast.expected}</span> | Actual: <span className={ast.passed ? 'text-emerald-400' : 'text-rose-400'}>{ast.actual}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          ast.passed ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}>
                          {ast.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diff Summary */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-bold">Observed State Diff:</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    {state.observe_verify.stateDiff}
                  </div>
                </div>
              </div>
            )}

            {/* 12a. RESULT */}
            {chamberId === 'result' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-700/80">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SYNTHESIZED RESPONSE & AUDIT BUNDLE (SUCCESS)</span>
                  </div>
                  <div className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {state.result.finalResponse}
                  </div>
                </div>

                {/* Audit Signature */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-bold">Ed25519 Cryptographic Proof Signature:</div>
                  <code className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-300 block break-all">
                    {state.result.auditSignature}
                  </code>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Total Duration:</div>
                    <div className="text-sm font-bold text-white mt-1">{state.result.executionMetrics.durationMs}ms</div>
                  </div>
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Tokens Consumed:</div>
                    <div className="text-sm font-bold text-cyan-300 mt-1">{state.result.executionMetrics.tokensConsumed}</div>
                  </div>
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Total Cost:</div>
                    <div className="text-sm font-bold text-emerald-400 mt-1">${state.result.executionMetrics.totalCostUsd.toFixed(4)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 12b. RECOVER */}
            {chamberId === 'recover' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-700/80">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>AUTOMATED FAULT RECOVERY & HEALING DISPATCH</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400">Diagnostic:</span>
                      <p className="text-slate-200 mt-0.5">{state.recover.diagnostic}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Root Cause:</span>
                      <p className="text-slate-200 mt-0.5">{state.recover.rootCause}</p>
                    </div>
                  </div>
                </div>

                {/* Repair Diff Patch */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-bold">Synthesized Remedial Patch:</div>
                  <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 text-[11px] overflow-x-auto">
                    {state.recover.remedialPatch}
                  </pre>
                </div>

                <div className="flex justify-between items-center p-3 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Retry Counter: {state.recover.retryAttempt} / {state.recover.maxRetries}</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                    ACTION: {state.recover.recoveryAction}
                  </span>
                </div>
              </div>
            )}

            {/* 13. LEARNING */}
            {chamberId === 'learning' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Episodic Observation & Evaluation:</div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    {state.learning.observationReview}
                  </div>
                </div>

                {/* Distilled Rule */}
                <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/40 space-y-2">
                  <div className="text-cyan-400 font-bold">Formulated Invariant Rules:</div>
                  {state.learning.rulesFormulated.map((rule) => (
                    <div key={rule.id} className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>{rule.id}</span>
                        <span className="text-emerald-400">Confidence: {(rule.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">Trigger: {rule.triggerCondition}</div>
                      <div className="text-cyan-300 text-[11px] font-semibold">Action: {rule.actionGuideline}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-400">
                  Memory Consolidation Target: <span className="text-emerald-300">{state.learning.memoryConsolidationTarget}</span>
                </div>
              </div>
            )}

            {/* 14. SELF-MODEL */}
            {chamberId === 'self_model' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Subsystem Capability Calibration:</div>
                  <div className="space-y-2">
                    {state.self_model.capabilities.map((cap) => (
                      <div key={cap.name} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-200">{cap.name}</span>
                          <span className="text-cyan-300 font-bold">{cap.score}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                          <div style={{ width: `${cap.score}%` }} className="h-full bg-cyan-400 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Completed Cycles:</div>
                    <div className="text-sm font-bold text-white mt-1">{state.self_model.successCount}</div>
                  </div>
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Failure Ledger:</div>
                    <div className="text-sm font-bold text-rose-400 mt-1">{state.self_model.failureCount}</div>
                  </div>
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Verification Rate:</div>
                    <div className="text-sm font-bold text-emerald-400 mt-1">{state.self_model.verificationPassRate}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* 15. CONTROLLED IMPROVEMENT */}
            {chamberId === 'controlled_improvement' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-slate-400 text-[11px]">Improvement Governance Mode:</div>
                    <div className="text-cyan-300 font-bold mt-0.5">{state.controlled_improvement.governanceMode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-[11px]">Rollback Checkpoint:</div>
                    <div className="text-emerald-400 font-bold mt-0.5">READY (Zero Rollbacks)</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-slate-400 font-bold">Active Bounded Improvement Proposals:</div>
                  {state.controlled_improvement.proposals.map((prop) => (
                    <div key={prop.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-cyan-300">{prop.id} → {prop.targetChamber}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">
                          {prop.riskTier}
                        </span>
                      </div>
                      <p className="text-slate-200 text-[11px]">{prop.description}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                        <span>Gain: <span className="text-emerald-400">{prop.projectedDelta}</span></span>
                        <span>Status: <span className="text-cyan-400">{prop.status}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
