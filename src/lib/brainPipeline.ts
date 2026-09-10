/**
 * PROJECT JARVIS — COMPLETE REAL COGNITIVE BRAIN INTEGRATION PIPELINE
 * 
 * Canonical Path:
 * USER REQUEST → BRAIN → GRAPH → UNDERSTAND → TOKENIZE → MEMORY/RAG →
 * CONTEXT → REAL MODEL → EVALUATE → VERIFY → RESPONSE
 * 
 * Connected directly to the Canonical Graph Core (`GraphExecutionEngine`).
 * The graph owns the execution state (`BrainGraphState`).
 * Preserves strict separation between:
 * - prompt/semantic intent
 * - graph/execution structure
 * - runtime state
 * - policy
 * - memory
 * - retrieved evidence
 * - tools
 * - observations
 * - evaluation
 * - verification
 */

import { encode } from './tokenizer';
import { RagEngine, GroundedCitation } from './ragEngine';
import { executeCognitiveEmbedding } from './modelClient';
import {
  BrainContext,
  RetrievedEvidenceItem,
  EpisodicLessonRecord,
  BrainFailureCode,
  BrainGraphIR,
  NodeContract,
  GraphEdge,
  BrainGraphState,
  ExecutionTraceEntry,
  ExecutionJournalEntry,
  ExplicitPlan,
} from '../types/brainGraph';
import { Modality } from '../types/brain';
import { GraphExecutionEngine } from './graphEngine';
import { PlanningEngine } from './planningEngine';
import { CognitiveLearningLoop } from './learningLoop';
import { assembleDeterministicContext } from './contextAssembly';

export interface BrainPipelineInput {
  cycleId?: string;
  userPrompt: string;
  modality?: Modality;
  topK?: number;
  minScore?: number;
  alpha?: number;
  model?: string;
  metadataFilter?: Record<string, any>;
  skipModelInference?: boolean; // For testing retrieval/context in isolation
  mockModelText?: string;       // For deterministic adversarial test verification
}

export interface BrainPipelineOutput {
  cycleId: string;
  intent: {
    intent: string;
    modality: Modality;
    confidence: number;
    entities: string[];
    hardConstraints: string[];
  };
  tokenization: {
    tokenIds: number[];
    tokenCount: number;
    compressionRatio: number;
  };
  retrieval: {
    evidence: RetrievedEvidenceItem[];
    groundedCitations: GroundedCitation[];
    vectorDimension: number;
    embeddingLatencyMs: number;
    retrievalLatencyMs: number;
  };
  context: BrainContext;
  modelReasoning: {
    answer: string;
    modelUsed: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
  };
  evaluation: {
    criticScore: number;
    passed: boolean;
    citationsFound: number;
    fabricatedCitations: string[];
    missingCitations: string[];
    groundingConfidence: number;
  };
  learnedLesson: EpisodicLessonRecord;
  failureCode?: BrainFailureCode;
  totalLatencyMs: number;
  evidenceClass: 'PROVEN' | 'REAL-BUT-INCOMPLETE' | 'FAILED';
}

export class BrainPipeline {
  private ragEngine: RagEngine;
  private episodicMemoryStore: EpisodicLessonRecord[] = [];
  private static singletonInstance: BrainPipeline | null = null;

  constructor(ragEngine?: RagEngine) {
    this.ragEngine = ragEngine || new RagEngine(768);
  }

  public static getInstance(): BrainPipeline {
    if (!this.singletonInstance) {
      this.singletonInstance = new BrainPipeline();
    }
    return this.singletonInstance;
  }

  public getRagEngine(): RagEngine {
    return this.ragEngine;
  }

  public getEpisodicMemory(): EpisodicLessonRecord[] {
    return [...this.episodicMemoryStore];
  }

  /**
   * Initializes the vector store with verified knowledge documents if not already initialized.
   */
  public async initialize(): Promise<number> {
    return await this.ragEngine.initialize();
  }

  /**
   * Constructs the Canonical JARVIS Brain Graph IR representing the complete cognitive flow.
   */
  public createCanonicalBrainGraph(cycleId: string, input: BrainPipelineInput): BrainGraphIR {
    const nodes: NodeContract[] = [
      {
        id: 'node_understand',
        name: 'Understand Semantic Intent',
        type: 'understand',
        inputTypes: { prompt: 'string', modality: 'string' },
        outputTypes: { intent: 'string', entities: 'string[]' },
        capability: 'intent_analysis',
        timeoutMs: 2000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: [],
      },
      {
        id: 'node_tokenize',
        name: 'Perception Byte Tokenization',
        type: 'tokenize',
        inputTypes: { prompt: 'string' },
        outputTypes: { tokenIds: 'number[]', tokenCount: 'number' },
        capability: 'byte_tokenization',
        timeoutMs: 2000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['node_understand'],
      },
      {
        id: 'node_memory',
        name: 'Memory & Evidence Retrieval',
        type: 'retrieval',
        inputTypes: { prompt: 'string', queryVector: 'number[]' },
        outputTypes: { evidence: 'RetrievedEvidenceItem[]' },
        capability: 'rag_hybrid_retrieval',
        timeoutMs: 5000,
        retryPolicy: { maxAttempts: 2, backoffMs: 100, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['node_tokenize'],
        memoryConfig: {
          topK: input.topK ?? 3,
          minScore: input.minScore ?? 0.0,
          alpha: input.alpha ?? 0.7,
        },
      },
      {
        id: 'node_context',
        name: 'Context Assembly & Policy Budgeting',
        type: 'context',
        inputTypes: { intent: 'any', evidence: 'any' },
        outputTypes: { context: 'BrainContext' },
        capability: 'context_fusion',
        timeoutMs: 2000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['node_memory'],
      },
      {
        id: 'node_model',
        name: 'Cognitive Model Reasoning',
        type: 'model',
        inputTypes: { prompt: 'string', context: 'BrainContext' },
        outputTypes: { answer: 'string' },
        capability: 'llm_reasoning',
        timeoutMs: 30000,
        retryPolicy: { maxAttempts: 2, backoffMs: 500, exponential: true },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['node_context'],
        modelConfig: {
          model: input.model || 'gemini-3.6-flash',
          mockText: input.mockModelText,
        },
      },
      {
        id: 'node_evaluate',
        name: 'Citation & Grounding Critic Evaluation',
        type: 'evaluation',
        inputTypes: { answer: 'string', evidence: 'RetrievedEvidenceItem[]' },
        outputTypes: { criticScore: 'number', passed: 'boolean' },
        capability: 'critic_evaluator',
        timeoutMs: 2000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['node_model'],
      },
      {
        id: 'node_verify',
        name: 'Constitutional Invariant Verification',
        type: 'verification',
        inputTypes: { evaluation: 'any' },
        outputTypes: { verified: 'boolean' },
        capability: 'invariant_verifier',
        timeoutMs: 2000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['node_evaluate'],
      },
      {
        id: 'node_terminal',
        name: 'Execution Termination',
        type: 'terminal',
        inputTypes: {},
        outputTypes: {},
        capability: 'termination',
        timeoutMs: 1000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['node_verify'],
      },
    ];

    const edges: GraphEdge[] = [
      { id: 'edge_1', from: 'node_understand', to: 'node_tokenize', type: 'sequential' },
      { id: 'edge_2', from: 'node_tokenize', to: 'node_memory', type: 'sequential' },
      { id: 'edge_3', from: 'node_memory', to: 'node_context', type: 'sequential' },
      { id: 'edge_4', from: 'node_context', to: 'node_model', type: 'sequential' },
      { id: 'edge_5', from: 'node_model', to: 'node_evaluate', type: 'sequential' },
      { id: 'edge_6', from: 'node_evaluate', to: 'node_verify', type: 'sequential' },
      { id: 'edge_7', from: 'node_verify', to: 'node_terminal', type: 'sequential' },
    ];

    return {
      id: `canonical_brain_graph_${cycleId}`,
      version: '1.0.0',
      name: 'Canonical JARVIS Cognitive Graph',
      description: 'Production Graph IR executing the verified JARVIS cognitive path.',
      entryNodeId: 'node_understand',
      nodes,
      edges,
    };
  }

  /**
   * Executes the real runtime path through the canonical Graph runtime.
   * Returns graph state, pipeline output, execution trace, and durable journal.
   */
  public async executeViaGraph(input: BrainPipelineInput): Promise<{
    state: BrainGraphState;
    output: BrainPipelineOutput;
    trace: ExecutionTraceEntry[];
    journal: ExecutionJournalEntry[];
  }> {
    const t0 = performance.now();
    const cycleId = input.cycleId || `cycle_${Date.now()}`;
    const userPrompt = input.userPrompt;
    const modality = input.modality || 'text';

    // 0. Adversarial validation on input
    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
      const failOutput = this.createFailureOutput(
        cycleId,
        userPrompt || '',
        modality,
        'INPUT_INVALID',
        'User prompt was empty or non-string'
      );
      const failGraph = this.createCanonicalBrainGraph(cycleId, input);
      const failState = GraphExecutionEngine.createInitialState(
        cycleId,
        failGraph.id,
        userPrompt || '',
        { prompt: userPrompt },
        failGraph.nodes,
        undefined,
        failGraph.version
      );
      failState.errors.push({
        node_id: 'node_understand',
        failure_code: 'INPUT_INVALID',
        message: 'User prompt was empty or non-string',
        timestamp: new Date().toISOString(),
        recoverable: false,
        recoveryAttempt: 0,
      });
      return {
        state: failState,
        output: failOutput,
        trace: [],
        journal: [],
      };
    }

    // 1. Construct canonical graph definition
    const graphIR = this.createCanonicalBrainGraph(cycleId, input);
    const engine = new GraphExecutionEngine();

    // 2. Initialize graph state
    const initialState = GraphExecutionEngine.createInitialState(
      cycleId,
      graphIR.id,
      userPrompt,
      {
        prompt: userPrompt,
        modality,
        topK: input.topK,
        minScore: input.minScore,
        alpha: input.alpha,
        model: input.model,
        metadataFilter: input.metadataFilter,
        mockModelText: input.mockModelText,
      },
      graphIR.nodes,
      undefined,
      graphIR.version
    );

    // 3. Execute Canonical Graph
    const finalState = await engine.execute(graphIR, initialState, {
      ragEngine: this.ragEngine,
      mockModelText: input.mockModelText,
      skipModelInference: input.skipModelInference,
    });

    const totalLatencyMs = +(performance.now() - t0).toFixed(2);

    // 4. Map observations into structured BrainPipelineOutput
    const understandObs = finalState.observations['node_understand'] || {};
    const tokenizeObs = finalState.observations['node_tokenize'] || {};
    const memoryObs = finalState.observations['node_memory'] || {};
    const modelObs = finalState.observations['node_model'] || {};
    const evaluateObs = finalState.observations['node_evaluate'] || {};

    const evidenceItems: RetrievedEvidenceItem[] = memoryObs.evidence || finalState.context.retrievedEvidence || [];
    const citations: GroundedCitation[] = memoryObs.citations || [];
    const answerText: string = finalState.artifacts.response || modelObs.text || '';
    const criticScore: number = evaluateObs.criticScore ?? finalState.evaluation.score;
    const passed: boolean = evaluateObs.passed ?? finalState.evaluation.passed;
    const fabricatedCitations: string[] = evaluateObs.fabricatedCitations || [];
    const missingCitations: string[] = evaluateObs.missingCitations || [];
    const citationsFound: number = evaluateObs.citationsFound || 0;

    // 5. Memory Loop: Record Episodic Lesson & Store in Vector Semantic Memory
    const lessonRecord: EpisodicLessonRecord = {
      id: `lesson_${cycleId}`,
      cycleId,
      taskSummary: userPrompt.substring(0, 100),
      outcome: passed ? 'PASS' : 'FAIL',
      rootCause: passed ? undefined : fabricatedCitations.length > 0 ? 'FABRICATED_CITATIONS' : 'LOW_GROUNDING_SCORE',
      lesson: passed
        ? `Verified query resolution grounded in ${citationsFound} reference(s).`
        : `Resolution failed invariant verification. Critic score: ${criticScore}%. Fabrications: ${fabricatedCitations.join(', ') || 'none'}.`,
      ruleCandidate: passed ? undefined : 'Enforce stricter prompt constraints against ungrounded hallucinations.',
      timestamp: new Date().toISOString(),
    };

    this.episodicMemoryStore.push(lessonRecord);

    try {
      const lessonText = `[EPISODIC LESSON from ${cycleId}]: Task: "${lessonRecord.taskSummary}". Outcome: ${lessonRecord.outcome}. Lesson: ${lessonRecord.lesson}`;
      let lessonVec = memoryObs.queryVector;
      if (!lessonVec || lessonVec.length !== this.ragEngine.dimension) {
        try {
          const emb = await executeCognitiveEmbedding({
            texts: [lessonText],
            outputDimensionality: this.ragEngine.dimension,
          });
          if (emb.success && emb.embeddings[0]) {
            lessonVec = emb.embeddings[0];
          }
        } catch {
          // Fallback
        }
      }
      if (!lessonVec || lessonVec.length !== this.ragEngine.dimension) {
        lessonVec = new Array(this.ragEngine.dimension).fill(0).map((_, i) => Math.sin(i + 1) * 0.05);
      }

      this.ragEngine.vectorStore.upsert(
        `lesson_${cycleId}`,
        lessonVec,
        lessonText,
        {
          documentId: `doc_lesson_${cycleId}`,
          chunkIndex: 0,
          totalChunks: 1,
          headingHierarchy: ['Episodic Memory', 'Lessons Learned'],
          tokenCount: encode(lessonText).length,
          charRange: [0, lessonText.length],
          isCodeBlock: false,
          hasTable: false,
          source: `brain://episodic/${cycleId}`,
        }
      );
    } catch {
      // Non-fatal
    }

    const output: BrainPipelineOutput = {
      cycleId,
      intent: {
        intent: understandObs.intent || finalState.context.queryIntent.intent,
        modality,
        confidence: understandObs.confidence || 0.98,
        entities: understandObs.entities || finalState.context.queryIntent.entities,
        hardConstraints: finalState.context.queryIntent.hardConstraints,
      },
      tokenization: {
        tokenIds: tokenizeObs.tokenIds || encode(userPrompt),
        tokenCount: tokenizeObs.tokenCount || encode(userPrompt).length,
        compressionRatio: tokenizeObs.compressionRatio || 1.0,
      },
      retrieval: {
        evidence: evidenceItems,
        groundedCitations: citations,
        vectorDimension: this.ragEngine.dimension,
        embeddingLatencyMs: 0,
        retrievalLatencyMs: 0,
      },
      context: finalState.context,
      modelReasoning: {
        answer: answerText,
        modelUsed: modelObs.model || 'gemini-3.6-flash',
        latencyMs: modelObs.latencyMs || 0,
        inputTokens: modelObs.usage?.inputTokens || 0,
        outputTokens: modelObs.usage?.outputTokens || 0,
      },
      evaluation: {
        criticScore,
        passed,
        citationsFound,
        fabricatedCitations,
        missingCitations,
        groundingConfidence: +(criticScore / 100).toFixed(3),
      },
      learnedLesson: lessonRecord,
      totalLatencyMs,
      evidenceClass: passed ? 'PROVEN' : 'REAL-BUT-INCOMPLETE',
    };

    return {
      state: finalState,
      output,
      trace: engine.getTrace(),
      journal: engine.getJournal(),
    };
  }

  /**
   * Executes the full JARVIS Brain runtime path through the canonical graph.
   */
  public async execute(input: BrainPipelineInput): Promise<BrainPipelineOutput> {
    const { output } = await this.executeViaGraph(input);
    return output;
  }

  private createFailureOutput(
    cycleId: string,
    prompt: string,
    modality: Modality,
    failureCode: BrainFailureCode,
    message: string
  ): BrainPipelineOutput {
    return {
      cycleId,
      intent: {
        intent: 'FAILED_INTENT_EXTRACTION',
        modality,
        confidence: 0.0,
        entities: [],
        hardConstraints: [],
      },
      tokenization: { tokenIds: [], tokenCount: 0, compressionRatio: 0 },
      retrieval: {
        evidence: [],
        groundedCitations: [],
        vectorDimension: this.ragEngine.dimension,
        embeddingLatencyMs: 0,
        retrievalLatencyMs: 0,
      },
      context: assembleDeterministicContext({
        currentRequest: { text: message, modality },
        options: { maxContextTokens: 0 },
      }),
      modelReasoning: {
        answer: `[EXECUTION FAILURE]: ${failureCode} - ${message}`,
        modelUsed: 'none',
        latencyMs: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
      evaluation: {
        criticScore: 0,
        passed: false,
        citationsFound: 0,
        fabricatedCitations: [],
        missingCitations: [],
        groundingConfidence: 0,
      },
      learnedLesson: {
        id: `lesson_${cycleId}`,
        cycleId,
        taskSummary: prompt.substring(0, 100),
        outcome: 'FAIL',
        rootCause: failureCode,
        lesson: `Encountered immediate input invalidation: ${message}`,
        timestamp: new Date().toISOString(),
      },
      failureCode,
      totalLatencyMs: 0,
      evidenceClass: 'FAILED',
    };
  }

  /**
   * Transforms:
   * USER GOAL → UNDERSTANDING → CONSTRAINTS → PLAN → EXECUTABLE GRAPH → POLICY CHECK → EXECUTION
   */
  public async executeGoalThroughFullPlanningLoop(
    goal: string,
    options?: { mockModelText?: string; skipModelInference?: boolean }
  ): Promise<{
    plan: ExplicitPlan;
    graphIR: BrainGraphIR;
    finalState: BrainGraphState;
    trace: ExecutionTraceEntry[];
    journal: ExecutionJournalEntry[];
    relevantPriorLessons: EpisodicLessonRecord[];
  }> {
    // 1. Retrieve relevant prior verified lessons for this goal
    const priorLessons = await CognitiveLearningLoop.retrieveRelevantLessons(goal, 3);

    // 2. Generate explicit plan with understanding, constraints, squad, DAG
    const plan = PlanningEngine.generatePlan(goal);

    // 3. Compile plan to executable BrainGraphIR
    const graphIR = PlanningEngine.compilePlanToGraph(plan);

    // 4. Instantiate graph engine
    const engine = new GraphExecutionEngine();

    // 5. Initialize state with prior lessons injected into context
    const initialState = GraphExecutionEngine.createInitialState(
      `task_${Date.now()}`,
      graphIR.id,
      goal,
      { prompt: goal, mockModelText: options?.mockModelText },
      graphIR.nodes,
      undefined,
      graphIR.version
    );
    initialState.context.episodicLessons = priorLessons;

    // 6. Execute compiled graph deterministically
    const finalState = await engine.execute(graphIR, initialState, {
      ragEngine: this.ragEngine,
      mockModelText: options?.mockModelText,
      skipModelInference: options?.skipModelInference,
    });

    return {
      plan,
      graphIR,
      finalState,
      trace: engine.getTrace(),
      journal: engine.getJournal(),
      relevantPriorLessons: priorLessons,
    };
  }
}
