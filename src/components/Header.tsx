import React, { useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  ShieldCheck, 
  Sliders, 
  Sparkles, 
  Columns, 
  GitFork, 
  Cpu,
  Layers,
  Activity,
  Scale,
  Save,
  Upload
} from 'lucide-react';
import { ChamberId, Modality } from '../types/brain';
import { PRESET_SCENARIOS, PresetScenario } from '../data/defaultPresets';

interface HeaderProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  cycleNumber: number;
  activeChamberId: ChamberId;
  viewMode: 'flow' | 'split' | 'inspector';
  onChangeViewMode: (mode: 'flow' | 'split' | 'inspector') => void;
  branchOverride: 'AUTO' | 'PASS' | 'FAIL';
  onChangeBranchOverride: (override: 'AUTO' | 'PASS' | 'FAIL') => void;
  selectedPreset: PresetScenario;
  onSelectPreset: (preset: PresetScenario) => void;
  onOpenConstitution: () => void;
  onOpenMathTruth: () => void;
  onOpenCustomStimulus: () => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  onSaveSession?: () => void;
  onLoadSession?: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onTogglePlay,
  onStep,
  onReset,
  cycleNumber,
  activeChamberId,
  viewMode,
  onChangeViewMode,
  branchOverride,
  onChangeBranchOverride,
  selectedPreset,
  onSelectPreset,
  onOpenConstitution,
  onOpenMathTruth,
  onOpenCustomStimulus,
  speed,
  onChangeSpeed,
  onSaveSession,
  onLoadSession,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadSession) {
      onLoadSession(file);
      e.target.value = '';
    }
  };
  return (
    <header className="w-full bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Brand & Cycle Telemetry */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Cpu className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-white tracking-widest">
                JARVIS BRAIN
              </span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-mono font-bold">
                BRAIN-001
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>CYCLE #{String(cycleNumber).padStart(4, '0')}</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 uppercase font-semibold">
                STAGE: {activeChamberId.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Engineering Constitution Quick Button */}
        <button
          onClick={onOpenConstitution}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          title="Inspect 10 Engineering Rules & Evidence Hierarchy"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>CONSTITUTION</span>
        </button>

        {/* Mathematical Truth & Integrity Button */}
        <button
          onClick={onOpenMathTruth}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-xs font-mono text-indigo-300 hover:text-white transition-colors"
          title="Inspect Mathematical Truth, Dependency Integrity DAG & Language Separation"
        >
          <Scale className="w-3.5 h-3.5 text-indigo-400" />
          <span>MATH TRUTH & DAG</span>
        </button>
      </div>

      {/* Center Controls: Scenario Selector & Modality Injector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <span className="text-[11px] font-mono text-slate-400 pl-1 hidden sm:inline">Scenario:</span>
          <select
            value={selectedPreset.id}
            onChange={(e) => {
              const found = PRESET_SCENARIOS.find((p) => p.id === e.target.value);
              if (found) onSelectPreset(found);
            }}
            className="bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 rounded px-2 py-1 outline-none focus:border-cyan-500 max-w-[200px] sm:max-w-[260px] truncate"
          >
            {PRESET_SCENARIOS.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.modality.toUpperCase()}] {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Stimulus Injection */}
        <button
          onClick={onOpenCustomStimulus}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/80 text-xs font-mono text-cyan-300 transition-colors"
          title="Inject custom prompt or multimodal input into Chamber 1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Inject Stimulus</span>
        </button>

        {/* Save & Load Session Controls */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {/* Hidden File Input for Loading */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={onSaveSession}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 text-xs font-mono transition-colors"
            title="Export Current Brain State & Parameters to JSON"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline font-medium">Save Session</span>
          </button>

          <span className="text-slate-700 text-xs">•</span>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-emerald-300 text-xs font-mono transition-colors"
            title="Load Brain Session from JSON File"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline font-medium">Load</span>
          </button>
        </div>
      </div>

      {/* Right Controls: Play / Step / Reset / Branch Override / View Mode */}
      <div className="flex items-center gap-2">
        {/* Verification Branch Override (Rule 04 & 10 Testing) */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <span className="text-[10px] font-mono text-slate-400 px-1">Chamber 12 Gate:</span>
          {(['AUTO', 'PASS', 'FAIL'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeBranchOverride(mode)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                branchOverride === mode
                  ? mode === 'PASS'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : mode === 'FAIL'
                    ? 'bg-rose-950 text-rose-300 border border-rose-700'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Play / Step / Reset Cluster */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={onTogglePlay}
            className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 font-mono font-bold ${
              isRunning ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
            title={isRunning ? 'Pause Loop' : 'Run Cognitive Loop'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="text-[11px] hidden sm:inline">{isRunning ? 'PAUSE' : 'RUN'}</span>
          </button>

          <button
            onClick={onStep}
            disabled={isRunning}
            className="p-1.5 rounded text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Step Forward to Next Chamber"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded text-xs font-mono text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Reset to Input Chamber"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => onChangeViewMode('flow')}
            className={`p-1.5 rounded text-xs transition-colors ${
              viewMode === 'flow' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-white'
            }`}
            title="Cognitive Flowchart View"
          >
            <GitFork className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeViewMode('split')}
            className={`p-1.5 rounded text-xs transition-colors ${
              viewMode === 'split' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-white'
            }`}
            title="Split Flowchart + Chamber Inspector"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeViewMode('inspector')}
            className={`p-1.5 rounded text-xs transition-colors ${
              viewMode === 'inspector' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-white'
            }`}
            title="Deep Chamber Inspector View"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
