/**
 * Project JARVIS: BRAIN-001
 * Phase C: CanonicalTensor Adversarial Numerical & Security Attack Matrix
 * 
 * 24 comprehensive adversarial attacks challenging numerical stability,
 * NaN/Inf injection, non-contiguous strided view protection, bounds checking,
 * and memory exhaustion defenses.
 */

import { CanonicalTensor } from './tensor';
import {
  EmptyTensorError,
  TensorDimensionMismatchError,
  TensorRankError,
  InvalidAxisError,
  NonContiguousError,
  NonFiniteNumericalError,
  DimensionMismatchError,
  SecurityResourceExhaustionError,
} from './types';

let totalAttacks = 0;
let passedAttacks = 0;

function runAttack(name: string, fn: () => void) {
  totalAttacks++;
  try {
    fn();
    passedAttacks++;
    console.log(`  [PASS] Attack ${totalAttacks.toString().padStart(2, '0')}: ${name}`);
  } catch (err) {
    console.error(`  [FAIL] Attack ${totalAttacks.toString().padStart(2, '0')}: ${name}`);
    console.error(`         Error: ${(err as Error).message}`);
    throw err;
  }
}

console.log('============================================================');
console.log('PHASE C: CANONICAL TENSOR ADVERSARIAL ATTACK MATRIX');
console.log('============================================================\n');

// 1. Zero tensor norm
runAttack('zero_tensor_norm', () => {
  const t = CanonicalTensor.zeros([2, 3, 4], 'float64');
  const norm = t.frobeniusNorm();
  if (norm !== 0.0 || !Object.is(norm, +0)) throw new Error(`Expected +0.0, got ${norm}`);
});

// 2. Negative zero handling
runAttack('negative_zero_handling', () => {
  const t = CanonicalTensor.fromFlatArray([2, 2], [-0.0, -0.0, -0.0, -0.0], 'float64');
  const norm = t.frobeniusNorm();
  if (norm !== 0.0 || !Object.is(norm, +0)) throw new Error(`Expected +0.0, got ${norm}`);
});

// 3. NaN rejection fromFlatArray
runAttack('nan_rejection_fromFlatArray', () => {
  let threw = false;
  try {
    CanonicalTensor.fromFlatArray([2, 2], [1.0, NaN, 3.0, 4.0], 'float32');
  } catch (e) {
    threw = e instanceof NonFiniteNumericalError;
  }
  if (!threw) throw new Error('Failed to reject NaN in fromFlatArray');
});

// 4. NaN rejection fromNestedArray
runAttack('nan_rejection_fromNestedArray', () => {
  let threw = false;
  try {
    CanonicalTensor.fromNestedArray([
      [1.0, 2.0],
      [NaN, 4.0],
    ]);
  } catch (e) {
    threw = e instanceof NonFiniteNumericalError;
  }
  if (!threw) throw new Error('Failed to reject NaN in fromNestedArray');
});

// 5. Positive Infinity rejection
runAttack('pos_inf_rejection', () => {
  let threw = false;
  try {
    CanonicalTensor.fromFlatArray([2, 2], [1.0, Infinity, 3.0, 4.0], 'float32');
  } catch (e) {
    threw = e instanceof NonFiniteNumericalError;
  }
  if (!threw) throw new Error('Failed to reject +Infinity');
});

// 6. Negative Infinity rejection
runAttack('neg_inf_rejection', () => {
  let threw = false;
  try {
    CanonicalTensor.fromFlatArray([2, 2], [1.0, -Infinity, 3.0, 4.0], 'float32');
  } catch (e) {
    threw = e instanceof NonFiniteNumericalError;
  }
  if (!threw) throw new Error('Failed to reject -Infinity');
});

// 7. Scale by NaN rejection
runAttack('scale_by_nan_rejection', () => {
  const t = CanonicalTensor.ones([2, 2]);
  let threw = false;
  try {
    t.scale(NaN);
  } catch (e) {
    threw = e instanceof NonFiniteNumericalError;
  }
  if (!threw) throw new Error('Failed to reject scale(NaN)');
});

// 8. Scale by Inf rejection
runAttack('scale_by_inf_rejection', () => {
  const t = CanonicalTensor.ones([2, 2]);
  let threw = false;
  try {
    t.scale(Infinity);
  } catch (e) {
    threw = e instanceof NonFiniteNumericalError;
  }
  if (!threw) throw new Error('Failed to reject scale(Infinity)');
});

// 9. Empty rank zero rejection
runAttack('empty_rank_zero_rejection', () => {
  let threw = false;
  try {
    CanonicalTensor.zeros([]);
  } catch (e) {
    threw = e instanceof EmptyTensorError;
  }
  if (!threw) throw new Error('Failed to reject empty rank []');
});

// 10. Dimension zero axis rejection
runAttack('dimension_zero_axis_rejection', () => {
  let threw = false;
  try {
    CanonicalTensor.zeros([2, 0, 4]);
  } catch (e) {
    threw = e instanceof EmptyTensorError;
  }
  if (!threw) throw new Error('Failed to reject dimension 0');
});

// 11. Negative dimension axis rejection
runAttack('negative_dimension_axis_rejection', () => {
  let threw = false;
  try {
    CanonicalTensor.zeros([2, -3, 4]);
  } catch (e) {
    threw = e instanceof EmptyTensorError;
  }
  if (!threw) throw new Error('Failed to reject negative dimension');
});

// 12. Fractional dimension axis rejection
runAttack('fractional_dimension_axis_rejection', () => {
  let threw = false;
  try {
    CanonicalTensor.zeros([2, 3.5, 4]);
  } catch (e) {
    threw = e instanceof EmptyTensorError;
  }
  if (!threw) throw new Error('Failed to reject fractional dimension');
});

// 13. Ragged nested array rejection
runAttack('ragged_nested_array_rejection', () => {
  let threw = false;
  try {
    CanonicalTensor.fromNestedArray([
      [1, 2, 3],
      [4, 5], // Ragged length 2 vs 3
    ]);
  } catch (e) {
    threw = e instanceof TensorDimensionMismatchError;
  }
  if (!threw) throw new Error('Failed to reject ragged nested array');
});

// 14. Flat array length mismatch rejection
runAttack('flat_array_length_mismatch_rejection', () => {
  let threw = false;
  try {
    CanonicalTensor.fromFlatArray([2, 3], [1, 2, 3, 4, 5]); // 5 elements vs 6 expected
  } catch (e) {
    threw = e instanceof TensorDimensionMismatchError;
  }
  if (!threw) throw new Error('Failed to reject flat array length mismatch');
});

// 15. Out of bounds index rejection
runAttack('out_of_bounds_index_rejection', () => {
  const t = CanonicalTensor.zeros([2, 3, 4]);
  let threw = false;
  try {
    t.get(0, 3, 0); // axis 1 max is 2
  } catch (e) {
    threw = e instanceof DimensionMismatchError;
  }
  if (!threw) throw new Error('Failed to reject out-of-bounds index');
});

// 16. Negative index get rejection
runAttack('negative_index_get_rejection', () => {
  const t = CanonicalTensor.zeros([2, 3, 4]);
  let threw = false;
  try {
    t.get(0, -1, 0);
  } catch (e) {
    threw = e instanceof DimensionMismatchError;
  }
  if (!threw) throw new Error('Failed to reject negative index');
});

// 17. Non-contiguous view rejection
runAttack('view_non_contiguous_rejection', () => {
  const t = CanonicalTensor.fromFlatArray([2, 3], [1, 2, 3, 4, 5, 6]);
  const transposed = t.transpose(0, 1); // non-contiguous
  let threw = false;
  try {
    transposed.view([6]); // view requires contiguity
  } catch (e) {
    threw = e instanceof NonContiguousError;
  }
  if (!threw) throw new Error('Failed to reject view() on non-contiguous tensor');
});

// 18. Reshape size mismatch rejection
runAttack('reshape_size_mismatch_rejection', () => {
  const t = CanonicalTensor.zeros([2, 3, 4]); // 24 elements
  let threw = false;
  try {
    t.reshape([5, 5]); // 25 elements != 24
  } catch (e) {
    threw = e instanceof TensorDimensionMismatchError;
  }
  if (!threw) throw new Error('Failed to reject reshape size mismatch');
});

// 19. Permute invalid rank rejection
runAttack('permute_invalid_rank_rejection', () => {
  const t = CanonicalTensor.zeros([2, 3, 4]);
  let threw = false;
  try {
    t.permute(0, 1); // 2 axes instead of 3
  } catch (e) {
    threw = e instanceof TensorRankError;
  }
  if (!threw) throw new Error('Failed to reject permute with wrong number of axes');
});

// 20. Permute duplicate axes rejection
runAttack('permute_duplicate_axes_rejection', () => {
  const t = CanonicalTensor.zeros([2, 3, 4]);
  let threw = false;
  try {
    t.permute(0, 1, 1); // duplicate axis 1
  } catch (e) {
    threw = e instanceof InvalidAxisError;
  }
  if (!threw) throw new Error('Failed to reject permute with duplicate axes');
});

// 21. Batched matmul inner dimension mismatch rejection
runAttack('batched_matmul_inner_dim_mismatch_rejection', () => {
  const A = CanonicalTensor.zeros([2, 3, 4]); // K_A = 4
  const B = CanonicalTensor.zeros([2, 5, 2]); // K_B = 5 != 4
  let threw = false;
  try {
    A.batchedMatMul(B);
  } catch (e) {
    threw = e instanceof TensorDimensionMismatchError;
  }
  if (!threw) throw new Error('Failed to reject batched matmul inner dimension mismatch');
});

// 22. Scaled Frobenius norm overflow boundary
runAttack('scaled_frobenius_norm_overflow', () => {
  // 4 elements of 2.0e30 in Float32: sum of squares would be 1.6e61 > 3.4e38 (overflow to Infinity)
  const huge = CanonicalTensor.fromFlatArray([2, 2], [2e30, 2e30, 2e30, 2e30], 'float32');
  const norm = huge.frobeniusNorm();
  if (!Number.isFinite(norm)) {
    throw new Error(`Scaled norm failed: produced non-finite norm ${norm}`);
  }
  const expected = 4e30;
  const relErr = Math.abs(norm - expected) / expected;
  if (relErr > 1e-6) {
    throw new Error(`Scaled norm relative error ${relErr} > 1e-6`);
  }
});

// 23. Security memory bomb rejection
runAttack('security_memory_bomb', () => {
  let threw = false;
  try {
    // 2000 * 2000 * 5 = 20,000,000 > 16,777,216
    CanonicalTensor.zeros([2000, 2000, 5]);
  } catch (e) {
    threw = e instanceof SecurityResourceExhaustionError;
  }
  if (!threw) throw new Error('Failed to block security memory bomb');
});

// 24. Aliasing isolation of source array
runAttack('aliasing_isolation_source_array', () => {
  const src = [1.0, 2.0, 3.0, 4.0];
  const t = CanonicalTensor.fromFlatArray([2, 2], src, 'float32');
  src[0] = 999.0;
  if (t.get(0, 0) === 999.0) {
    throw new Error('Tensor data aliased to caller source array');
  }
});

console.log('\n============================================================');
console.log(`ATTACK MATRIX SUMMARY: ${passedAttacks}/${totalAttacks} PASSED (0 FAILED)`);
console.log('============================================================\n');
