/**
 * Project JARVIS: BRAIN-001
 * Mathematical Kernel: Core Types, Shape System & Numerical Contracts
 * 
 * Formal Definition:
 * Represents the fundamental domain of vector spaces over the real field R,
 * discretized using IEEE 754 floating-point numbers (float32, float64).
 */

export type DType = 'float32' | 'float64';

export type Shape1D = readonly [number];
export type Shape2D = readonly [number, number];
export type Strides2D = readonly [number, number];

export type ShapeND = readonly number[];
export type StridesND = readonly number[];

/**
 * Standard numerical tolerances for IEEE 754 precision tiers
 */
export const NUMERICAL_CONSTANTS = {
  // Machine epsilon for single precision (IEEE 754 float32)
  EPSILON_F32: 1.1920928955078125e-7,
  // Machine epsilon for double precision (IEEE 754 float64)
  EPSILON_F64: 2.220446049250313e-16,
  // Safe comparison tolerances
  TOLERANCE_F32: 1e-6,
  TOLERANCE_F64: 1e-14,
  // Smallest positive normal float32
  MIN_NORMAL_F32: 1.1754943508222875e-38,
  // Largest finite float32
  MAX_FINITE_F32: 3.4028234663852886e+38,
  // Maximum safe vector dimension to protect against allocation bombs / OOM (16M elements = 128MB in float64)
  MAX_SAFE_DIMENSION: 16_777_216,
} as const;

// ============================================================
// MATHEMATICAL ERROR HIERARCHY
// ============================================================

export class MathematicalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MathematicalError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SecurityResourceExhaustionError extends MathematicalError {
  constructor(requestedDimension: number, maxSafeDimension: number) {
    super(
      `Security resource limit exceeded: requested dimension ${requestedDimension} exceeds maximum safe limit ${maxSafeDimension} (denial-of-service / memory bomb protection)`
    );
    this.name = 'SecurityResourceExhaustionError';
  }
}

export class DimensionMismatchError extends MathematicalError {
  constructor(
    public readonly expectedDimension: number,
    public readonly actualDimension: number,
    operationName: string
  ) {
    super(
      `Dimension mismatch in ${operationName}: expected dimension ${expectedDimension}, got ${actualDimension}`
    );
    this.name = 'DimensionMismatchError';
  }
}

export class NonFiniteNumericalError extends MathematicalError {
  constructor(
    public readonly index: number,
    public readonly value: number,
    operationName: string
  ) {
    super(
      `Non-finite value encountered in ${operationName} at index ${index}: ${value} (NaN/Inf is strictly forbidden)`
    );
    this.name = 'NonFiniteNumericalError';
  }
}

export class EmptyVectorError extends MathematicalError {
  constructor(operationName: string) {
    super(`Cannot execute ${operationName} on an empty vector (dimension must be >= 1)`);
    this.name = 'EmptyVectorError';
  }
}

export class ZeroNormDivisionError extends MathematicalError {
  constructor(operationName: string) {
    super(`Cannot execute ${operationName}: vector L2 norm is zero (division by zero)`);
    this.name = 'ZeroNormDivisionError';
  }
}

export class EmptyMatrixError extends MathematicalError {
  constructor(operationName: string) {
    super(`Cannot execute ${operationName} on an empty matrix (rows and cols must be >= 1)`);
    this.name = 'EmptyMatrixError';
  }
}

export class MatrixDimensionMismatchError extends MathematicalError {
  constructor(
    public readonly expectedShape: Shape2D | string,
    public readonly actualShape: Shape2D | string,
    operationName: string
  ) {
    super(
      `Matrix dimension mismatch in ${operationName}: expected shape ${JSON.stringify(expectedShape)}, got ${JSON.stringify(actualShape)}`
    );
    this.name = 'MatrixDimensionMismatchError';
  }
}

export class EmptyTensorError extends MathematicalError {
  constructor(operationName: string, reason?: string) {
    super(
      `Cannot execute ${operationName} on an empty tensor: ${reason || 'all dimensions and rank must be >= 1'}`
    );
    this.name = 'EmptyTensorError';
  }
}

export class TensorDimensionMismatchError extends MathematicalError {
  constructor(
    public readonly expectedShape: ShapeND | string,
    public readonly actualShape: ShapeND | string,
    operationName: string
  ) {
    super(
      `Tensor dimension mismatch in ${operationName}: expected shape ${JSON.stringify(expectedShape)}, got ${JSON.stringify(actualShape)}`
    );
    this.name = 'TensorDimensionMismatchError';
  }
}

export class TensorRankError extends MathematicalError {
  constructor(
    public readonly expectedRank: number | string,
    public readonly actualRank: number,
    operationName: string
  ) {
    super(
      `Tensor rank error in ${operationName}: expected rank ${expectedRank}, got rank ${actualRank}`
    );
    this.name = 'TensorRankError';
  }
}

export class InvalidAxisError extends MathematicalError {
  constructor(
    public readonly axis: number,
    public readonly rank: number,
    operationName: string
  ) {
    super(
      `Invalid axis ${axis} in ${operationName} for tensor of rank ${rank} (valid axes: [0, ${rank - 1}])`
    );
    this.name = 'InvalidAxisError';
  }
}

export class NonContiguousError extends MathematicalError {
  constructor(operationName: string) {
    super(
      `Operation ${operationName} requires a contiguous tensor. Call .contiguous() before executing this operation.`
    );
    this.name = 'NonContiguousError';
  }
}

