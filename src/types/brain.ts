export type EvidenceClass =
  | 'PROVEN'
  | 'REAL-BUT-INCOMPLETE'
  | 'IMPLEMENTED-UNVERIFIED'
  | 'FALLBACK'
  | 'SIMULATED'
  | 'MISSING'
  | 'FAILED';

export type LanguageFabric = 'typescript' | 'python' | 'sql' | 'html_css_js' | 'bash' | 'rust_go';

export type ChamberId =
  | 'constitution'
  | 'input'
  | 'tokenization'
  | 'numerical'
  | 'memory'
  | 'cognition'
  | 'attention'
  | 'model_intelligence'
  | 'planning'
  | 'workforce'
  | 'execution'
  | 'observe_verify'
  | 'result'
  | 'recover'
  | 'learning'
  | 'self_model'
  | 'controlled_improvement';

export type ChamberStatus = 'idle' | 'active' | 'completed' | 'failed' | 'bypassed';

export interface ChamberMeta {
  id: ChamberId;
  chamberNumber: string;
  title: string;
  subtitle: string;
  primaryLanguage: LanguageFabric;
  category: 'foundation' | 'perception' | 'numerical' | 'memory' | 'cognition' | 'planning' | 'action' | 'evaluation' | 'evolution';
  contractType: string;
  evidenceClass: EvidenceClass;
}

export type Modality = 'text' | 'image' | 'audio' | 'files' | 'events';

/* Chamber 2: Input */
export interface InputData {
  modality: Modality;
  rawPayload: string;
  byteSize: number;
  mimeType: string;
  signalToNoiseDb: number;
  normalizedContent: string;
  metadata: Record<string, string | number>;
  imagePatches?: { rows: number; cols: number; totalPatches: number; patchDimension: number };
  audioSpectrogram?: { sampleRateHz: number; durationSec: number; mfccBins: number[] };
}

/* Chamber 3: Tokenization */
export interface TokenItem {
  id: number;
  text: string;
  byteOffset: [number, number];
  isSpecial?: boolean;
}

export interface TokenizationData {
  tokens: TokenItem[];
  tokenIds: number[];
  vocabSize: number;
  sequenceLength: number;
  unknownCount: number;
  compressionRatio: number;
  tokenizationLatencyMs: number;
  attentionMask: number[];
  positionIds: number[];
}

/* Chamber 4: Numerical Representation */
export interface NumericalData {
  dim: number;
  tensorShape: string;
  dtype: 'float32' | 'bfloat16' | 'float8' | 'int8';
  vectorSample: number[];
  weightMatrixSample: number[][];
  activationFunction: 'GELU' | 'SwiGLU' | 'ReLU';
  normL2: number;
  conditionNumber: number;
  gradFlowStatus: 'STABLE' | 'SATURATED' | 'VANISHING';
}

/* Chamber 5: Memory */
export interface PgVectorRecord {
  id: string;
  chunk: string;
  metadata: { source: string; timestamp: string; category: string };
  similarity: number;
  rerankScore: number;
}

export interface MemoryData {
  workingMemory: string[];
  episodicMemory: { cycleId: string; taskSummary: string; outcome: 'PASS' | 'FAIL'; keyLesson: string }[];
  semanticMemory: PgVectorRecord[];
  pgvectorSql: string;
  contextTokensAllocated: number;
  contextBudgetMax: number;
  groundingConfidence: number;
}

/* Chamber 6: Cognition */
export interface EntitySpan {
  text: string;
  type: string;
  confidence: number;
}

export interface CognitionData {
  intent: string;
  intentConfidence: number;
  entities: EntitySpan[];
  hardConstraints: string[];
  softConstraints: string[];
  epistemicUncertainty: number;
  aleatoricUncertainty: number;
  reasoningPath: string[];
  decision: string;
}

/* Chamber 7: Attention */
export interface AttentionData {
  numHeads: number;
  headDim: number;
  hiddenDim: number;
  tokens: string[];
  attentionMatrix: number[][];
  qVectorSample: number[];
  kVectorSample: number[];
  vVectorSample: number[];
  ropeAngleStep: number;
  residualNorm: number;
}

/* Chamber 8: Model Intelligence */
export interface ModelCandidate {
  id: string;
  name: string;
  provider: string;
  qualityScore: number; // 0-100
  costPer1m: number; // in USD
  latencyP95Ms: number;
  reliabilityPct: number;
  riskRating: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  compositeScore: number;
  selected: boolean;
}

export interface ModelIntelligenceData {
  candidates: ModelCandidate[];
  routingCriteria: {
    qualityWeight: number;
    costWeight: number;
    latencyWeight: number;
    reliabilityWeight: number;
  };
  selectedModel: string;
  routingRationale: string;
}

/* Chamber 9: Planning */
export interface PlanTaskNode {
  id: string;
  label: string;
  dependencies: string[];
  estimatedMs: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'pending' | 'running' | 'completed' | 'failed';
  assignedRole: string;
}

export interface PlanningData {
  goal: string;
  dagNodes: PlanTaskNode[];
  criticalPath: string[];
  cycleDetected: boolean;
  totalEstimatedDurationMs: number;
  flopsBudget: string;
}

/* Chamber 10: Workforce */
export interface WorkforceMember {
  role: 'Research' | 'Strategy' | 'Builder' | 'Critic' | 'Executor' | 'Adaptive Generalist A' | 'Adaptive Generalist B';
  modelAssigned: string;
  status: 'idle' | 'analyzing' | 'debating' | 'completed';
  workOutput: string;
  agreementScore: number;
}

export interface WorkforceData {
  squad: WorkforceMember[];
  consensusRate: number;
  synthesisSummary: string;
  divergentViewsCount: number;
}

/* Chamber 11: Execution */
export interface ToolAction {
  id: string;
  toolName: string;
  command: string;
  permissionsRequired: string[];
  sandboxStatus: 'ENFORCED_SECCOMP' | 'RESTRICTED_FS' | 'NETWORK_ISOLATED';
  executionTimeMs: number;
  status: 'queued' | 'executing' | 'success' | 'failed';
  exitCode: number;
}

export type PolyglotEnvironmentId = 'node' | 'python' | 'sql';

export interface PolyglotEnvMetrics {
  runtimeName: string;
  version: string;
  status: 'active' | 'idle' | 'executing' | 'ready';
  memoryMb: number;
  cpuPct: number;
  engine: string;
  activeCommand?: string;
  stdoutSnippet?: string;
  evidenceClass: EvidenceClass;
}

export interface ExecutionData {
  actions: ToolAction[];
  sandboxProfile: string;
  resourceUsage: { cpuPct: number; memMb: number; ioReads: number };
  systemLogs: string[];
  activeEnvironment?: PolyglotEnvironmentId;
  environmentMetrics?: Record<PolyglotEnvironmentId, PolyglotEnvMetrics>;
}

/* Chamber 12: Observe + Verify */
export interface AssertionTest {
  id: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  evidenceRef: string;
}

export interface ObserveVerifyData {
  stdoutSummary: string;
  stderrSummary: string;
  stateDiff: string;
  assertions: AssertionTest[];
  criticScore: number;
  benchmarkScore: number;
  gateDecision: 'PASS' | 'FAIL';
  gateRationale: string;
  evidenceClass: EvidenceClass;
}

/* Chamber 13a: Result */
export interface ResultData {
  finalResponse: string;
  synthesizedOutput: string;
  auditSignature: string;
  executionMetrics: {
    durationMs: number;
    tokensConsumed: number;
    totalCostUsd: number;
  };
}

/* Chamber 13b: Recover */
export interface RecoverData {
  diagnostic: string;
  rootCause: string;
  repairHypothesis: string;
  remedialPatch: string;
  retryAttempt: number;
  maxRetries: number;
  recoveryAction: 'RE_EXECUTE' | 'RE_PLAN' | 'ESCALATE';
}

/* Chamber 14: Learning */
export interface RuleSynthesized {
  id: string;
  triggerCondition: string;
  actionGuideline: string;
  confidence: number;
  sourceCycle: string;
}

export interface LearningData {
  observationReview: string;
  evaluationFindings: string;
  synthesizedLesson: string;
  rulesFormulated: RuleSynthesized[];
  memoryConsolidationTarget: string;
}

/* Chamber 15: Self-Model */
export interface CapabilityMetric {
  name: string;
  score: number; // 0-100
  trend: 'improving' | 'stable' | 'regressing';
}

export interface SelfModelData {
  capabilities: CapabilityMetric[];
  failureCount: number;
  successCount: number;
  verificationPassRate: number;
  activePermissions: string[];
  registeredTools: string[];
}

/* Chamber 16: Controlled Improvement */
export interface ImprovementProposal {
  id: string;
  targetChamber: ChamberId;
  description: string;
  riskTier: 'AUTONOMOUS' | 'OPERATOR_GATED' | 'SUPERVISED';
  projectedDelta: string;
  verificationPlan: string;
  status: 'PROPOSED' | 'TESTED' | 'APPLIED' | 'ROLLED_BACK';
}

export interface ControlledImprovementData {
  proposals: ImprovementProposal[];
  lastRollbackTimestamp: string | null;
  improvementLedgerCount: number;
  governanceMode: 'AUTONOMOUS' | 'OPERATOR_CONFIRMATION';
}

/* Complete Brain Telemetry Snapshot */
export interface BrainChamberState {
  cycleNumber: number;
  timestamp: string;
  activeChamberId: ChamberId;
  gateDecision: 'PASS' | 'FAIL';
  input: InputData;
  tokenization: TokenizationData;
  numerical: NumericalData;
  memory: MemoryData;
  cognition: CognitionData;
  attention: AttentionData;
  model_intelligence: ModelIntelligenceData;
  planning: PlanningData;
  workforce: WorkforceData;
  execution: ExecutionData;
  observe_verify: ObserveVerifyData;
  result: ResultData;
  recover: RecoverData;
  learning: LearningData;
  self_model: SelfModelData;
  controlled_improvement: ControlledImprovementData;
}

/* Event Logging & Telemetry Types */
export interface BrainEventLog {
  id: string;
  timestamp: string; // ISO 8601 or formatted time string
  cycleNumber: number;
  chamberId: ChamberId;
  chamberNumber: string;
  level: 'info' | 'success' | 'warning' | 'error';
  category: 'TRANSITION' | 'GATE' | 'ASSERTION' | 'INFERENCE' | 'MEMORY' | 'SESSION' | 'CRITIC';
  title: string;
  details?: string;
  metadata?: Record<string, any>;
}

/* Critic Score History Data Point */
export interface CriticHistoryPoint {
  cycle: number;
  score: number;
  outcome: 'PASS' | 'FAIL';
  rationale?: string;
  timestamp?: string;
}

/* Brain Session Export / Import Schema */
export interface BrainSessionData {
  schemaVersion: 'jarvis-session-v1';
  exportedAt: string;
  cycleNumber: number;
  activeChamberId: ChamberId;
  branchOverride: 'AUTO' | 'PASS' | 'FAIL';
  speed: number;
  selectedPresetId: string;
  selectedPresetName: string;
  brainState: BrainChamberState;
  eventLogs?: BrainEventLog[];
  criticHistory?: CriticHistoryPoint[];
}

