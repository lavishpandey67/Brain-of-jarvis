/**
 * PROJECT JARVIS — CLOSED COGNITIVE EXECUTION LOOP & LEARNING ENGINE
 * 
 * Closes the loop:
 * EXECUTION → OBSERVATION → EVALUATION → VERIFICATION → RECOVERY → LESSON → MEMORY
 * 
 * Features:
 * - Deterministic failure classification & recovery policy routing (RE_EXECUTE, RE_PLAN, ESCALATE)
 * - Structured lesson candidate creation from verified executions
 * - Strict evidence & confidence criteria gate: only lessons meeting threshold are committed to memory
 * - Semantic indexing of verified lessons into VectorStore for future retrieval
 * - Zero model retraining: learning operates as verified experience becoming reusable memory
 * - Durable checkpoint restart and resume
 */

import {
  EpisodicLessonRecord,
  BrainFailureCode,
  LessonCandidateCriteria,
  DEFAULT_LESSON_CRITERIA,
  BrainGraphState,
} from '../types/brainGraph';
import { VectorStore } from '../math/vectorStore';
import { executeCognitiveEmbedding } from './modelClient';

export interface LessonCandidate {
  cycleId: string;
  taskSummary: string;
  outcome: 'PASS' | 'FAIL';
  rootCause?: string;
  lesson: string;
  ruleCandidate?: string;
  criticScore: number;
  confidence: number;
  fabricatedCitationsCount: number;
  evidenceRef?: string;
  timestamp?: string;
}

export type RecoveryAction = 'RE_EXECUTE' | 'RE_PLAN' | 'ESCALATE';

export interface RecoveryDecision {
  action: RecoveryAction;
  reason: string;
  remedialSuggestion?: string;
  targetNodeId?: string;
  retryAttempt: number;
}

export class CognitiveLearningLoop {
  private static lessonStore: EpisodicLessonRecord[] = [];
  private static vectorIndex: VectorStore = new VectorStore(768);

  /**
   * Evaluates failure and routes to appropriate recovery action:
   * TIMEOUT / MODEL_FAILURE -> RE_EXECUTE (with backoff)
   * RUNTIME_FAILURE / VERIFICATION_FAILURE -> RE_PLAN (remedial patch or route)
   * POLICY_DENIED / RESOURCE_EXHAUSTION (after max attempts) -> ESCALATE
   */
  public static routeFailure(params: {
    failureCode: BrainFailureCode;
    errorMessage: string;
    attempts: number;
    maxAttempts: number;
    nodeId: string;
  }): RecoveryDecision {
    const { failureCode, errorMessage, attempts, maxAttempts, nodeId } = params;

    if (failureCode === 'POLICY_DENIED') {
      return {
        action: 'ESCALATE',
        reason: `Execution halted by security policy gate on node '${nodeId}'. Unrecoverable violation: ${errorMessage}`,
        retryAttempt: attempts,
      };
    }

    if (attempts > maxAttempts) {
      return {
        action: 'ESCALATE',
        reason: `Max execution attempts (${maxAttempts}) exhausted on node '${nodeId}'. Failure code: ${failureCode}.`,
        retryAttempt: attempts,
      };
    }

    if (failureCode === 'TIMEOUT') {
      return {
        action: 'RE_EXECUTE',
        reason: `Transient timeout on node '${nodeId}'. Backing off and retrying attempt ${attempts + 1}/${maxAttempts}.`,
        remedialSuggestion: 'Increase timeout allocation or run with lighter payload.',
        targetNodeId: nodeId,
        retryAttempt: attempts + 1,
      };
    }

    if (failureCode === 'RUNTIME_FAILURE' || failureCode === 'VERIFICATION_FAILURE') {
      return {
        action: 'RE_PLAN',
        reason: `${failureCode} detected on node '${nodeId}': ${errorMessage}. Re-planning alternative route or applying remedial patch.`,
        remedialSuggestion: 'Modify implementation script, adapt parameters, or fallback to alternative workforce member.',
        targetNodeId: 'node_replan',
        retryAttempt: attempts + 1,
      };
    }

    return {
      action: 'RE_EXECUTE',
      reason: `Retrying step on node '${nodeId}' for failure code: ${failureCode}`,
      targetNodeId: nodeId,
      retryAttempt: attempts + 1,
    };
  }

  /**
   * Validates a structured lesson candidate against strict evidence/confidence criteria.
   * Prevents ungrounded or low-quality runs from polluting long-term memory.
   */
  public static validateLessonCandidate(
    candidate: LessonCandidate,
    criteria: LessonCandidateCriteria = DEFAULT_LESSON_CRITERIA
  ): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (criteria.requirePassedOutcome && candidate.outcome !== 'PASS') {
      violations.push(`Outcome is '${candidate.outcome}'; criteria requires 'PASS'.`);
    }

    if (candidate.criticScore < criteria.minCriticScore) {
      violations.push(`Critic score (${candidate.criticScore}) is below required minimum (${criteria.minCriticScore}).`);
    }

    if (criteria.requireZeroFabrications && candidate.fabricatedCitationsCount > 0) {
      violations.push(`Found ${candidate.fabricatedCitationsCount} fabricated citations; zero tolerated.`);
    }

    if (candidate.confidence < criteria.minConfidence) {
      violations.push(`Confidence (${candidate.confidence}) is below threshold (${criteria.minConfidence}).`);
    }

    if (!candidate.lesson || candidate.lesson.trim().length < criteria.minLessonLength) {
      violations.push(`Lesson content is shorter than minimum ${criteria.minLessonLength} characters.`);
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Commits a validated lesson into memory and semantic vector index.
   */
  public static async commitLesson(
    candidate: LessonCandidate,
    criteria: LessonCandidateCriteria = DEFAULT_LESSON_CRITERIA
  ): Promise<{ committed: boolean; lessonId?: string; violations?: string[]; rejectionReason?: string }> {
    const validation = this.validateLessonCandidate(candidate, criteria);
    if (!validation.passed) {
      return {
        committed: false,
        violations: validation.violations,
        rejectionReason: validation.violations.join('; '),
      };
    }

    const lessonId = `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const lessonRecord: EpisodicLessonRecord = {
      id: lessonId,
      cycleId: candidate.cycleId,
      taskSummary: candidate.taskSummary,
      outcome: candidate.outcome,
      rootCause: candidate.rootCause,
      lesson: candidate.lesson,
      ruleCandidate: candidate.ruleCandidate,
      confidence: candidate.confidence,
      criticScore: candidate.criticScore,
      evidenceRef: candidate.evidenceRef,
      timestamp: candidate.timestamp || new Date().toISOString(),
    };

    // 1. Store in episodic memory
    this.lessonStore.push(lessonRecord);

    // 2. Index into semantic vector memory for future retrieval
    const lessonDoc = `${lessonRecord.taskSummary}\nLesson: ${lessonRecord.lesson}\nRule: ${lessonRecord.ruleCandidate || ''}`;
    let vec: number[] | null = null;
    try {
      const emb = await executeCognitiveEmbedding({ texts: [lessonDoc], outputDimensionality: 768 });
      if (emb.success && emb.embeddings[0]) {
        vec = emb.embeddings[0];
      }
    } catch {
      // Fallback below
    }

    if (!vec || vec.length !== 768) {
      vec = new Array(768).fill(0).map((_, i) => Math.sin((i + 1) * 0.05));
    }

    this.vectorIndex.upsert(lessonId, vec, lessonDoc, {
      type: 'episodic_lesson',
      cycleId: lessonRecord.cycleId,
      criticScore: lessonRecord.criticScore,
      outcome: lessonRecord.outcome,
    });

    return {
      committed: true,
      lessonId,
    };
  }

  /**
   * Retrieves relevant prior lessons for a new incoming goal/task.
   * This is how past verified experience becomes reusable knowledge without model retraining!
   */
  public static async retrieveRelevantLessons(goal: string, topK: number = 3): Promise<EpisodicLessonRecord[]> {
    if (this.lessonStore.length === 0) {
      return [];
    }

    let queryVec: number[] | null = null;
    try {
      const emb = await executeCognitiveEmbedding({ texts: [goal], outputDimensionality: 768 });
      if (emb.success && emb.embeddings[0]) {
        queryVec = emb.embeddings[0];
      }
    } catch {
      // Fallback below
    }

    if (!queryVec || queryVec.length !== 768) {
      queryVec = new Array(768).fill(0).map((_, i) => Math.sin((i + 1) * 0.05));
    }

    const matches = this.vectorIndex.searchHybrid(goal, queryVec, { topK });
    const matchedIds = new Set(matches.map((m) => m.record.id));

    return this.lessonStore.filter((l) => matchedIds.has(l.id));
  }

  /**
   * Snapshots durable checkpoint and allows resume from latest valid checkpoint.
   */
  public static createCheckpoint(
    state: BrainGraphState,
    nodeId: string,
    milestone: string
  ): { checkpointId: string; timestamp: string; stateSnapshot: string } {
    const checkpointId = `chk_${state.graph_id}_${nodeId}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const snapshot = JSON.stringify({
      graph_id: state.graph_id,
      task_id: state.task_id,
      completed_nodes: state.completed_nodes,
      observations: state.observations,
      artifacts: state.artifacts,
      context: state.context,
      milestone,
      timestamp,
    });

    return {
      checkpointId,
      timestamp,
      stateSnapshot: snapshot,
    };
  }

  public static resumeFromCheckpoint(
    checkpointSnapshot: string,
    targetGraphState: BrainGraphState
  ): { resumed: boolean; restoredNodes: string[]; milestone: string } {
    try {
      const parsed = JSON.parse(checkpointSnapshot);
      targetGraphState.completed_nodes = parsed.completed_nodes || [];
      targetGraphState.observations = { ...targetGraphState.observations, ...parsed.observations };
      targetGraphState.artifacts = { ...targetGraphState.artifacts, ...parsed.artifacts };
      return {
        resumed: true,
        restoredNodes: parsed.completed_nodes || [],
        milestone: parsed.milestone || 'resumed',
      };
    } catch {
      return {
        resumed: false,
        restoredNodes: [],
        milestone: 'failed_restore',
      };
    }
  }

  public static restoreFromCheckpoint(
    checkpointSnapshot: string,
    targetGraphState: BrainGraphState
  ): { resumed: boolean; restoredNodes: string[]; milestone: string } {
    return this.resumeFromCheckpoint(checkpointSnapshot, targetGraphState);
  }

  /**
   * Reset store (primarily for clean test harnesses)
   */
  public static reset(): void {
    this.lessonStore = [];
    this.vectorIndex = new VectorStore(768);
  }

  public static getAllLessons(): EpisodicLessonRecord[] {
    return [...this.lessonStore];
  }
}
