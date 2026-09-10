import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RepresentationEngine, createTokenRepresentation } from './representation';
import { tokenizeToIds } from '../lib/tokenizer';

describe('Real Numerical Representation Engine (CanonicalTensor Integration)', () => {
  it('Shape & Contiguity Contract: Constructs rank-3 C-contiguous tensor [1, S, D]', () => {
    const engine = new RepresentationEngine(64, 32000);
    const tokenIds = [1, 260, 265, 270, 2]; // 5 tokens
    const result = engine.projectTokensToTensor(tokenIds);

    assert.equal(result.tensor.rank, 3);
    assert.deepEqual(result.tensor.shape, [1, 5, 64]);
    assert.deepEqual(result.tensor.strides, [5 * 64, 64, 1]);
    assert.equal(result.tensor.isContiguous, true);
    assert.equal(result.tensor.totalElements, 1 * 5 * 64);
  });

  it('Mathematical Norm Theorem: Each token row has unit Euclidean L2 norm ||v||_2 = 1.0', () => {
    const engine = new RepresentationEngine(64, 32000);
    for (let id = 0; id < 100; id += 7) {
      const vec = engine.getEmbeddingVector(id);
      let sumSq = 0;
      for (let i = 0; i < vec.length; i++) {
        sumSq += vec[i]! * vec[i]!;
      }
      const norm = Math.sqrt(sumSq);
      assert(Math.abs(norm - 1.0) < 1e-5, `Token ${id} norm deviated from 1.0: ${norm}`);
    }
  });

  it('Frobenius Norm Conservation: ||X||_F = sqrt(S) within strict tolerance', () => {
    const engine = new RepresentationEngine(64, 32000);
    const lengths = [1, 4, 16, 32, 64];

    for (const len of lengths) {
      const tokenIds = Array.from({ length: len }, (_, i) => (i * 37) % 32000);
      const result = engine.projectTokensToTensor(tokenIds);
      const expectedFrobenius = Math.sqrt(len);
      const actualFrobenius = result.frobeniusNorm;
      const relError = Math.abs(actualFrobenius - expectedFrobenius) / expectedFrobenius;
      assert(relError < 1e-4, `Frobenius norm error ${relError} exceeded 1e-4 for length ${len}`);
      assert.equal(result.numericalData.gradFlowStatus, 'STABLE');
    }
  });

  it('End-to-End Pipeline: Tokenizer -> Representation Engine', () => {
    const prompt = 'Project JARVIS executes verified mathematical tensor computations.';
    const tokenIds = tokenizeToIds(prompt, true);
    assert(tokenIds.length > 5);

    const result = createTokenRepresentation(tokenIds);
    assert.equal(result.sequenceLength, tokenIds.length);
    assert.equal(result.tensor.shape[1], tokenIds.length);
    assert.equal(result.tensor.shape[2], 64);

    // Verify all tensor values are non-NaN and finite
    for (let s = 0; s < result.sequenceLength; s++) {
      for (let d = 0; d < 64; d++) {
        const val = result.tensor.get(0, s, d);
        assert(Number.isFinite(val), `Found non-finite value at [0, ${s}, ${d}]: ${val}`);
        assert(!Number.isNaN(val), `Found NaN at [0, ${s}, ${d}]`);
      }
    }
  });
});
