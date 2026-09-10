/**
 * Project JARVIS: BRAIN-001
 * Phase C2: CanonicalTensor Deterministic Property-Based Testing
 * 
 * Tests algebraic invariants across ranks 1..4, shapes, and dtypes
 * using deterministic pseudo-random sequences (Mulberry32 PRNG).
 */

import { CanonicalTensor } from './tensor';
import { ShapeND, DType, NUMERICAL_CONSTANTS } from './types';

// Deterministic Mulberry32 PRNG
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS = {
  ALPHA: 0x12345678,
  BETA:  0x9abcdef0,
  GAMMA: 0xfeedface,
  DELTA: 0xcafebabe,
};

const TEST_SHAPES: ShapeND[] = [
  [12],           // Rank 1
  [3, 4],         // Rank 2
  [2, 3, 4],      // Rank 3
  [2, 2, 3, 2],   // Rank 4
];

const DTYPES: DType[] = ['float32', 'float64'];

let totalAssertions = 0;
let passedAssertions = 0;
let maxObservedError = 0.0;

function assertInvariant(property: string, error: number, tol: number, context: string) {
  totalAssertions++;
  if (error > maxObservedError) {
    maxObservedError = error;
  }
  if (error > tol || !Number.isFinite(error)) {
    console.error(`[FAIL] ${property} (${context}): error ${error.toExponential(4)} > tol ${tol.toExponential(4)}`);
    throw new Error(`Property assertion failed: ${property} (${context})`);
  }
  passedAssertions++;
}

console.log('============================================================');
console.log('PHASE C2: CANONICAL TENSOR PROPERTY-BASED TESTING');
console.log('============================================================\n');

for (const [seedName, seedVal] of Object.entries(SEEDS)) {
  const prng = mulberry32(seedVal);

  for (const dtype of DTYPES) {
    const tol = dtype === 'float32' ? 5e-5 : 1e-12;

    for (const shape of TEST_SHAPES) {
      let totalElements = 1;
      for (const d of shape) totalElements *= d;

      const randomArrA = Array.from({ length: totalElements }, () => (prng() - 0.5) * 10);
      const randomArrB = Array.from({ length: totalElements }, () => (prng() - 0.5) * 10);
      const randomArrC = Array.from({ length: totalElements }, () => (prng() - 0.5) * 10);

      const A = CanonicalTensor.fromFlatArray(shape, randomArrA, dtype);
      const B = CanonicalTensor.fromFlatArray(shape, randomArrB, dtype);
      const C = CanonicalTensor.fromFlatArray(shape, randomArrC, dtype);

      const ctx = `Seed:${seedName} Dtype:${dtype} Shape:[${shape.join(',')}]`;

      // 1. Additive Commutativity: ||(A + B) - (B + A)||_F == 0.0 (exact in IEEE 754)
      const commDiff = A.add(B).subtract(B.add(A)).frobeniusNorm();
      assertInvariant('Additive Commutativity', commDiff, 0.0, ctx);

      // 2. Additive Identity: ||(A + 0) - A||_F == 0.0
      const Zero = CanonicalTensor.zeros(shape, dtype);
      const idDiff = A.add(Zero).subtract(A).frobeniusNorm();
      assertInvariant('Additive Identity', idDiff, 0.0, ctx);

      // 3. Additive Inverse: ||A + (-A)||_F <= tol
      const invDiff = A.add(A.negate()).frobeniusNorm();
      assertInvariant('Additive Inverse', invDiff, tol, ctx);

      // 4. Reshape Roundtrip: Flatten then reshape back to original shape
      const reshaped = A.flatten().reshape(shape);
      const reshapeDiff = reshaped.subtract(A).frobeniusNorm();
      assertInvariant('Reshape Roundtrip', reshapeDiff, 0.0, ctx);

      // 5. Transpose Involution (rank >= 2)
      if (shape.length >= 2) {
        const transRoundtrip = A.transpose(0, 1).transpose(0, 1);
        const transDiff = transRoundtrip.subtract(A).frobeniusNorm();
        assertInvariant('Transpose Involution', transDiff, 0.0, ctx);
      }

      // 6. Frobenius Norm Triangle Inequality: ||A + B||_F <= ||A||_F + ||B||_F + tol
      const normA = A.frobeniusNorm();
      const normB = B.frobeniusNorm();
      const normAB = A.add(B).frobeniusNorm();
      const triangleViolation = Math.max(0, normAB - (normA + normB));
      assertInvariant('Triangle Inequality', triangleViolation, tol, ctx);
    }

    // 7. Batched GEMM Distributivity (rank 3): A * (B1 + B2) == A * B1 + A * B2
    {
      const bShapeA = [2, 3, 4];
      const bShapeB = [2, 4, 3];
      const totA = 24, totB = 24;

      const A_mat = CanonicalTensor.fromFlatArray(bShapeA, Array.from({ length: totA }, () => prng()), dtype);
      const B1_mat = CanonicalTensor.fromFlatArray(bShapeB, Array.from({ length: totB }, () => prng()), dtype);
      const B2_mat = CanonicalTensor.fromFlatArray(bShapeB, Array.from({ length: totB }, () => prng()), dtype);

      const LHS = A_mat.batchedMatMul(B1_mat.add(B2_mat));
      const RHS = A_mat.batchedMatMul(B1_mat).add(A_mat.batchedMatMul(B2_mat));

      const bmmDiff = LHS.subtract(RHS).frobeniusNorm();
      assertInvariant('Batched MatMul Distributivity', bmmDiff, tol * 10, `Seed:${seedName} Dtype:${dtype} Shape:[2,3,4]`);
    }
  }
}

console.log('============================================================');
console.log(`TOTAL PROPERTY ASSERTIONS: ${passedAssertions}/${totalAssertions} PASSED (100%)`);
console.log(`MAXIMUM OBSERVED INVARIANT ERROR: ${maxObservedError.toExponential(4)}`);
console.log('============================================================\n');
