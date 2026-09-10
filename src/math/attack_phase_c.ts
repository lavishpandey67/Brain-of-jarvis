/**
 * Project JARVIS: BRAIN-001
 * PHASE C: Numerical Attack & Adversarial Boundary Investigation
 */

import { CanonicalVector } from './vector';
import {
  EmptyVectorError,
  DimensionMismatchError,
  NonFiniteNumericalError,
  ZeroNormDivisionError,
  SecurityResourceExhaustionError,
  NUMERICAL_CONSTANTS,
} from './types';

interface AttackResult {
  caseName: string;
  category: string;
  passed: boolean;
  notes: string;
}

const results: AttackResult[] = [];

console.log('============================================================');
console.log('BRAIN-001: PHASE C — ADVERSARIAL NUMERICAL ATTACK SUITE');
console.log('============================================================\n');

// 1. Zero vector norm & operations
try {
  const z = CanonicalVector.zeros(5, 'float64');
  const norm = z.normL2();
  const passed = norm === 0.0;
  results.push({ caseName: 'zero_vector_norm', category: 'zero', passed, notes: `Norm = ${norm}` });
} catch (e: any) {
  results.push({ caseName: 'zero_vector_norm', category: 'zero', passed: false, notes: e.message });
}

// 2. Zero-norm normalization rejection
try {
  const z = CanonicalVector.zeros(5, 'float64');
  z.normalize();
  results.push({ caseName: 'zero_norm_normalize_reject', category: 'zero', passed: false, notes: 'Failed to throw on zero normalize' });
} catch (e: any) {
  const isExpected = e instanceof ZeroNormDivisionError;
  results.push({ caseName: 'zero_norm_normalize_reject', category: 'zero', passed: isExpected, notes: `Threw ${e.name}: ${e.message}` });
}

// 3. Negative zero (-0.0)
try {
  const negZeroVec = CanonicalVector.fromArray([-0.0, 0.0, -0.0], 'float64');
  const norm = negZeroVec.normL2();
  const passed = norm === 0.0 && Object.is(norm, 0); // norm should be +0.0
  results.push({ caseName: 'negative_zero_handling', category: 'sign', passed, notes: `Norm = ${norm}, Object.is(+0): ${passed}` });
} catch (e: any) {
  results.push({ caseName: 'negative_zero_handling', category: 'sign', passed: false, notes: e.message });
}

// 4. NaN input rejection in fromArray
try {
  CanonicalVector.fromArray([1.0, NaN, 3.0], 'float64');
  results.push({ caseName: 'nan_rejection_fromArray', category: 'non_finite', passed: false, notes: 'Allowed NaN' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'nan_rejection_fromArray', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// 5. +Infinity input rejection
try {
  CanonicalVector.fromArray([1.0, Infinity, 3.0], 'float64');
  results.push({ caseName: 'pos_inf_rejection', category: 'non_finite', passed: false, notes: 'Allowed +Infinity' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'pos_inf_rejection', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// 6. -Infinity input rejection
try {
  CanonicalVector.fromArray([1.0, -Infinity, 3.0], 'float64');
  results.push({ caseName: 'neg_inf_rejection', category: 'non_finite', passed: false, notes: 'Allowed -Infinity' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'neg_inf_rejection', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// 7. Dimension = 0 (empty input)
try {
  CanonicalVector.fromArray([], 'float64');
  results.push({ caseName: 'empty_input_dim_zero', category: 'dimension', passed: false, notes: 'Allowed dimension 0' });
} catch (e: any) {
  const passed = e instanceof EmptyVectorError;
  results.push({ caseName: 'empty_input_dim_zero', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 8. Dimension mismatch on addition
try {
  const u = CanonicalVector.ones(4, 'float64');
  const v = CanonicalVector.ones(5, 'float64');
  u.add(v);
  results.push({ caseName: 'dim_mismatch_add', category: 'dimension', passed: false, notes: 'Allowed dimension mismatch' });
} catch (e: any) {
  const passed = e instanceof DimensionMismatchError;
  results.push({ caseName: 'dim_mismatch_add', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 9. Dimension mismatch on dot product
try {
  const u = CanonicalVector.ones(4, 'float64');
  const v = CanonicalVector.ones(5, 'float64');
  u.dot(v);
  results.push({ caseName: 'dim_mismatch_dot', category: 'dimension', passed: false, notes: 'Allowed dimension mismatch' });
} catch (e: any) {
  const passed = e instanceof DimensionMismatchError;
  results.push({ caseName: 'dim_mismatch_dot', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 10. Single-element vector
try {
  const s = CanonicalVector.fromArray([-42.5], 'float64');
  const norm = s.normL2();
  const passed = Math.abs(norm - 42.5) < 1e-14;
  results.push({ caseName: 'single_element_vector', category: 'shape', passed, notes: `Dim=1 norm = ${norm}` });
} catch (e: any) {
  results.push({ caseName: 'single_element_vector', category: 'shape', passed: false, notes: e.message });
}

// 11. Large dimension (D = 100,000)
try {
  const D = 100_000;
  const largeVec = CanonicalVector.ones(D, 'float32');
  const norm = largeVec.normL2();
  const expected = Math.sqrt(D); // ~316.227766
  const relErr = Math.abs(norm - expected) / expected;
  const passed = relErr < 1e-5;
  results.push({ caseName: 'large_dimension_100k', category: 'scale', passed, notes: `Norm=${norm}, Expected=${expected}, relErr=${relErr.toExponential(4)}` });
} catch (e: any) {
  results.push({ caseName: 'large_dimension_100k', category: 'scale', passed: false, notes: e.message });
}

// 12. Alternating signs & cancellation
try {
  const alt = CanonicalVector.fromArray([1e8, -1e8, 1e-4, -1e-4], 'float64');
  const l1 = alt.normL1();
  const expectedL1 = 2e8 + 2e-4;
  const passed = Math.abs(l1 - expectedL1) < 1e-6;
  results.push({ caseName: 'alternating_signs_l1', category: 'cancellation', passed, notes: `L1=${l1}, expected=${expectedL1}` });
} catch (e: any) {
  results.push({ caseName: 'alternating_signs_l1', category: 'cancellation', passed: false, notes: e.message });
}

// 13. Subnormal numbers in Float64
try {
  // Min subnormal in Float64 is ~5e-324
  const subnormalVal = 1e-315;
  const subVec = CanonicalVector.fromArray([subnormalVal, subnormalVal], 'float64');
  const norm = subVec.normL2();
  const expected = Math.SQRT2 * subnormalVal;
  const relErr = Math.abs(norm - expected) / expected;
  const passed = Number.isFinite(norm) && norm > 0 && relErr < 1e-10;
  results.push({ caseName: 'subnormal_f64_norm', category: 'subnormal', passed, notes: `Norm=${norm.toExponential(6)}, expected=${expected.toExponential(6)}, relErr=${relErr.toExponential(4)}` });
} catch (e: any) {
  results.push({ caseName: 'subnormal_f64_norm', category: 'subnormal', passed: false, notes: e.message });
}

// 14. Subnormal numbers in Float32
try {
  // Float32 min normal is 1.175494e-38, subnormals go down to ~1.4e-45
  const subnormalValF32 = 1.0e-40;
  const subVecF32 = CanonicalVector.fromArray([subnormalValF32, subnormalValF32], 'float32');
  const norm = subVecF32.normL2();
  // With scaled Euclidean norm, max = 1e-40, scaled = [1.0, 1.0], norm = 1e-40 * sqrt(2)
  const expected = Math.SQRT2 * subnormalValF32;
  const relErr = Math.abs(norm - expected) / expected;
  const passed = Number.isFinite(norm) && norm > 0 && relErr < 1e-4;
  results.push({ caseName: 'subnormal_f32_norm', category: 'subnormal', passed, notes: `Norm=${norm.toExponential(6)}, expected=${expected.toExponential(6)}, relErr=${relErr.toExponential(4)}` });
} catch (e: any) {
  results.push({ caseName: 'subnormal_f32_norm', category: 'subnormal', passed: false, notes: e.message });
}

// ------------------------------------------------------------
// SPECIAL SCALED-NORM INVESTIGATION
// ------------------------------------------------------------
console.log('--- SPECIAL SCALED-NORM INVESTIGATION ---');
// Float32 maximum representable finite value: ~3.402823466e+38
// In unscaled L2 norm: (2e+30)^2 = 4e+60 -> overflows to +Infinity!
// Let's test scaled norm on 2e+30 in Float32:
const boundaryLargeF32 = 2.0e30;
const vLargeF32 = CanonicalVector.fromArray([boundaryLargeF32, boundaryLargeF32, boundaryLargeF32], 'float32');
const scaledNormLarge = vLargeF32.normL2();
const expectedScaledLarge = Math.sqrt(3) * boundaryLargeF32;
const relErrLarge = Math.abs(scaledNormLarge - expectedScaledLarge) / expectedScaledLarge;
const passedLarge = Number.isFinite(scaledNormLarge) && relErrLarge < 1e-5;

console.log(`Float32 Max Bound: 3.4028e+38`);
console.log(`Input component:   ${boundaryLargeF32.toExponential(4)}`);
console.log(`Unscaled square:   ${(boundaryLargeF32 * boundaryLargeF32).toExponential(4)} (Exceeds Float32 max finite!)`);
console.log(`Scaled Norm:       ${scaledNormLarge.toExponential(6)}`);
console.log(`Expected Norm:     ${expectedScaledLarge.toExponential(6)}`);
console.log(`Relative Error:    ${relErrLarge.toExponential(4)}`);
console.log(`Overflow Prevented: ${passedLarge ? 'TRUE (Scaled L2 Norm successfully prevented overflow)' : 'FALSE'}`);

results.push({
  caseName: 'scaled_norm_overflow_boundary',
  category: 'scaled_norm',
  passed: passedLarge,
  notes: `Input=2e30, norm=${scaledNormLarge.toExponential(6)}, relErr=${relErrLarge.toExponential(4)}`,
});

// 15. Extreme Dynamic Range: components spanning 1e-30 to 1e30 in Float64
try {
  const vRange = CanonicalVector.fromArray([1e30, 1e-30, 2.0], 'float64');
  const norm = vRange.normL2();
  const passed = Number.isFinite(norm) && Math.abs(norm - 1e30) / 1e30 < 1e-12;
  results.push({ caseName: 'extreme_dynamic_range_f64', category: 'range', passed, notes: `Norm=${norm.toExponential(6)} (Dominant component 1e30 preserved)` });
} catch (e: any) {
  results.push({ caseName: 'extreme_dynamic_range_f64', category: 'range', passed: false, notes: e.message });
}

// 16. Catastrophic Cancellation in Inner Product
try {
  const eps = 1e-10;
  const uCancel = CanonicalVector.fromArray([1.0 + eps, 1.0], 'float64');
  const vCancel = CanonicalVector.fromArray([1.0, -(1.0 + eps)], 'float64');
  // Exact: (1+eps)*1 - (1+eps)*1 = 0
  const dot = uCancel.dot(vCancel);
  const passed = Math.abs(dot) < 1e-15;
  results.push({ caseName: 'cancellation_dot_product', category: 'cancellation', passed, notes: `Dot=${dot.toExponential(4)} (Exact: 0.0)` });
} catch (e: any) {
  results.push({ caseName: 'cancellation_dot_product', category: 'cancellation', passed: false, notes: e.message });
}

// 17. Resource & Security Denial-of-Service: Dimension > MAX_SAFE_DIMENSION
try {
  CanonicalVector.zeros(50_000_000, 'float64');
  results.push({ caseName: 'security_memory_bomb_zeros', category: 'security', passed: false, notes: 'Failed to block memory bomb' });
} catch (e: any) {
  const passed = e instanceof SecurityResourceExhaustionError;
  results.push({ caseName: 'security_memory_bomb_zeros', category: 'security', passed, notes: `Blocked with ${e.name}` });
}

// 18. Negative and Fractional Dimensions
try {
  CanonicalVector.zeros(-4, 'float64');
  results.push({ caseName: 'negative_dimension_reject', category: 'dimension', passed: false, notes: 'Allowed negative dimension' });
} catch (e: any) {
  const passed = e instanceof EmptyVectorError;
  results.push({ caseName: 'negative_dimension_reject', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

try {
  CanonicalVector.zeros(3.5, 'float64');
  results.push({ caseName: 'fractional_dimension_reject', category: 'dimension', passed: false, notes: 'Allowed fractional dimension' });
} catch (e: any) {
  const passed = e instanceof EmptyVectorError;
  results.push({ caseName: 'fractional_dimension_reject', category: 'dimension', passed, notes: `Rejected with ${e.name}` });
}

// 19. Out-of-bounds Vector Element Access
try {
  const vAccess = CanonicalVector.fromArray([1.0, 2.0, 3.0], 'float32');
  vAccess.get(5);
  results.push({ caseName: 'index_out_of_bounds_get', category: 'bounds', passed: false, notes: 'Allowed out-of-bounds get()' });
} catch (e: any) {
  const passed = e instanceof DimensionMismatchError;
  results.push({ caseName: 'index_out_of_bounds_get', category: 'bounds', passed, notes: `Rejected with ${e.name}` });
}

try {
  const vAccess = CanonicalVector.fromArray([1.0, 2.0, 3.0], 'float32');
  vAccess.get(-1);
  results.push({ caseName: 'negative_index_get', category: 'bounds', passed: false, notes: 'Allowed negative index get()' });
} catch (e: any) {
  const passed = e instanceof DimensionMismatchError;
  results.push({ caseName: 'negative_index_get', category: 'bounds', passed, notes: `Rejected with ${e.name}` });
}

// 20. Aliasing & External Mutation Defense
try {
  const sourceArr = [10.0, 20.0, 30.0];
  const vAlias = CanonicalVector.fromArray(sourceArr, 'float32');
  sourceArr[0] = 999.0; // Mutate caller's original array
  const passed = vAlias.get(0) === 10.0;
  results.push({ caseName: 'source_array_aliasing_isolation', category: 'aliasing', passed, notes: `Vector element 0 remained ${vAlias.get(0)}` });
} catch (e: any) {
  results.push({ caseName: 'source_array_aliasing_isolation', category: 'aliasing', passed: false, notes: e.message });
}

// 21. Non-finite Scalar Multiplication (+Inf, -Inf, NaN)
try {
  const vInf = CanonicalVector.ones(3, 'float32');
  vInf.scale(Infinity);
  results.push({ caseName: 'scale_by_inf_rejection', category: 'non_finite', passed: false, notes: 'Allowed scale(Infinity)' });
} catch (e: any) {
  const passed = e instanceof NonFiniteNumericalError;
  results.push({ caseName: 'scale_by_inf_rejection', category: 'non_finite', passed, notes: `Rejected with ${e.name}` });
}

// Print Attack Matrix Table
console.log('\n============================================================');
console.log('| Case Name | Category | Status | Notes |');
console.log('| :--- | :--- | :---: | :--- |');
for (const r of results) {
  console.log(`| ${r.caseName} | ${r.category} | ${r.passed ? 'PASS' : 'FAIL'} | ${r.notes} |`);
}

const totalPassed = results.filter(r => r.passed).length;
console.log(`\nATTACK SUMMARY: ${totalPassed}/${results.length} PASSED`);
console.log('============================================================');
