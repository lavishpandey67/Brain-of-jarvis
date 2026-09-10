/**
 * Project JARVIS: BRAIN-001
 * CanonicalTensor Unit Test Suite
 * 
 * Verifies tensor construction, C-contiguous strides, linear indexing,
 * zero-copy view/reshape semantics, permutation/transposition,
 * tensor-space axioms, batched GEMM, norms, interop with CanonicalVector/CanonicalMatrix,
 * and error handling.
 */

import { CanonicalTensor } from './tensor';
import { CanonicalVector } from './vector';
import { CanonicalMatrix } from './matrix';
import {
  EmptyTensorError,
  TensorDimensionMismatchError,
  TensorRankError,
  InvalidAxisError,
  NonFiniteNumericalError,
  DimensionMismatchError,
  SecurityResourceExhaustionError,
} from './types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passedTests++;
  console.log(`  [PASS] ${msg}`);
}

console.log('============================================================');
console.log('PROJECT JARVIS: CANONICAL TENSOR TEST SUITE');
console.log('============================================================\n');

// ---------------------------------------------------------------------------
// SUITE 1: Construction, Ranks, Shapes, Strides & Memory Layout
// ---------------------------------------------------------------------------
console.log('SUITE 1: Construction, Ranks, Shapes, Strides & Memory Layout');

{
  const t = CanonicalTensor.zeros([2, 3, 4], 'float32');
  assert(t.rank === 3, 'Rank is 3');
  assert(t.shape[0] === 2 && t.shape[1] === 3 && t.shape[2] === 4, 'Shape is [2, 3, 4]');
  assert(t.totalElements === 24, 'Total elements is 24');
  assert(t.strides[0] === 12 && t.strides[1] === 4 && t.strides[2] === 1, 'C-contiguous strides are [12, 4, 1]');
  assert(t.isContiguous === true, 'isContiguous is true for zeros');
  assert(t.get(1, 2, 3) === 0, 'Initial value is 0');
}

{
  const ones = CanonicalTensor.ones([3, 2], 'float64');
  assert(ones.rank === 2, 'Ones rank is 2');
  assert(ones.totalElements === 6, 'Ones total elements is 6');
  assert(ones.get(0, 0) === 1.0 && ones.get(2, 1) === 1.0, 'All ones initialized');
}

{
  const flat = [1, 2, 3, 4, 5, 6, 7, 8];
  const t = CanonicalTensor.fromFlatArray([2, 2, 2], flat, 'float32');
  assert(t.get(0, 0, 0) === 1, 'fromFlatArray index (0,0,0) == 1');
  assert(t.get(0, 1, 1) === 4, 'fromFlatArray index (0,1,1) == 4');
  assert(t.get(1, 0, 0) === 5, 'fromFlatArray index (1,0,0) == 5');
  assert(t.get(1, 1, 1) === 8, 'fromFlatArray index (1,1,1) == 8');
}

{
  const nested = [
    [
      [10, 20],
      [30, 40],
    ],
    [
      [50, 60],
      [70, 80],
    ],
  ];
  const t = CanonicalTensor.fromNestedArray(nested, 'float32');
  assert(t.rank === 3, 'fromNestedArray rank is 3');
  assert(t.shape[0] === 2 && t.shape[1] === 2 && t.shape[2] === 2, 'fromNestedArray shape is [2, 2, 2]');
  assert(t.get(1, 0, 1) === 60, 'fromNestedArray element get(1, 0, 1) == 60');
}

// ---------------------------------------------------------------------------
// SUITE 2: Reshape, View & Layout Semantics
// ---------------------------------------------------------------------------
console.log('\nSUITE 2: Reshape, View & Layout Semantics');

{
  const t = CanonicalTensor.fromFlatArray([2, 3, 4], Array.from({ length: 24 }, (_, i) => i + 1), 'float32');
  const viewed = t.view([6, 4]);
  assert(viewed.rank === 2, 'View reshaped to rank 2');
  assert(viewed.shape[0] === 6 && viewed.shape[1] === 4, 'View shape is [6, 4]');
  assert(viewed.strides[0] === 4 && viewed.strides[1] === 1, 'View strides are [4, 1]');
  // Verify zero-copy: mutating t mutates viewed!
  t.set(999, 0, 0, 0);
  assert(viewed.get(0, 0) === 999, 'View is zero-copy: underlying buffer mutation observed');
}

{
  const t = CanonicalTensor.fromFlatArray([2, 3], [1, 2, 3, 4, 5, 6], 'float32');
  const transposed = t.transpose(0, 1);
  assert(transposed.shape[0] === 3 && transposed.shape[1] === 2, 'Transposed shape is [3, 2]');
  assert(transposed.get(0, 1) === 4, 'Transposed element get(0, 1) == 4');
  assert(transposed.isContiguous === false, 'Transposed tensor is non-contiguous');
  // Materialize contiguous
  const contig = transposed.contiguous();
  assert(contig.isContiguous === true, 'contiguous() materializes contiguous tensor');
  assert(contig.get(0, 1) === 4, 'contiguous preserves element order');
}

{
  const t = CanonicalTensor.fromFlatArray([2, 1, 3, 1], [1, 2, 3, 4, 5, 6], 'float32');
  const squeezed = t.squeeze();
  assert(squeezed.rank === 2, 'Squeeze all singletons reduces rank to 2');
  assert(squeezed.shape[0] === 2 && squeezed.shape[1] === 3, 'Squeezed shape is [2, 3]');
  const unsqueezed = squeezed.unsqueeze(1);
  assert(unsqueezed.rank === 3, 'Unsqueeze at 1 gives rank 3');
  assert(unsqueezed.shape[0] === 2 && unsqueezed.shape[1] === 1 && unsqueezed.shape[2] === 3, 'Shape [2, 1, 3]');
}

{
  const t = CanonicalTensor.fromFlatArray([4, 5], Array.from({ length: 20 }, (_, i) => i), 'float32');
  const sliced = t.slice(0, 1, 3);
  assert(sliced.rank === 2, 'Slice preserves rank 2');
  assert(sliced.shape[0] === 2 && sliced.shape[1] === 5, 'Sliced shape is [2, 5]');
  assert(sliced.get(0, 0) === 5, 'Sliced get(0, 0) == 5 (starts at row 1)');

  const selected = t.select(0, 2);
  assert(selected.rank === 1, 'Select reduces rank to 1');
  assert(selected.shape[0] === 5, 'Selected shape is [5]');
  assert(selected.get(3) === 13, 'Selected element get(3) == 13 (row 2, col 3)');
}

// ---------------------------------------------------------------------------
// SUITE 3: Tensor Space Axioms & Arithmetic
// ---------------------------------------------------------------------------
console.log('\nSUITE 3: Tensor Space Axioms & Arithmetic');

{
  const A = CanonicalTensor.fromFlatArray([2, 3], [1, 2, 3, 4, 5, 6], 'float64');
  const B = CanonicalTensor.fromFlatArray([2, 3], [7, 8, 9, 10, 11, 12], 'float64');

  // Commutativity: A + B = B + A
  const C1 = A.add(B);
  const C2 = B.add(A);
  assert(C1.equals(C2, 0.0), 'Tensor addition commutativity: A + B == B + A (exact 0.0)');

  // Additive Identity: A + 0 = A
  const Zero = CanonicalTensor.zeros([2, 3], 'float64');
  assert(A.add(Zero).equals(A, 0.0), 'Additive identity: A + 0 == A');

  // Additive Inverse: A + (-A) = 0
  const Inv = A.negate();
  assert(A.add(Inv).isZero(1e-15), 'Additive inverse: A + (-A) == 0');

  // Scalar Distributivity: alpha * (A + B) = alpha * A + alpha * B
  const alpha = 3.5;
  const LHS = C1.scale(alpha);
  const RHS = A.scale(alpha).add(B.scale(alpha));
  assert(LHS.equals(RHS, 1e-14), 'Scalar distributivity: alpha * (A + B) == alpha*A + alpha*B');
}

// ---------------------------------------------------------------------------
// SUITE 4: Contraction & Batched GEMM Theorems
// ---------------------------------------------------------------------------
console.log('\nSUITE 4: Contraction & Batched GEMM Theorems');

{
  // Batch size 2, A is 2x3, B is 3x2 -> output is 2x2 per batch
  const A = CanonicalTensor.fromFlatArray(
    [2, 2, 3],
    [
      1, 2, 3,
      4, 5, 6,
      7, 8, 9,
      1, 2, 3,
    ],
    'float64'
  );
  const B = CanonicalTensor.fromFlatArray(
    [2, 3, 2],
    [
      1, 0,
      0, 1,
      1, 1,
      2, 1,
      0, 1,
      1, 0,
    ],
    'float64'
  );

  const C = A.batchedMatMul(B);
  assert(C.rank === 3, 'Batched MatMul output rank is 3');
  assert(C.shape[0] === 2 && C.shape[1] === 2 && C.shape[2] === 2, 'Output shape is [2, 2, 2]');

  // Check batch 0:
  // [1, 2, 3] * [1, 0, 1]^T = 1*1 + 2*0 + 3*1 = 4
  // [1, 2, 3] * [0, 1, 1]^T = 1*0 + 2*1 + 3*1 = 5
  assert(C.get(0, 0, 0) === 4, 'Batch 0 (0,0) == 4');
  assert(C.get(0, 0, 1) === 5, 'Batch 0 (0,1) == 5');
}

// ---------------------------------------------------------------------------
// SUITE 5: Metric Theorems & Norms
// ---------------------------------------------------------------------------
console.log('\nSUITE 5: Metric Theorems & Norms');

{
  const t = CanonicalTensor.fromFlatArray([2, 2], [3, -4, 0, 0], 'float64');
  assert(Math.abs(t.frobeniusNorm() - 5.0) < 1e-14, 'Frobenius norm of [3, -4, 0, 0] == 5.0');
  assert(t.normL1() === 7.0, 'L1 norm is 7.0');
  assert(t.normLinf() === 4.0, 'Linf norm is 4.0');

  // Scaled Frobenius norm resists overflow on 2.0e30 in Float32
  const huge = CanonicalTensor.fromFlatArray([2, 2], [2e30, 2e30, 2e30, 2e30], 'float32');
  const normHuge = huge.frobeniusNorm();
  assert(Number.isFinite(normHuge), 'Scaled Frobenius norm is finite for 2e30 elements');
  const expectedNorm = 4e30;
  const relErr = Math.abs(normHuge - expectedNorm) / expectedNorm;
  assert(relErr < 1e-6, `Scaled Frobenius norm relErr = ${relErr} < 1e-6`);
}

// ---------------------------------------------------------------------------
// SUITE 6: Interoperability with Proven Dependencies
// ---------------------------------------------------------------------------
console.log('\nSUITE 6: Interoperability with Proven Dependencies');

{
  const vec = CanonicalVector.fromArray([1, 2, 3, 4], 'float32');
  const tVec = CanonicalTensor.fromVector(vec);
  assert(tVec.rank === 1 && tVec.shape[0] === 4, 'Tensor from vector has rank 1 and shape [4]');
  const vecBack = tVec.toVector();
  assert(vecBack.dimension === 4, 'toVector preserves dimension');
  assert(vecBack.get(2) === 3, 'toVector preserves element values');

  const mat = CanonicalMatrix.from2DArray(
    [
      [1, 2],
      [3, 4],
    ],
    'float32'
  );
  const tMat = CanonicalTensor.fromMatrix(mat);
  assert(tMat.rank === 2 && tMat.shape[0] === 2 && tMat.shape[1] === 2, 'Tensor from matrix has rank 2');
  const matBack = tMat.toMatrix();
  assert(matBack.rows === 2 && matBack.cols === 2, 'toMatrix preserves rows and cols');
  assert(matBack.get(1, 0) === 3, 'toMatrix preserves element values');
}

// ---------------------------------------------------------------------------
// SUITE 7: Adversarial Edge Cases & Failure Engineering
// ---------------------------------------------------------------------------
console.log('\nSUITE 7: Adversarial Edge Cases & Failure Engineering');

{
  let threw = false;
  try {
    CanonicalTensor.zeros([], 'float32');
  } catch (e) {
    threw = e instanceof EmptyTensorError;
  }
  assert(threw, 'Empty rank throws EmptyTensorError');
}

{
  let threw = false;
  try {
    CanonicalTensor.fromFlatArray([2, 3], [1, 2, NaN, 4, 5, 6], 'float32');
  } catch (e) {
    threw = e instanceof NonFiniteNumericalError;
  }
  assert(threw, 'NaN throws NonFiniteNumericalError');
}

{
  let threw = false;
  try {
    CanonicalTensor.fromNestedArray([
      [1, 2],
      [3, 4, 5],
    ]);
  } catch (e) {
    threw = e instanceof TensorDimensionMismatchError;
  }
  assert(threw, 'Ragged nested array throws TensorDimensionMismatchError');
}

{
  let threw = false;
  try {
    const t = CanonicalTensor.zeros([2, 3]);
    t.get(0, 5);
  } catch (e) {
    threw = e instanceof DimensionMismatchError;
  }
  assert(threw, 'Out of bounds index throws DimensionMismatchError');
}

{
  let threw = false;
  try {
    // 50,000,000 > MAX_SAFE_DIMENSION (16,777,216)
    CanonicalTensor.zeros([1000, 1000, 50]);
  } catch (e) {
    threw = e instanceof SecurityResourceExhaustionError;
  }
  assert(threw, 'Allocation bomb throws SecurityResourceExhaustionError');
}

console.log('\n============================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} PASSED (0 FAILED)`);
console.log('============================================================\n');
