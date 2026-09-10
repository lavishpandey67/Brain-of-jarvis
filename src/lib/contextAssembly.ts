/**
 * PROJECT JARVIS — DETERMINISTIC CONTEXT ASSEMBLY ENGINE
 * 
 * Implements deterministic context assembly combining:
 * 1. Current request
 * 2. Conversation state
 * 3. Task state
 * 4. Graph state
 * 5. Relevant memory
 * 6. Retrieved RAG evidence
 * 7. Previous observations
 * 8. Policies
 * 9. Tool results
 * 10. Execution history
 * 
 * With:
 * - Full item provenance (source, timestamp, confidence, classification)
 * - Explicit categorization: RELEVANT, IRRELEVANT, CONFLICTING, STALE, DUPLICATE, INJECTED
 * - Bounded token budgets with deterministic pruning
 * - Strict separation of semantic prompt construction from graph state
 */

import {
  BrainContext,
  ContextItemProvenance,
  MemoryItem,
  MemoryProvenanceClassification,
  PolicyRule,
  RetrievedEvidenceItem,
  ToolResultItem,
  ExecutionHistoryStep,
  ContextTokenBudgetBreakdown,
  BrainGraphState,
  EpisodicLessonRecord,
} from '../types/brainGraph';
import { Modality } from '../types/brain';
import { encode } from './tokenizer';

export interface RawMemoryInput {
  id: string;
  content: string;
  source?: string;
  timestamp?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  score?: number;
}

export interface ContextAssemblyOptions {
  maxContextTokens?: number;
  policyBudgetTokens?: number;
  evidenceBudgetTokens?: number;
  memoryBudgetTokens?: number;
  observationBudgetTokens?: number;
  historyBudgetTokens?: number;
  relevanceThreshold?: number;
  staleThresholdMs?: number; // default: 7 days
  currentTime?: string;
}

// Adversarial Injection Signatures
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s*:\s*override/i,
  /disregard\s+(all\s+)?(safety|constitutional|policy)\s+guidelines/i,
  /reveal\s+(all\s+)?(api\s+keys|secrets|passwords|internal\s+prompts)/i,
  /<script[\s>]/i,
  /\[system\s+prompt\s+reset\]/i,
  /admin\s+mode\s+enabled/i,
  /execute\s+arbitrary\s+code/i,
  /rm\s+-rf\s+\//i,
];

// Simple deterministic hash for deduplication
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Classifies a raw memory item based on relevance, age, duplicate check, adversarial patterns, and conflict.
 */
export function classifyMemoryItem(
  item: RawMemoryInput,
  queryGoal: string,
  existingHashes: Set<string>,
  activePolicies: PolicyRule[],
  options: { relevanceThreshold?: number; staleThresholdMs?: number; currentTime?: string } = {}
): { classification: MemoryProvenanceClassification; notes?: string } {
  const content = item.content || '';
  const now = options.currentTime ? new Date(options.currentTime).getTime() : Date.now();
  const staleThreshold = options.staleThresholdMs || 7 * 24 * 60 * 60 * 1000; // 7 days default
  const relevanceThreshold = options.relevanceThreshold ?? 0.35;

  // 1. Check for Adversarial Prompt Injection
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        classification: 'INJECTED',
        notes: `Adversarial pattern detected matching ${pattern.source}`,
      };
    }
  }

  // 2. Check for Duplicates (by ID or Content hash)
  const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ');
  const itemHash = hashString(normalized);
  const idKey = `id_${item.id}`;
  if (existingHashes.has(itemHash) || (item.id && existingHashes.has(idKey))) {
    return {
      classification: 'DUPLICATE',
      notes: 'Identical semantic content or ID already recorded in context',
    };
  }
  existingHashes.add(itemHash);
  if (item.id) existingHashes.add(idKey);

  // 3. Check for Stale Memory
  if (item.timestamp) {
    const itemTime = new Date(item.timestamp).getTime();
    if (!isNaN(itemTime) && now - itemTime > staleThreshold) {
      return {
        classification: 'STALE',
        notes: `Memory timestamp (${item.timestamp}) exceeds stale threshold of ${Math.round(staleThreshold / (1000 * 60 * 60 * 24))} days`,
      };
    }
  }

  // 4. Check for Conflict with Policies or Negations
  for (const policy of activePolicies) {
    if (policy.enforced) {
      if (
        (policy.rule.includes('read-only') && content.toLowerCase().includes('write permission granted')) ||
        (policy.rule.includes('no-network') && content.toLowerCase().includes('external network allowed')) ||
        (policy.rule.includes('restricted') && content.toLowerCase().includes('unrestricted access allowed'))
      ) {
        return {
          classification: 'CONFLICTING',
          notes: `Direct contradiction with active policy: "${policy.rule}"`,
        };
      }
    }
  }

  // Also check explicit conflicting flag in metadata if provided
  if (item.metadata?.isContradiction || item.metadata?.conflictsWith) {
    return {
      classification: 'CONFLICTING',
      notes: `Tagged conflicting in metadata against ref: ${item.metadata.conflictsWith || 'primary rule'}`,
    };
  }

  // 5. Check for Relevance
  const score = item.score !== undefined ? item.score : item.confidence !== undefined ? item.confidence : 1.0;
  // Keyword overlap bonus
  const queryTokens = queryGoal.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  const contentLower = content.toLowerCase();
  let matches = 0;
  for (const qt of queryTokens) {
    if (contentLower.includes(qt)) matches++;
  }
  const overlapRatio = queryTokens.length > 0 ? matches / queryTokens.length : 0.5;
  const effectiveScore = Math.max(score, overlapRatio);

  if (effectiveScore < relevanceThreshold && overlapRatio < 0.1) {
    return {
      classification: 'IRRELEVANT',
      notes: `Relevance score (${effectiveScore.toFixed(2)}) below threshold (${relevanceThreshold.toFixed(2)})`,
    };
  }

  return { classification: 'RELEVANT' };
}

/**
 * Deterministically assembles the full 10-aspect BrainContext with provenance and strict token budgeting.
 */
export function assembleDeterministicContext(params: {
  currentRequest: {
    text: string;
    modality?: Modality;
    timestamp?: string;
    entities?: string[];
    hardConstraints?: string[];
  };
  conversationState?: {
    turnIndex?: number;
    historySummary?: string;
    recentTurns?: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp?: string }>;
  };
  taskState?: {
    taskId: string;
    goal: string;
    status?: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    currentMilestone?: string;
  };
  graphState?: {
    graphId: string;
    graphVersion: string;
    activeNodeId?: string | null;
    completedNodes?: string[];
    pendingNodes?: string[];
    errors?: any[];
  };
  rawMemories?: RawMemoryInput[];
  retrievedEvidence?: RetrievedEvidenceItem[];
  previousObservations?: Record<string, any>;
  policies?: PolicyRule[];
  toolResults?: ToolResultItem[];
  executionHistory?: ExecutionHistoryStep[];
  episodicLessons?: EpisodicLessonRecord[];
  options?: ContextAssemblyOptions;
}): BrainContext {
  const options = params.options || {};
  const maxContextTokens = options.maxContextTokens || 4096;
  const nowIso = params.currentRequest.timestamp || new Date().toISOString();

  // Budgets per category (proportional, but capped)
  const policyBudget = options.policyBudgetTokens || 512;
  const evidenceBudget = options.evidenceBudgetTokens || 1536;
  const memoryBudget = options.memoryBudgetTokens || 768;
  const observationBudget = options.observationBudgetTokens || 512;
  const historyBudget = options.historyBudgetTokens || 256;

  const provenanceMap: Record<string, ContextItemProvenance> = {};
  const existingHashes = new Set<string>();
  let prunedCount = 0;

  // 1. Request
  const requestText = params.currentRequest.text || '';
  const promptTokens = encode(requestText).length;
  const reqProvId = `prov_req_${hashString(requestText)}`;
  provenanceMap[reqProvId] = {
    provenanceId: reqProvId,
    source: 'user_request',
    timestamp: nowIso,
    confidence: 1.0,
    classification: 'RELEVANT',
  };

  const currentRequest = {
    text: requestText,
    modality: params.currentRequest.modality || 'text',
    timestamp: nowIso,
    entities: params.currentRequest.entities || [],
    hardConstraints: params.currentRequest.hardConstraints || [],
  };

  // 2. Policies
  const rawPolicies = params.policies || [
    { id: 'pol_sec_01', rule: 'Disallow execution of destructive system deletion commands.', enforced: true, category: 'security' as const },
    { id: 'pol_res_01', rule: 'Bounded execution limits: Max process timeout 30s, max memory 512MB.', enforced: true, category: 'resource' as const },
    { id: 'pol_truth_01', rule: 'Strict factual grounding: Answers must cite verified references [REF-X].', enforced: true, category: 'correctness' as const },
  ];

  const assembledPolicies: PolicyRule[] = [];
  let policyTokens = 0;
  for (const p of rawPolicies) {
    const pTokens = encode(p.rule).length;
    if (policyTokens + pTokens <= policyBudget) {
      const pProvId = `prov_pol_${p.id}`;
      const prov: ContextItemProvenance = {
        provenanceId: pProvId,
        source: 'policy_engine',
        timestamp: nowIso,
        confidence: 1.0,
        classification: 'RELEVANT',
      };
      provenanceMap[pProvId] = prov;
      assembledPolicies.push({ ...p, provenance: prov });
      policyTokens += pTokens;
    } else {
      prunedCount++;
    }
  }

  // 3. Conversation State
  const conversationState = {
    turnIndex: params.conversationState?.turnIndex || 1,
    historySummary: params.conversationState?.historySummary,
    recentTurns: (params.conversationState?.recentTurns || []).map((turn) => ({
      role: turn.role,
      content: turn.content,
      timestamp: turn.timestamp || nowIso,
    })),
  };

  // 4. Task State
  const taskState = {
    taskId: params.taskState?.taskId || `task_${Date.now()}`,
    goal: params.taskState?.goal || requestText,
    status: params.taskState?.status || 'running',
    progress: params.taskState?.progress || 0.1,
    currentMilestone: params.taskState?.currentMilestone || 'Context Initialization',
  };

  // 5. Graph State
  const graphState = {
    graphId: params.graphState?.graphId || 'canonical_brain_graph',
    graphVersion: params.graphState?.graphVersion || '1.0.0',
    activeNodeId: params.graphState?.activeNodeId || 'node_context',
    completedNodes: params.graphState?.completedNodes || [],
    pendingNodes: params.graphState?.pendingNodes || [],
    errors: params.graphState?.errors || [],
  };

  // 6. Relevant Memory (with deduplication, stale, conflict, and injection classification)
  const rawMemories = params.rawMemories || [];
  const classifiedMemories: MemoryItem[] = [];
  let memoryTokens = 0;

  for (const m of rawMemories) {
    const { classification, notes } = classifyMemoryItem(
      m,
      taskState.goal,
      existingHashes,
      assembledPolicies,
      {
        relevanceThreshold: options.relevanceThreshold,
        staleThresholdMs: options.staleThresholdMs,
        currentTime: options.currentTime,
      }
    );

    const provId = `prov_mem_${m.id}`;
    const prov: ContextItemProvenance = {
      provenanceId: provId,
      source: m.source || 'episodic_memory',
      timestamp: m.timestamp || nowIso,
      confidence: m.confidence ?? 0.85,
      classification,
      notes,
    };
    provenanceMap[provId] = prov;

    const memItem: MemoryItem = {
      id: m.id,
      content: classification === 'INJECTED' ? `[SANITIZED ADVERSARIAL CONTENT]: ${notes}` : m.content,
      provenance: prov,
      metadata: m.metadata,
      score: m.score,
    };

    // Only admit RELEVANT and safely recorded CONFLICTING items into active memory budget
    if (classification === 'RELEVANT' || classification === 'CONFLICTING') {
      const itemTokens = encode(memItem.content).length;
      if (memoryTokens + itemTokens <= memoryBudget) {
        classifiedMemories.push(memItem);
        memoryTokens += itemTokens;
      } else {
        prunedCount++;
      }
    } else {
      // Still keep in memory list with its classified flag for audit trail, but don't blow token budget
      if (classification === 'INJECTED' || classification === 'STALE' || classification === 'DUPLICATE' || classification === 'IRRELEVANT') {
        classifiedMemories.push(memItem);
        prunedCount++;
      }
    }
  }

  // 7. Retrieved Evidence (RAG)
  const rawEvidence = params.retrievedEvidence || [];
  const assembledEvidence: RetrievedEvidenceItem[] = [];
  let evidenceTokens = 0;

  for (let i = 0; i < rawEvidence.length; i++) {
    const ev = rawEvidence[i]!;
    const evTokens = encode(ev.text).length;
    if (evidenceTokens + evTokens <= evidenceBudget) {
      const evProvId = `prov_rag_${ev.id || ev.refId || i}`;
      const prov: ContextItemProvenance = {
        provenanceId: evProvId,
        source: ev.source || 'rag_vector_store',
        timestamp: ev.timestamp || nowIso,
        confidence: ev.hybridScore || ev.denseScore || 0.9,
        classification: 'RELEVANT',
        originRef: ev.refId,
      };
      provenanceMap[evProvId] = prov;
      assembledEvidence.push({
        ...ev,
        provenance: prov,
      });
      evidenceTokens += evTokens;
    } else {
      prunedCount++;
    }
  }

  // 8. Previous Observations
  const previousObservations = params.previousObservations || {};
  const obsJson = JSON.stringify(previousObservations);
  const observationTokens = Math.min(observationBudget, encode(obsJson).length);

  // 9. Tool Results
  const toolResults = params.toolResults || [];

  // 10. Execution History
  const rawHistory = params.executionHistory || [];
  const assembledHistory: ExecutionHistoryStep[] = [];
  let historyTokens = 0;
  for (const step of rawHistory) {
    const stepTokens = encode(`${step.stepIndex}:${step.nodeId}:${step.status}`).length;
    if (historyTokens + stepTokens <= historyBudget) {
      assembledHistory.push(step);
      historyTokens += stepTokens;
    } else {
      prunedCount++;
    }
  }

  const allocatedTokens = promptTokens + policyTokens + evidenceTokens + memoryTokens + observationTokens + historyTokens;

  const tokenBudgets: ContextTokenBudgetBreakdown = {
    maxContextTokens,
    allocatedTokens,
    promptTokens,
    systemPolicyTokens: policyTokens,
    evidenceTokens,
    memoryTokens,
    observationTokens,
    historyTokens,
    prunedItemCount: prunedCount,
  };

  // Backward compatibility fields
  const memoryRefs = assembledEvidence.map((e) => e.id).concat(classifiedMemories.map((m) => m.id));
  const episodicLessons = params.episodicLessons || [];

  return {
    currentRequest,
    conversationState,
    taskState,
    graphState,
    relevantMemory: classifiedMemories,
    retrievedEvidence: assembledEvidence,
    previousObservations,
    policies: assembledPolicies,
    toolResults,
    executionHistory: assembledHistory,
    provenanceMap,
    tokenBudgets,
    // Backward compatibility
    queryIntent: {
      intent: currentRequest.text.substring(0, 120),
      modality: currentRequest.modality,
      confidence: 0.98,
      entities: currentRequest.entities,
      hardConstraints: currentRequest.hardConstraints,
    },
    memoryRefs,
    workingMemory: {
      allocatedTokens,
      prunedCount,
      activeObservationsCount: Object.keys(previousObservations).length,
    },
    episodicLessons,
    policyRules: assembledPolicies,
  };
}

/**
 * Cleanly separates semantic prompt construction from graph state.
 * Synthesizes the model instruction and user prompt purely from the explicit BrainContext.
 */
export function buildSemanticPrompt(context: BrainContext): {
  systemInstruction: string;
  userContent: string;
} {
  // 1. System Instruction: Built from active policies and constitutional rules
  const policyLines = (context.policies || [])
    .filter((p) => p.enforced)
    .map((p, idx) => `${idx + 1}. [${p.category.toUpperCase()}] ${p.rule}`)
    .join('\n');

  const systemInstruction = `You are the PROJECT JARVIS Cognitive Brain.
POLICY RULES:
You must adhere strictly to these operational policies:
${policyLines || '1. Provide verified, factual, and strictly grounded responses.'}

Strict Grounding Rule:
- Cite technical facts using [REF-1], [REF-2], etc. from the verified evidence provided.
- Never cite references that are not explicitly present in the verified retrieved evidence.
- If conflicting or contradictory facts exist in memory, explicitly highlight the contradiction.
- If no references apply, state what is verified and what is unknown.`;

  // 2. User Content: Structured combination of Request, Verified Context, Relevant Memory, and Tool Results
  const evidenceBlocks = (context.retrievedEvidence || [])
    .map((e) => `[${e.refId}] [Source: ${e.source || e.provenance?.source || 'vector_store'} | Confidence: ${((e.hybridScore || 0) * 100).toFixed(1)}%]\n${e.text}`)
    .join('\n\n---\n\n');

  const activeMemories = (context.relevantMemory || [])
    .filter((m) => m.provenance.classification === 'RELEVANT')
    .map((m) => `• [Memory ${m.id}]: ${m.content}`)
    .join('\n');

  const conflictingMemories = (context.relevantMemory || [])
    .filter((m) => m.provenance.classification === 'CONFLICTING')
    .map((m) => `• [CONFLICTING ALERT]: ${m.content} (${m.provenance.notes || 'contradicts policy'})`)
    .join('\n');

  const toolSummary = (context.toolResults || [])
    .map((t) => `• Tool ${t.toolName} (${t.status}): ${t.output.substring(0, 150)}`)
    .join('\n');

  const userContent = `=== CONTEXT Provenance Audit ===
Task ID: ${context.taskState.taskId}
Goal: ${context.taskState.goal}
Allocated Tokens: ${context.tokenBudgets.allocatedTokens} / ${context.tokenBudgets.maxContextTokens}

=== VERIFIED RETRIEVED EVIDENCE ===
${evidenceBlocks || 'No external RAG evidence was retrieved.'}

=== ACTIVE WORKING MEMORY ===
${activeMemories || 'No prior episodic memories active.'}
${conflictingMemories ? `\n=== ATTENTION: CONFLICTING SIGNALS ===\n${conflictingMemories}` : ''}

${toolSummary ? `=== RECENT TOOL RESULTS ===\n${toolSummary}\n` : ''}
=== CURRENT USER REQUEST ===
${context.currentRequest.text}

Respond authoritatively, factually, and cite every reference using exact [REF-X] tags:`;

  return { systemInstruction, userContent };
}
