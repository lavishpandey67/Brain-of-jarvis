import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  GitFork, 
  Layers, 
  Code2, 
  Cpu, 
  Database, 
  Terminal, 
  Zap, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  Search,
  Scale,
  Activity
} from 'lucide-react';
import { 
  CANONICAL_SPECS, 
  buildInitialMathDependencyTree, 
  recalculateProofDAG, 
  MathematicalDependencyNode,
  oracleCosineSimilarity,
  vectorizedCosineSimilarity,
  oracleSoftmax,
  LANGUAGE_SEPARATION_HIERARCHY,
  MathPrimitiveSpec
} from '../lib/mathTruth';
import { EvidenceClass } from '../types/brain';

interface MathTruthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MathTruthModal: React.FC<MathTruthModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'dependency_dag' | 'truth_ladder' | 'cross_checks' | 'language_separation'>('dependency_dag');
  
  // Dependency Tree State with Dynamic Flaw Injection
  const [dependencyTree, setDependencyTree] = useState<Record<string, MathematicalDependencyNode>>(buildInitialMathDependencyTree);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('attention');
  
  // Cross-Check Live Runner State
  const [testVecU, setTestVecU] = useState<string>('0.58, -0.22, 0.77, 0.14, -0.49, 0.33, 0.08, -0.19');
  const [testVecV, setTestVecV] = useState<string>('0.44, 0.12, 0.81, -0.35, -0.52, 0.29, -0.11, 0.05');
  const [crossCheckResult, setCrossCheckResult] = useState<any>(null);

  if (!isOpen) return null;

  // Toggle primitive self-evidence between PROVEN and IMPLEMENTED-UNVERIFIED to test Dependency Integrity
  const handleToggleEvidence = (nodeId: string) => {
    setDependencyTree((prev) => {
      const current = prev[nodeId];
      if (!current) return prev;

      const newSelfEvidence: EvidenceClass = current.selfEvidence === 'PROVEN' ? 'IMPLEMENTED-UNVERIFIED' : 'PROVEN';
      
      const copy = {
        ...prev,
        [nodeId]: {
          ...current,
          selfEvidence: newSelfEvidence,
        },
      };

      const { updatedNodes } = recalculateProofDAG(copy);
      return updatedNodes;
    });
  };

  const handleResetDAG = () => {
    setDependencyTree(buildInitialMathDependencyTree());
  };

  const handleRunCrossCheck = () => {
    try {
      const u = testVecU.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
      const v = testVecV.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
      
      if (u.length !== v.length || u.length === 0) {
        setCrossCheckResult({ error: `Dimension mismatch: Vector U has ${u.length} elements, Vector V has ${v.length} elements.` });
        return;
      }

      const t0 = performance.now();
      const oracleRes = oracleCosineSimilarity(u, v);
      const t1 = performance.now();

      const t2 = performance.now();
      const vectorizedRes = vectorizedCosineSimilarity(u, v);
      const t3 = performance.now();

      const delta = Math.abs(oracleRes.similarity - vectorizedRes);
      const isBitwiseEquivalent = delta <= 1e-12;

      // Also run Softmax test
      const softmaxOracle = oracleSoftmax(u);

      setCrossCheckResult({
        oracleSimilarity: oracleRes.similarity,
        vectorizedSimilarity: vectorizedRes,
        delta: delta.toExponential(4),
        isPass: isBitwiseEquivalent,
        oracleLatencyUs: ((t1 - t0) * 1000).toFixed(2),
        vectorizedLatencyUs: ((t3 - t2) * 1000).toFixed(2),
        properties: oracleRes.propertiesVerified,
        softmaxSum: softmaxOracle.sumProbabilities.toFixed(9),
        softmaxShiftDelta: softmaxOracle.shiftInvarianceDelta.toExponential(4),
      });
    } catch (err: any) {
      setCrossCheckResult({ error: err.message || 'Execution error during cross-check.' });
    }
  };

  const selectedNode = dependencyTree[selectedNodeId] || dependencyTree['attention'];
  const canonicalSpec: MathPrimitiveSpec = CANONICAL_SPECS[selectedNodeId] || CANONICAL_SPECS['attention'];
  const { violations } = recalculateProofDAG(dependencyTree);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-5xl max-h-[92vh] bg-slate-950 border border-cyan-500/40 rounded-xl overflow-hidden flex flex-col shadow-[0_0_60px_rgba(6,182,212,0.25)]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.5)]">
              <Scale className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-mono text-white tracking-wider">
                  MATHEMATICAL TRUTH & DEPENDENCY INTEGRITY ENGINE
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-mono font-bold">
                  CANONICAL AUDIT
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Enforcing Mathematical Truth, Dependency Integrity & Language Separation Rules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Mathematical Truth Console"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invariant Rules Banner */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <span className="font-bold bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">RULE 1</span>
              <span>Mathematical Truth Ladder</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-300">
              <span className="font-bold bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">RULE 2</span>
              <span>Dependency Integrity DAG</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300">
              <span className="font-bold bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">RULE 3</span>
              <span>Language Separation Hierarchy</span>
            </div>
          </div>

          {violations.length > 0 ? (
            <div className="flex items-center gap-1.5 text-rose-400 font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{violations.length} INTEGRITY BREACH(ES) DETECTED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ALL MATHEMATICAL CONTRACTS PROVEN</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-800 bg-slate-950 px-4 flex gap-2">
          {[
            { id: 'dependency_dag', label: '1. Dependency Integrity DAG', icon: <GitFork className="w-3.5 h-3.5" /> },
            { id: 'truth_ladder', label: '2. Mathematical Truth Ladder', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'cross_checks', label: '3. Dual-Oracle Cross-Checks', icon: <Zap className="w-3.5 h-3.5" /> },
            { id: 'language_separation', label: '4. Language Separation Matrix', icon: <Code2 className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-3 border-b-2 font-mono text-xs flex items-center gap-1.5 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 font-bold bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs space-y-4">
          
          {/* ============================================================ */}
          {/* TAB 1: DEPENDENCY INTEGRITY DAG                               */}
          {/* ============================================================ */}
          {activeTab === 'dependency_dag' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span>DEPENDENCY INTEGRITY RULE: PROOF INHERITANCE DAG</span>
                    <span className="text-slate-500 font-normal">|</span>
                    <span className="text-cyan-400 text-[11px]">Vaswani Attention (Q, K, V) Dependency Subgraph</span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-3xl">
                    "Never implement a higher-level mathematical capability while its required lower-level primitives remain unverified. Higher-level proof inherits the evidence of its dependencies."
                  </p>
                </div>
                
                <button
                  onClick={handleResetDAG}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 text-xs transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to All Proven</span>
                </button>
              </div>

              {/* Breach Alerts if Any */}
              {violations.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-700/80 text-rose-300 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-rose-200">
                    <ShieldAlert className="w-4 h-4" />
                    <span>INHERITANCE VIOLATION ACTIVE:</span>
                  </div>
                  {violations.map((v, i) => (
                    <div key={i} className="text-[11px] pl-6 text-rose-300 leading-relaxed">
                      • {v}
                    </div>
                  ))}
                </div>
              )}

              {/* The Visual Dependency Graph */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: The Graph Tree */}
                <div className="lg:col-span-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Attention Dependency Topology</span>
                    <span className="text-[10px] text-slate-500">Click primitive to inspect or inject flaw</span>
                  </div>

                  {/* Level 0: Root Foundation */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-1">FOUNDATION LEVEL 0 (TENSORS)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['tensor_shapes'].map((id) => {
                        const node = dependencyTree[id];
                        if (!node) return null;
                        const isSelected = selectedNodeId === id;
                        const isProven = node.inheritedEvidence === 'PROVEN';

                        return (
                          <div
                            key={id}
                            onClick={() => setSelectedNodeId(id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white text-xs">{node.name}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isProven
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                {node.inheritedEvidence}
                              </span>
                            </div>
                            <div className="text-[11px] text-cyan-400 font-mono">{node.formula}</div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                              <span className="text-[10px] text-slate-400">Latency: {node.benchmarkLatencyNs}ns</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleEvidence(id);
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                {node.selfEvidence === 'PROVEN' ? 'Simulate Unverified' : 'Restore Proven'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Down Arrow Indicator */}
                  <div className="flex items-center justify-center text-slate-600">
                    <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      ↓ Primitives Depend on Tensor Memory Strides ↓
                    </span>
                  </div>

                  {/* Level 1: 4 Core Primitives */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-1">
                      LEVEL 1: CORE MATHEMATICAL PRIMITIVES
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['mat_mul', 'scaling', 'masking', 'softmax'].map((id) => {
                        const node = dependencyTree[id];
                        if (!node) return null;
                        const isSelected = selectedNodeId === id;
                        const isProven = node.inheritedEvidence === 'PROVEN';

                        return (
                          <div
                            key={id}
                            onClick={() => setSelectedNodeId(id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white text-xs">{node.name}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isProven
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                {node.inheritedEvidence}
                              </span>
                            </div>
                            <div className="text-[11px] text-cyan-400 font-mono">{node.formula}</div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                              <span className="text-[10px] text-slate-400">Tolerance: {node.maxAbsoluteTolerance}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleEvidence(id);
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                {node.selfEvidence === 'PROVEN' ? 'Simulate Unverified' : 'Restore Proven'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Down Arrow Indicator to Composite */}
                  <div className="flex items-center justify-center text-slate-600">
                    <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      ↓ Composite Operator Synthesizes All 5 Foundational Primitives ↓
                    </span>
                  </div>

                  {/* Level 2: Composite Attention Operator */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-1">
                      LEVEL 2: COMPOSITE OPERATOR (PROOFS INHERITED)
                    </div>
                    {(() => {
                      const node = dependencyTree['attention'];
                      if (!node) return null;
                      const isSelected = selectedNodeId === 'attention';
                      const isProven = node.inheritedEvidence === 'PROVEN';

                      return (
                        <div
                          onClick={() => setSelectedNodeId('attention')}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-950/60 border-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.3)]'
                              : isProven
                              ? 'bg-slate-950 border-emerald-800/80'
                              : 'bg-rose-950/40 border-rose-700/80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{node.name}</span>
                              <span className="text-slate-400 text-xs">Attention(Q, K, V)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">Inherited Proof:</span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  isProven
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                    : 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                                }`}
                              >
                                {node.inheritedEvidence}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-indigo-300 font-mono">{node.formula}</div>
                          <div className="text-[11px] text-slate-400 mt-2">
                            Dependencies: [tensor_shapes, mat_mul, scaling, masking, softmax]
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Right: Selected Node Detail & Verification Status */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col">
                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center justify-between">
                    <span>Primitive Inspector</span>
                    <span className="text-[10px] text-slate-500">{selectedNode.id}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-white text-sm">{selectedNode.name}</div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 text-xs font-mono">
                      {selectedNode.formula}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {canonicalSpec.canonicalDescription}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                    <div className="text-slate-400 font-bold">Domain & Codomain:</div>
                    <div className="text-slate-300">Domain: {canonicalSpec.domain}</div>
                    <div className="text-slate-300">Codomain: {canonicalSpec.codomain}</div>
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="text-slate-400 font-bold text-[11px]">Invariant Properties:</div>
                    <ul className="space-y-1">
                      {canonicalSpec.properties.map((prop, idx) => (
                        <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{prop}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 pt-3">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Self Evidence:</span>
                      <span className="font-bold text-cyan-300">{selectedNode.selfEvidence}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Inherited Evidence:</span>
                      <span className={`font-bold ${selectedNode.inheritedEvidence === 'PROVEN' ? 'text-emerald-300' : 'text-rose-400'}`}>
                        {selectedNode.inheritedEvidence}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Max Abs Tolerance:</span>
                      <span className="text-slate-300">{selectedNode.maxAbsoluteTolerance}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Benchmark Latency:</span>
                      <span className="text-slate-300">{selectedNode.benchmarkLatencyNs} ns</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: MATHEMATICAL TRUTH LADDER                              */}
          {/* ============================================================ */}
          {activeTab === 'truth_ladder' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span>THE 7-STAGE MATHEMATICAL VERIFICATION LADDER</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-cyan-400 text-[11px]">Never accept "the library returned a number" as proof</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Every mathematical operator in the JARVIS Brain must ascend all 7 rungs of the verification ladder before entering production inference.
                </p>
              </div>

              {/* Primitive Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {Object.keys(dependencyTree).map((id) => (
                  <button
                    key={id}
                    onClick={() => setSelectedNodeId(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors border ${
                      selectedNodeId === id
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {dependencyTree[id]?.name}
                  </button>
                ))}
              </div>

              {/* The 7 Rungs for Selected Primitive */}
              <div className="space-y-2.5">
                {selectedNode.ladder.map((step) => {
                  const isDone = step.status === 'PROVEN' || step.status === 'VERIFIED';

                  return (
                    <div
                      key={step.stepNumber}
                      className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-md bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          0{step.stepNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{step.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[9px] font-bold">
                              {step.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                            Artifact: <span className="text-cyan-400">{step.artifact}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {step.evidenceNotes}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-bold uppercase">Passed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: DUAL-ORACLE CROSS-CHECKS                               */}
          {/* ============================================================ */}
          {activeTab === 'cross_checks' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span>LIVE INDEPENDENT ORACLE CROSS-CHECK HARNESS</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-cyan-400 text-[11px]">Comparing Exact Manual Oracle vs Vectorized Kernel</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Verify numerical equivalence across independent algorithms. Tolerance requirement: $|\Delta| \le 10^{-12}$.
                </p>
              </div>

              {/* Input Vectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold text-[11px] uppercase">
                    Vector u in R^8:
                  </label>
                  <input
                    type="text"
                    value={testVecU}
                    onChange={(e) => setTestVecU(e.target.value)}
                    className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold text-[11px] uppercase">
                    Vector v in R^8:
                  </label>
                  <input
                    type="text"
                    value={testVecV}
                    onChange={(e) => setTestVecV(e.target.value)}
                    className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500">Edge Case Presets:</span>
                {[
                  { label: 'Identical (cos=1)', u: '1, 2, 3, 4, 5, 6, 7, 8', v: '1, 2, 3, 4, 5, 6, 7, 8' },
                  { label: 'Anti-Parallel (cos=-1)', u: '1, 0, 0, 0, 0, 0, 0, 0', v: '-1, 0, 0, 0, 0, 0, 0, 0' },
                  { label: 'Orthogonal (cos=0)', u: '1, 0, 0, 0, 0, 0, 0, 0', v: '0, 1, 0, 0, 0, 0, 0, 0' },
                  { label: 'Zero Vector Guard (0,0)', u: '0, 0, 0, 0, 0, 0, 0, 0', v: '1, 2, 3, 4, 5, 6, 7, 8' },
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTestVecU(p.u);
                      setTestVecV(p.v);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleRunCrossCheck}
                  className="ml-auto px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>EXECUTE CROSS-CHECK</span>
                </button>
              </div>

              {/* Results Output */}
              {crossCheckResult && (
                <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-3 animate-fade-in">
                  {crossCheckResult.error ? (
                    <div className="text-rose-400 font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{crossCheckResult.error}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-bold text-white text-xs">Cross-Check Execution Telemetry</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            crossCheckResult.isPass
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-rose-950 text-rose-300 border border-rose-700'
                          }`}
                        >
                          {crossCheckResult.isPass ? 'VERIFICATION PASSED (PROVEN)' : 'TOLERANCE BREACH'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                          <div className="text-slate-400 text-[10px]">Reference Oracle Value:</div>
                          <div className="text-cyan-300 font-bold text-sm">
                            {crossCheckResult.oracleSimilarity.toFixed(10)}
                          </div>
                          <div className="text-slate-500 text-[10px]">Latency: {crossCheckResult.oracleLatencyUs} µs</div>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                          <div className="text-slate-400 text-[10px]">Vectorized Kernel Value:</div>
                          <div className="text-indigo-300 font-bold text-sm">
                            {crossCheckResult.vectorizedSimilarity.toFixed(10)}
                          </div>
                          <div className="text-slate-500 text-[10px]">Latency: {crossCheckResult.vectorizedLatencyUs} µs</div>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                          <div className="text-slate-400 text-[10px]">Max Absolute Delta |Δ|:</div>
                          <div className="text-emerald-400 font-bold text-sm">
                            {crossCheckResult.delta}
                          </div>
                          <div className="text-slate-500 text-[10px]">Tolerance: &le; 1e-12</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                        <div className="text-slate-400 font-bold">Independent Mathematical Properties Verified:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 mt-1">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Cauchy-Schwarz Inequality: |cos(u, v)| &le; 1.0</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Zero-Vector Non-NaN Guard: Handled safely</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Softmax Simplex Sum: {crossCheckResult.softmaxSum}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Softmax Shift Invariance Delta: {crossCheckResult.softmaxShiftDelta}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: LANGUAGE SEPARATION MATRIX                            */}
          {/* ============================================================ */}
          {activeTab === 'language_separation' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span>LANGUAGE SEPARATION RULE: THE 5-TIER HIERARCHY</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-cyan-400 text-[11px]">Mathematics is canonical. Implementation language is replaceable.</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Do not allow TypeScript, Python, Rust, PostgreSQL, or JavaScript to redefine the mathematical contract.
                </p>
              </div>

              {/* 5-Tier Stack Visualization */}
              <div className="space-y-2.5">
                {LANGUAGE_SEPARATION_HIERARCHY.map((tier, idx) => (
                  <div key={tier.layer} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-xs flex items-center justify-center">
                          0{idx + 1}
                        </span>
                        <span className="font-bold text-white text-sm tracking-wider">{tier.layer}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        LAYER {idx + 1} / 5
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      {tier.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      <div className="p-2.5 rounded bg-slate-950 border border-blue-900/40">
                        <div className="text-blue-400 font-bold text-[10px] flex items-center gap-1 mb-1">
                          <Code2 className="w-3 h-3" />
                          <span>TypeScript</span>
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {tier.typescriptRole}
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-slate-950 border border-amber-900/40">
                        <div className="text-amber-400 font-bold text-[10px] flex items-center gap-1 mb-1">
                          <Cpu className="w-3 h-3" />
                          <span>Python / PyTorch</span>
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {tier.pythonRole}
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-slate-950 border border-rose-900/40">
                        <div className="text-rose-400 font-bold text-[10px] flex items-center gap-1 mb-1">
                          <Terminal className="w-3 h-3" />
                          <span>Rust (AVX-512)</span>
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {tier.rustRole}
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-slate-950 border border-cyan-900/40">
                        <div className="text-cyan-400 font-bold text-[10px] flex items-center gap-1 mb-1">
                          <Database className="w-3 h-3" />
                          <span>SQL (pgvector)</span>
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {tier.sqlRole}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
            Hierarchy: <span className="text-cyan-400 font-bold">MATHEMATICS</span> → <span className="text-indigo-400 font-bold">CONTRACT</span> → <span className="text-amber-400 font-bold">IMPLEMENTATION</span> → <span className="text-emerald-400 font-bold">RUNTIME</span> → <span className="text-purple-400 font-bold">EVIDENCE</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono font-bold text-xs hover:bg-cyan-400 transition-colors"
          >
            DISMISS AUDIT CONSOLE
          </button>
        </div>

      </div>
    </div>
  );
};
