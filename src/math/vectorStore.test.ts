import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VectorStore } from './vectorStore';
import { CanonicalVector } from './vector';
import { DimensionMismatchError } from './types';

describe('VectorStore Mathematical Memory Kernel (Chamber 04 / RAG)', () => {
  it('Dimensional Homogeneity: Rejects vectors with dimension differing from store configuration', () => {
    const store = new VectorStore(4);
    assert.throws(
      () => store.upsert('v1', [1, 2, 3], 'dim-3 text'),
      DimensionMismatchError
    );
    assert.throws(
      () => store.searchDense([1, 2, 3, 4, 5]),
      DimensionMismatchError
    );
  });

  it('Exact Collinear & Orthogonal Cosine Retrieval: Rank 1 for identical direction, 0 for orthogonal, -1 for opposite', () => {
    const store = new VectorStore(3);
    store.upsert('collinear', [2, 0, 0], 'parallel vector along X');
    store.upsert('orthogonal', [0, 5, 0], 'orthogonal vector along Y');
    store.upsert('opposite', [-3, 0, 0], 'opposite vector along negative X');

    const query = CanonicalVector.fromArray([1, 0, 0], 'float32');
    const results = store.searchDense(query, 3);

    assert.equal(results.length, 3);
    assert.equal(results[0]?.record.id, 'collinear');
    assert.equal(Math.round(results[0]?.denseScore * 100) / 100, 1.0);

    assert.equal(results[1]?.record.id, 'orthogonal');
    assert.equal(Math.round(results[1]?.denseScore * 100) / 100, 0.0);

    assert.equal(results[2]?.record.id, 'opposite');
    assert.equal(Math.round(results[2]?.denseScore * 100) / 100, -1.0);
  });

  it('Cauchy-Schwarz Invariant: Cosine similarity is mathematically bounded within [-1.0, 1.0]', () => {
    const store = new VectorStore(128);
    // Insert 20 random unit vectors
    for (let i = 0; i < 20; i++) {
      const arr = Array.from({ length: 128 }, () => (Math.random() - 0.5) * 100);
      store.upsert(`rand-${i}`, arr, `Random content ${i}`);
    }

    const queryArr = Array.from({ length: 128 }, () => (Math.random() - 0.5) * 100);
    const results = store.searchDense(queryArr, 20);

    for (const res of results) {
      assert(res.denseScore >= -1.000001, `Dense score ${res.denseScore} below -1.0`);
      assert(res.denseScore <= 1.000001, `Dense score ${res.denseScore} above 1.0`);
    }
  });

  it('Hybrid Search: Balances dense semantic similarity with lexical keyword overlap', () => {
    const store = new VectorStore(2);
    // Doc A: strong semantic direction [1, 0], no keyword match
    store.upsert('doc-dense', [1, 0], 'numerical calculations in continuous space');
    // Doc B: weak semantic direction [0, 1], exact keyword match "JARVIS kernel"
    store.upsert('doc-lexical', [0, 1], 'JARVIS kernel execution protocol');

    const queryVec = [1, 0];
    const queryText = 'JARVIS kernel';

    // Pure dense (alpha = 1.0): doc-dense wins
    const denseOnly = store.searchHybrid(queryText, queryVec, { alpha: 1.0, topK: 2 });
    assert.equal(denseOnly[0]?.record.id, 'doc-dense');

    // Pure lexical (alpha = 0.0): doc-lexical wins
    const lexicalOnly = store.searchHybrid(queryText, queryVec, { alpha: 0.0, topK: 2 });
    assert.equal(lexicalOnly[0]?.record.id, 'doc-lexical');

    // Balanced hybrid: both contribute
    const hybrid = store.searchHybrid(queryText, queryVec, { alpha: 0.5, topK: 2 });
    assert.equal(hybrid.length, 2);
    assert(hybrid[0]?.hybridScore > 0);
  });

  it('Metadata Predicate Filtering: Restricts search results to matching records', () => {
    const store = new VectorStore<any>(2);
    store.upsert('d1', [1, 0], 'Item 1', { category: 'tensor', verified: true });
    store.upsert('d2', [0.9, 0.1], 'Item 2', { category: 'rag', verified: false });
    store.upsert('d3', [0.8, 0.2], 'Item 3', { category: 'tensor', verified: false });

    const results = store.searchHybrid('item', [1, 0], {
      filter: (meta) => meta.category === 'tensor' && meta.verified === true,
    });

    assert.equal(results.length, 1);
    assert.equal(results[0]?.record.id, 'd1');
  });

  it('Reciprocal Rank Fusion (RRF): Successfully merges multi-retrieval rankings', () => {
    const store = new VectorStore(3);
    store.upsert('r1', [1, 0, 0], 'tensor linear algebra', {});
    store.upsert('r2', [0, 1, 0], 'attention transformer query', {});
    store.upsert('r3', [0.7, 0.7, 0], 'tensor attention fused kernel', {});

    const results = store.searchRRF('tensor kernel', [0.7, 0.7, 0], 3);
    assert.equal(results.length, 3);
    // r3 has high dense match AND lexical match, should rank at top
    assert.equal(results[0]?.record.id, 'r3');
  });
});
