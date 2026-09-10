import React, { useState, useEffect, useRef } from 'react';
import { 
  ChamberId, 
  BrainChamberState, 
  Modality, 
  BrainEventLog, 
  CriticHistoryPoint, 
  BrainSessionData 
} from './types/brain';
import { CHAMBERS } from './data/chambers';
import { PRESET_SCENARIOS, PresetScenario, buildBrainState } from './data/defaultPresets';
import { Header } from './components/Header';
import { FlowGraph } from './components/FlowGraph';
import { ChamberInspector } from './components/ChamberInspector';
import { EventLogPanel } from './components/EventLogPanel';
import { ConstitutionModal } from './components/ConstitutionModal';
import { CustomStimulusModal } from './components/CustomStimulusModal';
import { MathTruthModal } from './components/MathTruthModal';

const STAGE_SEQUENCE: ChamberId[] = [
  'input',
  'tokenization',
  'numerical',
  'memory',
  'cognition',
  'attention',
  'planning',
  'model_intelligence',
  'workforce',
  'execution',
  'observe_verify',
  // Result or Recover chosen dynamically based on gateDecision
  'learning',
  'self_model',
  'controlled_improvement',
];

export function App() {
  const [selectedPreset, setSelectedPreset] = useState<PresetScenario>(PRESET_SCENARIOS[0]);
  const [cycleNumber, setCycleNumber] = useState(42);
  const [branchOverride, setBranchOverride] = useState<'AUTO' | 'PASS' | 'FAIL'>('AUTO');
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [viewMode, setViewMode] = useState<'flow' | 'split' | 'inspector'>('split');
  const [activeChamberId, setActiveChamberId] = useState<ChamberId>('observe_verify');
  const [isConstitutionOpen, setIsConstitutionOpen] = useState(false);
  const [isMathTruthOpen, setIsMathTruthOpen] = useState(false);
  const [isCustomStimulusOpen, setIsCustomStimulusOpen] = useState(false);
  const [isLogPanelCollapsed, setIsLogPanelCollapsed] = useState(false);

  // Generate initial brain telemetry state
  const [brainState, setBrainState] = useState<BrainChamberState>(() =>
    buildBrainState(
      PRESET_SCENARIOS[0].prompt,
      PRESET_SCENARIOS[0].modality,
      42,
      undefined
    )
  );

  // Critic Score History across previous cycles
  const [criticHistory, setCriticHistory] = useState<CriticHistoryPoint[]>([
    { cycle: 36, score: 91.2, outcome: 'PASS', rationale: 'All invariants verified.' },
    { cycle: 37, score: 94.8, outcome: 'PASS', rationale: 'Model response matches mathematical truth.' },
    { cycle: 38, score: 88.5, outcome: 'PASS', rationale: 'Memory retrieval grounding verified.' },
    { cycle: 39, score: 42.0, outcome: 'FAIL', rationale: 'Simulated breach: assertion AST-03 failed.' },
    { cycle: 40, score: 96.5, outcome: 'PASS', rationale: 'Recovery patch restored state integrity.' },
    { cycle: 41, score: 98.1, outcome: 'PASS', rationale: 'Topological DAG validated with zero cycles.' },
    { cycle: 42, score: 99.4, outcome: 'PASS', rationale: 'High-confidence inference with 100% grounding.' },
  ]);

  // Real-time Event Logs for the current execution cycle
  const [eventLogs, setEventLogs] = useState<BrainEventLog[]>(() => {
    const now = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return [
      {
        id: 'evt_boot_1',
        timestamp: now,
        cycleNumber: 42,
        chamberId: 'input',
        chamberNumber: '02',
        level: 'info',
        category: 'TRANSITION',
        title: 'Cognitive Engine Initialized',
        details: 'Cycle #0042 booted with scenario: [TEXT] Complex Mathematical & Coding Request',
      },
      {
        id: 'evt_boot_2',
        timestamp: now,
        cycleNumber: 42,
        chamberId: 'observe_verify',
        chamberNumber: '11',
        level: 'success',
        category: 'GATE',
        title: 'Observe & Verify Gate: PASS (99.4%)',
        details: 'All 4 mission-critical invariants satisfied. Bifurcating to Chamber 12a RESULT.',
      },
    ];
  });

  // Event Logger Helper
  const logEvent = (
    chamberId: ChamberId,
    category: BrainEventLog['category'],
    title: string,
    level: BrainEventLog['level'] = 'info',
    details?: string,
    metadata?: Record<string, any>
  ) => {
    const ch = CHAMBERS.find((c) => c.id === chamberId);
    const newLog: BrainEventLog = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cycleNumber,
      chamberId,
      chamberNumber: ch?.chamberNumber || '00',
      level,
      category,
      title,
      details,
      metadata,
    };
    setEventLogs((prev) => [...prev.slice(-150), newLog]);
  };

  // Synchronize current cycle critic score with history
  useEffect(() => {
    const currentScore = brainState.observe_verify.criticScore;
    const currentOutcome = brainState.observe_verify.gateDecision;
    const currentRationale = brainState.observe_verify.gateRationale;

    setCriticHistory((prev) => {
      const idx = prev.findIndex((p) => p.cycle === cycleNumber);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { 
          cycle: cycleNumber, 
          score: currentScore, 
          outcome: currentOutcome, 
          rationale: currentRationale 
        };
        return copy;
      } else {
        return [
          ...prev.slice(-14),
          { 
            cycle: cycleNumber, 
            score: currentScore, 
            outcome: currentOutcome, 
            rationale: currentRationale 
          },
        ];
      }
    });
  }, [cycleNumber, brainState.observe_verify.criticScore, brainState.observe_verify.gateDecision, brainState.observe_verify.gateRationale]);

  // Handle Preset changes
  const handleSelectPreset = (preset: PresetScenario) => {
    setSelectedPreset(preset);
    const forceGate = branchOverride === 'AUTO' ? preset.defaultOutcome : branchOverride;
    const newState = buildBrainState(preset.prompt, preset.modality, cycleNumber, forceGate);
    setBrainState(newState);
    setActiveChamberId('input');
    logEvent(
      'input',
      'TRANSITION',
      `Loaded Scenario: [${preset.modality.toUpperCase()}] ${preset.name}`,
      'info',
      `Prompt: "${preset.prompt.substring(0, 80)}..." | Default gate: ${preset.defaultOutcome}`
    );
  };

  // Handle Custom Stimulus injection
  const handleCustomStimulus = (prompt: string, modality: Modality) => {
    const customPreset: PresetScenario = {
      id: 'custom_' + Date.now(),
      name: 'Custom Stimulus Ingestion',
      modality,
      prompt,
      description: 'Operator-injected multimodal stimulus into Chamber 01',
      defaultOutcome: prompt.toLowerCase().includes('fail') ? 'FAIL' : 'PASS',
    };
    setSelectedPreset(customPreset);
    const forceGate = branchOverride === 'AUTO' ? customPreset.defaultOutcome : branchOverride;
    const nextCycle = cycleNumber + 1;
    const newState = buildBrainState(prompt, modality, nextCycle, forceGate);
    setCycleNumber(nextCycle);
    setBrainState(newState);
    setActiveChamberId('input');
    logEvent(
      'input',
      'TRANSITION',
      `Custom Stimulus Ingested (${modality.toUpperCase()}) for Cycle #${nextCycle}`,
      'info',
      `Payload size: ${prompt.length} bytes. Projected outcome: ${customPreset.defaultOutcome}`
    );
  };

  // Handle Branch Override change
  const handleChangeBranchOverride = (override: 'AUTO' | 'PASS' | 'FAIL') => {
    setBranchOverride(override);
    const forceGate = override === 'AUTO' ? selectedPreset.defaultOutcome : override;
    const isFail = forceGate === 'FAIL';
    const critic = isFail ? 42.0 : 99.4;

    setBrainState((prev) => ({
      ...prev,
      gateDecision: isFail ? 'FAIL' : 'PASS',
      observe_verify: {
        ...prev.observe_verify,
        gateDecision: isFail ? 'FAIL' : 'PASS',
        criticScore: critic,
        evidenceClass: isFail ? 'FAILED' : 'PROVEN',
        gateRationale: isFail
          ? 'Assertion check breached invariant. Bifurcating to Chamber 12b RECOVER.'
          : 'All mission-critical assertions passed. Bifurcating to Chamber 12a RESULT.',
      },
    }));

    logEvent(
      'observe_verify',
      'GATE',
      `Branch Override Configured: ${override} (Critic: ${critic.toFixed(1)}%)`,
      isFail ? 'warning' : 'success',
      isFail 
        ? 'Forced Chamber 11 Gate to FAIL. Bifurcation set to Chamber 12b RECOVER.'
        : 'Forced Chamber 11 Gate to PASS. Bifurcation set to Chamber 12a RESULT.'
    );
  };

  // Step function to move forward one chamber
  const handleStep = () => {
    const currentId = activeChamberId;
    const isFail = brainState.gateDecision === 'FAIL';
    let nextId: ChamberId;

    if (currentId === 'observe_verify') {
      nextId = isFail ? 'recover' : 'result';
    } else if (currentId === 'result' || currentId === 'recover') {
      nextId = 'learning';
    } else if (currentId === 'controlled_improvement') {
      // Loopback to input with next cycle!
      const nextCycle = cycleNumber + 1;
      setCycleNumber(nextCycle);
      nextId = 'input';
      logEvent(
        'controlled_improvement',
        'TRANSITION',
        `Cycle #${cycleNumber} Completed. Initializing Cycle #${nextCycle}`,
        'success',
        `Telemetry consolidated. Continuous loopback routed to Chamber 02 (Input).`
      );
    } else {
      const currIdx = STAGE_SEQUENCE.indexOf(currentId);
      if (currIdx >= 0 && currIdx < STAGE_SEQUENCE.length - 1) {
        nextId = STAGE_SEQUENCE[currIdx + 1];
      } else {
        nextId = 'input';
      }
    }

    setActiveChamberId(nextId);

    // Emit chronological status update in the real-time event log
    const ch = CHAMBERS.find((c) => c.id === nextId);
    let category: BrainEventLog['category'] = 'TRANSITION';
    let level: BrainEventLog['level'] = 'info';
    let details = `Transitioned to Chamber ${ch?.chamberNumber || ''} (${nextId.replace('_', ' ').toUpperCase()}).`;

    if (nextId === 'observe_verify') {
      category = 'GATE';
      level = isFail ? 'warning' : 'success';
      details = `Gate Decision: ${brainState.gateDecision} | Critic Score: ${brainState.observe_verify.criticScore}%`;
    } else if (nextId === 'memory') {
      category = 'MEMORY';
      details = `Allocated ${brainState.memory.vectorMemory.length} semantic vectors. Context budget: ${brainState.memory.contextTokensAllocated} tokens.`;
    } else if (nextId === 'model_intelligence') {
      category = 'INFERENCE';
      details = `Prepared prompt tensor for model execution. Temperature: ${brainState.model_intelligence.runtimeParams.temperature}.`;
    } else if (nextId === 'result') {
      category = 'ASSERTION';
      level = 'success';
      details = `Result synthesized with audit hash: ${brainState.result.auditHash}`;
    } else if (nextId === 'recover') {
      category = 'CRITIC';
      level = 'error';
      details = `Fault detected: ${brainState.recover.faultAnalysis.rootCause}. Remedial patch dispatched.`;
    }

    logEvent(nextId, category, `Executing Chamber ${ch?.chamberNumber}: ${ch?.title || nextId}`, level, details);
  };

  // Reset function
  const handleReset = () => {
    setIsRunning(false);
    setActiveChamberId('input');
    logEvent('input', 'TRANSITION', 'Execution Loop Reset to Input Chamber', 'info');
  };

  // Save Session Handler (Export to JSON)
  const handleSaveSession = () => {
    const sessionData: BrainSessionData = {
      schemaVersion: 'jarvis-session-v1',
      exportedAt: new Date().toISOString(),
      cycleNumber,
      activeChamberId,
      branchOverride,
      speed,
      selectedPresetId: selectedPreset.id,
      selectedPresetName: selectedPreset.name,
      brainState,
      eventLogs,
      criticHistory,
    };

    const jsonStr = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis_brain_session_cycle_${cycleNumber}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logEvent(
      activeChamberId,
      'SESSION',
      `Brain Session Exported (Cycle #${cycleNumber})`,
      'success',
      `Saved complete state, parameters, ${criticHistory.length} cycle points, and ${eventLogs.length} events to JSON.`
    );
  };

  // Load Session Handler (Import from JSON)
  const handleLoadSession = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON format');
        }

        if (!parsed.brainState) {
          throw new Error('Missing brainState object in session file');
        }

        if (parsed.cycleNumber !== undefined) {
          setCycleNumber(Number(parsed.cycleNumber));
        }
        if (parsed.activeChamberId) {
          setActiveChamberId(parsed.activeChamberId);
        }
        if (parsed.branchOverride) {
          setBranchOverride(parsed.branchOverride);
        }
        if (parsed.speed) {
          setSpeed(Number(parsed.speed));
        }
        if (parsed.selectedPresetId) {
          const found = PRESET_SCENARIOS.find((p) => p.id === parsed.selectedPresetId);
          if (found) setSelectedPreset(found);
        }
        if (parsed.brainState) {
          setBrainState(parsed.brainState);
        }
        if (Array.isArray(parsed.criticHistory)) {
          setCriticHistory(parsed.criticHistory);
        }

        const loadedLogs = Array.isArray(parsed.eventLogs) ? parsed.eventLogs : [];
        const restorationLog: BrainEventLog = {
          id: 'evt_load_' + Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cycleNumber: parsed.cycleNumber ?? cycleNumber,
          chamberId: parsed.activeChamberId ?? 'input',
          chamberNumber: '00',
          level: 'success',
          category: 'SESSION',
          title: `Session Loaded: ${file.name}`,
          details: `Successfully restored Cycle #${parsed.cycleNumber ?? cycleNumber}, Active Chamber: ${parsed.activeChamberId ?? activeChamberId}, Gate: ${parsed.brainState?.gateDecision ?? 'PASS'}`,
        };

        setEventLogs([...loadedLogs.slice(-120), restorationLog]);
      } catch (err: any) {
        console.error('Failed to parse session JSON:', err);
        logEvent(
          activeChamberId,
          'SESSION',
          `Failed to load session: ${file.name}`,
          'error',
          err.message || 'Corrupted or incompatible JSON structure'
        );
      }
    };
    reader.readAsText(file);
  };

  // Execution Timer Loop
  useEffect(() => {
    if (!isRunning) return;

    const intervalMs = Math.max(400, 1400 / speed);
    const timer = setInterval(() => {
      handleStep();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, speed, activeChamberId, brainState.gateDecision, cycleNumber]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Operator Console Header with Save/Load Session */}
      <Header
        isRunning={isRunning}
        onTogglePlay={() => {
          const willRun = !isRunning;
          setIsRunning(willRun);
          logEvent(activeChamberId, 'TRANSITION', willRun ? 'Continuous Loop Started' : 'Continuous Loop Paused', 'info');
        }}
        onStep={handleStep}
        onReset={handleReset}
        cycleNumber={cycleNumber}
        activeChamberId={activeChamberId}
        viewMode={viewMode}
        onChangeViewMode={(mode) => {
          setViewMode(mode);
          logEvent(activeChamberId, 'TRANSITION', `Switched View Mode to ${mode.toUpperCase()}`, 'info');
        }}
        branchOverride={branchOverride}
        onChangeBranchOverride={handleChangeBranchOverride}
        selectedPreset={selectedPreset}
        onSelectPreset={handleSelectPreset}
        onOpenConstitution={() => setIsConstitutionOpen(true)}
        onOpenMathTruth={() => setIsMathTruthOpen(true)}
        onOpenCustomStimulus={() => setIsCustomStimulusOpen(true)}
        speed={speed}
        onChangeSpeed={setSpeed}
        onSaveSession={handleSaveSession}
        onLoadSession={handleLoadSession}
      />

      {/* Main Workspace Layout based on View Mode */}
      <main className="flex-1 flex overflow-hidden">
        {/* VIEW MODE: FLOW ONLY */}
        {viewMode === 'flow' && (
          <div className="flex-1 overflow-y-auto p-4 flex justify-center">
            <div className="w-full max-w-2xl">
              <FlowGraph
                state={brainState}
                activeChamberId={activeChamberId}
                onSelectChamber={(id) => {
                  setActiveChamberId(id);
                  setViewMode('split');
                  logEvent(id, 'TRANSITION', `Navigated to Chamber ${id.toUpperCase()} from Flowchart`, 'info');
                }}
                isRunning={isRunning}
              />
            </div>
          </div>
        )}

        {/* VIEW MODE: SPLIT (FLOWGRAPH ON LEFT, CHAMBER INSPECTOR ON RIGHT, REAL-TIME EVENT LOG AT BOTTOM) */}
        {viewMode === 'split' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Split Main Area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
              {/* Left Column: Flowchart */}
              <div className="w-full lg:w-[460px] border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto p-2 bg-slate-950/40 shrink-0">
                <FlowGraph
                  state={brainState}
                  activeChamberId={activeChamberId}
                  onSelectChamber={(id) => {
                    setActiveChamberId(id);
                    logEvent(id, 'TRANSITION', `Selected Chamber ${id.toUpperCase()} in Split View`, 'info');
                  }}
                  isRunning={isRunning}
                />
              </div>

              {/* Right Column: Deep Chamber Inspector */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-950/20">
                <ChamberInspector
                  chamberId={activeChamberId}
                  state={brainState}
                  onUpdateState={setBrainState}
                  onSelectChamber={(id) => {
                    setActiveChamberId(id);
                    logEvent(id, 'TRANSITION', `Navigated to Chamber ${id.toUpperCase()}`, 'info');
                  }}
                  onOpenMathTruth={() => setIsMathTruthOpen(true)}
                  criticHistory={criticHistory}
                />
              </div>
            </div>

            {/* Real-time Event Log Panel Docked in Split View Mode */}
            <div className="shrink-0">
              <EventLogPanel
                logs={eventLogs}
                onClearLogs={() => {
                  setEventLogs([]);
                  logEvent(activeChamberId, 'SESSION', 'Event logs cleared by operator', 'info');
                }}
                onSelectChamber={(id) => {
                  setActiveChamberId(id);
                  logEvent(id, 'TRANSITION', `Navigated to Chamber ${id.toUpperCase()} from Event Log`, 'info');
                }}
                isCollapsed={isLogPanelCollapsed}
                onToggleCollapse={() => setIsLogPanelCollapsed(!isLogPanelCollapsed)}
              />
            </div>
          </div>
        )}

        {/* VIEW MODE: INSPECTOR ONLY */}
        {viewMode === 'inspector' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
            {/* Stage Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
              {CHAMBERS.map((ch) => {
                const isActive = activeChamberId === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChamberId(ch.id);
                      logEvent(ch.id, 'TRANSITION', `Navigated to Chamber ${ch.chamberNumber}`, 'info');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors border ${
                      isActive
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ch.chamberNumber}. {ch.title.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Full-width Inspector */}
            <div className="flex-1 overflow-hidden">
              <ChamberInspector
                chamberId={activeChamberId}
                state={brainState}
                onUpdateState={setBrainState}
                onSelectChamber={(id) => {
                  setActiveChamberId(id);
                  logEvent(id, 'TRANSITION', `Navigated to Chamber ${id.toUpperCase()}`, 'info');
                }}
                onOpenMathTruth={() => setIsMathTruthOpen(true)}
                criticHistory={criticHistory}
              />
            </div>
          </div>
        )}
      </main>

      {/* Constitution Modal */}
      <ConstitutionModal
        isOpen={isConstitutionOpen}
        onClose={() => setIsConstitutionOpen(false)}
      />

      {/* Mathematical Truth & Integrity DAG Modal */}
      <MathTruthModal
        isOpen={isMathTruthOpen}
        onClose={() => setIsMathTruthOpen(false)}
      />

      {/* Custom Stimulus Modal */}
      <CustomStimulusModal
        isOpen={isCustomStimulusOpen}
        onClose={() => setIsCustomStimulusOpen(false)}
        onSubmit={handleCustomStimulus}
      />
    </div>
  );
}

export default App;
