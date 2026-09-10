import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RagEngine, CANONICAL_KNOWLEDGE_BASE } from './ragEngine';

describe('Vertical Slice 2: Full RAG & Memory Pipeline End-to-End', () => {
  it('Initialization & Dense Vector Indexing: Embeds and indexes canonical knowledge', async () => {
    const rag = new RagEngine(768);
    const count = await rag.initialize();

    assert(count > 0, `Expected indexed chunk count > 0, got ${count}`);
    assert.equal(rag.vectorStore.size, count);
    assert.equal(rag.dimension, 768);

    // Verify all stored vectors have dimension 768
    for (const record of rag.vectorStore.all()) {
      assert.equal(record.vector.dimension, 768);
      assert(record.vector.normL2() > 0, 'Vector norm must be positive non-zero');
    }
  });

  it('End-to-End Query Execution: Returns grounded response with citations and real metrics', async () => {
    const rag = new RagEngine(768);
    await rag.initialize();

    const query = 'How does Project JARVIS prevent numerical overflow in norm calculation?';
    const result = await rag.executeQuery(query, {
      topK: 2,
      minScore: 0.2,
      alpha: 0.7,
    });

    assert(result.answer && result.answer.length > 20, 'Answer must be non-empty');
    assert(result.retrievedChunks.length > 0, 'Must retrieve at least 1 chunk');
    
    // Top chunk should be tensor math
    const topChunk = result.retrievedChunks[0]!;
    assert(
      topChunk.record.text.toLowerCase().includes('lapack') ||
      topChunk.record.text.toLowerCase().includes('norm') ||
      topChunk.record.text.toLowerCase().includes('numerical'),
      'Top chunk must discuss numerical norms'
    );
    assert(topChunk.denseScore > 0.2, `Expected positive cosine similarity, got ${topChunk.denseScore}`);

    // Citations validation
    assert(result.citations.length > 0, 'Citations list must not be empty');
    assert(result.citations[0]?.refId === 'REF-1');

    // Metrics validation
    assert.equal(result.metrics.vectorDimension, 768);
    assert(result.metrics.queryTokens > 0);
    assert(result.metrics.contextTokens > 0);
    assert(result.metrics.totalLatencyMs > 0);
    assert(result.metrics.embeddingLatencyMs > 0);
    assert(result.metrics.inferenceLatencyMs > 0);
    assert(result.pgvectorSqlEquivalent.includes('ORDER BY'));
  });
});
