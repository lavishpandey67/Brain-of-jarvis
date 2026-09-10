/**
 * Project JARVIS: BRAIN-001
 * Mathematical Kernel: Canonical Matrix Primitive
 * 
 * Mathematical Specification:
 * Represents an element A of the vector space of m x n matrices M_{m,n}(R) over R.
 * Backed by contiguous IEEE 754 TypedArrays (Float32Array / Float64Array) in row-major layout.
 * 
 * Invariants Enforced:
 * 1. 2D DIMENSIONAL INTEGRITY: m, n in N^+, shape = [m, n], strides = [n, 1], data.length == m * n.
 * 2. ROW-MAJOR STORAGE INVARIANT: Element A_{i,j} is stored at linear index (i * n + j).
 * 3. NUMERICAL FINITENESS: For all i, j, A_{i,j} in R (no NaN, +Inf, -Inf).
 * 4. OVERFLOW-SAFE FROBENIUS NORM: Uses scaled sum-of-squares (LAPACK style)
 *    s * sqrt(sum (A_{i,j}/s)^2) to prevent intermediate overflow on large elements.
 * 5. COMPENSATED GEMM & GEMV: Uses double-precision accumulators and cache-friendly
 *    loop order (i-k-j) for matrix multiplication.
 * 6. BOUNDS & SHAPE VALIDATION: Strict validation on all binary operations, vector mappings,
 *    and element indices.
 */

import {
  DType,
  Shape2D,
  Strides2D,
  EmptyMatrixError,
  MatrixDimensionMismatchError,
  DimensionMismatchError,
  NonFiniteNumericalError,
  SecurityResourceExhaustionError,
  NUMERICAL_CONSTANTS,
} from './types';
import { CanonicalVector } from './vector';

export class CanonicalMatrix {
  public readonly rows: number;
  public readonly cols: number;
  public readonly shape: Shape2D;
  public readonly strides: Strides2D;
  public readonly dtype: DType;
  public readonly data: Float32Array | Float64Array;

  /**
   * Internal constructor. Use factory methods `from2DArray`, `fromFlatArray`, `zeros`, `ones`, `eye`, `diag` for instantiation.
   */
  private constructor(
    rows: number,
    cols: number,
    data: Float32Array | Float64Array,
    dtype: DType
  ) {
    if (rows <= 0 || !Number.isInteger(rows) || cols <= 0 || !Number.isInteger(cols)) {
      throw new EmptyMatrixError('CanonicalMatrix constructor');
    }

    const totalElements = rows * cols;
    if (totalElements > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(totalElements, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }

    if (data.length !== totalElements) {
      throw new MatrixDimensionMismatchError(
        [rows, cols],
        `data length ${data.length}` as any,
        'CanonicalMatrix constructor'
      );
    }

    this.rows = rows;
    this.cols = cols;
    this.shape = [rows, cols] as const;
    this.strides = [cols, 1] as const;
    this.dtype = dtype;
    this.data = data;

    // Validate numerical finiteness for every element
    for (let i = 0; i < totalElements; i++) {
      const val = this.data[i]!;
      if (!Number.isFinite(val)) {
        throw new NonFiniteNumericalError(i, val, 'CanonicalMatrix validation');
      }
    }
  }

  // ============================================================
  // FACTORY CONSTRUCTORS
  // ============================================================

  /**
   * Constructs a CanonicalMatrix from a 2D array of numbers.
   * Validates rectangular shape (all rows must have identical column count).
   */
  public static from2DArray(
    elements: number[][],
    dtype: DType = 'float32'
  ): CanonicalMatrix {
    if (!elements || elements.length === 0) {
      throw new EmptyMatrixError('from2DArray');
    }

    const rows = elements.length;
    const firstRow = elements[0];
    if (!firstRow || firstRow.length === 0) {
      throw new EmptyMatrixError('from2DArray');
    }

    const cols = firstRow.length;

    // Validate that every row has the exact same number of columns (rectangularity)
    for (let i = 1; i < rows; i++) {
      const row = elements[i];
      if (!row || row.length !== cols) {
        throw new MatrixDimensionMismatchError(
          [rows, cols],
          `row ${i} length ${row ? row.length : 0}` as any,
          'from2DArray rectangular validation'
        );
      }
    }

    const totalElements = rows * cols;
    if (totalElements > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(totalElements, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }

    const typedData = dtype === 'float32' ? new Float32Array(totalElements) : new Float64Array(totalElements);
    let idx = 0;
    for (let i = 0; i < rows; i++) {
      const row = elements[i]!;
      for (let j = 0; j < cols; j++) {
        const val = row[j]!;
        if (!Number.isFinite(val)) {
          throw new NonFiniteNumericalError(idx, val, 'from2DArray');
        }
        typedData[idx++] = val;
      }
    }

    return new CanonicalMatrix(rows, cols, typedData, dtype);
  }

  /**
   * Constructs a CanonicalMatrix from a flat array-like buffer.
   */
  public static fromFlatArray(
    rows: number,
    cols: number,
    elements: ArrayLike<number>,
    dtype: DType = 'float32'
  ): CanonicalMatrix {
    if (rows <= 0 || !Number.isInteger(rows) || cols <= 0 || !Number.isInteger(cols)) {
      throw new EmptyMatrixError('fromFlatArray');
    }

    const totalElements = rows * cols;
    if (elements.length !== totalElements) {
      throw new MatrixDimensionMismatchError(
        [rows, cols],
        `flat elements length ${elements.length}` as any,
        'fromFlatArray'
      );
    }

    if (totalElements > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(totalElements, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }

    const typedData = dtype === 'float32' ? new Float32Array(totalElements) : new Float64Array(totalElements);
    for (let i = 0; i < totalElements; i++) {
      const val = elements[i]!;
      if (!Number.isFinite(val)) {
        throw new NonFiniteNumericalError(i, val, 'fromFlatArray');
      }
      typedData[i] = val;
    }

    return new CanonicalMatrix(rows, cols, typedData, dtype);
  }

  /**
   * Constructs an all-zeros CanonicalMatrix of shape [rows, cols].
   */
  public static zeros(
    rows: number,
    cols: number,
    dtype: DType = 'float32'
  ): CanonicalMatrix {
    if (rows <= 0 || !Number.isInteger(rows) || cols <= 0 || !Number.isInteger(cols)) {
      throw new EmptyMatrixError('zeros');
    }
    const totalElements = rows * cols;
    if (totalElements > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(totalElements, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }
    const data = dtype === 'float32' ? new Float32Array(totalElements) : new Float64Array(totalElements);
    return new CanonicalMatrix(rows, cols, data, dtype);
  }

  /**
   * Constructs an all-ones CanonicalMatrix of shape [rows, cols].
   */
  public static ones(
    rows: number,
    cols: number,
    dtype: DType = 'float32'
  ): CanonicalMatrix {
    if (rows <= 0 || !Number.isInteger(rows) || cols <= 0 || !Number.isInteger(cols)) {
      throw new EmptyMatrixError('ones');
    }
    const totalElements = rows * cols;
    if (totalElements > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(totalElements, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }
    const data = dtype === 'float32' ? new Float32Array(totalElements) : new Float64Array(totalElements);
    data.fill(1.0);
    return new CanonicalMatrix(rows, cols, data, dtype);
  }

  /**
   * Constructs an identity matrix I_n of shape [size, size].
   */
  public static eye(
    size: number,
    dtype: DType = 'float32'
  ): CanonicalMatrix {
    if (size <= 0 || !Number.isInteger(size)) {
      throw new EmptyMatrixError('eye');
    }
    const totalElements = size * size;
    if (totalElements > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(totalElements, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }
    const data = dtype === 'float32' ? new Float32Array(totalElements) : new Float64Array(totalElements);
    for (let i = 0; i < size; i++) {
      data[i * size + i] = 1.0;
    }
    return new CanonicalMatrix(size, size, data, dtype);
  }

  /**
   * Constructs a diagonal matrix from a vector or array of numbers.
   */
  public static diag(
    diagonal: CanonicalVector | number[],
    dtype: DType = 'float32'
  ): CanonicalMatrix {
    const values = Array.isArray(diagonal) ? diagonal : diagonal.toArray();
    const size = values.length;
    if (size <= 0) {
      throw new EmptyMatrixError('diag');
    }
    const mat = CanonicalMatrix.zeros(size, size, dtype);
    for (let i = 0; i < size; i++) {
      const val = values[i]!;
      if (!Number.isFinite(val)) {
        throw new NonFiniteNumericalError(i, val, 'diag');
      }
      mat.data[i * size + i] = val;
    }
    return mat;
  }

  // ============================================================
  // ELEMENT ACCESS & INSPECTION
  // ============================================================

  /**
   * Returns element A_{row, col} at given row and column.
   * Enforces row-major index invariant: index = row * cols + col.
   */
  public get(row: number, col: number): number {
    if (row < 0 || row >= this.rows || !Number.isInteger(row)) {
      throw new DimensionMismatchError(this.rows, row, `CanonicalMatrix get() row index`);
    }
    if (col < 0 || col >= this.cols || !Number.isInteger(col)) {
      throw new DimensionMismatchError(this.cols, col, `CanonicalMatrix get() col index`);
    }
    return this.data[row * this.cols + col]!;
  }

  /**
   * Extracts a row as a CanonicalVector.
   */
  public getRow(row: number): CanonicalVector {
    if (row < 0 || row >= this.rows || !Number.isInteger(row)) {
      throw new DimensionMismatchError(this.rows, row, 'getRow');
    }
    const rowStart = row * this.cols;
    const rowSlice = this.data.subarray(rowStart, rowStart + this.cols);
    const rowCopy = this.dtype === 'float32' ? new Float32Array(rowSlice) : new Float64Array(rowSlice);
    // CanonicalVector constructor via fromArray
    return CanonicalVector.fromArray(rowCopy, this.dtype);
  }

  /**
   * Extracts a column as a CanonicalVector.
   */
  public getCol(col: number): CanonicalVector {
    if (col < 0 || col >= this.cols || !Number.isInteger(col)) {
      throw new DimensionMismatchError(this.cols, col, 'getCol');
    }
    const colData = this.dtype === 'float32' ? new Float32Array(this.rows) : new Float64Array(this.rows);
    for (let i = 0; i < this.rows; i++) {
      colData[i] = this.data[i * this.cols + col]!;
    }
    return CanonicalVector.fromArray(colData, this.dtype);
  }

  /**
   * Returns a copy of the matrix as a nested JavaScript 2D array.
   */
  public to2DArray(): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: number[] = [];
      const rowOffset = i * this.cols;
      for (let j = 0; j < this.cols; j++) {
        row.push(this.data[rowOffset + j]!);
      }
      result.push(row);
    }
    return result;
  }

  /**
   * Returns a copy of the contiguous flat buffer as a JavaScript array.
   */
  public toFlatArray(): number[] {
    const result = new Array<number>(this.data.length);
    for (let i = 0; i < this.data.length; i++) {
      result[i] = this.data[i]!;
    }
    return result;
  }

  /**
   * Deep copy of the matrix with isolated backing memory.
   */
  public copy(): CanonicalMatrix {
    const clonedData = this.dtype === 'float32' ? new Float32Array(this.data) : new Float64Array(this.data);
    return new CanonicalMatrix(this.rows, this.cols, clonedData, this.dtype);
  }

  // ============================================================
  // MATRIX ALGEBRA OPERATIONS
  // ============================================================

  /**
   * Matrix addition C = A + B.
   * Requires A.shape == B.shape.
   */
  public add(other: CanonicalMatrix): CanonicalMatrix {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new MatrixDimensionMismatchError(this.shape, other.shape, 'matrix addition (add)');
    }

    const outDtype: DType = this.dtype === 'float64' || other.dtype === 'float64' ? 'float64' : 'float32';
    const len = this.data.length;
    const outData = outDtype === 'float32' ? new Float32Array(len) : new Float64Array(len);

    for (let i = 0; i < len; i++) {
      outData[i] = this.data[i]! + other.data[i]!;
    }

    return new CanonicalMatrix(this.rows, this.cols, outData, outDtype);
  }

  /**
   * Matrix subtraction C = A - B.
   * Requires A.shape == B.shape.
   */
  public subtract(other: CanonicalMatrix): CanonicalMatrix {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new MatrixDimensionMismatchError(this.shape, other.shape, 'matrix subtraction (subtract)');
    }

    const outDtype: DType = this.dtype === 'float64' || other.dtype === 'float64' ? 'float64' : 'float32';
    const len = this.data.length;
    const outData = outDtype === 'float32' ? new Float32Array(len) : new Float64Array(len);

    for (let i = 0; i < len; i++) {
      outData[i] = this.data[i]! - other.data[i]!;
    }

    return new CanonicalMatrix(this.rows, this.cols, outData, outDtype);
  }

  /**
   * Scalar multiplication C = alpha * A.
   */
  public scale(scalar: number): CanonicalMatrix {
    if (!Number.isFinite(scalar)) {
      throw new NonFiniteNumericalError(0, scalar, 'scale scalar operand');
    }

    const len = this.data.length;
    const outData = this.dtype === 'float32' ? new Float32Array(len) : new Float64Array(len);

    for (let i = 0; i < len; i++) {
      outData[i] = this.data[i]! * scalar;
    }

    return new CanonicalMatrix(this.rows, this.cols, outData, this.dtype);
  }

  /**
   * Matrix negation C = -A.
   */
  public negate(): CanonicalMatrix {
    return this.scale(-1.0);
  }

  /**
   * Matrix-Vector multiplication y = A * x.
   * For A in R^{m x n}, requires x in R^n, produces y in R^m.
   * Uses double-precision accumulation for numerical stability.
   */
  public multiplyVector(vector: CanonicalVector): CanonicalVector {
    if (this.cols !== vector.dimension) {
      throw new DimensionMismatchError(this.cols, vector.dimension, 'multiplyVector (A.cols == vector.dimension)');
    }

    const outDtype: DType = this.dtype === 'float64' || vector.dtype === 'float64' ? 'float64' : 'float32';
    const outData = outDtype === 'float32' ? new Float32Array(this.rows) : new Float64Array(this.rows);

    const m = this.rows;
    const n = this.cols;
    const aData = this.data;
    const xData = vector.data;

    for (let i = 0; i < m; i++) {
      let sum = 0.0;
      const rowOffset = i * n;
      for (let j = 0; j < n; j++) {
        sum += aData[rowOffset + j]! * xData[j]!;
      }
      outData[i] = sum;
    }

    return CanonicalVector.fromArray(outData, outDtype);
  }

  /**
   * Matrix-Matrix multiplication C = A * B (GEMM).
   * For A in R^{m x k} and B in R^{k x p}, produces C in R^{m x p}.
   * Requires A.cols == B.rows.
   * 
   * Implementation:
   * Uses cache-friendly i-k-j loop ordering for optimal memory locality on row-major buffers,
   * coupled with double-precision accumulation.
   */
  public multiply(other: CanonicalMatrix): CanonicalMatrix {
    if (this.cols !== other.rows) {
      throw new MatrixDimensionMismatchError(
        [this.rows, this.cols],
        [other.rows, other.cols],
        'matrix multiplication (multiply: A.cols must equal B.rows)'
      );
    }

    const m = this.rows;
    const k = this.cols;
    const p = other.cols;

    const totalOut = m * p;
    if (totalOut > NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION) {
      throw new SecurityResourceExhaustionError(totalOut, NUMERICAL_CONSTANTS.MAX_SAFE_DIMENSION);
    }

    const outDtype: DType = this.dtype === 'float64' || other.dtype === 'float64' ? 'float64' : 'float32';
    // Use Float64Array accumulator buffer during GEMM for double precision stability
    const accum = new Float64Array(totalOut);

    const aData = this.data;
    const bData = other.data;

    // Cache-friendly i-k-j loop order:
    // Outer loop over row i of A
    // Middle loop over inner dimension k
    // Inner loop over col j of B (contiguous streaming access in row-major memory!)
    for (let i = 0; i < m; i++) {
      const aRowOffset = i * k;
      const cRowOffset = i * p;

      for (let kk = 0; kk < k; kk++) {
        const aVal = aData[aRowOffset + kk]!;
        if (aVal === 0.0) continue; // Sparse skip optimization

        const bRowOffset = kk * p;
        for (let j = 0; j < p; j++) {
          accum[cRowOffset + j] += aVal * bData[bRowOffset + j]!;
        }
      }
    }

    const outData = outDtype === 'float32' ? new Float32Array(totalOut) : new Float64Array(totalOut);
    for (let idx = 0; idx < totalOut; idx++) {
      outData[idx] = accum[idx]!;
    }

    return new CanonicalMatrix(m, p, outData, outDtype);
  }

  /**
   * Matrix Transpose C = A^T.
   * For A in R^{m x n}, produces A^T in R^{n x m}.
   */
  public transpose(): CanonicalMatrix {
    const m = this.rows;
    const n = this.cols;
    const len = this.data.length;
    const outData = this.dtype === 'float32' ? new Float32Array(len) : new Float64Array(len);

    const srcData = this.data;
    for (let i = 0; i < m; i++) {
      const rowOffset = i * n;
      for (let j = 0; j < n; j++) {
        outData[j * m + i] = srcData[rowOffset + j]!;
      }
    }

    return new CanonicalMatrix(n, m, outData, this.dtype);
  }

  /**
   * Trace of a square matrix: tr(A) = sum_{i=0}^{n-1} A_{i,i}.
   * Throws MatrixDimensionMismatchError if matrix is non-square.
   */
  public trace(): number {
    if (this.rows !== this.cols) {
      throw new MatrixDimensionMismatchError(
        [this.rows, this.rows],
        this.shape,
        'trace (requires square matrix)'
      );
    }

    let sum = 0.0;
    const n = this.rows;
    for (let i = 0; i < n; i++) {
      sum += this.data[i * n + i]!;
    }
    return sum;
  }

  // ============================================================
  // MATRIX NORMS
  // ============================================================

  /**
   * Scaled Frobenius norm ||A||_F = sqrt(sum_{i,j} A_{i,j}^2).
   * 
   * Uses scaled sum-of-squares (LAPACK style) to prevent intermediate
   * floating-point overflow on large values and underflow on subnormals:
   * ||A||_F = s * sqrt(sum_{i,j} (A_{i,j} / s)^2) where s = max_{i,j} |A_{i,j}|.
   */
  public frobeniusNorm(): number {
    const len = this.data.length;
    let maxAbs = 0.0;

    for (let i = 0; i < len; i++) {
      const absVal = Math.abs(this.data[i]!);
      if (absVal > maxAbs) {
        maxAbs = absVal;
      }
    }

    if (maxAbs === 0.0) {
      return 0.0;
    }

    let sumSq = 0.0;
    for (let i = 0; i < len; i++) {
      const normalized = this.data[i]! / maxAbs;
      sumSq += normalized * normalized;
    }

    return maxAbs * Math.sqrt(sumSq);
  }

  /**
   * Matrix 1-norm (maximum absolute column sum): ||A||_1 = max_j sum_i |A_{i,j}|.
   */
  public normL1(): number {
    const m = this.rows;
    const n = this.cols;
    let maxColSum = 0.0;

    for (let j = 0; j < n; j++) {
      let colSum = 0.0;
      for (let i = 0; i < m; i++) {
        colSum += Math.abs(this.data[i * n + j]!);
      }
      if (colSum > maxColSum) {
        maxColSum = colSum;
      }
    }

    return maxColSum;
  }

  /**
   * Matrix infinity-norm (maximum absolute row sum): ||A||_inf = max_i sum_j |A_{i,j}|.
   */
  public normLinf(): number {
    const m = this.rows;
    const n = this.cols;
    let maxRowSum = 0.0;

    for (let i = 0; i < m; i++) {
      let rowSum = 0.0;
      const rowOffset = i * n;
      for (let j = 0; j < n; j++) {
        rowSum += Math.abs(this.data[rowOffset + j]!);
      }
      if (rowSum > maxRowSum) {
        maxRowSum = rowSum;
      }
    }

    return maxRowSum;
  }

  // ============================================================
  // PREDICATES & PROPERTIES
  // ============================================================

  /**
   * True if rows === cols.
   */
  public isSquare(): boolean {
    return this.rows === this.cols;
  }

  /**
   * True if A is symmetric: A == A^T within given numerical tolerance.
   */
  public isSymmetric(tolerance?: number): boolean {
    if (!this.isSquare()) return false;
    const tol = tolerance ?? (this.dtype === 'float32' ? NUMERICAL_CONSTANTS.TOLERANCE_F32 : NUMERICAL_CONSTANTS.TOLERANCE_F64);
    const n = this.rows;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const diff = Math.abs(this.data[i * n + j]! - this.data[j * n + i]!);
        if (diff > tol) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Compares two matrices for numerical equality within specified tolerance.
   */
  public equals(other: CanonicalMatrix, tolerance?: number): boolean {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      return false;
    }
    const tol = tolerance ?? (this.dtype === 'float32' ? NUMERICAL_CONSTANTS.TOLERANCE_F32 : NUMERICAL_CONSTANTS.TOLERANCE_F64);
    const len = this.data.length;

    for (let i = 0; i < len; i++) {
      if (Math.abs(this.data[i]! - other.data[i]!) > tol) {
        return false;
      }
    }
    return true;
  }

  /**
   * True if all elements are within tolerance of zero.
   */
  public isZero(tolerance?: number): boolean {
    const tol = tolerance ?? (this.dtype === 'float32' ? NUMERICAL_CONSTANTS.TOLERANCE_F32 : NUMERICAL_CONSTANTS.TOLERANCE_F64);
    const len = this.data.length;
    for (let i = 0; i < len; i++) {
      if (Math.abs(this.data[i]!) > tol) {
        return false;
      }
    }
    return true;
  }
}
