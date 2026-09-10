import React, { useState } from 'react';
import { X, Sparkles, Send, FileText, Image as ImageIcon, Mic, Radio } from 'lucide-react';
import { Modality } from '../types/brain';

interface CustomStimulusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, modality: Modality) => void;
}

export const CustomStimulusModal: React.FC<CustomStimulusModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [prompt, setPrompt] = useState('');
  const [modality, setModality] = useState<Modality>('text');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit(prompt.trim(), modality);
    onClose();
  };

  const samplePrompts = [
    { mod: 'text' as const, label: 'C-Kernel Spinlock Invariant', text: 'Validate atomic spinlock acquiring order in net/core/dev.c to prevent CPU priority inversion under high interrupt load.' },
    { mod: 'image' as const, label: 'Thermal Sensor Anomaly', text: 'Ingest thermal camera patch tensor at 12mK. Flag hot spot localized around qubit resonator coupling line.' },
    { mod: 'audio' as const, label: 'Orbital Maneuver Voice', text: '"Jarvis, compute retrograde burn vector of 142.5 m/s at perigee T-minus 4 minutes to avoid debris track 881-Echo."' },
    { mod: 'events' as const, label: 'DEX Arbitrage Attack (Fail Trigger)', text: 'Execute triangular flash-loan arbitrage on Uniswap/Curve pools. Maximum allowable slippage tolerance: 0.05%.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-950 border border-cyan-500/40 rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.2)]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold font-mono text-white tracking-wider">
                INJECT COGNITIVE STIMULUS
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Direct Multimodal Ingestion into Chamber 01 (PERCEIVE)
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 font-mono text-xs">
          {/* Modality Selector */}
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 uppercase">
              Select Input Ingestion Modality:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'text', label: 'Text Payload', icon: <FileText className="w-3.5 h-3.5" /> },
                { id: 'image', label: 'Image Tensor', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                { id: 'audio', label: 'Audio PCM', icon: <Mic className="w-3.5 h-3.5" /> },
                { id: 'events', label: 'Event Stream', icon: <Radio className="w-3.5 h-3.5" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModality(m.id as Modality)}
                  className={`p-2.5 rounded-lg border flex items-center gap-2 transition-all ${
                    modality === m.id
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Area */}
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 uppercase">
              Stimulus Content / Directive:
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter technical directive, code snippet, sensor telemetry query, or prompt..."
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none font-mono text-xs"
            />
          </div>

          {/* Sample Prompts */}
          <div>
            <label className="block text-slate-500 font-bold mb-1.5">
              Quick Ingestion Templates:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samplePrompts.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPrompt(s.text);
                    setModality(s.mod);
                  }}
                  className="p-2 rounded bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-left transition-colors"
                >
                  <div className="font-bold text-cyan-400 text-[11px] mb-0.5">
                    [{s.mod.toUpperCase()}] {s.label}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-2">
                    {s.text}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>INJECT INTO BRAIN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
