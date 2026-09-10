import React from 'react';
import { X, ShieldCheck, Check, Code, AlertCircle, Database, Terminal, Cpu } from 'lucide-react';

interface ConstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConstitutionModal: React.FC<ConstitutionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const corePillars = [
    {
      law: 'MATHEMATICAL TRUTH RULE',
      badge: 'AXIOM 01',
      subtitle: 'Never accept "the library returned a number" as proof',
      desc: 'For every primitive: Mathematical Specification → Reference Implementation → Independent Test or Property → Library Implementation → Cross-Check → Benchmark → Production Integration. Critical operations must be cross-verified against an independent mathematical oracle or dual independent implementations.',
      color: 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300',
    },
    {
      law: 'DEPENDENCY INTEGRITY RULE',
      badge: 'AXIOM 02',
      subtitle: 'Higher-level proof inherits the evidence of its dependencies',
      desc: 'Never implement a higher-level mathematical capability while its required lower-level primitives remain unverified. Attention cannot be declared PROVEN if matrix multiplication, scaling, masking, softmax, or tensor shapes are unverified. Invariant proof cascades down a strict DAG.',
      color: 'border-indigo-500/50 bg-indigo-950/20 text-indigo-300',
    },
    {
      law: 'LANGUAGE SEPARATION RULE',
      badge: 'AXIOM 03',
      subtitle: 'Mathematics is canonical. Implementation language is replaceable.',
      desc: 'Do not allow TypeScript, Python, Rust, PostgreSQL, or JavaScript to redefine the mathematical contract. The invariant stack is immutable: MATHEMATICS → CONTRACT → IMPLEMENTATION → RUNTIME → EVIDENCE.',
      color: 'border-amber-500/50 bg-amber-950/20 text-amber-300',
    },
  ];

  const rules = [
    { num: '01', title: 'Capability first', desc: 'Every component must provide a real, non-trivial capability. Never mock when a simple real implementation is possible.' },
    { num: '02', title: 'Polyglot by purpose', desc: 'Use the best language/runtime for the job. TypeScript for orchestration & API, Python for numerical/ML, SQL for relational & vector, HTML/CSS/JS for operator console, Bash for sandboxing.' },
    { num: '03', title: 'Stable contracts', desc: 'Languages communicate through typed JSON, HTTP, CLI, events, and database tables. Contracts are documented, versioned, and schema-validated.' },
    { num: '04', title: 'No fake intelligence', desc: 'No hardcoded responses, fake embeddings, simulated execution, fake benchmarks, or fallback presented as real capability.' },
    { num: '05', title: 'Fallback ≠ capability', desc: 'A fallback is a safety net, not the implementation. Every fallback must be explicitly measured, logged, and classified.' },
    { num: '06', title: 'Runtime is truth', desc: 'Real runtime evidence is required: execution logs, real outputs, actual state diffs, real test passes, real benchmarks. Compilation alone is not proof.' },
    { num: '07', title: 'Independently testable', desc: 'Every chamber must be testable in isolation with unit tests, integration tests, benchmark suites, and failure-injection tests.' },
    { num: '08', title: 'Replaceability', desc: 'Any model, vector store, tokenizer, sandbox, or agent must be replaceable behind a stable interface with zero impact on callers.' },
    { num: '09', title: 'Security by boundary', desc: 'The Brain has real capabilities. Permissions, sandboxing, resource limits, human-in-the-loop gates, and audit trails are foundational.' },
    { num: '10', title: 'Evidence classification', desc: 'Every result must be classified into the 6-tier evidence hierarchy: PROVEN, REAL-BUT-INCOMPLETE, IMPLEMENTED-UNVERIFIED, FALLBACK, SIMULATED, or FAILED.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-cyan-500/40 rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.2)]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold font-mono text-white tracking-wider">
                PROJECT JARVIS — ENGINEERING CONSTITUTION
              </h2>
              <p className="text-xs font-mono text-slate-400">
                10 Invariant Operational Rules & Polyglot Architectural Fabric
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 font-mono text-xs">
          {/* 3 Core Mathematical Invariant Pillars */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Supreme Mathematical Invariant Axioms</span>
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {corePillars.map((p) => (
                <div key={p.law} className={`p-3.5 rounded-lg border ${p.color} space-y-1.5`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-black/50 border border-current text-[10px] font-bold">
                        {p.badge}
                      </span>
                      <span className="font-bold text-white text-xs">{p.law}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 italic">{p.subtitle}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Grid */}
          <div>
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3">
              The 10 Invariant Operational Rules
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rules.map((rule) => (
                <div key={rule.num} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-bold flex items-center justify-center">
                      {rule.num}
                    </span>
                    <span className="font-bold text-white text-xs">{rule.title}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed pl-8">
                    {rule.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Polyglot Language Fabric */}
          <div>
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3">
              Language Fabric (Rule 02 & 03)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-blue-900/50">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1">
                  <Code className="w-3.5 h-3.5" />
                  <span>TypeScript / Node.js</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Orchestration, pipeline, HTTP/WebSocket API, contracts, CLI runner.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-amber-900/50">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Python / PyTorch</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Numerical intelligence, tensors, embeddings, attention math, model adapters.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-cyan-900/50">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
                  <Database className="w-3.5 h-3.5" />
                  <span>SQL / pgvector</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  PostgreSQL 16, pgvector similarity search, episodic memory ledger.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-emerald-900/50">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Bash / POSIX</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Subprocess boundaries, gVisor sandboxing, seccomp-bpf filters, build runner.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-orange-900/50">
                <div className="flex items-center gap-1.5 text-orange-400 font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>HTML / CSS / JS</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Operator observability console, real-time telemetry, stage inspection.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-purple-900/50">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold mb-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Rule 10 Taxonomy</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Strict 6-tier evidence tracking from PROVEN to FAILED.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono font-bold text-xs hover:bg-cyan-400 transition-colors"
          >
            DISMISS CONSTITUTION
          </button>
        </div>
      </div>
    </div>
  );
};
