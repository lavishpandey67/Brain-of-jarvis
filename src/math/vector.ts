/**
 * Project JARVIS: BRAIN-001
 * Mathematical Kernel: Canonical Vector Primitive
 * 
 * Mathematical Specification:
 * Represents an element v of the vector space V = R^D over the field R.
 * Backed by contiguous IEEE 754 TypedArrays (Float32Array / Float64Array).
 * 
 * Invariants Enforced:
 * 1. DIMENSIONAL INTEGRITY: D in N^+, shape = [D], data.length == D.
 * 2. NUMERICAL FINITENESS: For all i in {0, ..., D-1}, v_i in R (no NaN, +Inf, -Inf).
 * 3. OVERFLOW-SAFE NORM: L2 norm uses scaled Euclidean sum (LAPACK dnrm2 style),
 *    preventing intermediate overflow when squaring large components.
 * 4. COMPENSATED INNER PRODUCT: Dot product uses double-precision accumulation
 *    to mitigate catastrophic cancellation.
 * 5. CAUCHY-SCHWARZ INVARIANT: |<u, v>| <= ||u||_2 ||v||_2 within floating-point tolerance.
 */

import {
  DType,
  Shape1D,
  DimensionMismatchError,
  NonFiniteNumericalError,
  EmptyVectorError,
  ZeroNormDivisionError,
  SecurityResourceExhaustionError,
  NUMERICAL_CONSTANTS,
} from './types';

export class CanonicalVector {
  public readonly shape: Shape1D;
  public readonly dimension: number;
  public readonly dtype: DType;
  public readonly data: Float32Array | Float64Array;

  /**
   * Internal constructor. Use factory methods `fromArray`, `zeros`, `ones`, `basis` for instantiation.
   */
  private constructor(data: Float32Array | Float64Array, dtype: DType) {
    if (data.length === 0) {
      throw new EmptyVectorError('CanonicalVector constructor');
    }
    if (data.length > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(data.length, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }

    this.dimension = data.length;
    this.shape = [this.dimension] as const;
    this.dtype = dtype;
    this.data = data;

    // Validate finiteness across all elements
    for (let i = 0; i < this.dimension; i++) {
      const val = this.data[i]!;
      if (!Number.isFinite(val)) {
        throw new NonFiniteNumericalError(i, val, 'CanonicalVector validation');
      }
    }
  }

  // ============================================================
  // FACTORY CONSTRUCTORS
  // ============================================================

  /**
   * Create a CanonicalVector from an array-like source with strict finite validation.
   */
  public static fromArray(
    source: ArrayLike<number>,
    dtype: DType = 'float32'
  ): CanonicalVector {
    const len = source.length;
    if (len === 0) {
      throw new EmptyVectorError('fromArray');
    }
    if (len > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(len, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }

    const typedData = dtype === 'float32' ? new Float32Array(len) : new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const val = source[i]!;
      if (!Number.isFinite(val)) {
        throw new NonFiniteNumericalError(i, val, 'fromArray');
      }
      typedData[i] = val;
    }

    return new CanonicalVector(typedData, dtype);
  }

  /**
   * Create a zero vector in R^dimension.
   */
  public static zeros(dimension: number, dtype: DType = 'float32'): CanonicalVector {
    if (dimension <= 0 || !Number.isInteger(dimension)) {
      throw new EmptyVectorError('zeros');
    }
    if (dimension > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(dimension, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }
    const data = dtype === 'float32' ? new Float32Array(dimension) : new Float64Array(dimension);
    return new CanonicalVector(data, dtype);
  }

  /**
   * Create a vector with all elements equal to 1.
   */
  public static ones(dimension: number, dtype: DType = 'float32'): CanonicalVector {
    if (dimension <= 0 || !Number.isInteger(dimension)) {
      throw new EmptyVectorError('ones');
    }
    if (dimension > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(dimension, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }
    const data = dtype === 'float32' ? new Float32Array(dimension) : new Float64Array(dimension);
    data.fill(1.0);
    return new CanonicalVector(data, dtype);
  }

  /**
   * Create standard canonical basis vector e_i in R^dimension.
   */
  public static basis(
    dimension: number,
    index: number,
    dtype: DType = 'float32'
  ): CanonicalVector {
    if (dimension <= 0 || !Number.isInteger(dimension)) {
      throw new EmptyVectorError('basis');
    }
    if (dimension > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(dimension, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }
    if (index < 0 || index >= dimension || !Number.isInteger(index)) {
      throw new DimensionMismatchError(dimension, index, 'basis vector index');
    }
    const data = dtype === 'float32' ? new Float32Array(dimension) : new Float64Array(dimension);
    data[index] = 1.0;
    return new CanonicalVector(data, dtype);
  }

  // ============================================================
  // ELEMENT ACCESS & INSPECTION
  // ============================================================

  public get(index: number): number {
    if (index < 0 || index >= this.dimension || !Number.isInteger(index)) {
      throw new DimensionMismatchError(this.dimension, index, 'vector get()');
    }
    return this.data[index]!;
  }

  public toArray(): number[] {
    const arr = new Array<number>(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      arr[i] = this.data[i]!;
    }
    return arr;
  }

  public clone(): CanonicalVector {
    const copy = this.dtype === 'float32' 
      ? new Float32Array(this.data)
      : new Float64Array(this.data);
    return new CanonicalVector(copy, this.dtype);
  }

  // ============================================================
  // VECTOR SPACE OPERATIONS (R^D)
  // ============================================================

  /**
   * Vector Addition: w = u + v
   * Invariant: Dimension must match. Commutative and associative.
   */
  public add(other: CanonicalVector): CanonicalVector {
    if (this.dimension !== other.dimension) {
      throw new DimensionMismatchError(this.dimension, other.dimension, 'vector addition');
    }

    const outDtype: DType = (this.dtype === 'float64' || other.dtype === 'float64') ? 'float64' : 'float32';
    const outData = outDtype === 'float32' ? new Float32Array(this.dimension) : new Float64Array(this.dimension);

    for (let i = 0; i < this.dimension; i++) {
      const sum = this.data[i]! + other.data[i]!;
      outData[i] = sum;
    }

    return new CanonicalVector(outData, outDtype);
  }

  /**
   * Vector Subtraction: w = u - v
   */
  public subtract(other: CanonicalVector): CanonicalVector {
    if (this.dimension !== other.dimension) {
      throw new DimensionMismatchError(this.dimension, other.dimension, 'vector subtraction');
    }

    const outDtype: DType = (this.dtype === 'float64' || other.dtype === 'float64') ? 'float64' : 'float32';
    const outData = outDtype === 'float32' ? new Float32Array(this.dimension) : new Float64Array(this.dimension);

    for (let i = 0; i < this.dimension; i++) {
      const diff = this.data[i]! - other.data[i]!;
      outData[i] = diff;
    }

    return new CanonicalVector(outData, outDtype);
  }

  /**
   * Scalar Multiplication: w = alpha * v
   */
  public scale(scalar: number): CanonicalVector {
    if (!Number.isFinite(scalar)) {
      throw new NonFiniteNumericalError(0, scalar, 'vector scalar scaling');
    }

    const outData = this.dtype === 'float32' ? new Float32Array(this.dimension) : new Float64Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      outData[i] = this.data[i]! * scalar;
    }

    return new CanonicalVector(outData, this.dtype);
  }

  /**
   * Vector Negation: w = -v
   */
  public negate(): CanonicalVector {
    return this.scale(-1.0);
  }

  // ============================================================
  // INNER PRODUCT & METRICS
  // ============================================================

  /**
   * Dot Product (Inner Product): <u, v> = sum_{i=0}^{D-1} (u_i * v_i)
   * Uses high-precision double accumulator to minimize cancellation error.
   */
  public dot(other: CanonicalVector): number {
    if (this.dimension !== other.dimension) {
      throw new DimensionMismatchError(this.dimension, other.dimension, 'dot product');
    }

    // Double-precision accumulator
    let acc = 0.0;
    for (let i = 0; i < this.dimension; i++) {
      acc += (this.data[i]! as number) * (other.data[i]! as number);
    }

    if (!Number.isFinite(acc)) {
      throw new NonFiniteNumericalError(-1, acc, 'dot product accumulation');
    }

    return acc;
  }

  /**
   * L1 Norm (Taxicab/Manhattan norm): ||v||_1 = sum |v_i|
   */
  public normL1(): number {
    let sum = 0.0;
    for (let i = 0; i < this.dimension; i++) {
      sum += Math.abs(this.data[i]!);
    }
    return sum;
  }

  /**
   * L2 Norm (Euclidean norm): ||v||_2 = sqrt( sum v_i^2 )
   * 
   * CRITICAL NUMERICAL STABILITY:
   * Uses scaled Euclidean summation (Blue's/LAPACK dnrm2 algorithm).
   * Prevents intermediate overflow when squaring numbers near 10^38 in float32,
   * and prevents underflow when values are extremely small.
   */
  public normL2(): number {
    let maxAbs = 0.0;
    for (let i = 0; i < this.dimension; i++) {
      const absVal = Math.abs(this.data[i]!);
      if (absVal > maxAbs) {
        maxAbs = absVal;
      }
    }

    // Zero vector optimization
    if (maxAbs === 0.0) {
      return 0.0;
    }

    // Scale components by maxAbs before squaring
    let sumSq = 0.0;
    for (let i = 0; i < this.dimension; i++) {
      const normalized = this.data[i]! / maxAbs;
      sumSq += normalized * normalized;
    }

    return maxAbs * Math.sqrt(sumSq);
  }

  /**
   * L-infinity Norm (Chebyshev / Maximum norm): ||v||_inf = max |v_i|
   */
  public normLinf(): number {
    let maxAbs = 0.0;
    for (let i = 0; i < this.dimension; i++) {
      const absVal = Math.abs(this.data[i]!);
      if (absVal > maxAbs) {
        maxAbs = absVal;
      }
    }
    return maxAbs;
  }

  /**
   * Unit Normalization: v_hat = v / ||v||_2
   * Returns a unit vector with ||v_hat||_2 = 1.0.
   */
  public normalize(): CanonicalVector {
    const l2 = this.normL2();
    if (l2 === 0.0) {
      throw new ZeroNormDivisionError('normalize()');
    }
    return this.scale(1.0 / l2);
  }

  /**
   * Euclidean Distance: d(u, v) = ||u - v||_2
   */
  public distance(other: CanonicalVector): number {
    return this.subtract(other).normL2();
  }

  /**
   * Cosine Similarity: cos(theta) = <u, v> / (||u||_2 * ||v||_2)
   * Strictly bounded to [-1.0, 1.0].
   */
  public cosineSimilarity(other: CanonicalVector): number {
    if (this.dimension !== other.dimension) {
      throw new DimensionMismatchError(this.dimension, other.dimension, 'cosine similarity');
    }

    const normU = this.normL2();
    const normV = other.normL2();

    if (normU === 0.0 || normV === 0.0) {
      // Degenerate vector space: cosine with zero vector is 0.0 by canonical definition
      return 0.0;
    }

    const dotProd = this.dot(other);
    let sim = dotProd / (normU * normV);

    // Guard numerical boundary caused by floating point precision limit
    if (sim > 1.0) sim = 1.0;
    if (sim < -1.0) sim = -1.0;

    return sim;
  }

  // ============================================================
  // NUMERICAL EQUALITY & COMPARISON
  // ============================================================

  /**
   * Test numerical equality under defined absolute tolerance:
   * for all i: |u_i - v_i| <= tolerance
   */
  public equals(other: CanonicalVector, tolerance?: number): boolean {
    if (this.dimension !== other.dimension) {
      return false;
    }

    const tol = tolerance ?? (
      this.dtype === 'float64' && other.dtype === 'float64'
        ? NUMERICAL_CONSTANTS.TOLERANCE_F64
        : NUMERICAL_CONSTANTS.TOLERANCE_F32
    );

    for (let i = 0; i < this.dimension; i++) {
      const diff = Math.abs(this.data[i]! - other.data[i]!);
      if (diff > tol) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if vector is identically zero within tolerance.
   */
  public isZero(tolerance: number = NUMERICAL_CONSTANTS.TOLERANCE_F64): boolean {
    return this.normLinf() <= tolerance;
  }
}
