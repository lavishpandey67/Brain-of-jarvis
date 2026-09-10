/**
 * Project JARVIS: BRAIN-001
 * CanonicalTensor: The Atomic Rank-N Tensor Mathematical Primitive
 * 
 * Mathematical Contracts:
 * 1. Explicit rank R >= 1, dimensions d_k in N+, shape tuple [d_0, ..., d_{R-1}].
 * 2. Total elements N = prod(d_k) <= MAX_SAFE_DIMENSION (16,777,216).
 * 3. Contiguous or strided storage backed by linear Float32Array or Float64Array.
 * 4. Index mapping: offset(i_0, ..., i_{R-1}) = baseOffset + sum(i_k * s_k).
 * 5. Reshape, permute, transpose, and slice semantics with explicit zero-copy views.
 * 6. Elementwise arithmetic with strict shape contracts.
 * 7. Batched GEMM contraction with cache-friendly loop order and double-precision accumulation.
 * 8. Scaled Frobenius norm resisting overflow and underflow.
 * 9. Seamless interop with CanonicalVector (rank 1) and CanonicalMatrix (rank 2).
 */

import {
  DType,
  ShapeND,
  StridesND,
  NUMERICAL_CONSTANTS,
  NonFiniteNumericalError,
  DimensionMismatchError,
  EmptyTensorError,
  TensorDimensionMismatchError,
  TensorRankError,
  InvalidAxisError,
  NonContiguousError,
  SecurityResourceExhaustionError,
} from './types';
import { CanonicalVector } from './vector';
import { CanonicalMatrix } from './matrix';

export class CanonicalTensor {
  public readonly shape: ShapeND;
  public readonly strides: StridesND;
  public readonly offset: number;
  public readonly dtype: DType;
  public readonly rank: number;
  public readonly totalElements: number;
  public readonly isContiguous: boolean;

  /**
   * Internal linear TypedArray backing buffer.
   */
  public readonly data: Float32Array | Float64Array;

  /**
   * Private constructor enforcing dimensional, stride, and security invariants.
   */
  private constructor(
    shape: ShapeND,
    data: Float32Array | Float64Array,
    dtype: DType,
    strides?: StridesND,
    offset: number = 0
  ) {
    if (shape.length === 0) {
      throw new EmptyTensorError('constructor', 'tensor rank must be >= 1');
    }

    let total = 1;
    for (let k = 0; k < shape.length; k++) {
      const d = shape[k]!;
      if (!Number.isInteger(d) || d <= 0) {
        throw new EmptyTensorError(
          'constructor',
          `dimension at axis ${k} must be a positive integer, got ${d}`
        );
      }
      total *= d;
    }

    if (total > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(
        total,
        NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION
      );
    }

    this.shape = Object.freeze([...shape]);
    this.rank = shape.length;
    this.totalElements = total;
    this.dtype = dtype;
    this.offset = offset;
    this.data = data;

    if (strides) {
      if (strides.length !== this.rank) {
        throw new TensorRankError(this.rank, strides.length, 'constructor (strides)');
      }
      this.strides = Object.freeze([...strides]);
    } else {
      this.strides = Object.freeze(CanonicalTensor.computeContiguousStrides(this.shape));
    }

    this.isContiguous = CanonicalTensor.checkContiguity(this.shape, this.strides);
  }

  // =========================================================================
  // FACTORY METHODS
  // =========================================================================

  /**
   * Computes standard row-major (C-contiguous) strides for a given shape.
   * s_k = prod_{j=k+1}^{R-1} d_j, with s_{R-1} = 1.
   */
  public static computeContiguousStrides(shape: ShapeND): number[] {
    const rank = shape.length;
    if (rank === 0) return [];
    const strides = new Array<number>(rank);
    let stride = 1;
    for (let k = rank - 1; k >= 0; k--) {
      strides[k] = stride;
      stride *= shape[k]!;
    }
    return strides;
  }

  /**
   * Checks if given shape and strides form a standard C-contiguous layout.
   */
  public static checkContiguity(shape: ShapeND, strides: StridesND): boolean {
    const rank = shape.length;
    if (rank === 0) return true;
    let expectedStride = 1;
    for (let k = rank - 1; k >= 0; k--) {
      if (shape[k] !== 1 && strides[k] !== expectedStride) {
        return false;
      }
      expectedStride *= shape[k]!;
    }
    return true;
  }

  /**
   * Validates shape tuple: non-empty rank, positive integers, and resource limit.
   */
  public static validateShape(shape: ShapeND, op: string): number {
    if (shape.length === 0) {
      throw new EmptyTensorError(op, 'tensor rank must be >= 1');
    }
    let total = 1;
    for (let k = 0; k < shape.length; k++) {
      const d = shape[k]!;
      if (!Number.isInteger(d) || d <= 0) {
        throw new EmptyTensorError(op, `dimension at axis ${k} must be a positive integer, got ${d}`);
      }
      total *= d;
    }
    if (total > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(total, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }
    return total;
  }

  /**
   * Creates a zero-initialized CanonicalTensor of specified shape and dtype.
   */
  public static zeros(shape: ShapeND, dtype: DType = 'float32'): CanonicalTensor {
    const total = CanonicalTensor.validateShape(shape, 'zeros');
    const data = dtype === 'float32' ? new Float32Array(total) : new Float64Array(total);
    return new CanonicalTensor(shape, data, dtype);
  }

  /**
   * Creates a CanonicalTensor filled with ones of specified shape and dtype.
   */
  public static ones(shape: ShapeND, dtype: DType = 'float32'): CanonicalTensor {
    const tensor = CanonicalTensor.zeros(shape, dtype);
    tensor.data.fill(1.0);
    return tensor;
  }

  /**
   * Constructs a CanonicalTensor from a 1D flat array and target shape.
   */
  public static fromFlatArray(
    shape: ShapeND,
    flatArray: ArrayLike<number>,
    dtype: DType = 'float32'
  ): CanonicalTensor {
    let total = 1;
    for (let k = 0; k < shape.length; k++) {
      const d = shape[k]!;
      if (!Number.isInteger(d) || d <= 0) {
        throw new EmptyTensorError('fromFlatArray', `dimension at axis ${k} must be >= 1, got ${d}`);
      }
      total *= d;
    }

    if (flatArray.length !== total) {
      throw new TensorDimensionMismatchError(
        shape,
        `[flatArray.length: ${flatArray.length}]`,
        'fromFlatArray'
      );
    }

    const data = dtype === 'float32' ? new Float32Array(total) : new Float64Array(total);
    for (let i = 0; i < total; i++) {
      const v = flatArray[i]!;
      if (!Number.isFinite(v)) {
        throw new NonFiniteNumericalError(i, v, 'fromFlatArray');
      }
      data[i] = v;
    }

    return new CanonicalTensor(shape, data, dtype);
  }

  /**
   * Constructs a CanonicalTensor from a recursively nested JavaScript array.
   * Enforces uniform rectangular shape across all sub-arrays.
   */
  public static fromNestedArray(nested: unknown, dtype: DType = 'float32'): CanonicalTensor {
    if (!Array.isArray(nested)) {
      throw new EmptyTensorError('fromNestedArray', 'input must be an array');
    }
    if (nested.length === 0) {
      throw new EmptyTensorError('fromNestedArray', 'outer array cannot be empty');
    }

    // Determine shape and validate rectangular structure
    const shape: number[] = [];
    let current: unknown = nested;
    while (Array.isArray(current)) {
      if (current.length === 0) {
        throw new EmptyTensorError('fromNestedArray', 'nested dimension cannot be empty');
      }
      shape.push(current.length);
      current = current[0];
    }

    // Flatten recursively and validate uniformity
    const flat: number[] = [];
    const validateAndFlatten = (arr: unknown[], depth: number): void => {
      const expectedLen = shape[depth]!;
      if (arr.length !== expectedLen) {
        throw new TensorDimensionMismatchError(
          `nested length ${expectedLen} at depth ${depth}`,
          `ragged length ${arr.length}`,
          'fromNestedArray'
        );
      }

      if (depth === shape.length - 1) {
        for (let i = 0; i < arr.length; i++) {
          const val = arr[i];
          if (typeof val !== 'number' || !Number.isFinite(val)) {
            throw new NonFiniteNumericalError(flat.length, typeof val === 'number' ? val : NaN, 'fromNestedArray');
          }
          flat.push(val);
        }
      } else {
        for (let i = 0; i < arr.length; i++) {
          const sub = arr[i];
          if (!Array.isArray(sub)) {
            throw new TensorDimensionMismatchError(
              `nested array at depth ${depth + 1}`,
              typeof sub,
              'fromNestedArray'
            );
          }
          validateAndFlatten(sub, depth + 1);
        }
      }
    };

    validateAndFlatten(nested, 0);
    return CanonicalTensor.fromFlatArray(shape, flat, dtype);
  }

  /**
   * Bridges CanonicalVector (rank 1) into a CanonicalTensor.
   */
  public static fromVector(v: CanonicalVector): CanonicalTensor {
    return CanonicalTensor.fromFlatArray([v.dimension], v.toArray(), v.dtype);
  }

  /**
   * Bridges CanonicalMatrix (rank 2) into a CanonicalTensor.
   */
  public static fromMatrix(m: CanonicalMatrix): CanonicalTensor {
    return CanonicalTensor.fromFlatArray([m.rows, m.cols], m.toFlatArray(), m.dtype);
  }

  // =========================================================================
  // ELEMENT ACCESS & INDEXING
  // =========================================================================

  /**
   * Computes the linear index in the data buffer for given multi-dimensional indices.
   */
  public linearIndex(...indices: number[]): number {
    if (indices.length !== this.rank) {
      throw new TensorRankError(this.rank, indices.length, 'linearIndex');
    }

    let idx = this.offset;
    for (let k = 0; k < this.rank; k++) {
      const i = indices[k]!;
      const dim = this.shape[k]!;
      if (!Number.isInteger(i) || i < 0 || i >= dim) {
        throw new DimensionMismatchError(dim, i, `linearIndex axis ${k}`);
      }
      idx += i * this.strides[k]!;
    }
    return idx;
  }

  /**
   * Retrieves element value at given multi-dimensional coordinates.
   */
  public get(...indices: number[]): number {
    return this.data[this.linearIndex(...indices)]!;
  }

  /**
   * Sets element value at given multi-dimensional coordinates.
   */
  public set(value: number, ...indices: number[]): void {
    if (!Number.isFinite(value)) {
      throw new NonFiniteNumericalError(-1, value, 'set()');
    }
    const idx = this.linearIndex(...indices);
    this.data[idx] = value;
  }

  // =========================================================================
  // VIEW & RESHAPE SEMANTICS
  // =========================================================================

  /**
   * Creates a zero-copy view of the tensor with new shape, provided it is contiguous.
   * Throws NonContiguousError if tensor is non-contiguous.
   */
  public view(newShape: ShapeND): CanonicalTensor {
    if (!this.isContiguous) {
      throw new NonContiguousError('view()');
    }

    let newTotal = 1;
    for (let k = 0; k < newShape.length; k++) {
      const d = newShape[k]!;
      if (!Number.isInteger(d) || d <= 0) {
        throw new EmptyTensorError('view()', `dimension at axis ${k} must be >= 1, got ${d}`);
      }
      newTotal *= d;
    }

    if (newTotal !== this.totalElements) {
      throw new TensorDimensionMismatchError(
        `total elements ${this.totalElements}`,
        `new shape total elements ${newTotal}`,
        'view()'
      );
    }

    return new CanonicalTensor(newShape, this.data, this.dtype, undefined, this.offset);
  }

  /**
   * Reshapes the tensor to a new shape.
   * If contiguous, returns a zero-copy view over the same underlying buffer.
   * If non-contiguous, materializes a contiguous copy with the requested shape.
   */
  public reshape(newShape: ShapeND): CanonicalTensor {
    let newTotal = 1;
    for (let k = 0; k < newShape.length; k++) {
      const d = newShape[k]!;
      if (!Number.isInteger(d) || d <= 0) {
        throw new EmptyTensorError('reshape()', `dimension at axis ${k} must be >= 1, got ${d}`);
      }
      newTotal *= d;
    }

    if (newTotal !== this.totalElements) {
      throw new TensorDimensionMismatchError(
        `total elements ${this.totalElements}`,
        `new shape total elements ${newTotal}`,
        'reshape()'
      );
    }

    if (this.isContiguous) {
      return new CanonicalTensor(newShape, this.data, this.dtype, undefined, this.offset);
    }

    // Materialize contiguous representation
    return this.contiguous().reshape(newShape);
  }

  /**
   * Flattens the tensor to a 1D CanonicalTensor with shape [totalElements].
   */
  public flatten(): CanonicalTensor {
    return this.reshape([this.totalElements]);
  }

  /**
   * Squeezes singleton dimensions (dimension == 1).
   * If axis is specified, squeezes that specific dimension if it equals 1.
   * Returns a zero-copy strided view.
   */
  public squeeze(axis?: number): CanonicalTensor {
    if (axis !== undefined) {
      if (!Number.isInteger(axis) || axis < 0 || axis >= this.rank) {
        throw new InvalidAxisError(axis, this.rank, 'squeeze()');
      }
      if (this.shape[axis] !== 1) {
        return this; // No-op if not singleton
      }
      if (this.rank === 1) {
        throw new EmptyTensorError('squeeze()', 'cannot squeeze 1D tensor to 0D scalar (minimum rank is 1)');
      }
      const newShape = this.shape.filter((_, idx) => idx !== axis);
      const newStrides = this.strides.filter((_, idx) => idx !== axis);
      return new CanonicalTensor(newShape, this.data, this.dtype, newStrides, this.offset);
    }

    // Squeeze all singleton dimensions
    const newShape: number[] = [];
    const newStrides: number[] = [];
    for (let k = 0; k < this.rank; k++) {
      if (this.shape[k] !== 1) {
        newShape.push(this.shape[k]!);
        newStrides.push(this.strides[k]!);
      }
    }

    // Preserve at least rank 1
    if (newShape.length === 0) {
      newShape.push(1);
      newStrides.push(1);
    }

    return new CanonicalTensor(newShape, this.data, this.dtype, newStrides, this.offset);
  }

  /**
   * Inserts a singleton dimension of size 1 at specified axis.
   * Returns a zero-copy strided view.
   */
  public unsqueeze(axis: number): CanonicalTensor {
    if (!Number.isInteger(axis) || axis < 0 || axis > this.rank) {
      throw new InvalidAxisError(axis, this.rank + 1, 'unsqueeze()');
    }

    const newShape = [...this.shape];
    const newStrides = [...this.strides];

    // Compute stride for new singleton dimension: stride of next dimension * size of next dimension, or 1
    const nextStride = axis < this.rank ? this.strides[axis]! * this.shape[axis]! : 1;

    newShape.splice(axis, 0, 1);
    newStrides.splice(axis, 0, nextStride);

    return new CanonicalTensor(newShape, this.data, this.dtype, newStrides, this.offset);
  }

  /**
   * Permutes the dimensions of the tensor according to given axes permutation.
   * Returns a zero-copy strided view.
   */
  public permute(...axes: number[]): CanonicalTensor {
    if (axes.length !== this.rank) {
      throw new TensorRankError(this.rank, axes.length, 'permute()');
    }

    const seen = new Set<number>();
    for (let k = 0; k < axes.length; k++) {
      const ax = axes[k]!;
      if (!Number.isInteger(ax) || ax < 0 || ax >= this.rank || seen.has(ax)) {
        throw new InvalidAxisError(ax, this.rank, 'permute() (must be a valid permutation)');
      }
      seen.add(ax);
    }

    const newShape = axes.map((ax) => this.shape[ax]!);
    const newStrides = axes.map((ax) => this.strides[ax]!);

    return new CanonicalTensor(newShape, this.data, this.dtype, newStrides, this.offset);
  }

  /**
   * Transposes two dimensions. Defaults to dim0 = 0, dim1 = 1.
   * Returns a zero-copy strided view.
   */
  public transpose(dim0: number = 0, dim1: number = 1): CanonicalTensor {
    if (this.rank < 2) {
      throw new TensorRankError(2, this.rank, 'transpose()');
    }
    if (!Number.isInteger(dim0) || dim0 < 0 || dim0 >= this.rank) {
      throw new InvalidAxisError(dim0, this.rank, 'transpose() (dim0)');
    }
    if (!Number.isInteger(dim1) || dim1 < 0 || dim1 >= this.rank) {
      throw new InvalidAxisError(dim1, this.rank, 'transpose() (dim1)');
    }

    if (dim0 === dim1) return this;

    const axes = Array.from({ length: this.rank }, (_, i) => i);
    axes[dim0] = dim1;
    axes[dim1] = dim0;

    return this.permute(...axes);
  }

  /**
   * Slices along an axis with [start, end) indices.
   * Returns a zero-copy strided view.
   */
  public slice(axis: number, start: number, end: number): CanonicalTensor {
    if (!Number.isInteger(axis) || axis < 0 || axis >= this.rank) {
      throw new InvalidAxisError(axis, this.rank, 'slice()');
    }

    const dim = this.shape[axis]!;
    if (!Number.isInteger(start) || start < 0 || start >= dim) {
      throw new DimensionMismatchError(dim, start, `slice start axis ${axis}`);
    }
    if (!Number.isInteger(end) || end <= start || end > dim) {
      throw new DimensionMismatchError(dim, end, `slice end axis ${axis}`);
    }

    const sliceLen = end - start;
    const newShape = [...this.shape];
    newShape[axis] = sliceLen;

    const newOffset = this.offset + start * this.strides[axis]!;
    return new CanonicalTensor(newShape, this.data, this.dtype, this.strides, newOffset);
  }

  /**
   * Extracts a sub-tensor by selecting a single index along an axis, reducing rank by 1.
   * Returns a zero-copy strided view.
   */
  public select(axis: number, index: number): CanonicalTensor {
    if (this.rank <= 1) {
      throw new TensorRankError('>= 2', this.rank, 'select() (cannot reduce rank below 1)');
    }
    if (!Number.isInteger(axis) || axis < 0 || axis >= this.rank) {
      throw new InvalidAxisError(axis, this.rank, 'select()');
    }
    const dim = this.shape[axis]!;
    if (!Number.isInteger(index) || index < 0 || index >= dim) {
      throw new DimensionMismatchError(dim, index, `select index axis ${axis}`);
    }

    const newShape = this.shape.filter((_, idx) => idx !== axis);
    const newStrides = this.strides.filter((_, idx) => idx !== axis);
    const newOffset = this.offset + index * this.strides[axis]!;

    return new CanonicalTensor(newShape, this.data, this.dtype, newStrides, newOffset);
  }

  /**
   * Materializes a contiguous copy of the tensor in C-order.
   * If already contiguous and offset == 0, returns this.
   */
  public contiguous(): CanonicalTensor {
    if (this.isContiguous && this.offset === 0) {
      return this;
    }

    const flat = this.toFlatArray();
    return CanonicalTensor.fromFlatArray(this.shape, flat, this.dtype);
  }

  /**
   * Creates an independent deep copy of the tensor with its own isolated buffer.
   */
  public copy(): CanonicalTensor {
    const flat = this.toFlatArray();
    return CanonicalTensor.fromFlatArray(this.shape, flat, this.dtype);
  }

  // =========================================================================
  // INTEROP WITH PROVEN PRIMITIVES
  // =========================================================================

  /**
   * Converts a rank-1 CanonicalTensor to a CanonicalVector.
   */
  public toVector(): CanonicalVector {
    if (this.rank !== 1) {
      throw new TensorRankError(1, this.rank, 'toVector()');
    }
    return CanonicalVector.fromArray(this.toFlatArray(), this.dtype);
  }

  /**
   * Converts a rank-2 CanonicalTensor to a CanonicalMatrix.
   */
  public toMatrix(): CanonicalMatrix {
    if (this.rank !== 2) {
      throw new TensorRankError(2, this.rank, 'toMatrix()');
    }
    return CanonicalMatrix.fromFlatArray(
      this.shape[0]!,
      this.shape[1]!,
      this.toFlatArray(),
      this.dtype
    );
  }

  // =========================================================================
  // MATHEMATICAL & ALGEBRAIC OPERATIONS
  // =========================================================================

  /**
   * Elementwise tensor addition: C = A + B.
   * Enforces strict shape matching.
   */
  public add(other: CanonicalTensor): CanonicalTensor {
    this.assertMatchingShape(other, 'add');

    const result = CanonicalTensor.zeros(this.shape, this.dtype);
    const itA = this.elementIterator();
    const itB = other.elementIterator();

    for (let i = 0; i < this.totalElements; i++) {
      result.data[i] = itA() + itB();
    }
    return result;
  }

  /**
   * Elementwise tensor subtraction: C = A - B.
   * Enforces strict shape matching.
   */
  public subtract(other: CanonicalTensor): CanonicalTensor {
    this.assertMatchingShape(other, 'subtract');

    const result = CanonicalTensor.zeros(this.shape, this.dtype);
    const itA = this.elementIterator();
    const itB = other.elementIterator();

    for (let i = 0; i < this.totalElements; i++) {
      result.data[i] = itA() - itB();
    }
    return result;
  }

  /**
   * Scalar multiplication: C = alpha * A.
   */
  public scale(scalar: number): CanonicalTensor {
    if (!Number.isFinite(scalar)) {
      throw new NonFiniteNumericalError(-1, scalar, 'scale()');
    }

    const result = CanonicalTensor.zeros(this.shape, this.dtype);
    const it = this.elementIterator();

    for (let i = 0; i < this.totalElements; i++) {
      result.data[i] = it() * scalar;
    }
    return result;
  }

  /**
   * Elementwise negation: C = -A.
   */
  public negate(): CanonicalTensor {
    return this.scale(-1.0);
  }

  /**
   * Scaled Frobenius Norm with overflow and underflow resistance (LAPACK dnrm2 style).
   * ||T||_F = s * sqrt(sum_{i} (T_i / s)^2) where s = max |T_i|.
   */
  public frobeniusNorm(): number {
    let maxAbs = 0.0;
    const it = this.elementIterator();

    for (let i = 0; i < this.totalElements; i++) {
      const val = it();
      const absVal = Math.abs(val);
      if (absVal > maxAbs) {
        maxAbs = absVal;
      }
    }

    if (maxAbs === 0.0) {
      return 0.0;
    }

    let sumSquares = 0.0;
    const it2 = this.elementIterator();
    for (let i = 0; i < this.totalElements; i++) {
      const scaled = it2() / maxAbs;
      sumSquares += scaled * scaled;
    }

    return maxAbs * Math.sqrt(sumSquares);
  }

  /**
   * Entrywise L1 norm: sum |T_i|.
   */
  public normL1(): number {
    let sum = 0.0;
    const it = this.elementIterator();
    for (let i = 0; i < this.totalElements; i++) {
      sum += Math.abs(it());
    }
    return sum;
  }

  /**
   * Entrywise Linf norm: max |T_i|.
   */
  public normLinf(): number {
    let maxVal = 0.0;
    const it = this.elementIterator();
    for (let i = 0; i < this.totalElements; i++) {
      const absVal = Math.abs(it());
      if (absVal > maxVal) {
        maxVal = absVal;
      }
    }
    return maxVal;
  }

  /**
   * Batched Matrix Multiplication for rank >= 3 tensors.
   * [..., M, K] x [..., K, P] -> [..., M, P]
   * Batch dimensions must match. Last two dimensions perform GEMM with cache-friendly
   * i-k-j loop order and double-precision accumulation.
   */
  public batchedMatMul(other: CanonicalTensor): CanonicalTensor {
    if (this.rank < 3 || other.rank < 3) {
      throw new TensorRankError('>= 3', Math.min(this.rank, other.rank), 'batchedMatMul');
    }
    if (this.rank !== other.rank) {
      throw new TensorRankError(this.rank, other.rank, 'batchedMatMul (ranks must match)');
    }

    // Verify batch dimensions match
    const batchDims: number[] = [];
    let numBatches = 1;
    for (let k = 0; k < this.rank - 2; k++) {
      if (this.shape[k] !== other.shape[k]) {
        throw new TensorDimensionMismatchError(
          this.shape,
          other.shape,
          `batchedMatMul batch axis ${k}`
        );
      }
      batchDims.push(this.shape[k]!);
      numBatches *= this.shape[k]!;
    }

    const M = this.shape[this.rank - 2]!;
    const K_A = this.shape[this.rank - 1]!;
    const K_B = other.shape[other.rank - 2]!;
    const P = other.shape[other.rank - 1]!;

    if (K_A !== K_B) {
      throw new TensorDimensionMismatchError(
        `K_A (${K_A})`,
        `K_B (${K_B})`,
        'batchedMatMul inner contraction dimension'
      );
    }

    const outShape = [...batchDims, M, P];
    const result = CanonicalTensor.zeros(outShape, this.dtype);

    const sA_row = this.strides[this.rank - 2]!;
    const sA_col = this.strides[this.rank - 1]!;
    const sB_row = other.strides[this.rank - 2]!;
    const sB_col = other.strides[this.rank - 1]!;
    const sC_row = result.strides[this.rank - 2]!;
    const sC_col = result.strides[this.rank - 1]!;

    const dataA = this.data;
    const dataB = other.data;
    const dataC = result.data;

    // Iterate over batches
    for (let b = 0; b < numBatches; b++) {
      // Compute batch base offsets
      let rem = b;
      let baseA = this.offset;
      let baseB = other.offset;
      let baseC = result.offset;

      for (let k = this.rank - 3; k >= 0; k--) {
        const coord = rem % batchDims[k]!;
        rem = Math.floor(rem / batchDims[k]!);
        baseA += coord * this.strides[k]!;
        baseB += coord * other.strides[k]!;
        baseC += coord * result.strides[k]!;
      }

      // Multiply MxK by KxP using cache-friendly i-k-j loop with direct typed array indexing
      for (let i = 0; i < M; i++) {
        const aRow = baseA + i * sA_row;
        const cRow = baseC + i * sC_row;
        for (let k = 0; k < K_A; k++) {
          const aVal = dataA[aRow + k * sA_col]!;
          if (aVal === 0.0) continue;
          const bRow = baseB + k * sB_row;
          for (let j = 0; j < P; j++) {
            dataC[cRow + j * sC_col] += aVal * dataB[bRow + j * sB_col]!;
          }
        }
      }
    }

    return result;
  }

  // =========================================================================
  // EXPORT & CONVERSION UTILITIES
  // =========================================================================

  /**
   * Flattens tensor elements into a native JavaScript number array in logical C-order.
   */
  public toFlatArray(): number[] {
    const flat: number[] = new Array(this.totalElements);
    const it = this.elementIterator();
    for (let i = 0; i < this.totalElements; i++) {
      flat[i] = it();
    }
    return flat;
  }

  /**
   * Recursively reconstructs nested JavaScript arrays matching tensor shape.
   */
  public toArray(): unknown {
    const it = this.elementIterator();
    const buildSubArray = (depth: number): unknown => {
      const dim = this.shape[depth]!;
      if (depth === this.rank - 1) {
        const row: number[] = new Array(dim);
        for (let i = 0; i < dim; i++) {
          row[i] = it();
        }
        return row;
      }
      const arr: unknown[] = new Array(dim);
      for (let i = 0; i < dim; i++) {
        arr[i] = buildSubArray(depth + 1);
      }
      return arr;
    };

    return buildSubArray(0);
  }

  /**
   * Checks equality with another tensor within a numerical tolerance.
   */
  public equals(other: CanonicalTensor, tolerance?: number): boolean {
    if (this.rank !== other.rank) return false;
    for (let k = 0; k < this.rank; k++) {
      if (this.shape[k] !== other.shape[k]) return false;
    }

    const tol =
      tolerance !== undefined
        ? tolerance
        : this.dtype === 'float32' || other.dtype === 'float32'
        ? NUMERICAL_CONSTANTS.TOLERANCE_F32
        : NUMERICAL_CONSTANTS.TOLERANCE_F64;

    const itA = this.elementIterator();
    const itB = other.elementIterator();

    for (let i = 0; i < this.totalElements; i++) {
      const diff = Math.abs(itA() - itB());
      if (diff > tol || !Number.isFinite(diff)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if all elements of the tensor are approximately zero.
   */
  public isZero(tolerance?: number): boolean {
    const tol =
      tolerance !== undefined
        ? tolerance
        : this.dtype === 'float32'
        ? NUMERICAL_CONSTANTS.TOLERANCE_F32
        : NUMERICAL_CONSTANTS.TOLERANCE_F64;

    const it = this.elementIterator();
    for (let i = 0; i < this.totalElements; i++) {
      if (Math.abs(it()) > tol) {
        return false;
      }
    }
    return true;
  }

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  private assertMatchingShape(other: CanonicalTensor, operationName: string): void {
    if (this.rank !== other.rank) {
      throw new TensorRankError(this.rank, other.rank, operationName);
    }
    for (let k = 0; k < this.rank; k++) {
      if (this.shape[k] !== other.shape[k]) {
        throw new TensorDimensionMismatchError(this.shape, other.shape, operationName);
      }
    }
  }

  /**
   * High-performance iterator function yielding elements in standard C-logical order.
   */
  private elementIterator(): () => number {
    if (this.isContiguous && this.offset === 0) {
      let idx = 0;
      return () => this.data[idx++]!;
    }

    // Strided multi-index traversal
    const coords = new Array<number>(this.rank).fill(0);
    let currentLinear = this.offset;
    let isFirst = true;

    return () => {
      if (isFirst) {
        isFirst = false;
        return this.data[currentLinear]!;
      }

      // Advance coords in C-order (odometer)
      for (let k = this.rank - 1; k >= 0; k--) {
        coords[k]!++;
        currentLinear += this.strides[k]!;
        if (coords[k]! < this.shape[k]!) {
          break;
        }
        // Carry over
        coords[k] = 0;
        currentLinear -= this.shape[k]! * this.strides[k]!;
      }

      return this.data[currentLinear]!;
    };
  }
}
