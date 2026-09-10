/**
 * Project JARVIS: BRAIN-001
 * CanonicalMatrix Phase C: Adversarial Numerical Attack Suite
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

interface AttackCase {
  caseName: string;
  category: string;
  passed: boolean;
  notes: string;
}

const results: AttackCase[] = [];

console.log('============================================================');
console.log('BRAIN-001: CANONICAL MATRIX — PHASE C ADVERSARIAL ATTACK SUITE');
console.log('============================================================\n');

// 1. Zero Matrix Frobenius Norm
try {
  const zeroMat = CanonicalMatrix.zeros(4, 4, 'float64');
  const norm = zeroMat.frobeniusNorm();
  const passed = norm === 0 && Object.is(norm, +0);
  results.push({ caseName: 'zero_matrix_frobenius_norm', category: 'zero', passed, notes: `Norm = ${norm}, Object.is(+0): ${Object.is(norm, +0)}` });
} catch (e: any) {
  results.push({ caseName: 'zero_matrix_frobenius_norm', category: 'zero', passed: false, notes: e.message });
}

// 2. Negative Zero Handling in Matrix Elements
try {
  const negZeroMat = CanonicalMatrix.from2DArray([[-0.0, -0.0], [-0.0, -0.0]], 'float64');
  const norm = negZeroMat.frobeniusNorm();
  const passed = norm === 0 && Object.is(norm, +0);
  results.push({ caseName: 'negative_zero_handling', category: 'sign', passed, notes: `Norm = ${norm}, Object.is(+0): ${Object.is(norm, +0)}` });
} catch (e: any) {
  results.push({ caseName: 'negative_zero_handling', category: 'sign', passed: false, notes: e.message });
}

// 3. NaN Rejection in from2DArray
try {
  CanonicalMatrix.from2DArray([[1.0, NaN], [2.0, 3.0]], 'float32');
  results.push({ caseName: 'nan_rejection_from2DArray', category: 'non_finite', passed: false, notes: 'Failed to reject NaN' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'nan_rejection_from2DArray', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// 4. NaN Rejection in fromFlatArray
try {
  CanonicalMatrix.fromFlatArray(2, 2, [1.0, 2.0, NaN, 4.0], 'float32');
  results.push({ caseName: 'nan_rejection_fromFlatArray', category: 'non_finite', passed: false, notes: 'Failed to reject NaN in flat array' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'nan_rejection_fromFlatArray', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// 5. Positive Infinity Rejection
try {
  CanonicalMatrix.from2DArray([[Infinity, 2.0], [3.0, 4.0]], 'float64');
  results.push({ caseName: 'pos_inf_rejection', category: 'non_finite', passed: false, notes: 'Failed to reject +Inf' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'pos_inf_rejection', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// 6. Negative Infinity Rejection
try {
  CanonicalMatrix.from2DArray([[1.0, -Infinity], [3.0, 4.0]], 'float64');
  results.push({ caseName: 'neg_inf_rejection', category: 'non_finite', passed: false, notes: 'Failed to reject -Inf' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'neg_inf_rejection', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// 7. Scale by NaN Rejection
try {
  const mat = CanonicalMatrix.eye(2, 'float32');
  mat.scale(NaN);
  results.push({ caseName: 'scale_by_nan_rejection', category: 'non_finite', passed: false, notes: 'Allowed scale(NaN)' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'scale_by_nan_rejection', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// 8. Scale by Infinity Rejection
try {
  const mat = CanonicalMatrix.eye(2, 'float32');
  mat.scale(Infinity);
  results.push({ caseName: 'scale_by_inf_rejection', category: 'non_finite', passed: false, notes: 'Allowed scale(Infinity)' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'scale_by_inf_rejection', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// 9. Empty Rows Rejection
try {
  CanonicalMatrix.zeros(0, 5, 'float32');
  results.push({ caseName: 'empty_rows_rejection', category: 'dimension', passed: false, notes: 'Allowed rows = 0' });
} catch (e: any) {
  const passed = e instanceof EmptyMatrixError;
  results.push({ caseName: 'empty_rows_rejection', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 10. Empty Cols Rejection
try {
  CanonicalMatrix.zeros(5, 0, 'float32');
  results.push({ caseName: 'empty_cols_rejection', category: 'dimension', passed: false, notes: 'Allowed cols = 0' });
} catch (e: any) {
  const passed = e instanceof EmptyMatrixError;
  results.push({ caseName: 'empty_cols_rejection', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 11. Negative Dimensions Rejection
try {
  CanonicalMatrix.zeros(-3, 4, 'float32');
  results.push({ caseName: 'negative_dimensions_rejection', category: 'dimension', passed: false, notes: 'Allowed negative dimension' });
} catch (e: any) {
  const passed = e instanceof EmptyMatrixError;
  results.push({ caseName: 'negative_dimensions_rejection', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 12. Fractional Dimensions Rejection
try {
  CanonicalMatrix.zeros(3.5, 4, 'float32');
  results.push({ caseName: 'fractional_dimensions_rejection', category: 'dimension', passed: false, notes: 'Allowed fractional dimension' });
} catch (e: any) {
  const passed = e instanceof EmptyMatrixError;
  results.push({ caseName: 'fractional_dimensions_rejection', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 13. Ragged 2D Array Rejection
try {
  CanonicalMatrix.from2DArray([[1, 2, 3], [4, 5]], 'float32');
  results.push({ caseName: 'ragged_2d_array_rejection', category: 'shape', passed: false, notes: 'Allowed ragged 2D array' });
} catch (e: any) {
  const passed = e instanceof MatrixDimensionMismatchError;
  results.push({ caseName: 'ragged_2d_array_rejection', category: 'shape', passed, notes: `Rejected with ${e.name}` });
}

// 14. Flat Array Length Mismatch
try {
  CanonicalMatrix.fromFlatArray(2, 3, [1, 2, 3, 4, 5], 'float32'); // Expected 6 elements
  results.push({ caseName: 'flat_array_length_mismatch', category: 'shape', passed: false, notes: 'Allowed mismatched flat array' });
} catch (e: any) {
  const passed = e instanceof MatrixDimensionMismatchError;
  results.push({ caseName: 'flat_array_length_mismatch', category: 'shape', passed, notes: `Rejected with ${e.name}` });
}

// 15. Out of Bounds Row Get
try {
  const mat = CanonicalMatrix.zeros(2, 3, 'float32');
  mat.get(5, 0);
  results.push({ caseName: 'out_of_bounds_row_get', category: 'bounds', passed: false, notes: 'Allowed out-of-bounds row' });
} catch (e: any) {
  const passed = e instanceof DimensionMismatchError;
  results.push({ caseName: 'out_of_bounds_row_get', category: 'bounds', passed, notes: `Rejected with ${e.name}` });
}

// 16. Out of Bounds Col Get
try {
  const mat = CanonicalMatrix.zeros(2, 3, 'float32');
  mat.get(0, 5);
  results.push({ caseName: 'out_of_bounds_col_get', category: 'bounds', passed: false, notes: 'Allowed out-of-bounds col' });
} catch (e: any) {
  const passed = e instanceof DimensionMismatchError;
  results.push({ caseName: 'out_of_bounds_col_get', category: 'bounds', passed, notes: `Rejected with ${e.name}` });
}

// 17. Negative Index Get
try {
  const mat = CanonicalMatrix.zeros(2, 3, 'float32');
  mat.get(-1, 0);
  results.push({ caseName: 'negative_index_get', category: 'bounds', passed: false, notes: 'Allowed negative index' });
} catch (e: any) {
  const passed = e instanceof DimensionMismatchError;
  results.push({ caseName: 'negative_index_get', category: 'bounds', passed, notes: `Rejected with ${e.name}` });
}

// 18. GEMM Dimension Mismatch
try {
  const A = CanonicalMatrix.zeros(2, 3, 'float32');
  const B = CanonicalMatrix.zeros(4, 2, 'float32');
  A.multiply(B);
  results.push({ caseName: 'gemm_dimension_mismatch', category: 'dimension', passed: false, notes: 'Allowed GEMM inner dimension mismatch' });
} catch (e: any) {
  const passed = e instanceof MatrixDimensionMismatchError;
  results.push({ caseName: 'gemm_dimension_mismatch', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 19. GEMV Dimension Mismatch
try {
  const A = CanonicalMatrix.zeros(2, 3, 'float32');
  const x = CanonicalVector.zeros(4, 'float32');
  A.multiplyVector(x);
  results.push({ caseName: 'gemv_dimension_mismatch', category: 'dimension', passed: false, notes: 'Allowed GEMV dimension mismatch' });
} catch (e: any) {
  const passed = e instanceof DimensionMismatchError;
  results.push({ caseName: 'gemv_dimension_mismatch', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 20. Trace Non-Square Rejection
try {
  const A = CanonicalMatrix.zeros(2, 3, 'float32');
  A.trace();
  results.push({ caseName: 'trace_non_square_rejection', category: 'dimension', passed: false, notes: 'Allowed trace() on non-square matrix' });
} catch (e: any) {
  const passed = e instanceof MatrixDimensionMismatchError;
  results.push({ caseName: 'trace_non_square_rejection', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 21. Scaled Frobenius Norm Overflow Boundary (2e30 in float32)
try {
  const large = 2.0e30;
  const mat = CanonicalMatrix.from2DArray([
    [large, large],
    [large, large],
  ], 'float32');
  const norm = mat.frobeniusNorm();
  const expected = 4.0e30;
  const relErr = Math.abs(norm - expected) / expected;
  const passed = Number.isFinite(norm) && relErr < 1e-6;
  results.push({ caseName: 'scaled_frobenius_norm_overflow', category: 'overflow', passed, notes: `Norm = ${norm.toExponential(6)}, relErr = ${relErr.toExponential(4)}` });
} catch (e: any) {
  results.push({ caseName: 'scaled_frobenius_norm_overflow', category: 'overflow', passed: false, notes: e.message });
}

// 22. Subnormal Float64 Matrix GEMM
try {
  const sub = 1e-315;
  const A = CanonicalMatrix.from2DArray([[sub, 0.0], [0.0, sub]], 'float64');
  const B = CanonicalMatrix.from2DArray([[2.0, 0.0], [0.0, 3.0]], 'float64');
  const C = A.multiply(B);
  const relErr00 = Math.abs(C.get(0, 0) - 2e-315) / 2e-315;
  const relErr11 = Math.abs(C.get(1, 1) - 3e-315) / 3e-315;
  const passed = relErr00 < 1e-6 && relErr11 < 1e-6;
  results.push({ caseName: 'subnormal_f64_matrix_gemm', category: 'subnormal', passed, notes: `C[0,0] = ${C.get(0,0)}, relErr = ${relErr00.toExponential(3)}` });
} catch (e: any) {
  results.push({ caseName: 'subnormal_f64_matrix_gemm', category: 'subnormal', passed: false, notes: e.message });
}

// 23. Security Resource Exhaustion (Memory Bomb 10,000 x 10,000 = 100M elements)
try {
  CanonicalMatrix.zeros(10_000, 10_000, 'float64');
  results.push({ caseName: 'security_memory_bomb_zeros', category: 'security', passed: false, notes: 'Failed to block memory bomb' });
} catch (e: any) {
  const passed = e instanceof SecurityResourceExhaustionError;
  results.push({ caseName: 'security_memory_bomb_zeros', category: 'security', passed, notes: `Blocked with ${e.name}` });
}

// 24. Aliasing Isolation on Source Array
try {
  const sourceArr = [[10.0, 20.0], [30.0, 40.0]];
  const mat = CanonicalMatrix.from2DArray(sourceArr, 'float32');
  sourceArr[0]![0] = 999.0; // Mutate caller's array
  const passed = mat.get(0, 0) === 10.0;
  results.push({ caseName: 'aliasing_isolation_source_array', category: 'aliasing', passed, notes: `Matrix element [0,0] remained ${mat.get(0, 0)}` });
} catch (e: any) {
  results.push({ caseName: 'aliasing_isolation_source_array', category: 'aliasing', passed: false, notes: e.message });
}

// Print Attack Matrix Table
console.log('============================================================');
console.log('| Case Name | Category | Status | Notes |');
console.log('| :--- | :--- | :---: | :--- |');
for (const r of results) {
  console.log(`| ${r.caseName} | ${r.category} | ${r.passed ? 'PASS' : 'FAIL'} | ${r.notes} |`);
}
console.log('============================================================');

const totalAttacks = results.length;
const passedAttacks = results.filter(r => r.passed).length;
console.log(`MATRIX ATTACK SUMMARY: ${passedAttacks}/${totalAttacks} PASSED`);
console.log('============================================================\n');

if (passedAttacks !== totalAttacks) {
  process.exit(1);
}
