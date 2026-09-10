/**
 * PROJECT JARVIS: VERTICAL SLICE 2 (RAG & MEMORY RETRIEVAL ENGINE)
 * 
 * Pipeline:
 * USER QUERY → TOKENIZATION → REAL EMBEDDING → CANONICAL VECTOR STORE →
 * HYBRID DENSE/LEXICAL RETRIEVAL → RERANKING → CONTEXT ASSEMBLY →
 * REAL COGNITIVE INFERENCE → GROUNDED CITATIONS & VERIFICATION
 */

import { encode } from './tokenizer';
import { chunkDocument, ChunkMetadata } from './chunker';
import { VectorStore, SearchResult } from '../math/vectorStore';
import { executeCognitiveEmbedding, executeCognitiveInference, CognitiveModelResponse } from './modelClient';
import { PostgresKnowledgeEngine } from './postgresKnowledgeEngine';

export interface GroundedCitation {
  refId: string;
  source: string;
  chunkId: string;
  denseScore: number;
  hybridScore: number;
  citedInText: boolean;
}

export interface RagQueryResult {
  query: string;
  answer: string;
  retrievedChunks: SearchResult<ChunkMetadata>[];
  citations: GroundedCitation[];
  groundingConfidence: number;
  metrics: {
    queryTokens: number;
    contextTokens: number;
    embeddingLatencyMs: number;
    retrievalLatencyMs: number;
    inferenceLatencyMs: number;
    totalLatencyMs: number;
    vectorDimension: number;
    modelUsed: string;
  };
  pgvectorSqlEquivalent: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  source: string;
  content: string;
}

export const CANONICAL_KNOWLEDGE_BASE: KnowledgeDoc[] = [
  {
    id: 'kb-tensor-math',
    title: 'JARVIS Numerical Kernel & Tensor Calculus',
    source: 'brain://math/tensor',
    content: `# CanonicalTensor & Numerical Stability
The mathematical kernel of Project JARVIS executes multi-linear mappings over R^D.
Contiguous typed array memory layouts (Float32Array) ensure maximum cache locality and vectorized operations.
Norm calculations use Blue's LAPACK dnrm2 scaled Euclidean summation to avoid intermediate overflow or underflow.
Dot products employ double-precision accumulators to suppress catastrophic cancellation during dense matrix contractions.
Tensor contractions satisfy Cauchy-Schwarz bounds: |<u, v>| <= ||u||_2 * ||v||_2 across all finite coordinate frames.`,
  },
  {
    id: 'kb-tokenization',
    title: 'Byte-Level Subword Invertibility',
    source: 'brain://perception/tokenizer',
    content: `# Byte-Level Universality & Invertibility Theorem
Every raw byte 0x00 through 0xFF is mapped to a dedicated token fallback (IDs 4..259).
This guarantees zero out-of-vocabulary crashes on arbitrary binary, UTF-8, or corrupted payloads.
The Invertibility Theorem guarantees:
decodeTokens(tokenizeText(input).tokenIds) === input with 100% loss-free reconstruction.
Vocabulary consists of byte singletons, common system syntax sequences, and curated mathematical/code morphemes.`,
  },
  {
    id: 'kb-memory-chambers',
    title: 'Dual-Execution Memory Architecture',
    source: 'brain://memory/architecture',
    content: `# Dual-Execution Memory Architecture (Chamber 04)
Memory is partitioned across three distinct tiers:
1. Working Memory: Active scratchpad and short-term task registers.
2. Episodic Memory: Historical cycle outcomes, task summaries, pass/fail status, and lessons learned.
3. Semantic Memory: Persistent knowledge vectors indexed in R^D with cosine distance metrics.
RAG queries retrieve relevant semantic records, inject token-bounded context into the cognitive pipeline,
and mandate structured reference citations [REF-X] to eliminate hallucination.`,
  },
  {
    id: 'kb-adversarial-recovery',
    title: 'Adversarial Verification and Fault Recovery',
    source: 'brain://evaluation/recovery',
    content: `# Adversarial Fault Tolerance & Controlled Recovery (Chamber 13 & 14)
When an execution node encounters non-zero exit codes, numerical NaN, or constraint violations:
1. State snapshot rollback isolates corrupted state diffs.
2. Critic scoring computes epistemic and aleatoric uncertainty bounds.
3. Fallback policies trigger parameter mitigation (learning rate decay, model rerouting, or algorithmic substitution).
Optimism is zero; no claim is accepted without reproducible runtime evidence and test verification.`,
  },
];

export class RagEngine {
  public readonly vectorStore: VectorStore<ChunkMetadata>;
  public readonly dimension: number;
  public readonly postgresEngine?: PostgresKnowledgeEngine;
  private isInitialized: boolean = false;

  constructor(dimension: number = 768, postgresEngine?: PostgresKnowledgeEngine) {
    this.dimension = dimension;
    this.postgresEngine = postgresEngine;
    this.vectorStore = new VectorStore<ChunkMetadata>(dimension, postgresEngine);
  }

  /**
   * Initializes the vector store with indexed documents and real embeddings.
   */
  public async initialize(docs: KnowledgeDoc[] = CANONICAL_KNOWLEDGE_BASE): Promise<number> {
    if (this.postgresEngine) {
      await this.postgresEngine.initialize();
    }
    if (this.isInitialized && this.vectorStore.size > 0) {
      return this.vectorStore.size;
    }

    const allChunks = docs.flatMap((doc) =>
      chunkDocument(doc.content, doc.id, doc.source, { maxTokens: 120, overlapTokens: 20 })
    );

    if (allChunks.length === 0) {
      return 0;
    }

    // Embed all chunks via real cognitive embedding API
    const textsToEmbed = allChunks.map((c) => `${c.metadata.headingHierarchy.join(' > ')}\n${c.text}`);
    const embedResp = await executeCognitiveEmbedding({
      texts: textsToEmbed,
      outputDimensionality: this.dimension,
    });

    if (!embedResp.success || embedResp.embeddings.length !== allChunks.length) {
      throw new Error(`RAG initialization failed: ${embedResp.error || 'Embedding count mismatch'}`);
    }

    for (let i = 0; i < allChunks.length; i++) {
      const chunk = allChunks[i]!;
      const embedding = embedResp.embeddings[i]!;
      this.vectorStore.upsert(chunk.id, embedding, chunk.text, chunk.metadata);
    }

    this.isInitialized = true;
    return this.vectorStore.size;
  }

  /**
   * Executes the full RAG query cycle:
   * Query -> Tokenize -> Embed -> Vector Store Search -> Context Assembly -> Infer -> Grounding Verification
   */
  public async executeQuery(
    userQuery: string,
    options: {
      topK?: number;
      minScore?: number;
      alpha?: number;
      model?: string;
      maxContextTokens?: number;
    } = {}
  ): Promise<RagQueryResult> {
    const t0 = performance.now();
    const topK = options.topK ?? 3;
    const minScore = options.minScore ?? 0.0;
    const alpha = options.alpha ?? 0.7;
    const model = options.model ?? 'gemini-3.6-flash';
    const maxContextTokens = options.maxContextTokens ?? 1200;

    // 1. Tokenize query
    const queryTokenIds = encode(userQuery);
    const queryTokens = queryTokenIds.length;

    // 2. Real Query Embedding
    const tEmbedStart = performance.now();
    const embedResp = await executeCognitiveEmbedding({
      texts: [userQuery],
      outputDimensionality: this.dimension,
    });

    const embeddingLatencyMs = +(performance.now() - tEmbedStart).toFixed(2);

    if (!embedResp.success || !embedResp.embeddings[0]) {
      throw new Error(`Failed to generate query embedding: ${embedResp.error || 'Unknown embedding error'}`);
    }

    const queryVector = embedResp.embeddings[0];

    // 3. Dense / Hybrid Retrieval from VectorStore
    const tRetStart = performance.now();
    const searchResults = this.vectorStore.searchHybrid(userQuery, queryVector, {
      topK,
      minScore,
      alpha,
    });
    const retrievalLatencyMs = +(performance.now() - tRetStart).toFixed(2);

    // 4. Assemble Context with Explicit Provenance Citations
    let contextTokens = 0;
    const contextBlocks: string[] = [];
    const citations: GroundedCitation[] = [];

    for (let i = 0; i < searchResults.length; i++) {
      const res = searchResults[i]!;
      const refId = `REF-${i + 1}`;
      const block = `[${refId} | Source: ${res.record.metadata.source} | Chunk: ${res.record.id}]\n${res.record.text}`;
      const blockTokens = encode(block).length;

      if (contextTokens + blockTokens > maxContextTokens && contextBlocks.length > 0) {
        break;
      }

      contextBlocks.push(block);
      contextTokens += blockTokens;

      citations.push({
        refId,
        source: res.record.metadata.source,
        chunkId: res.record.id,
        denseScore: +(res.denseScore.toFixed(4)),
        hybridScore: +(res.hybridScore.toFixed(4)),
        citedInText: false,
      });
    }

    const assembledContext = contextBlocks.join('\n\n---\n\n');

    // 5. Generate Equivalent pgvector SQL representation for inspection
    const vectorSampleStr = queryVector.slice(0, 5).map((v) => v.toFixed(4)).join(', ');
    const pgvectorSqlEquivalent = `
-- Equivalent PostgreSQL pgvector HNSW / IVFFLAT Retrieval Query
SELECT 
  id,
  source,
  chunk_text,
  1 - (embedding <=> '[${vectorSampleStr}, ... ${this.dimension - 5} dims]') AS cosine_similarity,
  ts_rank(tsv_text, plainto_tsquery('english', '${userQuery.replace(/'/g, "''")}')) AS bm25_lexical_rank
FROM jarvis_brain_semantic_memory
WHERE 1 - (embedding <=> '[${vectorSampleStr}, ...]') >= ${minScore.toFixed(2)}
ORDER BY (${alpha.toFixed(2)} * (1 - (embedding <=> '[${vectorSampleStr}, ...]')) + ${(1 - alpha).toFixed(2)} * ts_rank(tsv_text, plainto_tsquery('english', '${userQuery.replace(/'/g, "''")}'))) DESC
LIMIT ${topK};
`.trim();

    // 6. Grounded Cognitive Model Inference
    const systemInstruction = `You are the Project JARVIS Cognitive Brain. Answer the user prompt strictly and factually using ONLY the provided verified context references.
Whenever you state a fact or technical detail from a reference, you MUST cite it using the notation [REF-1], [REF-2], etc.
If the context does not contain enough information to answer definitively, state what is known and specify the information boundary.`;

    const modelPrompt = `VERIFIED RETRIEVED CONTEXT:\n${assembledContext}\n\nUSER QUERY:\n${userQuery}\n\nProvide an authoritative, grounded technical response with explicit reference citations.`;

    const tInferStart = performance.now();
    const inferResp: CognitiveModelResponse = await executeCognitiveInference({
      prompt: modelPrompt,
      model,
      systemInstruction,
      temperature: 0.1, // Low temperature for factual precision
    });
    const inferenceLatencyMs = +(performance.now() - tInferStart).toFixed(2);

    if (!inferResp.success) {
      throw new Error(`Cognitive inference failed during RAG execution: ${inferResp.error || 'Unknown error'}`);
    }

    const answer = inferResp.text;

    // 7. Verify Grounding & Citations
    let citedCount = 0;
    for (const cit of citations) {
      if (answer.includes(cit.refId)) {
        cit.citedInText = true;
        citedCount++;
      }
    }

    const groundingConfidence = citations.length > 0
      ? +(Math.min(1.0, (citedCount / citations.length) * 0.7 + (searchResults[0]?.denseScore || 0) * 0.3).toFixed(3))
      : 0.0;

    const totalLatencyMs = +(performance.now() - t0).toFixed(2);

    return {
      query: userQuery,
      answer,
      retrievedChunks: searchResults,
      citations,
      groundingConfidence,
      metrics: {
        queryTokens,
        contextTokens,
        embeddingLatencyMs,
        retrievalLatencyMs,
        inferenceLatencyMs,
        totalLatencyMs,
        vectorDimension: this.dimension,
        modelUsed: inferResp.model,
      },
      pgvectorSqlEquivalent,
    };
  }
}
