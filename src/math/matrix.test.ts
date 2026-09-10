/**
 * Project JARVIS: BRAIN-001
 * CanonicalMatrix Comprehensive Unit & Axiomatic Test Suite
 */

import { CanonicalMatrix } from './matrix';
import { CanonicalVector } from './vector';
import {
  EmptyMatrixError,
  MatrixDimensionMismatchError,
  DimensionMismatchError,
  NonFiniteNumericalError,
  SecurityResourceExhaustionError,
  NUMERICAL_CONSTANTS,
} from './types';

// Simple minimal test runner
interface TestResult {
  name: string;
  suite: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const testResults: TestResult[] = [];
let currentSuite = '';

function suite(name: string, fn: () => void) {
  currentSuite = name;
  console.log(`\nSUITE: ${name}`);
  fn();
}

function test(name: string, fn: () => void) {
  const start = performance.now();
  try {
    fn();
    const durationMs = performance.now() - start;
    testResults.push({ name, suite: currentSuite, passed: true, durationMs });
    console.log(`  [PASS] ${name} (${durationMs.toFixed(3)} ms)`);
  } catch (err: any) {
    const durationMs = performance.now() - start;
    testResults.push({ name, suite: currentSuite, passed: false, error: err.message, durationMs });
    console.error(`  [FAIL] ${name} (${durationMs.toFixed(3)} ms)`);
    console.error(`         Error: ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertClose(actual: number, expected: number, tol: number, message: string) {
  const diff = Math.abs(actual - expected);
  if (diff > tol) {
    throw new Error(`${message}: expected ${expected}, got ${actual} (diff: ${diff.toExponential(4)} > tol: ${tol.toExponential(4)})`);
  }
}

console.log('============================================================');
console.log('PROJECT JARVIS: CANONICAL MATRIX TEST SUITE');
console.log('============================================================');

// ------------------------------------------------------------
// SUITE 1: CONSTRUCTION, SHAPE, STRIDES & REPRESENTATION INTEGRITY
// ------------------------------------------------------------
suite('Construction, Shape, Strides & Representation Integrity', () => {
  test('from2DArray creates valid matrix with correct shape, strides, and contiguous memory', () => {
    const data = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const mat = CanonicalMatrix.from2DArray(data, 'float32');
    assert(mat.rows === 2, 'Rows must be 2');
    assert(mat.cols === 3, 'Cols must be 3');
    assert(mat.shape[0] === 2 && mat.shape[1] === 3, 'Shape must be [2, 3]');
    assert(mat.strides[0] === 3 && mat.strides[1] === 1, 'Strides must be [3, 1]');
    assert(mat.dtype === 'float32', 'Dtype must be float32');
    assert(mat.data.length === 6, 'Data buffer length must be 6');
    assert(mat.get(0, 0) === 1, 'get(0,0) must be 1');
    assert(mat.get(0, 2) === 3, 'get(0,2) must be 3');
    assert(mat.get(1, 0) === 4, 'get(1,0) must be 4');
    assert(mat.get(1, 2) === 6, 'get(1,2) must be 6');
  });

  test('zeros and ones construct properly sized and filled matrices', () => {
    const z = CanonicalMatrix.zeros(3, 4, 'float64');
    assert(z.rows === 3 && z.cols === 4, 'Zeros shape check');
    assert(z.isZero(), 'Zeros matrix must be isZero()');

    const o = CanonicalMatrix.ones(2, 2, 'float32');
    assert(o.get(0, 0) === 1 && o.get(1, 1) === 1, 'Ones elements check');
  });

  test('eye constructs identity matrix with delta_{i,j}', () => {
    const eye = CanonicalMatrix.eye(3, 'float64');
    assert(eye.rows === 3 && eye.cols === 3, 'Eye shape');
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        assert(eye.get(i, j) === (i === j ? 1 : 0), `Eye element at (${i},${j})`);
      }
    }
  });

  test('diag constructs diagonal matrix from vector and array', () => {
    const v = CanonicalVector.fromArray([2, -5, 7], 'float64');
    const d = CanonicalMatrix.diag(v, 'float64');
    assert(d.get(0, 0) === 2 && d.get(1, 1) === -5 && d.get(2, 2) === 7, 'Diagonal entries');
    assert(d.get(0, 1) === 0 && d.get(1, 0) === 0, 'Off-diagonal entries must be 0');
  });

  test('getRow and getCol extract CanonicalVectors with matching elements', () => {
    const mat = CanonicalMatrix.from2DArray([
      [10, 20, 30],
      [40, 50, 60],
    ], 'float64');

    const r1 = mat.getRow(1);
    assert(r1.dimension === 3, 'Row dimension');
    assert(r1.get(0) === 40 && r1.get(1) === 50 && r1.get(2) === 60, 'Row components');

    const c2 = mat.getCol(2);
    assert(c2.dimension === 2, 'Col dimension');
    assert(c2.get(0) === 30 && c2.get(1) === 60, 'Col components');
  });
});

// ------------------------------------------------------------
// SUITE 2: MATRIX-SPACE AXIOMS
// ------------------------------------------------------------
suite('Matrix-Space Axioms', () => {
  test('Additive Commutativity: A + B = B + A (exact)', () => {
    const A = CanonicalMatrix.from2DArray([[1.5, -2.5], [3.5, 4.5]], 'float64');
    const B = CanonicalMatrix.from2DArray([[-0.5, 1.2], [4.0, -1.1]], 'float64');
    const AB = A.add(B);
    const BA = B.add(A);
    assert(AB.equals(BA, 0.0), 'A + B must bitwise match B + A in IEEE 754');
  });

  test('Additive Identity & Inverse: A + 0 = A and A + (-A) = 0', () => {
    const A = CanonicalMatrix.from2DArray([[1, 2], [3, 4]], 'float64');
    const zero = CanonicalMatrix.zeros(2, 2, 'float64');
    assert(A.add(zero).equals(A, 0.0), 'A + 0 = A');
    assert(A.add(A.negate()).isZero(1e-15), 'A + (-A) = 0');
  });

  test('Scalar Distributivity: alpha * (A + B) = alpha * A + alpha * B', () => {
    const A = CanonicalMatrix.from2DArray([[1.2, 3.4], [-2.1, 0.5]], 'float64');
    const B = CanonicalMatrix.from2DArray([[0.8, -1.4], [1.1, 2.5]], 'float64');
    const alpha = 2.5;
    const left = A.add(B).scale(alpha);
    const right = A.scale(alpha).add(B.scale(alpha));
    assert(left.equals(right, 1e-14), 'alpha * (A + B) == alpha * A + alpha * B');
  });
});

// ------------------------------------------------------------
// SUITE 3: MATRIX MULTIPLICATION (GEMM) THEOREMS
// ------------------------------------------------------------
suite('Matrix Multiplication (GEMM) Theorems', () => {
  test('Identity property: A * I = I * A = A', () => {
    const A = CanonicalMatrix.from2DArray([
      [1.2, 3.4, -0.5],
      [-2.1, 0.5, 4.0],
    ], 'float64');
    const I3 = CanonicalMatrix.eye(3, 'float64');
    const I2 = CanonicalMatrix.eye(2, 'float64');

    const rightId = A.multiply(I3);
    const leftId = I2.multiply(A);
    assert(rightId.equals(A, 1e-14), 'A * I_3 = A');
    assert(leftId.equals(A, 1e-14), 'I_2 * A = A');
  });

  test('Associativity: (A * B) * C = A * (B * C)', () => {
    const A = CanonicalMatrix.from2DArray([[1, 2], [3, 4], [5, 6]], 'float64'); // 3x2
    const B = CanonicalMatrix.from2DArray([[7, 8, 9], [1, 2, 3]], 'float64');    // 2x3
    const C = CanonicalMatrix.from2DArray([[2, -1], [0, 3], [1, 4]], 'float64');  // 3x2

    const left = A.multiply(B).multiply(C);
    const right = A.multiply(B.multiply(C));
    assert(left.equals(right, 1e-12), '(AB)C must equal A(BC)');
  });

  test('Distributivity: A * (B + C) = A * B + A * C', () => {
    const A = CanonicalMatrix.from2DArray([[1, 2], [3, 4]], 'float64');
    const B = CanonicalMatrix.from2DArray([[5, 6], [7, 8]], 'float64');
    const C = CanonicalMatrix.from2DArray([[-1, 2], [3, -4]], 'float64');

    const left = A.multiply(B.add(C));
    const right = A.multiply(B).add(A.multiply(C));
    assert(left.equals(right, 1e-13), 'A(B + C) == AB + AC');
  });

  test('Transpose of product: (A * B)^T = B^T * A^T', () => {
    const A = CanonicalMatrix.from2DArray([[1, 2, 3], [4, 5, 6]], 'float64'); // 2x3
    const B = CanonicalMatrix.from2DArray([[7, 8], [9, 10], [11, 12]], 'float64'); // 3x2

    const left = A.multiply(B).transpose();
    const right = B.transpose().multiply(A.transpose());
    assert(left.equals(right, 1e-13), '(AB)^T == B^T * A^T');
  });

  test('Non-commutativity: AB != BA in general', () => {
    const A = CanonicalMatrix.from2DArray([[1, 2], [3, 4]], 'float64');
    const B = CanonicalMatrix.from2DArray([[0, 1], [1, 0]], 'float64');
    const AB = A.multiply(B);
    const BA = B.multiply(A);
    assert(!AB.equals(BA, 1e-6), 'Matrix multiplication must be non-commutative in general');
  });
});

// ------------------------------------------------------------
// SUITE 4: MATRIX-VECTOR MULTIPLICATION (GEMV)
// ------------------------------------------------------------
suite('Matrix-Vector Multiplication (GEMV)', () => {
  test('Linearity: A * (x + y) = A * x + A * y', () => {
    const A = CanonicalMatrix.from2DArray([
      [1.5, -2.0, 0.5],
      [3.0, 1.0, -1.5],
    ], 'float64');
    const x = CanonicalVector.fromArray([1.0, 2.0, 3.0], 'float64');
    const y = CanonicalVector.fromArray([-0.5, 1.5, 2.5], 'float64');

    const left = A.multiplyVector(x.add(y));
    const right = A.multiplyVector(x).add(A.multiplyVector(y));
    assert(left.equals(right, 1e-13), 'A(x + y) == Ax + Ay');
  });

  test('Matrix-vector product matches matrix-matrix single column multiplication', () => {
    const A = CanonicalMatrix.from2DArray([
      [1, 2, 3],
      [4, 5, 6],
    ], 'float64');
    const x = CanonicalVector.fromArray([2, -1, 4], 'float64');

    // As GEMV
    const yVec = A.multiplyVector(x);

    // As GEMM with 3x1 column matrix
    const xMat = CanonicalMatrix.from2DArray([[2], [-1], [4]], 'float64');
    const yMat = A.multiply(xMat);

    assert(yVec.get(0) === yMat.get(0, 0), 'Component 0 matches');
    assert(yVec.get(1) === yMat.get(1, 0), 'Component 1 matches');
  });
});

// ------------------------------------------------------------
// SUITE 5: MATRIX NORMS & TRACE
// ------------------------------------------------------------
suite('Matrix Norms & Trace', () => {
  test('Cyclic Trace Property: tr(A * B) = tr(B * A)', () => {
    const A = CanonicalMatrix.from2DArray([[1, 2, 3], [4, 5, 6]], 'float64'); // 2x3
    const B = CanonicalMatrix.from2DArray([[7, 8], [9, 1], [2, 3]], 'float64'); // 3x2

    const trAB = A.multiply(B).trace(); // AB is 2x2
    const trBA = B.multiply(A).trace(); // BA is 3x3
    assertClose(trAB, trBA, 1e-13, 'tr(AB) must equal tr(BA)');
  });

  test('Frobenius Norm Sub-multiplicativity: ||AB||_F <= ||A||_F * ||B||_F', () => {
    const A = CanonicalMatrix.from2DArray([[1, -2], [3, 4]], 'float64');
    const B = CanonicalMatrix.from2DArray([[5, 6], [-1, 2]], 'float64');

    const normAB = A.multiply(B).frobeniusNorm();
    const prodNorms = A.frobeniusNorm() * B.frobeniusNorm();
    assert(normAB <= prodNorms + 1e-14, 'Frobenius norm must be sub-multiplicative');
  });

  test('L1 and Linf norms calculate exact maximum absolute column/row sums', () => {
    const A = CanonicalMatrix.from2DArray([
      [1, -5, 2],
      [-4, 3, -6],
    ], 'float64');

    // Col sums: |1|+|-4|=5, |-5|+|3|=8, |2|+|-6|=8 -> max = 8
    assert(A.normL1() === 8, `L1 norm: expected 8, got ${A.normL1()}`);

    // Row sums: |1|+|-5|+|2|=8, |-4|+|3|+|-6|=13 -> max = 13
    assert(A.normLinf() === 13, `Linf norm: expected 13, got ${A.normLinf()}`);
  });
});

// ------------------------------------------------------------
// SUITE 6: NUMERICAL BOUNDARIES & OVERFLOW RESISTANCE
// ------------------------------------------------------------
suite('Numerical Boundaries & Overflow Resistance', () => {
  test('Scaled Frobenius Norm prevents overflow on large elements (~2e30 in float32)', () => {
    const large = 2.0e30;
    // Unscaled square: (2e30)^2 * 4 = 1.6e61 (Overflows float32 3.4e38!)
    const mat = CanonicalMatrix.from2DArray([
      [large, large],
      [large, large],
    ], 'float32');

    const norm = mat.frobeniusNorm();
    assert(Number.isFinite(norm), 'Frobenius norm must be finite');
    // Expected: sqrt(4 * (2e30)^2) = 2 * 2e30 = 4e30
    const expected = 4.0e30;
    const relErr = Math.abs(norm - expected) / expected;
    assert(relErr < 1e-6, `Frobenius norm relative error (${relErr.toExponential(4)}) must be < 1e-6`);
  });

  test('Scaled Frobenius Norm prevents underflow on subnormals (~1e-40 in float32)', () => {
    const small = 1.0e-40;
    const mat = CanonicalMatrix.from2DArray([
      [small, small],
      [small, small],
    ], 'float32');

    const norm = mat.frobeniusNorm();
    assert(norm > 0, 'Norm must be non-zero');
    const expected = 2.0e-40;
    const relErr = Math.abs(norm - expected) / expected;
    assert(relErr < 1e-5, `Subnormal Frobenius norm relErr: ${relErr.toExponential(4)}`);
  });
});

// ------------------------------------------------------------
// SUITE 7: ADVERSARIAL EDGE CASES & FAILURE ENGINEERING
// ------------------------------------------------------------
suite('Adversarial Edge Cases & Failure Engineering', () => {
  test('Empty dimensions throw EmptyMatrixError', () => {
    let thrown = false;
    try {
      CanonicalMatrix.zeros(0, 5, 'float32');
    } catch (e) {
      if (e instanceof EmptyMatrixError) thrown = true;
    }
    assert(thrown, 'Zero rows must throw EmptyMatrixError');
  });

  test('Non-rectangular 2D array throws MatrixDimensionMismatchError', () => {
    let thrown = false;
    try {
      CanonicalMatrix.from2DArray([
        [1, 2, 3],
        [4, 5], // Missing 3rd column
      ], 'float32');
    } catch (e) {
      if (e instanceof MatrixDimensionMismatchError) thrown = true;
    }
    assert(thrown, 'Non-rectangular array must throw MatrixDimensionMismatchError');
  });

  test('GEMM dimension mismatch throws MatrixDimensionMismatchError', () => {
    const A = CanonicalMatrix.zeros(2, 3, 'float32');
    const B = CanonicalMatrix.zeros(4, 2, 'float32'); // A.cols(3) != B.rows(4)
    let thrown = false;
    try {
      A.multiply(B);
    } catch (e) {
      if (e instanceof MatrixDimensionMismatchError) thrown = true;
    }
    assert(thrown, 'GEMM dimension mismatch must throw MatrixDimensionMismatchError');
  });

  test('GEMV dimension mismatch throws DimensionMismatchError', () => {
    const A = CanonicalMatrix.zeros(2, 3, 'float32');
    const x = CanonicalVector.zeros(4, 'float32'); // A.cols(3) != x.dim(4)
    let thrown = false;
    try {
      A.multiplyVector(x);
    } catch (e) {
      if (e instanceof DimensionMismatchError) thrown = true;
    }
    assert(thrown, 'GEMV dimension mismatch must throw DimensionMismatchError');
  });

  test('Trace on non-square matrix throws MatrixDimensionMismatchError', () => {
    const A = CanonicalMatrix.zeros(2, 3, 'float32');
    let thrown = false;
    try {
      A.trace();
    } catch (e) {
      if (e instanceof MatrixDimensionMismatchError) thrown = true;
    }
    assert(thrown, 'Trace on non-square must throw MatrixDimensionMismatchError');
  });

  test('NaN in matrix elements throws NonFiniteNumericalError', () => {
    let thrown = false;
    try {
      CanonicalMatrix.from2DArray([[1, NaN], [2, 3]], 'float32');
    } catch (e) {
      if (e instanceof NonFiniteNumericalError) thrown = true;
    }
    assert(thrown, 'NaN in matrix must throw NonFiniteNumericalError');
  });

  test('Scale by Infinity throws NonFiniteNumericalError', () => {
    const A = CanonicalMatrix.eye(2, 'float32');
    let thrown = false;
    try {
      A.scale(Infinity);
    } catch (e) {
      if (e instanceof NonFiniteNumericalError) thrown = true;
    }
    assert(thrown, 'Scale by Infinity must throw NonFiniteNumericalError');
  });

  test('Allocation bomb exceeding MAX_SAFE_DIMENSION throws SecurityResourceExhaustionError', () => {
    let thrown = false;
    try {
      // 10,000 x 10,000 = 100,000,000 > 16,777,216
      CanonicalMatrix.zeros(10_000, 10_000, 'float64');
    } catch (e) {
      if (e instanceof SecurityResourceExhaustionError) thrown = true;
    }
    assert(thrown, 'Exceeding MAX_SAFE_DIMENSION must throw SecurityResourceExhaustionError');
  });
});

// ------------------------------------------------------------
// REPORT SUMMARY
// ------------------------------------------------------------
const totalTests = testResults.length;
const passedTests = testResults.filter(t => t.passed).length;
const failedTests = testResults.filter(t => !t.passed).length;

console.log('\n============================================================');
console.log(`CANONICAL MATRIX TEST SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('============================================================');

if (failedTests > 0) {
  process.exit(1);
}
