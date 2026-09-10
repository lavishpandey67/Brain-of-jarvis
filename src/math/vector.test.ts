/**
 * Project JARVIS: BRAIN-001
 * Mathematical Kernel: Canonical Vector Primitive Verification Suite
 * 
 * Tests:
 * 1. Shape & Dtype Integrity
 * 2. Vector Space Axioms (Commutativity, Associativity, Identity, Inverse, Distributivity)
 * 3. Inner Product & Metric Properties (Cauchy-Schwarz, Triangle Inequality, Pythogorean)
 * 4. Numerical Boundary & Precision (Scaled L2 Norm, Cancellation Resistance)
 * 5. Adversarial Edge Cases (Empty, NaN, Inf, Zero Norm, Large Magnitudes)
 */

import { CanonicalVector } from './vector';
import {
  DimensionMismatchError,
  NonFiniteNumericalError,
  EmptyVectorError,
  ZeroNormDivisionError,
  SecurityResourceExhaustionError,
  NUMERICAL_CONSTANTS,
} from './types';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertClose(a: number, b: number, tolerance: number, message: string) {
  const diff = Math.abs(a - b);
  if (diff > tolerance) {
    throw new Error(
      `Numerical tolerance breached: |${a} - ${b}| = ${diff} > tolerance ${tolerance}. ${message}`
    );
  }
}

function runTest(suite: string, name: string, fn: () => void) {
  const start = performance.now();
  try {
    fn();
    const durationMs = performance.now() - start;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  [PASS] ${name} (${durationMs.toFixed(3)} ms)`);
  } catch (err: any) {
    const durationMs = performance.now() - start;
    results.push({ suite, name, passed: false, durationMs, error: err?.message || String(err) });
    console.error(`  [FAIL] ${name}: ${err?.message}`);
  }
}

console.log('============================================================');
console.log('PROJECT JARVIS: CANONICAL VECTOR TEST SUITE');
console.log('============================================================\n');

// ------------------------------------------------------------
// SUITE 1: CONSTRUCTION & SHAPE INTEGRITY
// ------------------------------------------------------------
console.log('SUITE 1: Construction, Shape & Dtype Integrity');

runTest('Construction', 'fromArray creates valid vector with correct shape & dtype', () => {
  const v = CanonicalVector.fromArray([1.0, 2.5, -3.25], 'float32');
  assert(v.dimension === 3, 'dimension must be 3');
  assert(v.shape[0] === 3, 'shape must be [3]');
  assert(v.dtype === 'float32', 'dtype must be float32');
  assert(v.get(0) === 1.0, 'element 0 must be 1.0');
  assert(v.get(1) === 2.5, 'element 1 must be 2.5');
  assert(v.get(2) === -3.25, 'element 2 must be -3.25');
});

runTest('Construction', 'zeros and ones create properly sized and initialized vectors', () => {
  const z = CanonicalVector.zeros(5, 'float64');
  assert(z.dimension === 5, 'dimension must be 5');
  assert(z.isZero(), 'zeros must be zero vector');
  assert(z.normL2() === 0.0, 'norm of zeros must be 0.0');

  const o = CanonicalVector.ones(4, 'float32');
  assert(o.dimension === 4, 'dimension must be 4');
  assert(o.normL1() === 4.0, 'L1 norm of ones(4) must be 4.0');
  assertClose(o.normL2(), 2.0, 1e-6, 'L2 norm of ones(4) must be sqrt(4) = 2.0');
});

runTest('Construction', 'basis vector creates unit standard basis e_i', () => {
  const e1 = CanonicalVector.basis(3, 1, 'float32');
  assert(e1.dimension === 3, 'dimension must be 3');
  assert(e1.get(0) === 0.0 && e1.get(1) === 1.0 && e1.get(2) === 0.0, 'must be [0, 1, 0]');
  assert(e1.normL2() === 1.0, 'basis vector must have norm 1.0');
});

// ------------------------------------------------------------
// SUITE 2: VECTOR SPACE AXIOMS
// ------------------------------------------------------------
console.log('\nSUITE 2: Vector Space Axioms');

runTest('Axioms', 'Commutativity: u + v = v + u', () => {
  const u = CanonicalVector.fromArray([1.5, -2.0, 3.75, 4.0], 'float64');
  const v = CanonicalVector.fromArray([0.5, 3.2, -1.75, 2.1], 'float64');

  const uv = u.add(v);
  const vu = v.add(u);
  assert(uv.equals(vu), 'u + v must equal v + u');
});

runTest('Axioms', 'Associativity: (u + v) + w = u + (v + w)', () => {
  const u = CanonicalVector.fromArray([1.2, -0.4, 3.1], 'float64');
  const v = CanonicalVector.fromArray([-2.1, 4.5, 0.2], 'float64');
  const w = CanonicalVector.fromArray([3.0, -1.1, -2.5], 'float64');

  const left = u.add(v).add(w);
  const right = u.add(v.add(w));
  assert(left.equals(right, 1e-12), '(u + v) + w must equal u + (v + w)');
});

runTest('Axioms', 'Additive Identity & Inverse: v + 0 = v and v + (-v) = 0', () => {
  const v = CanonicalVector.fromArray([4.5, -3.2, 8.1, -0.05], 'float64');
  const zero = CanonicalVector.zeros(4, 'float64');

  const identity = v.add(zero);
  assert(identity.equals(v), 'v + 0 must equal v');

  const inverse = v.add(v.negate());
  assert(inverse.isZero(1e-14), 'v + (-v) must equal zero vector');
});

runTest('Axioms', 'Scalar Distributivity: alpha * (u + v) = alpha * u + alpha * v', () => {
  const u = CanonicalVector.fromArray([2.0, -1.5, 4.0], 'float64');
  const v = CanonicalVector.fromArray([-3.0, 5.5, 1.0], 'float64');
  const alpha = 2.5;

  const left = u.add(v).scale(alpha);
  const right = u.scale(alpha).add(v.scale(alpha));
  assert(left.equals(right, 1e-12), 'alpha * (u + v) must equal alpha*u + alpha*v');
});

// ------------------------------------------------------------
// SUITE 3: INNER PRODUCT & METRIC THEOREMS
// ------------------------------------------------------------
console.log('\nSUITE 3: Inner Product & Metric Theorems');

runTest('Theorems', 'Cauchy-Schwarz Inequality: |<u, v>| <= ||u||_2 * ||v||_2', () => {
  const u = CanonicalVector.fromArray([1.0, 3.0, -2.0, 5.0], 'float64');
  const v = CanonicalVector.fromArray([-4.0, 2.0, 3.0, -1.0], 'float64');

  const dot = Math.abs(u.dot(v));
  const normProduct = u.normL2() * v.normL2();
  assert(dot <= normProduct + 1e-12, `Cauchy-Schwarz breached: ${dot} > ${normProduct}`);
});

runTest('Theorems', 'Triangle Inequality: ||u + v||_2 <= ||u||_2 + ||v||_2', () => {
  const u = CanonicalVector.fromArray([3.0, -4.0, 2.0], 'float64');
  const v = CanonicalVector.fromArray([-1.0, 2.0, 5.0], 'float64');

  const normSum = u.add(v).normL2();
  const sumNorms = u.normL2() + v.normL2();
  assert(normSum <= sumNorms + 1e-12, `Triangle inequality breached: ${normSum} > ${sumNorms}`);
});

runTest('Theorems', 'Pythagorean Theorem: If <u, v> = 0, then ||u + v||^2 = ||u||^2 + ||v||^2', () => {
  // Construct two orthogonal vectors in R^3: [1, 2, 0] and [-2, 1, 0] -> dot = -2 + 2 = 0
  const u = CanonicalVector.fromArray([1.0, 2.0, 0.0], 'float64');
  const v = CanonicalVector.fromArray([-2.0, 1.0, 0.0], 'float64');

  assert(Math.abs(u.dot(v)) < 1e-14, 'Vectors must be strictly orthogonal');

  const normSumSq = Math.pow(u.add(v).normL2(), 2);
  const sumNormSq = Math.pow(u.normL2(), 2) + Math.pow(v.normL2(), 2);
  assertClose(normSumSq, sumNormSq, 1e-12, 'Pythagorean theorem must hold for orthogonal vectors');
});

runTest('Theorems', 'Cosine Similarity: Collinear (1.0), Orthogonal (0.0), Antiparallel (-1.0)', () => {
  const u = CanonicalVector.fromArray([2.0, -3.0, 6.0], 'float64');
  const collinear = u.scale(3.5);
  const antiparallel = u.scale(-2.0);
  const orthogonal = CanonicalVector.fromArray([3.0, 2.0, 0.0], 'float64'); // <[2,-3,6], [3,2,0]> = 6 - 6 + 0 = 0

  assertClose(u.cosineSimilarity(collinear), 1.0, 1e-12, 'Collinear cosine similarity must be 1.0');
  assertClose(u.cosineSimilarity(antiparallel), -1.0, 1e-12, 'Antiparallel cosine similarity must be -1.0');
  assertClose(u.cosineSimilarity(orthogonal), 0.0, 1e-12, 'Orthogonal cosine similarity must be 0.0');
});

runTest('Theorems', 'Unit Normalization: ||normalize(v)||_2 = 1.0', () => {
  const v = CanonicalVector.fromArray([12.3, -45.6, 78.9, -0.12], 'float32');
  const vHat = v.normalize();
  assertClose(vHat.normL2(), 1.0, NUMERICAL_CONSTANTS.TOLERANCE_F32, 'Normalized vector must have norm 1.0');
});

// ------------------------------------------------------------
// SUITE 4: NUMERICAL BOUNDARIES & OVERFLOW RESISTANCE
// ------------------------------------------------------------
console.log('\nSUITE 4: Numerical Boundaries & Overflow Resistance');

runTest('Numerical', 'Scaled Euclidean Norm prevents overflow on large float32 components (~10^25)', () => {
  // In float32, max finite value is ~3.4e38.
  // A vector with components 1e25 would overflow if squared naively: (1e25)^2 = 1e50 > 3.4e38 -> Infinity.
  // Our scaled norm algorithm MUST return a finite, mathematically accurate norm: sqrt(3) * 1e25.
  const largeVal = 1e25;
  const v = CanonicalVector.fromArray([largeVal, largeVal, largeVal], 'float32');
  const norm = v.normL2();

  assert(Number.isFinite(norm), 'Scaled norm must be finite, not Infinity');
  const expectedNorm = Math.sqrt(3) * largeVal;
  const relError = Math.abs(norm - expectedNorm) / expectedNorm;
  assert(relError < 1e-5, `Relative error too high: ${relError}`);
});

runTest('Numerical', 'Scaled Euclidean Norm prevents underflow on small components (~10^-25)', () => {
  const smallVal = 1e-25;
  const v = CanonicalVector.fromArray([smallVal, smallVal, smallVal], 'float32');
  const norm = v.normL2();

  assert(Number.isFinite(norm), 'Scaled norm must be finite');
  assert(norm > 0.0, 'Scaled norm must not underflow to zero');
  const expectedNorm = Math.sqrt(3) * smallVal;
  const relError = Math.abs(norm - expectedNorm) / expectedNorm;
  assert(relError < 1e-5, `Relative error too high: ${relError}`);
});

// ------------------------------------------------------------
// SUITE 5: ADVERSARIAL EDGE CASES & FAILURE ENGINEERING
// ------------------------------------------------------------
console.log('\nSUITE 5: Adversarial Edge Cases & Failure Engineering');

runTest('EdgeCases', 'Empty vector throws EmptyVectorError', () => {
  let thrown = false;
  try {
    CanonicalVector.fromArray([], 'float32');
  } catch (err) {
    if (err instanceof EmptyVectorError) thrown = true;
  }
  assert(thrown, 'Empty array must throw EmptyVectorError');
});

runTest('EdgeCases', 'Dimension mismatch throws DimensionMismatchError on add', () => {
  const u = CanonicalVector.zeros(3);
  const v = CanonicalVector.zeros(4);
  let thrown = false;
  try {
    u.add(v);
  } catch (err) {
    if (err instanceof DimensionMismatchError) thrown = true;
  }
  assert(thrown, 'Mismatched dimensions must throw DimensionMismatchError');
});

runTest('EdgeCases', 'Dimension mismatch throws DimensionMismatchError on dot', () => {
  const u = CanonicalVector.zeros(3);
  const v = CanonicalVector.zeros(4);
  let thrown = false;
  try {
    u.dot(v);
  } catch (err) {
    if (err instanceof DimensionMismatchError) thrown = true;
  }
  assert(thrown, 'Mismatched dot dimensions must throw DimensionMismatchError');
});

runTest('EdgeCases', 'NaN component throws NonFiniteNumericalError on creation', () => {
  let thrown = false;
  try {
    CanonicalVector.fromArray([1.0, NaN, 3.0], 'float32');
  } catch (err) {
    if (err instanceof NonFiniteNumericalError) thrown = true;
  }
  assert(thrown, 'NaN input must throw NonFiniteNumericalError');
});

runTest('EdgeCases', '+Infinity component throws NonFiniteNumericalError on creation', () => {
  let thrown = false;
  try {
    CanonicalVector.fromArray([1.0, Infinity, 3.0], 'float32');
  } catch (err) {
    if (err instanceof NonFiniteNumericalError) thrown = true;
  }
  assert(thrown, '+Infinity input must throw NonFiniteNumericalError');
});

runTest('EdgeCases', 'Scaling by NaN throws NonFiniteNumericalError', () => {
  const v = CanonicalVector.ones(3);
  let thrown = false;
  try {
    v.scale(NaN);
  } catch (err) {
    if (err instanceof NonFiniteNumericalError) thrown = true;
  }
  assert(thrown, 'Scaling by NaN must throw NonFiniteNumericalError');
});

runTest('EdgeCases', 'Normalizing zero vector throws ZeroNormDivisionError', () => {
  const zeroVec = CanonicalVector.zeros(4);
  let thrown = false;
  try {
    zeroVec.normalize();
  } catch (err) {
    if (err instanceof ZeroNormDivisionError) thrown = true;
  }
  assert(thrown, 'Normalizing zero vector must throw ZeroNormDivisionError');
});

runTest('EdgeCases', 'Cosine similarity with zero vector produces safe 0.0', () => {
  const u = CanonicalVector.fromArray([1.0, 2.0, 3.0], 'float32');
  const z = CanonicalVector.zeros(3, 'float32');
  const sim = u.cosineSimilarity(z);
  assert(sim === 0.0, 'Cosine similarity with zero vector must be 0.0');
});

runTest('EdgeCases', 'Allocation bomb dimension exceeds MAX_SAFE_DIMENSION throws SecurityResourceExhaustionError', () => {
  let thrown = false;
  try {
    CanonicalVector.zeros(100_000_000, 'float64');
  } catch (err) {
    if (err instanceof SecurityResourceExhaustionError) thrown = true;
  }
  assert(thrown, 'Exceeding MAX_SAFE_DIMENSION must throw SecurityResourceExhaustionError');
});

// ------------------------------------------------------------
// TEST REPORT SUMMARY
// ------------------------------------------------------------
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log('\n============================================================');
console.log(`TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
