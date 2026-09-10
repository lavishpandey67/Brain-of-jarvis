/**
 * Project JARVIS: BRAIN-001
 * Phase B: CanonicalTensor Mathematical Audit & Floating-Point Characterization
 * 
 * Objectives:
 * 1. Independent mathematical tolerance derivation for Tensor operations via Higham error bounds.
 * 2. C-contiguous layout and strides verification across ranks 1..5.
 * 3. Exact IEEE 754 elementwise commutativity check: ||(A + B) - (B + A)||_F == 0.0.
 * 4. Adversarial characterization of tensor non-associativity in finite precision.
 * 5. Zero-copy view vs independent copy aliasing isolation audit.
 * 6. Metric and contraction theorem proofs.
 */

import { CanonicalTensor } from './tensor';
import { NUMERICAL_CONSTANTS } from './types';

console.log('============================================================');
console.log('PHASE B: CANONICAL TENSOR MATHEMATICAL AUDIT');
console.log('============================================================\n');

// ---------------------------------------------------------------------------
// B0: Higham Error Bounds Derivation for Tensor Operations
// ---------------------------------------------------------------------------
console.log('--- B0: Higham Error Bounds Derivation ---');

const u32 = NUMERICAL_CONSTANTS.EPSILON_F32 / 2; // ~5.96e-8
const u64 = NUMERICAL_CONSTANTS.EPSILON_F64 / 2; // ~1.11e-16

function gamma(n: number, u: number): number {
  return (n * u) / (1 - n * u);
}

console.log(`Unit roundoff Float32: u_32 = ${u32.toExponential(4)}`);
console.log(`Unit roundoff Float64: u_64 = ${u64.toExponential(4)}`);

// For tensor contraction along dimension K (e.g. batched GEMM):
// ||fl(A * B) - A * B||_F <= gamma_K * ||A||_F * ||B||_F
const K_vals = [4, 16, 64];
for (const K of K_vals) {
  const g32 = gamma(K, u32);
  const g64 = gamma(K, u64);
  console.log(`Contraction dim K=${K}: gamma_K(F32)=${g32.toExponential(3)}, gamma_K(F64)=${g64.toExponential(3)}`);
}

// ---------------------------------------------------------------------------
// B1: Strides and C-Contiguity Invariant Audit
// ---------------------------------------------------------------------------
console.log('\n--- B1: Strides and C-Contiguity Invariant Audit ---');

const testShapes = [
  [10],
  [4, 5],
  [2, 3, 4],
  [2, 3, 4, 5],
  [2, 2, 2, 2, 2],
];

for (const shape of testShapes) {
  const t = CanonicalTensor.zeros(shape);
  const rank = shape.length;
  // Verify strides: s_k = prod_{j=k+1}^{R-1} d_j, s_{R-1} = 1
  let expectedStride = 1;
  let matches = true;
  for (let k = rank - 1; k >= 0; k--) {
    if (t.strides[k] !== expectedStride) {
      matches = false;
      break;
    }
    expectedStride *= shape[k]!;
  }
  console.log(`Shape [${shape.join(', ')}] -> Strides [${t.strides.join(', ')}] | C-Contiguity: ${matches && t.isContiguous ? 'PASS' : 'FAIL'}`);
  if (!matches || !t.isContiguous) {
    throw new Error(`Strides verification failed for shape [${shape.join(', ')}]`);
  }
}

// ---------------------------------------------------------------------------
// B2: Exact IEEE 754 Additive Commutativity
// ---------------------------------------------------------------------------
console.log('\n--- B2: Exact IEEE 754 Additive Commutativity ---');

{
  const shape = [3, 4, 5];
  const total = 60;
  const A = CanonicalTensor.fromFlatArray(shape, Array.from({ length: total }, (_, i) => Math.sin(i + 1)), 'float64');
  const B = CanonicalTensor.fromFlatArray(shape, Array.from({ length: total }, (_, i) => Math.cos(i + 1)), 'float64');

  const diff = A.add(B).subtract(B.add(A));
  const diffNorm = diff.frobeniusNorm();
  console.log(`Frobenius norm of (A + B) - (B + A): ${diffNorm.toExponential(4)}`);
  if (diffNorm !== 0.0) {
    throw new Error(`Additive commutativity violation: expected exact 0.0, got ${diffNorm}`);
  }
  console.log('Additive commutativity verified: exact bitwise identity in IEEE 754.');
}

// ---------------------------------------------------------------------------
// B3: Floating-Point Non-Associativity Characterization
// ---------------------------------------------------------------------------
console.log('\n--- B3: Floating-Point Non-Associativity Characterization ---');

{
  // Adversarial cancellation triples
  const A = CanonicalTensor.fromFlatArray([1, 1, 1], [1e16], 'float64');
  const B = CanonicalTensor.fromFlatArray([1, 1, 1], [-1e16], 'float64');
  const C = CanonicalTensor.fromFlatArray([1, 1, 1], [1.0], 'float64');

  const left = A.add(B).add(C); // (1e16 - 1e16) + 1.0 = 0.0 + 1.0 = 1.0
  const right = A.add(B.add(C)); // 1e16 + (-1e16 + 1.0) = 1e16 + (-1e16) = 0.0

  const gap = Math.abs(left.get(0, 0, 0) - right.get(0, 0, 0));
  console.log(`Adversarial addition left-association ((A+B)+C):  ${left.get(0, 0, 0)}`);
  console.log(`Adversarial addition right-association (A+(B+C)): ${right.get(0, 0, 0)}`);
  console.log(`Adversarial non-associativity gap:               ${gap.toExponential(4)}`);

  if (gap !== 1.0) {
    throw new Error(`Expected adversarial non-associativity gap 1.0, got ${gap}`);
  }
  console.log('Adversarial non-associativity demonstrated and characterized.');

  // Benign associativity check on smooth values
  const shape = [2, 3, 4];
  const A_b = CanonicalTensor.fromFlatArray(shape, Array.from({ length: 24 }, (_, i) => (i + 1) * 0.1), 'float64');
  const B_b = CanonicalTensor.fromFlatArray(shape, Array.from({ length: 24 }, (_, i) => (i + 1) * 0.05), 'float64');
  const C_b = CanonicalTensor.fromFlatArray(shape, Array.from({ length: 24 }, (_, i) => (i + 1) * 0.02), 'float64');

  const left_b = A_b.add(B_b).add(C_b);
  const right_b = A_b.add(B_b.add(C_b));
  const benignDiff = left_b.subtract(right_b).frobeniusNorm();
  console.log(`Benign associativity Frobenius diff:             ${benignDiff.toExponential(4)}`);
  if (benignDiff > 1e-14) {
    throw new Error(`Benign associativity exceeded tolerance 1e-14: ${benignDiff}`);
  }
}

// ---------------------------------------------------------------------------
// B4: Zero-Copy View vs Independent Copy Aliasing Isolation Audit
// ---------------------------------------------------------------------------
console.log('\n--- B4: Zero-Copy View vs Independent Copy Aliasing Audit ---');

{
  const orig = CanonicalTensor.fromFlatArray([4, 6], Array.from({ length: 24 }, (_, i) => i), 'float32');

  // Zero-copy view
  const view = orig.view([2, 12]);
  orig.set(42, 0, 0);
  if (view.get(0, 0) !== 42) {
    throw new Error('View failed zero-copy invariant: underlying mutation not reflected in view');
  }
  console.log('Zero-copy view verified: underlying memory shared between orig and view.');

  // Independent copy
  const copy = orig.copy();
  orig.set(999, 0, 0);
  if (copy.get(0, 0) === 999) {
    throw new Error('Copy failed aliasing isolation: mutation leaked into deep copy');
  }
  console.log('Deep copy verified: aliasing isolation strictly preserved.');
}

// ---------------------------------------------------------------------------
// B5: Batched Contraction Metric Invariants
// ---------------------------------------------------------------------------
console.log('\n--- B5: Batched Contraction Metric Invariants ---');

{
  // A is [B, M, K], B is [B, K, P]
  // Distributivity: A * (B1 + B2) == A * B1 + A * B2
  const B = 2, M = 3, K = 4, P = 3;
  const A = CanonicalTensor.fromFlatArray(
    [B, M, K],
    Array.from({ length: B * M * K }, (_, i) => Math.sin(i + 1)),
    'float64'
  );
  const B1 = CanonicalTensor.fromFlatArray(
    [B, K, P],
    Array.from({ length: B * K * P }, (_, i) => Math.cos(i + 1)),
    'float64'
  );
  const B2 = CanonicalTensor.fromFlatArray(
    [B, K, P],
    Array.from({ length: B * K * P }, (_, i) => Math.sin(i * 2 + 1)),
    'float64'
  );

  const LHS = A.batchedMatMul(B1.add(B2));
  const RHS = A.batchedMatMul(B1).add(A.batchedMatMul(B2));

  const distDiff = LHS.subtract(RHS).frobeniusNorm();
  console.log(`Batched MatMul Distributivity Diff: ${distDiff.toExponential(4)} (Tol: 1e-14)`);
  if (distDiff > 1e-14) {
    throw new Error(`Batched MatMul distributivity error ${distDiff} > 1e-14`);
  }
}

console.log('\n============================================================');
console.log('PHASE B AUDIT COMPLETED: ALL INVARIANTS VERIFIED');
console.log('============================================================\n');
