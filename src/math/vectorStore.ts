/**
 * PROJECT JARVIS: BRAIN-001 MATHEMATICAL VECTOR STORE
 * High-Precision Vector Memory Kernel
 * 
 * Mathematical Specification & Invariants:
 * 1. DIMENSIONAL HOMOGENEITY: All stored vectors and query vectors must reside in the same
 *    Euclidean space V = R^D. Any dimensional mismatch throws DimensionMismatchError.
 * 2. CANONICAL VECTOR INTEGRITY: Backed by CanonicalVector (IEEE 754 Float32/Float64),
 *    enforcing LAPACK-scaled Euclidean norm (Blue's algorithm) and double-precision dot products.
 * 3. STRICT METRIC BOUNDS: Cosine similarity is mathematically bounded to [-1.0, 1.0] by Cauchy-Schwarz.
 * 4. HYBRID RETRIEVAL: Integrates dense vector cosine similarity with BM25/lexical term scoring:
 *    Score_hybrid = alpha * Score_dense + (1 - alpha) * Score_lexical, with alpha in [0.0, 1.0].
 * 5. RECIPROCAL RANK FUSION (RRF): Multi-retriever combination using RRF(d) = sum(1 / (k + rank_i(d))).
 */

import { CanonicalVector } from './vector';
import { DimensionMismatchError, EmptyVectorError } from './types';

export interface VectorRecord<TMetadata = Record<string, unknown>> {
  id: string;
  vector: CanonicalVector;
  text: string;
  metadata: TMetadata;
  timestamp: number;
}

export interface SearchResult<TMetadata = Record<string, unknown>> {
  record: VectorRecord<TMetadata>;
  denseScore: number;      // Cosine similarity in [-1.0, 1.0]
  lexicalScore: number;    // Normalized lexical BM25/term frequency score in [0.0, 1.0]
  hybridScore: number;     // Combined score in [0.0, 1.0]
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  alpha?: number; // 1.0 = pure dense, 0.0 = pure lexical, 0.7 = standard hybrid
  filter?: (metadata: Record<string, unknown>) => boolean;
}

export class VectorStore<TMetadata = Record<string, unknown>> {
  public readonly dimension: number;
  private records: Map<string, VectorRecord<TMetadata>> = new Map();
  public postgresEngine: any = null;

  constructor(dimension: number, postgresEngine?: any) {
    if (!Number.isInteger(dimension) || dimension <= 0) {
      throw new EmptyVectorError(`VectorStore dimension must be positive integer, got ${dimension}`);
    }
    this.dimension = dimension;
    if (postgresEngine) {
      this.postgresEngine = postgresEngine;
    }
  }

  /**
   * Attaches a backing PostgreSQL + pgvector engine for durable knowledge storage.
   */
  public attachPostgresEngine(engine: any): void {
    this.postgresEngine = engine;
  }

  /**
   * Returns current count of stored vectors.
   */
  public get size(): number {
    return this.records.size;
  }

  /**
   * Insert or update a vector record.
   */
  public upsert(
    id: string,
    vectorOrArray: CanonicalVector | ArrayLike<number>,
    text: string,
    metadata: TMetadata = {} as TMetadata
  ): VectorRecord<TMetadata> {
    if (!id || typeof id !== 'string') {
      throw new Error('Vector record id must be a non-empty string');
    }

    let canonicalVec: CanonicalVector;
    if (vectorOrArray instanceof CanonicalVector) {
      canonicalVec = vectorOrArray;
    } else {
      canonicalVec = CanonicalVector.fromArray(vectorOrArray, 'float32');
    }

    if (canonicalVec.dimension !== this.dimension) {
      throw new DimensionMismatchError(
        this.dimension,
        canonicalVec.dimension,
        `VectorStore.upsert(id=${id})`
      );
    }

    const record: VectorRecord<TMetadata> = {
      id,
      vector: canonicalVec,
      text,
      metadata,
      timestamp: Date.now(),
    };

    this.records.set(id, record);

    if (this.postgresEngine && typeof this.postgresEngine.upsert === 'function') {
      const meta = (metadata || {}) as Record<string, unknown>;
      this.postgresEngine.upsert({
        id,
        documentId: (meta.documentId as string) || id,
        chunkIndex: (meta.chunkIndex as number) || 0,
        totalChunks: 1,
        content: text,
        tokenCount: (meta.tokenCount as number) || text.split(/\s+/).length,
        embedding: canonicalVec.toArray(),
        metadata: meta,
        provenance: {
          source: (meta.source as string) || 'vector_store',
          contentHash: id,
          revision: 1,
          parentDocumentId: (meta.documentId as string) || id,
          ingestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorOrProcess: 'vector_store_upsert',
        },
      }).catch(() => {});
    }

    return record;
  }

  /**
   * Batch upsert records.
   */
  public upsertBatch(
    items: {
      id: string;
      vector: CanonicalVector | ArrayLike<number>;
      text: string;
      metadata?: TMetadata;
    }[]
  ): void {
    for (const item of items) {
      this.upsert(item.id, item.vector, item.text, item.metadata);
    }
  }

  /**
   * Retrieve record by ID.
   */
  public get(id: string): VectorRecord<TMetadata> | undefined {
    return this.records.get(id);
  }

  /**
   * Remove record by ID.
   */
  public delete(id: string): boolean {
    if (this.postgresEngine && typeof this.postgresEngine.delete === 'function') {
      this.postgresEngine.delete(id).catch(() => {});
    }
    return this.records.delete(id);
  }

  /**
   * Clear all records.
   */
  public clear(): void {
    if (this.postgresEngine && typeof this.postgresEngine.clear === 'function') {
      this.postgresEngine.clear().catch(() => {});
    }
    this.records.clear();
  }

  /**
   * List all stored records.
   */
  public all(): VectorRecord<TMetadata>[] {
    return Array.from(this.records.values());
  }

  /**
   * Fast lexical relevance scoring based on query token frequencies.
   */
  private computeLexicalScore(queryTokens: string[], text: string): number {
    if (queryTokens.length === 0 || !text) return 0.0;
    const lowerText = text.toLowerCase();
    let matches = 0;
    for (const token of queryTokens) {
      if (token.length < 2) continue;
      if (lowerText.includes(token)) {
        matches++;
      }
    }
    return Math.min(1.0, matches / Math.max(1, queryTokens.length));
  }

  /**
   * Perform pure dense vector cosine similarity search.
   */
  public searchDense(
    queryVector: CanonicalVector | ArrayLike<number>,
    topK: number = 5,
    minScore: number = -1.0,
    filter?: (metadata: any) => boolean
  ): SearchResult<TMetadata>[] {
    const qVec = queryVector instanceof CanonicalVector
      ? queryVector
      : CanonicalVector.fromArray(queryVector, 'float32');

    if (qVec.dimension !== this.dimension) {
      throw new DimensionMismatchError(this.dimension, qVec.dimension, 'VectorStore.searchDense');
    }

    const results: SearchResult<TMetadata>[] = [];

    for (const record of this.records.values()) {
      if (filter && !filter(record.metadata)) {
        continue;
      }
      const cosine = qVec.cosineSimilarity(record.vector);
      if (cosine >= minScore) {
        results.push({
          record,
          denseScore: cosine,
          lexicalScore: 0,
          hybridScore: cosine,
        });
      }
    }

    // Sort descending by cosine similarity with deterministic tie-breaker
    results.sort((a, b) => {
      if (b.denseScore !== a.denseScore) {
        return b.denseScore - a.denseScore;
      }
      return a.record.id.localeCompare(b.record.id);
    });

    return results.slice(0, topK);
  }

  /**
   * Perform hybrid search combining dense vector cosine similarity and lexical token overlap.
   */
  public searchHybrid(
    queryText: string,
    queryVector: CanonicalVector | ArrayLike<number>,
    options: SearchOptions = {}
  ): SearchResult<TMetadata>[] {
    const topK = options.topK ?? 5;
    const minScore = options.minScore ?? 0.0;
    const alpha = Math.max(0.0, Math.min(1.0, options.alpha ?? 0.7)); // Default 70% dense, 30% lexical
    const filter = options.filter;

    const qVec = queryVector instanceof CanonicalVector
      ? queryVector
      : CanonicalVector.fromArray(queryVector, 'float32');

    if (qVec.dimension !== this.dimension) {
      throw new DimensionMismatchError(this.dimension, qVec.dimension, 'VectorStore.searchHybrid');
    }

    const queryTokens = queryText
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((t) => t.length > 1);

    const candidates: SearchResult<TMetadata>[] = [];

    for (const record of this.records.values()) {
      if (filter && !filter(record.metadata as Record<string, unknown>)) {
        continue;
      }

      const cosine = qVec.cosineSimilarity(record.vector);
      // Map cosine similarity [-1, 1] to normalized dense score [0, 1] for hybrid linear combination
      const normalizedDense = Math.max(0.0, (cosine + 1.0) / 2.0);

      const lexical = this.computeLexicalScore(queryTokens, record.text);
      const hybrid = alpha * normalizedDense + (1.0 - alpha) * lexical;

      if (hybrid >= minScore) {
        candidates.push({
          record,
          denseScore: cosine,
          lexicalScore: lexical,
          hybridScore: +(hybrid.toFixed(5)),
        });
      }
    }

    candidates.sort((a, b) => {
      if (b.hybridScore !== a.hybridScore) {
        return b.hybridScore - a.hybridScore;
      }
      return a.record.id.localeCompare(b.record.id);
    });

    return candidates.slice(0, topK);
  }

  /**
   * Reciprocal Rank Fusion (RRF) between dense ranking and lexical ranking.
   */
  public searchRRF(
    queryText: string,
    queryVector: CanonicalVector | ArrayLike<number>,
    topK: number = 5,
    rrfK: number = 60
  ): SearchResult<TMetadata>[] {
    const denseRanked = this.searchDense(queryVector, this.size);

    const queryTokens = queryText
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((t) => t.length > 1);

    const lexicalList: { record: VectorRecord<TMetadata>; score: number }[] = [];
    for (const record of this.records.values()) {
      const score = this.computeLexicalScore(queryTokens, record.text);
      lexicalList.push({ record, score });
    }
    lexicalList.sort((a, b) => b.score - a.score);

    // Compute RRF scores
    const rrfScores = new Map<string, { denseScore: number; lexicalScore: number; rrf: number; record: VectorRecord<TMetadata> }>();

    denseRanked.forEach((res, rank) => {
      const id = res.record.id;
      const current = rrfScores.get(id) || { denseScore: res.denseScore, lexicalScore: 0, rrf: 0, record: res.record };
      current.rrf += 1.0 / (rrfK + (rank + 1));
      current.denseScore = res.denseScore;
      rrfScores.set(id, current);
    });

    lexicalList.forEach((item, rank) => {
      const id = item.record.id;
      const current = rrfScores.get(id) || { denseScore: 0, lexicalScore: item.score, rrf: 0, record: item.record };
      current.rrf += 1.0 / (rrfK + (rank + 1));
      current.lexicalScore = item.score;
      rrfScores.set(id, current);
    });

    const combined = Array.from(rrfScores.values()).map((v) => ({
      record: v.record,
      denseScore: v.denseScore,
      lexicalScore: v.lexicalScore,
      hybridScore: +(v.rrf.toFixed(6)),
    }));

    combined.sort((a, b) => b.hybridScore - a.hybridScore);
    return combined.slice(0, topK);
  }
}
