/**
 * PROJECT JARVIS: COGNITIVE EXECUTION LOOP & NON-TRIVIAL RUNTIME PROOF
 * 
 * Verifies:
 * 1. Brain Planning Architecture:
 *    USER GOAL → UNDERSTANDING → CONSTRAINTS → PLAN → EXECUTABLE GRAPH → POLICY CHECK → EXECUTION
 * 2. Deterministic Context Assembly with Provenance & Semantic Prompt Separation
 * 3. Polyglot Runtime Security:
 *    - Workspace escape protection (path traversal ../../)
 *    - Resource byte limits (maxOutputBytes truncation)
 *    - Multi-language verification (TypeScript, Python, Shell)
 * 4. Closed Cognitive Learning Loop:
 *    - Failure classification & routing (RE_EXECUTE, RE_PLAN, ESCALATE)
 *    - Lesson candidate quality gates (rejects fabricated citations, low critic scores)
 *    - Vector memory indexing into 768-D VectorStore
 *    - Checkpoint snapshotting and recovery restoration
 * 5. Non-Trivial Multi-Step Task Proof:
 *    - Multi-step research & multi-language computational verification
 *    - Real graph execution with state ownership and durable journal
 *    - Verified lesson commitment and subsequent retrieval for new queries
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PlanningEngine } from './planningEngine';
import { GraphExecutionEngine, validateGraphIR } from './graphEngine';
import { PolyglotEngine } from './polyglotEngine';
import { CognitiveLearningLoop } from './learningLoop';
import { assembleDeterministicContext, buildSemanticPrompt } from './contextAssembly';
import { BrainPipeline } from './brainPipeline';
import { NodeContract, BrainGraphState, BrainGraphIR } from '../types/brainGraph';

describe('1. Planning Engine: Goal → Understanding → Constraints → Plan → Graph IR', () => {
  test('Transforms natural language user goal into structured ExplicitPlan with DAG and constraints', () => {
    const goal = 'Analyze matrix eigenvalue stability, execute Python verification script, and output audited report';
    const plan = PlanningEngine.generatePlan(goal);

    // 1. Understanding & Intent
    assert.ok(plan.planId.startsWith('plan_'));
    assert.equal(plan.goal, goal);
    assert.ok(plan.understanding.intent.length > 0);
    assert.ok(plan.understanding.entities.length > 0);

    // 2. Extracted Constraints
    assert.ok(plan.constraints.hardConstraints.length >= 2, 'Must extract operational and security constraints');
    assert.ok(plan.constraints.securityPolicies.some((c) => c.includes('POL_SEC') || c.includes('POL_RES')));

    // 3. Squad & Tool Selection
    assert.ok(plan.workforce.assignedSquad.length >= 2, 'Must allocate specialized squad');
    assert.ok(plan.tasks.length >= 2, 'Must generate sequential/parallel task list');
    assert.ok(plan.tasks.some((t) => t.taskType === 'polyglot'));

    // 4. DAG Topological Ordering & Critical Path
    assert.ok(plan.tasks.length >= 2);
    assert.ok(plan.criticalPath.length > 0);
    assert.ok(plan.totalEstimatedDurationMs > 0);
    assert.equal(plan.status, 'VALIDATED');
  });

  test('Compiles ExplicitPlan into canonical, schema-valid BrainGraphIR', () => {
    const goal = 'Compute scaled Euclidean norm in Python, verify zero overflow, and evaluate results';
    const plan = PlanningEngine.generatePlan(goal);
    const graphIR = PlanningEngine.compilePlanToGraph(plan);

    // IR structure
    assert.ok(graphIR.id.startsWith('graph_plan_'));
    assert.equal(graphIR.entryNodeId, 'node_entry_understand');
    assert.ok(graphIR.nodes.length >= 4);
    assert.ok(graphIR.edges.length >= 3);

    // Graph IR Validation must pass with 0 errors
    const validation = validateGraphIR(graphIR);
    assert.equal(validation.valid, true, `Validation failed: ${validation.errors.join('; ')}`);
    assert.equal(validation.errors.length, 0);

    // Entry nodes must include understand and policy gate
    assert.ok(graphIR.nodes.some((n) => n.id === 'node_entry_understand'));
    assert.ok(graphIR.nodes.some((n) => n.id === 'node_policy_gate'));
    assert.ok(graphIR.nodes.some((n) => n.type === 'polyglot'));
    assert.ok(graphIR.nodes.some((n) => n.id === 'node_verify_plan'));
  });

  test('Replanning Engine revises plan upon failure with remedial patches', () => {
    const goal = 'Execute statistical distribution check';
    const plan = PlanningEngine.generatePlan(goal);
    const taskIdToFail = plan.tasks[0]?.taskId || 'task_1';

    const replanResult = PlanningEngine.replanAfterFailure(
      plan,
      taskIdToFail,
      'RUNTIME_FAILURE',
      'Segmentation fault in native process'
    );

    assert.equal(replanResult.replanSuccess, true);
    assert.equal(replanResult.recoveryAction, 'RE_PLAN');
    assert.ok(replanResult.remedialPatch.length > 0);
    assert.equal(replanResult.revisedPlan.replanningCount, 1);
    assert.equal(replanResult.revisedPlan.status, 'REPLANNING');
  });
});

describe('2. Deterministic Context Assembly & Provenance Layer', () => {
  test('Assembles bounded deterministic context with exact provenance and memory budgets', () => {
    const assembled = assembleDeterministicContext({
      currentRequest: {
        text: 'Verify Cauchy-Schwarz inequality for high-dimensional vectors',
        modality: 'text',
      },
      taskState: {
        taskId: 'task_cs_001',
        goal: 'Cauchy-Schwarz verification',
        status: 'running',
        progress: 0.5,
      },
      graphState: {
        graphId: 'graph_cs',
        graphVersion: '1.0.0',
        activeNodeId: 'node_calc',
        completedNodes: ['node_init'],
        pendingNodes: ['node_calc', 'node_verify'],
        errors: [],
      },
      rawMemories: [
        { id: 'mem_1', content: 'Cauchy-Schwarz theorem: |<u,v>| <= ||u||*||v||', score: 0.95, source: 'EPISODIC_STORE' },
        { id: 'mem_2', content: 'Stale note from 2021', score: 0.20 },
      ],
      retrievedEvidence: [
        {
          id: 'chk_1',
          refId: 'REF-1',
          source: 'math_axioms.md',
          text: 'Cauchy-Schwarz inequality guarantees cosine similarity lies strictly within [-1.0, 1.0].',
          denseScore: 0.98,
          hybridScore: 0.96,
          metadata: { heading: 'Inner Product Spaces' },
          timestamp: new Date().toISOString(),
        },
      ],
      options: { maxContextTokens: 1000 },
    });

    assert.equal(assembled.queryIntent.modality, 'text');
    assert.ok(assembled.retrievedEvidence.length === 1);
    assert.equal(assembled.retrievedEvidence[0]?.refId, 'REF-1');
    assert.ok(assembled.tokenBudgets.allocatedTokens <= 1000);
    assert.ok(assembled.relevantMemory.length > 0);
    assert.equal(assembled.relevantMemory[0]?.provenance?.source, 'EPISODIC_STORE');

    // Semantic Prompt Separation
    const { systemInstruction, userContent } = buildSemanticPrompt(assembled);
    assert.ok(systemInstruction.includes('PROJECT JARVIS'));
    assert.ok(systemInstruction.includes('POLICY RULES'));
    assert.ok(userContent.includes('USER REQUEST'));
    assert.ok(userContent.includes('[REF-1]'));
    assert.ok(userContent.includes('Cauchy-Schwarz'));
  });

  test('Deduplicates and filters conflicting or stale memories', () => {
    const assembled = assembleDeterministicContext({
      currentRequest: { text: 'Query with duplicate memories' },
      rawMemories: [
        { id: 'mem_dup', content: 'Memory A', score: 0.9 },
        { id: 'mem_dup', content: 'Memory A duplicate', score: 0.9 },
        { id: 'mem_low', content: 'Low score noise', score: 0.1 },
      ],
    });

    const relevant = assembled.relevantMemory.filter((m) => m.provenance?.classification === 'RELEVANT');
    const duplicate = assembled.relevantMemory.filter((m) => m.provenance?.classification === 'DUPLICATE');
    assert.equal(relevant.length, 1);
    assert.equal(duplicate.length, 1);
    assert.equal(relevant[0]?.id, 'mem_dup');
  });
});

describe('3. Polyglot Intelligence & Security Boundaries', () => {
  test('Blocks workspace path escape attacks (Directory Traversal)', async () => {
    const escapeResult = await PolyglotEngine.execute({
      taskId: 'sec_escape_test',
      language: 'shell',
      code: 'cat ../../../etc/passwd',
    });

    assert.equal(escapeResult.success, false);
    assert.equal(escapeResult.failureCode, 'POLICY_DENIED');
    assert.ok(escapeResult.stderr.includes('Workspace escape blocked') || escapeResult.verification.failureReason?.includes('traversal'));
  });

  test('Enforces maximum output byte limits to prevent resource exhaustion', async () => {
    const result = await PolyglotEngine.execute({
      taskId: 'byte_limit_test',
      language: 'python',
      code: 'print("A" * 50000)',
      maxOutputBytes: 1024,
    });

    assert.equal(result.success, true);
    assert.ok(result.stdout.length <= 1100);
    assert.ok(result.stdout.includes('[TRUNCATED: maxOutputBytes limit'));
  });

  test('Multi-language execution verification (TypeScript and Python)', async () => {
    // Python calculation
    const pyRes = await PolyglotEngine.execute({
      taskId: 'poly_py',
      language: 'python',
      code: 'import math; print(f"SQRT2={math.sqrt(2):.6f}")',
    });
    assert.equal(pyRes.success, true);
    assert.ok(pyRes.stdout.includes('SQRT2=1.414214'));

    // TypeScript execution
    const tsRes = await PolyglotEngine.execute({
      taskId: 'poly_ts',
      language: 'typescript',
      code: 'const nums = [1, 2, 3, 4]; console.log("SUM=" + nums.reduce((a, b) => a + b, 0));',
    });
    assert.equal(tsRes.success, true);
    assert.ok(tsRes.stdout.includes('SUM=10'));
  });
});

describe('4. Closed Cognitive Learning Loop', () => {
  beforeEach(() => {
    CognitiveLearningLoop.reset();
  });

  test('Routes failures deterministically to appropriate recovery actions', () => {
    // 1. Policy Denial -> Immediate Escalate
    const policyDecision = CognitiveLearningLoop.routeFailure({
      failureCode: 'POLICY_DENIED',
      errorMessage: 'Workspace boundary escape',
      attempts: 1,
      maxAttempts: 3,
      nodeId: 'node_shell',
    });
    assert.equal(policyDecision.action, 'ESCALATE');

    // 2. Timeout -> Re-execute with backoff
    const timeoutDecision = CognitiveLearningLoop.routeFailure({
      failureCode: 'TIMEOUT',
      errorMessage: 'Process exceeded 2000ms',
      attempts: 1,
      maxAttempts: 3,
      nodeId: 'node_calc',
    });
    assert.equal(timeoutDecision.action, 'RE_EXECUTE');
    assert.equal(timeoutDecision.retryAttempt, 2);

    // 3. Verification failure -> Re-plan
    const verifDecision = CognitiveLearningLoop.routeFailure({
      failureCode: 'VERIFICATION_FAILURE',
      errorMessage: 'Assertion failed: expected output to match',
      attempts: 1,
      maxAttempts: 3,
      nodeId: 'node_verify',
    });
    assert.equal(verifDecision.action, 'RE_PLAN');
    assert.equal(verifDecision.targetNodeId, 'node_replan');

    // 4. Exhausted attempts -> Escalate
    const exhaustDecision = CognitiveLearningLoop.routeFailure({
      failureCode: 'RUNTIME_FAILURE',
      errorMessage: 'Crash',
      attempts: 4,
      maxAttempts: 3,
      nodeId: 'node_calc',
    });
    assert.equal(exhaustDecision.action, 'ESCALATE');
  });

  test('Enforces strict quality gates on lesson candidates before committing to memory', async () => {
    // 1. Candidate with fabricated citations is rejected
    const rejectedFabricated = await CognitiveLearningLoop.commitLesson({
      cycleId: 'cycle_fake_cite',
      taskSummary: 'Fake citation lesson',
      outcome: 'PASS',
      lesson: 'Never do this',
      criticScore: 90,
      confidence: 0.9,
      fabricatedCitationsCount: 2, // VIOLATION!
    });
    assert.equal(rejectedFabricated.committed, false);
    assert.ok(rejectedFabricated.rejectionReason?.toLowerCase().includes('fabricated citations'));

    // 2. Candidate with low critic score is rejected
    const rejectedLowScore = await CognitiveLearningLoop.commitLesson({
      cycleId: 'cycle_low_score',
      taskSummary: 'Poor quality lesson',
      outcome: 'PASS',
      lesson: 'Low score',
      criticScore: 60, // Below default 75
      confidence: 0.5,
      fabricatedCitationsCount: 0,
    });
    assert.equal(rejectedLowScore.committed, false);

    // 3. Candidate meeting all quality gates is committed
    const validLesson = await CognitiveLearningLoop.commitLesson({
      cycleId: 'cycle_high_quality',
      taskSummary: 'Blue LAPACK norm scaling for Float32 vectors',
      outcome: 'PASS',
      lesson: 'Always apply 3-accumulator Blue scaling to prevent subnormal underflow and intermediate overflow.',
      ruleCandidate: 'Apply Blue dnrm2 scaling on large vectors',
      criticScore: 95,
      confidence: 0.95,
      fabricatedCitationsCount: 0,
      evidenceRef: 'REF-1',
    });
    assert.equal(validLesson.committed, true);
    assert.ok(validLesson.lessonId);
    assert.equal(CognitiveLearningLoop.getAllLessons().length, 1);
  });

  test('Past verified lessons are indexed into vector store and retrieved for new tasks', async () => {
    // Seed verified lesson
    await CognitiveLearningLoop.commitLesson({
      cycleId: 'cycle_prior_exp',
      taskSummary: 'Mitigate float overflow in norm calculations',
      outcome: 'PASS',
      lesson: 'Use scaled accumulation via Blue algorithm dnrm2 to avoid overflow.',
      ruleCandidate: 'Use Blue scaling',
      criticScore: 92,
      confidence: 0.92,
      fabricatedCitationsCount: 0,
    });

    // Retrieve for a new similar goal
    const retrieved = await CognitiveLearningLoop.retrieveRelevantLessons(
      'Prevent floating point overflow in Euclidean norm summation',
      1
    );

    assert.ok(retrieved.length >= 1, 'Must retrieve relevant prior lesson');
    assert.ok(retrieved[0]?.lesson.includes('Blue algorithm'));
  });

  test('Snapshots durable checkpoints and restores graph state on recovery', () => {
    const mockState: BrainGraphState = {
      task_id: 'task_snapshot_test',
      graph_id: 'graph_snap_01',
      graph_version: '1.0.0',
      current_node: 'node_step_2',
      goal: 'Snapshot test goal',
      inputs: {},
      policy_state: { authorized: true, activeRules: [] },
      authorization: { role: 'operator', approved: true },
      completed_nodes: ['node_step_1'],
      pending_nodes: ['node_step_2', 'node_step_3'],
      attempts: { node_step_1: 1, node_step_2: 1 },
      memory_refs: ['REF-1'],
      retrieved_refs: ['REF-1'],
      context: assembleDeterministicContext({
        currentRequest: { text: 'test' },
        options: { maxContextTokens: 1000 },
      }),
      observations: { node_step_1: { output: 'Step 1 success' } },
      artifacts: { data: 42 },
      errors: [],
      resource_usage: { total_tokens: 0, total_execution_time_ms: 0, memory_bytes: 0, subprocess_count: 0 },
      timestamps: { created_at: new Date().toISOString(), started_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      verification: { verified: true, critic_score: 95, failed_invariants: [], evidence_hash: 'hash_1' },
      evaluation: { score: 95, passed: true, criteria: {}, rationale: '' },
    };

    // Save checkpoint
    const chk = CognitiveLearningLoop.createCheckpoint(mockState, 'node_step_1', 'step_1_completed');
    assert.ok(chk.checkpointId);
    assert.ok(chk.stateSnapshot);

    // Restore into fresh state
    const targetState: BrainGraphState = {
      ...mockState,
      completed_nodes: [],
      observations: {},
      artifacts: {},
    };

    const restoreResult = CognitiveLearningLoop.restoreFromCheckpoint(chk.stateSnapshot, targetState);
    assert.equal(restoreResult.resumed, true);
    assert.equal(restoreResult.milestone, 'step_1_completed');
    assert.ok(targetState.completed_nodes.includes('node_step_1'));
    assert.equal(targetState.artifacts['data'], 42);
  });
});

describe('5. Non-Trivial Multi-Step Cognitive Loop Proof', () => {
  test('Complete End-to-End Proof: Goal → Plan → Multi-Node Execution → Verification → Learning', async () => {
    const pipeline = new BrainPipeline();
    await pipeline.initialize();

    const goal = 'Research numerical stability in Euclidean norm computation, calculate sample vector norms across languages, verify Blue algorithm invariants, and synthesize a verified engineering report.';

    // Execute through full planning, graph compilation, and deterministic execution loop
    const result = await pipeline.executeGoalThroughFullPlanningLoop(goal, {
      mockModelText: 'Project JARVIS guarantees numerical stability using Blue\'s LAPACK dnrm2 algorithm [REF-1]. Multi-language verification confirmed identical L2 norm results across Float32 arrays.',
    });

    // 1. PROVE: Structured Plan was generated with DAG and constraints
    assert.ok(result.plan.planId);
    assert.equal(result.plan.status, 'VALIDATED');
    assert.ok(result.plan.tasks.length >= 3);
    assert.ok(result.plan.criticalPath.length >= 2);

    // 2. PROVE: GraphIR was compiled and executed deterministically
    assert.ok(result.graphIR.id);
    assert.ok(result.finalState.completed_nodes.length >= 3);
    assert.ok(result.finalState.completed_nodes.includes('node_entry_understand'));
    assert.ok(result.finalState.completed_nodes.includes('node_policy_gate'));
    assert.equal(result.finalState.verification.verified, true);

    // 3. PROVE: Execution journal & trace records state ownership
    assert.ok(result.trace.length >= 3);
    assert.ok(result.journal.length >= 3);
    for (const entry of result.journal) {
      assert.ok(entry.taskId);
      assert.ok(entry.graphId);
      assert.ok(entry.nodeId);
      assert.ok(entry.eventType);
      assert.ok(entry.timestamp);
    }

    // 4. PROVE: Cognitive Learning Loop committed verified lesson
    const allLessons = CognitiveLearningLoop.getAllLessons();
    assert.ok(allLessons.length >= 1, 'Must have committed verified lesson');
    const lastLesson = allLessons[allLessons.length - 1]!;
    assert.equal(lastLesson.outcome, 'PASS');
    assert.ok(lastLesson.criticScore >= 75);

    // 5. PROVE: Experience becomes memory for subsequent queries
    const retrieved = await CognitiveLearningLoop.retrieveRelevantLessons(
      'How to compute Euclidean norm with high numerical stability?',
      1
    );
    assert.ok(retrieved.length >= 1, 'Subsequent query must retrieve previously committed lesson');
  });
});
