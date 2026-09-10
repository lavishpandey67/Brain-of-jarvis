/**
 * PROJECT JARVIS — BRAIN GRAPH & STATE CONTRACTS
 * Machine-readable contracts for graph execution, node definitions, explicit context,
 * failure taxonomy, and durable journaling.
 */

import { Modality, EvidenceClass } from './brain';

// ============================================================
// FAILURE TAXONOMY (Strict Machine-Readable Categorization)
// ============================================================
export type BrainFailureCode =
  | 'INPUT_INVALID'
  | 'AUTHORIZATION_FAILURE'
  | 'POLICY_DENIED'
  | 'MODEL_FAILURE'
  | 'TOOL_FAILURE'
  | 'RUNTIME_FAILURE'
  | 'TIMEOUT'
  | 'RESOURCE_EXHAUSTION'
  | 'OBSERVATION_FAILURE'
  | 'VERIFICATION_FAILURE'
  | 'EVALUATION_FAILURE'
  | 'RECOVERY_EXHAUSTED';

export interface BrainFailureRecord {
  node_id: string;
  failure_code: BrainFailureCode;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  recoverable: boolean;
  recoveryAttempt: number;
}

// ============================================================
// SIDE-EFFECT & IDEMPOTENCY CLASSIFICATION
// ============================================================
export type SideEffectClassification =
  | 'READ_ONLY'
  | 'IDEMPOTENT_WRITE'
  | 'NON_IDEMPOTENT_SIDE_EFFECT';

// ============================================================
// SUPPORTED RUNTIMES
// ============================================================
export type SupportedRuntime = 'typescript' | 'python' | 'shell' | 'sql' | 'rust';

export interface RuntimeCapabilityStatus {
  runtime: SupportedRuntime;
  status: EvidenceClass;
  binaryPath?: string;
  version?: string;
  notes?: string;
}

// ============================================================
// EXPLICIT BRAIN CONTEXT (Deterministically assembled with provenance)
// ============================================================
export type MemoryProvenanceClassification =
  | 'RELEVANT'
  | 'IRRELEVANT'
  | 'CONFLICTING'
  | 'STALE'
  | 'DUPLICATE'
  | 'INJECTED';

export interface ContextItemProvenance {
  provenanceId: string;
  source: string; // 'user_request' | 'conversation_state' | 'task_state' | 'graph_state' | 'rag_store' | 'episodic_memory' | 'policy_engine' | 'tool_execution' | 'runtime_observation'
  timestamp: string;
  confidence: number;
  classification: MemoryProvenanceClassification;
  originRef?: string;
  notes?: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  provenance: ContextItemProvenance;
  metadata?: Record<string, any>;
  score?: number;
}

export interface ToolResultItem {
  toolName: string;
  actionId: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  output: string;
  artifacts?: Record<string, any>;
  timestamp: string;
}

export interface ExecutionHistoryStep {
  stepIndex: number;
  nodeId: string;
  nodeName: string;
  status: string;
  durationMs?: number;
  timestamp: string;
}

export interface ContextTokenBudgetBreakdown {
  maxContextTokens: number;
  allocatedTokens: number;
  promptTokens: number;
  systemPolicyTokens: number;
  evidenceTokens: number;
  memoryTokens: number;
  observationTokens: number;
  historyTokens: number;
  prunedItemCount: number;
}

export interface RetrievedEvidenceItem {
  id: string;
  refId: string;
  source: string;
  text: string;
  denseScore: number;
  hybridScore: number;
  metadata: Record<string, any>;
  timestamp: string;
  provenance?: ContextItemProvenance;
}

export interface EpisodicLessonRecord {
  id: string;
  cycleId: string;
  taskSummary: string;
  outcome: 'PASS' | 'FAIL';
  rootCause?: string;
  lesson: string;
  ruleCandidate?: string;
  confidence?: number;
  criticScore?: number;
  evidenceRef?: string;
  timestamp: string;
}

export interface PolicyRule {
  id: string;
  rule: string;
  enforced: boolean;
  category: 'security' | 'resource' | 'correctness' | 'privacy';
  provenance?: ContextItemProvenance;
}

export interface BrainContext {
  // 1. Current Request
  currentRequest: {
    text: string;
    modality: Modality;
    timestamp: string;
    entities: string[];
    hardConstraints: string[];
  };

  // 2. Conversation State
  conversationState: {
    turnIndex: number;
    historySummary?: string;
    recentTurns: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: string }>;
  };

  // 3. Task State
  taskState: {
    taskId: string;
    goal: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    currentMilestone?: string;
  };

  // 4. Graph State
  graphState: {
    graphId: string;
    graphVersion: string;
    activeNodeId: string | null;
    completedNodes: string[];
    pendingNodes: string[];
    errors: BrainFailureRecord[];
  };

  // 5. Relevant Memory
  relevantMemory: MemoryItem[];

  // 6. Retrieved RAG Evidence
  retrievedEvidence: RetrievedEvidenceItem[];

  // 7. Previous Observations
  previousObservations: Record<string, any>;

  // 8. Policies
  policies: PolicyRule[];

  // 9. Tool Results
  toolResults: ToolResultItem[];

  // 10. Execution History
  executionHistory: ExecutionHistoryStep[];

  // Deterministic Assembly & Bounded Budgets
  provenanceMap: Record<string, ContextItemProvenance>;
  tokenBudgets: ContextTokenBudgetBreakdown;

  // Backward compatibility fields:
  queryIntent: {
    intent: string;
    modality: Modality;
    confidence: number;
    entities: string[];
    hardConstraints: string[];
  };
  memoryRefs: string[];
  workingMemory: Record<string, any>;
  episodicLessons: EpisodicLessonRecord[];
  policyRules: PolicyRule[];
}

// ============================================================
// EXPLICIT PLAN REPRESENTATION
// ============================================================
export interface PlanTaskItem {
  taskId: string;
  title: string;
  description: string;
  taskType: 'sequential' | 'conditional' | 'tool' | 'polyglot' | 'model';
  dependencies: string[];
  assignedRole: string; // e.g. 'Research' | 'Strategy' | 'Builder' | 'Critic' | 'Executor'
  selectedModel?: string;
  selectedTool?: string;
  runtime?: SupportedRuntime;
  condition?: EdgeCondition;
  estimatedDurationMs: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  verificationRule: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  codePayload?: string;
}

export interface ExplicitPlan {
  planId: string;
  goal: string;
  understanding: {
    intent: string;
    scope: string;
    entities: string[];
  };
  constraints: {
    hardConstraints: string[];
    softConstraints: string[];
    resourceLimits: {
      maxDurationMs: number;
      maxTokens: number;
      maxCostUsd: number;
    };
    securityPolicies: string[];
  };
  workforce: {
    assignedSquad: Array<{ role: string; model: string; responsibility: string }>;
  };
  tasks: PlanTaskItem[];
  criticalPath: string[];
  totalEstimatedDurationMs: number;
  terminationCriteria: {
    requiredCompletedTasks: string[];
    successConditions: string[];
    maxReplanningAttempts: number;
  };
  replanningCount: number;
  status: 'PROPOSED' | 'VALIDATED' | 'EXECUTING' | 'REPLANNING' | 'COMPLETED' | 'FAILED';
}

// ============================================================
// STRUCTURED LESSON CANDIDATE & CRITERIA
// ============================================================
export interface LessonCandidateCriteria {
  minCriticScore: number;
  requireZeroFabrications: boolean;
  minLessonLength: number;
  minConfidence: number;
  requirePassedOutcome: boolean;
}

export const DEFAULT_LESSON_CRITERIA: LessonCandidateCriteria = {
  minCriticScore: 80,
  requireZeroFabrications: true,
  minLessonLength: 15,
  minConfidence: 0.8,
  requirePassedOutcome: true,
};

// ============================================================
// ============================================================
// NODE CONTRACT & CANONICAL GRAPH IR
// ============================================================
export type GraphNodeType =
  | 'understand'
  | 'constraints'
  | 'plan'
  | 'replan'
  | 'tokenize'
  | 'context'
  | 'memory'
  | 'retrieval'
  | 'model'
  | 'tool'
  | 'polyglot'
  | 'policy_gate'
  | 'observation'
  | 'evaluation'
  | 'verification'
  | 'checkpoint'
  | 'recovery'
  | 'terminal'
  | 'workforce';

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  exponential: boolean;
}

export type EdgeConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'truthy'
  | 'falsy'
  | 'includes'
  | 'not_includes';

export interface EdgeCondition {
  key: string; // Evaluated against state/observations, e.g. 'observations.node_eval.passed' or 'policy_state.authorized'
  operator?: EdgeConditionOperator;
  value?: any;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  condition?: EdgeCondition;
  type?: 'sequential' | 'branch_pass' | 'branch_fail' | 'loop' | 'recovery' | 'checkpoint';
}

export interface NodeContract {
  id: string;
  name: string;
  type: GraphNodeType;
  inputTypes: Record<string, string>;
  outputTypes: Record<string, string>;
  runtime?: SupportedRuntime;
  capability: string;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  sideEffect: SideEffectClassification;
  authorization: {
    requiredRole: string;
    requireApproval: boolean;
  };
  verification: {
    requiredAssertions: string[];
    criticThreshold: number;
  };
  dependencies: string[];
  // Runtime Capsule Declarations
  resourceLimits?: {
    maxMemoryBytes?: number;
    maxOutputBytes?: number;
    maxSubprocesses?: number;
  };
  environmentConfig?: {
    workingDirectory?: string;
    envVars?: Record<string, string>;
    isolateNetwork?: boolean;
    restrictedFs?: boolean;
  };
  policyDeclaration?: {
    ruleIds?: string[];
    allowNetwork?: boolean;
    allowFileSystemWrite?: boolean;
    dangerousPatternsBlocked?: boolean;
  };
  planConfig?: {
    planId?: string;
    goal?: string;
    explicitPlan?: ExplicitPlan;
  };
  // Graph flow controls
  conditionalBranch?: {
    conditionKey: string;
    onPassNodeId: string;
    onFailNodeId: string;
  };
  loop?: {
    loopConditionKey: string;
    maxIterations: number;
    targetNodeId: string;
  };
  polyglotPayload?: {
    code: string;
    args?: string[];
    env?: Record<string, string>;
  };
  memoryConfig?: {
    topK?: number;
    minScore?: number;
    alpha?: number;
    queryKey?: string;
  };
  modelConfig?: {
    model?: string;
    systemInstruction?: string;
    temperature?: number;
    mockText?: string;
  };
}

/**
 * Canonical JARVIS Graph Intermediate Representation (Graph IR)
 */
export interface BrainGraphIR {
  id: string;
  version: string;
  name: string;
  description?: string;
  entryNodeId: string;
  nodes: NodeContract[];
  edges: GraphEdge[];
  metadata?: Record<string, any>;
}

// ============================================================
// EXECUTION TRACE CONTRACT
// ============================================================
export interface ExecutionTraceEntry {
  stepIndex: number;
  task_id: string;
  graph_id: string;
  graph_version: string;
  node_id: string;
  node_name: string;
  node_type: GraphNodeType;
  state: {
    current_node: string | null;
    completed_nodes: string[];
    pending_nodes: string[];
    resource_usage: BrainGraphState['resource_usage'];
    policy_state: BrainGraphState['policy_state'];
    evaluation: BrainGraphState['evaluation'];
    verification: BrainGraphState['verification'];
  };
  context: BrainContext;
  memory_refs: string[];
  observations: Record<string, any>;
  errors: BrainFailureRecord[];
  attempts: number;
  timestamps: {
    started_at: string;
    completed_at?: string;
    duration_ms?: number;
  };
  status: 'COMPLETED' | 'FAILED' | 'RECOVERED' | 'SKIPPED' | 'CHECKPOINTED';
}

// ============================================================
// MACHINE-READABLE GRAPH STATE CONTRACT
// ============================================================
export interface BrainGraphState {
  task_id: string;
  graph_id: string;
  graph_version: string;
  current_node: string | null;
  goal: string;
  inputs: Record<string, any>;
  context: BrainContext;
  memory_refs: string[];
  retrieved_refs: string[];
  policy_state: {
    authorized: boolean;
    activeRules: string[];
    deniedReason?: string;
  };
  authorization: {
    role: string;
    approved: boolean;
    approver?: string;
  };
  completed_nodes: string[];
  pending_nodes: string[];
  attempts: Record<string, number>;
  observations: Record<string, any>;
  artifacts: Record<string, any>;
  errors: BrainFailureRecord[];
  evaluation: {
    score: number;
    passed: boolean;
    criteria: Record<string, boolean>;
    rationale: string;
  };
  verification: {
    verified: boolean;
    critic_score: number;
    failed_invariants: string[];
    evidence_hash: string;
  };
  resource_usage: {
    total_tokens: number;
    total_execution_time_ms: number;
    memory_bytes: number;
    subprocess_count: number;
  };
  timestamps: {
    created_at: string;
    started_at: string;
    updated_at: string;
    completed_at?: string;
  };
}

// ============================================================
// DURABLE EXECUTION JOURNAL ENTRY
// ============================================================
export interface ExecutionJournalEntry {
  entryId: string;
  taskId: string;
  graphId: string;
  graphVersion?: string;
  nodeId: string;
  eventType:
    | 'NODE_START'
    | 'SIDE_EFFECT_EXECUTED'
    | 'OBSERVATION_CAPTURED'
    | 'NODE_COMPLETED'
    | 'NODE_FAILED'
    | 'RECOVERY_TRIGGERED'
    | 'CHECKPOINT_SAVED'
    | 'STATE_TRANSITION';
  sideEffect: SideEffectClassification;
  sideEffectRecorded: boolean;
  stateSnapshotHash: string;
  payload?: any;
  timestamp: string;
}
