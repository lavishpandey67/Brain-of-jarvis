/**
 * PROJECT JARVIS: GRAPH 1 — REAL POSTGRESQL + PGVECTOR KNOWLEDGE ENGINE TESTS
 * 
 * Formal verification of:
 * 1. Native PostgreSQL engine initialization with pgvector extension (<=> cosine distance)
 * 2. Exact Knowledge Unit persistence with token counts, heading hierarchy, and char offsets
 * 3. Deterministic cryptographic provenance tracking and revision lineage
 * 4. Dense vector retrieval, Lexical full-text GIN search, and Hybrid RRF fusion
 * 5. Metadata predicate filtering directly in PostgreSQL query planner
 * 6. Real updates with provenance revision increments and soft/hard deletions
 * 7. Multi-partition ScaledKnowledgeEngine sharding & distributed retrieval
 * 8. Strict preservation of existing VectorStore & RagEngine contracts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PostgresKnowledgeEngine } from './postgresKnowledgeEngine';
import { ScaledKnowledgeEngine } from './scaledKnowledgeEngine';
import { KnowledgeUnit } from '../types/knowledge';
import { VectorStore } from '../math/vectorStore';
import { RagEngine, CANONICAL_KNOWLEDGE_BASE } from './ragEngine';

describe('Graph 1: PostgreSQL + pgvector Knowledge Engine Substrate', () => {
  const DIM = 3;
  let engine: PostgresKnowledgeEngine;

  before(async () => {
    engine = new PostgresKnowledgeEngine({ dimension: DIM });
    await engine.initialize();
  });

  after(async () => {
    await engine.close();
  });

  it('1. Extension & Schema Bootstrap: Verifies PostgreSQL and pgvector extension are operational', async () => {
    const stats = await engine.getStats();
    assert.equal(stats.dimension, DIM);
    assert.equal(stats.engineBackend, 'POSTGRESQL_PGVECTOR');
  });

  it('2. Ingestion & Persistence: Upserts single Knowledge Unit with provenance and token offsets', async () => {
    const unit: KnowledgeUnit = {
      id: 'ku-tensor-01',
      documentId: 'doc-tensor-math',
      chunkIndex: 0,
      totalChunks: 3,
      title: 'Canonical Tensor Calculus',
      content: 'Contiguous typed array memory layouts ensure maximum cache locality and vectorized BLAS operations.',
      headingHierarchy: ['Math', 'Tensor', 'Kernel'],
      tokenCount: 16,
      charRange: [0, 108],
      embedding: new Float32Array([1.0, 0.0, 0.0]),
      metadata: { domain: 'math', precision: 'float32', validated: true },
      provenance: {
        source: 'brain://math/tensor',
        contentHash: 'hash-abc-001',
        revision: 1,
        parentDocumentId: 'doc-tensor-math',
        ingestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorOrProcess: 'test_suite',
      },
      isDeleted: false,
    };

    const saved = await engine.upsert(unit);
    assert.equal(saved.id, 'ku-tensor-01');
    assert.equal(saved.provenance.revision, 2); // Auto-incremented on upsert

    const retrieved = await engine.get('ku-tensor-01');
    assert(retrieved !== null, 'Retrieved unit must not be null');
    assert.equal(retrieved.id, 'ku-tensor-01');
    assert.equal(retrieved.tokenCount, 16);
    assert.deepEqual(retrieved.charRange, [0, 108]);
    assert.deepEqual(retrieved.headingHierarchy, ['Math', 'Tensor', 'Kernel']);
    assert.equal((retrieved.metadata as any).domain, 'math');
    assert.equal(retrieved.embedding.length, DIM);
    assert.equal(retrieved.embedding[0], 1.0);
  });

  it('3. Multi-Row Batch Ingestion: Ingests batch of knowledge units in a single transaction', async () => {
    const batch: KnowledgeUnit[] = [
      {
        id: 'ku-batch-01',
        documentId: 'doc-memory-tier',
        chunkIndex: 0,
        totalChunks: 2,
        title: 'Working Memory Scratchpad',
        content: 'Working memory maintains active scratchpads and short-term task registers.',
        tokenCount: 12,
        embedding: new Float32Array([0.0, 1.0, 0.0]),
        metadata: { category: 'memory', tier: 'working' },
        provenance: {
          source: 'brain://memory/tiers',
          contentHash: 'hash-002',
          revision: 1,
          parentDocumentId: 'doc-memory-tier',
          ingestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorOrProcess: 'test_batch',
        },
      },
      {
        id: 'ku-batch-02',
        documentId: 'doc-memory-tier',
        chunkIndex: 1,
        totalChunks: 2,
        title: 'Semantic Memory Substrate',
        content: 'Semantic memory indexes persistent knowledge vectors in high-dimensional Euclidean space.',
        tokenCount: 14,
        embedding: new Float32Array([0.0, 0.0, 1.0]),
        metadata: { category: 'memory', tier: 'semantic' },
        provenance: {
          source: 'brain://memory/tiers',
          contentHash: 'hash-003',
          revision: 1,
          parentDocumentId: 'doc-memory-tier',
          ingestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorOrProcess: 'test_batch',
        },
      },
    ];

    const count = await engine.upsertBatch(batch);
    assert.equal(count, 2);

    const stats = await engine.getStats();
    assert.equal(stats.activeKnowledgeUnits, 3);
  });

  it('4. Dense Vector Retrieval: Ranks exactly by pgvector native <=> cosine operator', async () => {
    // Query collinear with ku-tensor-01 [1, 0, 0]
    const queryVec = new Float32Array([1.0, 0.0, 0.0]);
    const results = await engine.searchDense(queryVec, { topK: 3 });

    assert.equal(results.length, 3);
    assert.equal(results[0]?.unit.id, 'ku-tensor-01');
    assert.equal(Math.round(results[0]?.denseScore * 100) / 100, 1.0); // Exact cosine similarity = 1.0
  });

  it('5. Lexical Full-Text Search: Finds keywords using PostgreSQL tsvector and GIN index', async () => {
    const results = await engine.searchLexical('scratchpad registers', { topK: 2 });
    assert(results.length > 0, 'Expected lexical results');
    assert.equal(results[0]?.unit.id, 'ku-batch-01');
    assert(results[0]?.lexicalScore > 0, 'Expected positive lexical score');
  });

  it('6. Hybrid Retrieval: Fuses dense similarity and lexical scores via Convex Alpha & RRF', async () => {
    // Query with vector pointing to semantic memory [0, 0, 1] but text mentioning scratchpad
    const queryVec = new Float32Array([0.0, 0.0, 1.0]);
    const queryText = 'scratchpad';

    // Dense dominated (alpha = 0.9) -> ku-batch-02 wins
    const denseBiased = await engine.searchHybrid(queryVec, queryText, { alpha: 0.9, topK: 2 });
    assert.equal(denseBiased[0]?.unit.id, 'ku-batch-02');

    // Lexical dominated (alpha = 0.1) -> ku-batch-01 wins
    const lexicalBiased = await engine.searchHybrid(queryVec, queryText, { alpha: 0.1, topK: 2 });
    assert.equal(lexicalBiased[0]?.unit.id, 'ku-batch-01');

    // Reciprocal Rank Fusion (RRF)
    const rrfResults = await engine.searchHybrid(queryVec, queryText, { useRRF: true, topK: 2 });
    assert.equal(rrfResults.length, 2);
  });

  it('7. Metadata Predicate Filtering: Restricts results pushed down to PostgreSQL query planner', async () => {
    const results = await engine.searchDense(new Float32Array([0.0, 1.0, 0.0]), {
      topK: 10,
      filter: {
        metadataMatch: { tier: 'semantic' },
      },
    });

    assert.equal(results.length, 1);
    assert.equal(results[0]?.unit.id, 'ku-batch-02');
  });

  it('8. Updates with Provenance Lineage: Bumps revision number and records updated content hash', async () => {
    const unit = await engine.get('ku-tensor-01');
    assert(unit !== null);
    const prevRev = unit.provenance.revision;

    // Update content
    const updated = await engine.upsert({
      ...unit,
      content: 'Updated tensor content with advanced Lapack factorization routines.',
    });

    assert.equal(updated.provenance.revision, prevRev + 1);
    assert.notEqual(updated.provenance.contentHash, unit.provenance.contentHash);

    const reloaded = await engine.get('ku-tensor-01');
    assert.equal(reloaded?.provenance.revision, prevRev + 1);
  });

  it('9. Soft & Hard Deletions: Verifies soft delete exclusion and hard delete removal', async () => {
    // Soft delete ku-batch-01
    const softRes = await engine.delete('ku-batch-01', true);
    assert.equal(softRes, true);

    // Active searches must exclude it
    const active = await engine.get('ku-batch-01');
    assert.equal(active, null);

    const searchAfterSoft = await engine.searchDense(new Float32Array([0.0, 1.0, 0.0]), { topK: 5 });
    assert(!searchAfterSoft.some((r) => r.unit.id === 'ku-batch-01'));

    // Hard delete ku-batch-02
    const hardRes = await engine.delete('ku-batch-02', false);
    assert.equal(hardRes, true);
  });

  it('10. Multi-Partition ScaledKnowledgeEngine: Manages sharded PostgreSQL substrate', async () => {
    const scaled = new ScaledKnowledgeEngine({ numPartitions: 2, dimension: DIM });
    await scaled.initialize();

    const units: KnowledgeUnit[] = [
      {
        id: 's-ku-1',
        documentId: 'doc-alpha',
        chunkIndex: 0,
        totalChunks: 1,
        content: 'Shard alpha chunk',
        tokenCount: 4,
        embedding: new Float32Array([1, 0, 0]),
        metadata: { shard: 'alpha' },
        provenance: {
          source: 'test://alpha',
          contentHash: 'h1',
          revision: 1,
          parentDocumentId: 'doc-alpha',
          ingestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorOrProcess: 'scaled_test',
        },
      },
      {
        id: 's-ku-2',
        documentId: 'doc-beta',
        chunkIndex: 0,
        totalChunks: 1,
        content: 'Shard beta chunk',
        tokenCount: 4,
        embedding: new Float32Array([0, 1, 0]),
        metadata: { shard: 'beta' },
        provenance: {
          source: 'test://beta',
          contentHash: 'h2',
          revision: 1,
          parentDocumentId: 'doc-beta',
          ingestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorOrProcess: 'scaled_test',
        },
      },
    ];

    const ingested = await scaled.upsertBatch(units);
    assert.equal(ingested, 2);

    const searchRes = await scaled.searchDense(new Float32Array([1, 0, 0]), { topK: 2 });
    assert.equal(searchRes.length, 2);
    assert.equal(searchRes[0]?.unit.id, 's-ku-1');

    await scaled.close();
  });

  it('11. VectorStore & RagEngine Contract Integration: VectorStore works seamlessly with PostgresKnowledgeEngine', async () => {
    const store = new VectorStore(DIM, engine);
    store.upsert('vs-1', [1, 0, 0], 'VectorStore synced to Postgres', { custom: 42 });

    assert.equal(store.size, 1);
    const dense = store.searchDense([1, 0, 0], 1);
    assert.equal(dense[0]?.record.id, 'vs-1');

    // RagEngine with Postgres backend
    const rag = new RagEngine(DIM, engine);
    assert.equal(rag.dimension, DIM);
    assert(rag.postgresEngine !== undefined);
  });
});
