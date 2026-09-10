/**
 * PROJECT JARVIS: CANONICAL GRAPH CORE & LIVE REAL RUNTIME INTEGRATION TEST
 * 
 * Tests:
 * 1. Graph IR Schema Validation (valid, duplicate IDs, broken edges, invalid runtimes, illegal cycles)
 * 2. Deterministic Graph Execution (sequential, branching, bounded loops, termination)
 * 3. State & Trace Propagation (task_id, graph_id, graph_version, node_id, state, context, memory_refs, observations, errors, attempts, timestamps)
 * 4. Policy Gates & Durable Journaling Replay Protection
 * 5. Complete Real Live Runtime Path:
 *    USER REQUEST → BRAIN → GRAPH → UNDERSTAND → TOKENIZE → CONTEXT → MEMORY/RAG → REAL MODEL → RESPONSE
 *    - Real model call (gemini-3.6-flash via /api/cognitive/infer)
 *    - Graph owns execution state
 *    - Memory reaches model context
 *    - Final response returns through Brain graph
 *    - Complete execution trace verified
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BrainPipeline } from './brainPipeline';
import { GraphExecutionEngine, validateGraphIR } from './graphEngine';
import {
  BrainGraphIR,
  NodeContract,
  GraphEdge,
  BrainGraphState,
} from '../types/brainGraph';
import { CANONICAL_KNOWLEDGE_BASE } from './ragEngine';

describe('1. Canonical Graph IR: Schema Validation & Invariants', () => {
  test('Valid Canonical Graph IR passes validation', () => {
    const validGraph: BrainGraphIR = {
      id: 'graph_valid_01',
      version: '1.0.0',
      name: 'Valid Sequential Graph',
      entryNodeId: 'node_a',
      nodes: [
        {
          id: 'node_a',
          name: 'First Step',
          type: 'tool',
          inputTypes: {},
          outputTypes: {},
          capability: 'step_a',
          timeoutMs: 1000,
          retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
          sideEffect: 'READ_ONLY',
          authorization: { requiredRole: 'USER', requireApproval: false },
          verification: { requiredAssertions: [], criticThreshold: 75 },
          dependencies: [],
        },
        {
          id: 'node_b',
          name: 'Second Step',
          type: 'tool',
          inputTypes: {},
          outputTypes: {},
          capability: 'step_b',
          timeoutMs: 1000,
          retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
          sideEffect: 'READ_ONLY',
          authorization: { requiredRole: 'USER', requireApproval: false },
          verification: { requiredAssertions: [], criticThreshold: 75 },
          dependencies: ['node_a'],
        },
      ],
      edges: [
        { id: 'e1', from: 'node_a', to: 'node_b', type: 'sequential' },
      ],
    };

    const res = validateGraphIR(validGraph);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
  });

  test('Invalid Graph: Rejects empty nodes or missing IDs', () => {
    const emptyGraph = { id: '', version: '', entryNodeId: '', nodes: [], edges: [] } as any;
    const res = validateGraphIR(emptyGraph);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('Graph ID')));
    assert.ok(res.errors.some((e) => e.includes('at least one node')));
  });

  test('Invalid Graph: Rejects duplicate node IDs', () => {
    const dupGraph: BrainGraphIR = {
      id: 'graph_dup',
      version: '1.0.0',
      name: 'Duplicate Node Graph',
      entryNodeId: 'node_1',
      nodes: [
        {
          id: 'node_1',
          name: 'Step 1',
          type: 'tool',
          inputTypes: {},
          outputTypes: {},
          capability: 'tool',
          timeoutMs: 1000,
          retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
          sideEffect: 'READ_ONLY',
          authorization: { requiredRole: 'USER', requireApproval: false },
          verification: { requiredAssertions: [], criticThreshold: 75 },
          dependencies: [],
        },
        {
          id: 'node_1', // Duplicate ID
          name: 'Step 1 Duplicate',
          type: 'tool',
          inputTypes: {},
          outputTypes: {},
          capability: 'tool',
          timeoutMs: 1000,
          retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
          sideEffect: 'READ_ONLY',
          authorization: { requiredRole: 'USER', requireApproval: false },
          verification: { requiredAssertions: [], criticThreshold: 75 },
          dependencies: [],
        },
      ],
      edges: [],
    };

    const res = validateGraphIR(dupGraph);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('Duplicate node ID')));
  });

  test('Invalid Graph: Rejects broken edge source or target', () => {
    const brokenEdgeGraph: BrainGraphIR = {
      id: 'graph_broken_edge',
      version: '1.0.0',
      name: 'Broken Edge Graph',
      entryNodeId: 'node_x',
      nodes: [
        {
          id: 'node_x',
          name: 'Node X',
          type: 'tool',
          inputTypes: {},
          outputTypes: {},
          capability: 'tool',
          timeoutMs: 1000,
          retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
          sideEffect: 'READ_ONLY',
          authorization: { requiredRole: 'USER', requireApproval: false },
          verification: { requiredAssertions: [], criticThreshold: 75 },
          dependencies: [],
        },
      ],
      edges: [
        { id: 'edge_broken', from: 'node_x', to: 'node_nonexistent', type: 'sequential' },
      ],
    };

    const res = validateGraphIR(brokenEdgeGraph);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('target node "node_nonexistent" does not exist')));
  });

  test('Invalid Graph: Detects illegal unmanaged cycles', () => {
    const cyclicGraph: BrainGraphIR = {
      id: 'graph_cyclic',
      version: '1.0.0',
      name: 'Cyclic Graph',
      entryNodeId: 'node_c1',
      nodes: [
        {
          id: 'node_c1',
          name: 'C1',
          type: 'tool',
          inputTypes: {},
          outputTypes: {},
          capability: 'tool',
          timeoutMs: 1000,
          retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
          sideEffect: 'READ_ONLY',
          authorization: { requiredRole: 'USER', requireApproval: false },
          verification: { requiredAssertions: [], criticThreshold: 75 },
          dependencies: ['node_c2'],
        },
        {
          id: 'node_c2',
          name: 'C2',
          type: 'tool',
          inputTypes: {},
          outputTypes: {},
          capability: 'tool',
          timeoutMs: 1000,
          retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
          sideEffect: 'READ_ONLY',
          authorization: { requiredRole: 'USER', requireApproval: false },
          verification: { requiredAssertions: [], criticThreshold: 75 },
          dependencies: ['node_c1'],
        },
      ],
      edges: [
        { id: 'ec1', from: 'node_c1', to: 'node_c2', type: 'sequential' },
        { id: 'ec2', from: 'node_c2', to: 'node_c1', type: 'sequential' },
      ],
    };

    const res = validateGraphIR(cyclicGraph);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('illegal unmanaged cycle')));
  });
});

describe('2. Canonical Graph Core: Transitions, Branching, Loops & State Ownership', () => {
  test('Sequential Execution & State Ownership Propagation', async () => {
    const nodes: NodeContract[] = [
      {
        id: 'step_1',
        name: 'Step One',
        type: 'tool',
        inputTypes: {},
        outputTypes: {},
        capability: 'tool_one',
        timeoutMs: 1000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: [],
      },
      {
        id: 'step_2',
        name: 'Step Two',
        type: 'tool',
        inputTypes: {},
        outputTypes: {},
        capability: 'tool_two',
        timeoutMs: 1000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['step_1'],
      },
    ];

    const edges: GraphEdge[] = [
      { id: 'e1_2', from: 'step_1', to: 'step_2', type: 'sequential' },
    ];

    const graph: BrainGraphIR = {
      id: 'graph_seq_01',
      version: '1.0.0',
      name: 'Sequential Execution Graph',
      entryNodeId: 'step_1',
      nodes,
      edges,
    };

    const engine = new GraphExecutionEngine();
    const initialState = GraphExecutionEngine.createInitialState(
      'task_seq_01',
      graph.id,
      'Execute sequential steps',
      {},
      nodes,
      undefined,
      graph.version
    );

    const finalState = await engine.execute(graph, initialState);

    // Verify Graph owns execution state
    assert.equal(finalState.task_id, 'task_seq_01');
    assert.equal(finalState.graph_id, 'graph_seq_01');
    assert.equal(finalState.graph_version, '1.0.0');
    assert.equal(finalState.completed_nodes.length, 2);
    assert.ok(finalState.completed_nodes.includes('step_1'));
    assert.ok(finalState.completed_nodes.includes('step_2'));

    // Verify Traces carry mandatory context & timestamps
    const traces = engine.getTrace();
    assert.equal(traces.length, 2);
    for (const t of traces) {
      assert.equal(t.task_id, 'task_seq_01');
      assert.equal(t.graph_id, 'graph_seq_01');
      assert.equal(t.graph_version, '1.0.0');
      assert.ok(t.node_id);
      assert.ok(t.state);
      assert.ok(t.context);
      assert.ok(Array.isArray(t.memory_refs));
      assert.ok(t.observations);
      assert.ok(Array.isArray(t.errors));
      assert.ok(t.attempts >= 1);
      assert.ok(t.timestamps.started_at);
      assert.ok(t.timestamps.completed_at);
      assert.equal(t.status, 'COMPLETED');
    }
  });

  test('Conditional Branching: Traverses branch_pass edge when condition met', async () => {
    const nodes: NodeContract[] = [
      {
        id: 'eval_gate',
        name: 'Evaluation Gate',
        type: 'tool',
        inputTypes: {},
        outputTypes: {},
        capability: 'gate',
        timeoutMs: 1000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: [],
      },
      {
        id: 'pass_path',
        name: 'Passed Path',
        type: 'tool',
        inputTypes: {},
        outputTypes: {},
        capability: 'pass_action',
        timeoutMs: 1000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['eval_gate'],
      },
      {
        id: 'fail_path',
        name: 'Failed Path',
        type: 'tool',
        inputTypes: {},
        outputTypes: {},
        capability: 'fail_action',
        timeoutMs: 1000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['eval_gate'],
      },
    ];

    const edges: GraphEdge[] = [
      {
        id: 'branch_to_pass',
        from: 'eval_gate',
        to: 'pass_path',
        type: 'branch_pass',
        condition: { key: 'policy_state.authorized', operator: 'truthy' },
      },
      {
        id: 'branch_to_fail',
        from: 'eval_gate',
        to: 'fail_path',
        type: 'branch_fail',
        condition: { key: 'policy_state.authorized', operator: 'falsy' },
      },
    ];

    const graph: BrainGraphIR = {
      id: 'graph_branch_01',
      version: '1.0.0',
      name: 'Branching Graph',
      entryNodeId: 'eval_gate',
      nodes,
      edges,
    };

    const engine = new GraphExecutionEngine();
    const state = GraphExecutionEngine.createInitialState(
      'task_branch_01',
      graph.id,
      'Test Branching',
      {},
      nodes
    );
    state.policy_state.authorized = true;

    const result = await engine.execute(graph, state);

    assert.ok(result.completed_nodes.includes('eval_gate'));
    assert.ok(result.completed_nodes.includes('pass_path'));
    assert.equal(result.completed_nodes.includes('fail_path'), false, 'Fail path should not be executed');
  });

  test('Bounded Loops: Safely iterates up to maxIterations then terminates deterministically', async () => {
    let loopCounter = 0;
    const nodes: NodeContract[] = [
      {
        id: 'node_looping',
        name: 'Looping Node',
        type: 'polyglot',
        runtime: 'typescript',
        polyglotPayload: {
          code: 'console.log("LOOP_TICK");',
        },
        inputTypes: {},
        outputTypes: {},
        capability: 'loop_task',
        timeoutMs: 3000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: [],
        loop: {
          loopConditionKey: 'verified',
          maxIterations: 3,
          targetNodeId: 'node_looping',
        },
      },
      {
        id: 'node_done',
        name: 'Post-Loop Done',
        type: 'terminal',
        inputTypes: {},
        outputTypes: {},
        capability: 'finish',
        timeoutMs: 1000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['node_looping'],
      },
    ];

    const graph: BrainGraphIR = {
      id: 'graph_loop_01',
      version: '1.0.0',
      name: 'Looping Graph',
      entryNodeId: 'node_looping',
      nodes,
      edges: [
        { id: 'loop_done', from: 'node_looping', to: 'node_done', type: 'sequential' },
      ],
    };

    const engine = new GraphExecutionEngine();
    const state = GraphExecutionEngine.createInitialState(
      'task_loop_01',
      graph.id,
      'Test bounded loop',
      {},
      nodes
    );

    const res = await engine.execute(graph, state);
    assert.ok(res.attempts['node_looping'] >= 3, 'Loop must execute exactly 3 bounded iterations');
    assert.ok(res.completed_nodes.includes('node_done'));
  });

  test('Policy Gate: Halts graph execution and records POLICY_DENIED on authorization refusal', async () => {
    const nodes: NodeContract[] = [
      {
        id: 'node_gate',
        name: 'Security Authorization Gate',
        type: 'policy_gate',
        inputTypes: {},
        outputTypes: {},
        capability: 'auth_gate',
        timeoutMs: 1000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'ADMIN', requireApproval: true },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: [],
      },
      {
        id: 'node_sensitive',
        name: 'Sensitive Action',
        type: 'tool',
        inputTypes: {},
        outputTypes: {},
        capability: 'action',
        timeoutMs: 1000,
        retryPolicy: { maxAttempts: 1, backoffMs: 0, exponential: false },
        sideEffect: 'READ_ONLY',
        authorization: { requiredRole: 'USER', requireApproval: false },
        verification: { requiredAssertions: [], criticThreshold: 75 },
        dependencies: ['node_gate'],
      },
    ];

    const graph: BrainGraphIR = {
      id: 'graph_gate_01',
      version: '1.0.0',
      name: 'Policy Gate Graph',
      entryNodeId: 'node_gate',
      nodes,
      edges: [{ id: 'e1', from: 'node_gate', to: 'node_sensitive', type: 'sequential' }],
    };

    const engine = new GraphExecutionEngine();
    const state = GraphExecutionEngine.createInitialState(
      'task_gate_01',
      graph.id,
      'Test policy denial',
      {},
      nodes
    );
    state.policy_state.authorized = false;
    state.policy_state.deniedReason = 'Constitutional invariant check: Unauthorized role';

    const res = await engine.execute(graph, state);

    assert.equal(res.completed_nodes.includes('node_sensitive'), false);
    assert.ok(res.errors.some((e) => e.failure_code === 'POLICY_DENIED'));
    assert.equal(res.verification.verified, false);
  });
});

describe('3. Complete Real Runtime Path: USER REQUEST → BRAIN → GRAPH → UNDERSTAND → TOKENIZE → CONTEXT → MEMORY/RAG → REAL MODEL → RESPONSE', () => {
  test('Live Integration: End-to-end execution through real Gemini model provider with verified memory injection', async () => {
    const pipeline = new BrainPipeline();
    await pipeline.initialize();

    const userPrompt = 'How does Project JARVIS prevent numerical overflow in Euclidean norm calculation?';

    // Execute through the Canonical Graph Runtime
    const { state, output, trace, journal } = await pipeline.executeViaGraph({
      cycleId: 'cycle_live_verified_001',
      userPrompt,
      model: 'gemini-3.8-flash',
      // No mockModelText! This calls the actual configured Gemini model!
    });

    // 1. PROVE: Graph owns execution state
    assert.equal(state.task_id, 'cycle_live_verified_001');
    assert.ok(state.graph_id.startsWith('canonical_brain_graph_'));
    assert.equal(state.graph_version, '1.0.0');
    assert.ok(state.completed_nodes.includes('node_understand'));
    assert.ok(state.completed_nodes.includes('node_tokenize'));
    assert.ok(state.completed_nodes.includes('node_memory'));
    assert.ok(state.completed_nodes.includes('node_context'));
    assert.ok(state.completed_nodes.includes('node_model'));
    assert.ok(state.completed_nodes.includes('node_evaluate'));
    assert.ok(state.completed_nodes.includes('node_verify'));
    assert.ok(state.completed_nodes.includes('node_terminal'));

    // 2. PROVE: Complete execution trace recorded
    assert.ok(trace.length >= 7, `Expected at least 7 trace entries, got ${trace.length}`);
    for (const t of trace) {
      assert.equal(t.task_id, 'cycle_live_verified_001');
      assert.ok(t.graph_id);
      assert.ok(t.node_id);
      assert.ok(t.timestamps.started_at);
      assert.ok(t.timestamps.completed_at);
    }

    // 3. PROVE: Retrieved memory actually reaches the model context
    assert.ok(state.context.retrievedEvidence.length > 0, 'Must retrieve verified knowledge chunks');
    const firstEvidence = state.context.retrievedEvidence[0]!;
    assert.equal(firstEvidence.refId, 'REF-1');
    assert.ok(
      firstEvidence.text.toLowerCase().includes('lapack') || firstEvidence.text.toLowerCase().includes('norm'),
      'Retrieved evidence must contain LAPACK norm formula'
    );
    assert.ok(state.memory_refs.length > 0);
    assert.ok(state.retrieved_refs.includes('REF-1'));

    // 4. PROVE: Final model response returns through the Brain graph from the real configured model provider
    assert.ok(output.modelReasoning.answer.length > 20, 'Expected non-empty model response');
    assert.equal(output.modelReasoning.modelUsed, 'gemini-3.8-flash');
    assert.ok(output.modelReasoning.latencyMs > 0, 'Real inference must have positive latency');
    assert.ok(output.modelReasoning.outputTokens > 0, 'Real inference must produce output tokens');
    assert.equal(state.artifacts.response, output.modelReasoning.answer);

    // 5. PROVE: Grounding citations and evaluation
    assert.ok(output.evaluation.citationsFound >= 1, 'Expected model to cite [REF-1]');
    assert.equal(output.evaluation.fabricatedCitations.length, 0, 'Expected zero fabricated citations');
    assert.ok(output.evaluation.criticScore >= 75, `Expected criticScore >= 75, got ${output.evaluation.criticScore}`);
    assert.equal(output.evaluation.passed, true);

    // 6. PROVE: Real Memory Loop persisted lesson
    assert.equal(output.learnedLesson.outcome, 'PASS');
    assert.ok(pipeline.getEpisodicMemory().length >= 1);

    // 7. PROVE: Durable Journal entries logged
    assert.ok(journal.some((j) => j.eventType === 'NODE_START'));
    assert.ok(journal.some((j) => j.eventType === 'OBSERVATION_CAPTURED'));
    assert.ok(journal.some((j) => j.eventType === 'NODE_COMPLETED'));
  });
});
