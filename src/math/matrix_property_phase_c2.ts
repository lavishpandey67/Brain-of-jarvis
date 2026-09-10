/**
 * Project JARVIS: BRAIN-001
 * CanonicalMatrix Phase C2: Deterministic Property-Based Testing
 * 
 * Uses deterministic Mulberry32 PRNG across 4 fixed seeds and diverse matrix dimensions.
 * Evaluates core invariant theorems over thousands of matrix configurations.
 */

import { CanonicalMatrix } from './matrix';
import { CanonicalVector } from './vector';
import { DType, NUMERICAL_CONSTANTS } from './types';

// Deterministic Mulberry32 32-bit PRNG
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS = {
  SEED_ALPHA: 0x12345678,
  SEED_BETA:  0x9abcdef0,
  SEED_GAMMA: 0xfeedface,
  SEED_DELTA: 0xcafebabe,
};

const SHAPES: Array<[number, number]> = [
  [2, 2],
  [3, 4],
  [4, 3],
  [8, 8],
  [5, 7],
  [16, 16],
];

const DTYPES: DType[] = ['float32', 'float64'];

interface AssertionRecord {
  seedName: string;
  rows: number;
  cols: number;
  dtype: DType;
  property: string;
  passed: boolean;
  errorMagnitude: number;
}

const records: AssertionRecord[] = [];

console.log('============================================================');
console.log('BRAIN-001: CANONICAL MATRIX — PHASE C2 PROPERTY-BASED TESTING');
console.log('============================================================\n');

for (const [seedName, seedVal] of Object.entries(SEEDS)) {
  const rng = mulberry32(seedVal);

  for (const [m, n] of SHAPES) {
    for (const dtype of DTYPES) {
      const tol = dtype === 'float32' ? 5e-5 : 1e-12;

      // Helper to generate random m x n matrix with values in [-5, 5]
      const genMatrix = (rows: number, cols: number): CanonicalMatrix => {
        const total = rows * cols;
        const arr = new Array<number>(total);
        for (let i = 0; i < total; i++) {
          arr[i] = (rng() * 10.0) - 5.0;
        }
        return CanonicalMatrix.fromFlatArray(rows, cols, arr, dtype);
      };

      const A = genMatrix(m, n);
      const B = genMatrix(m, n);

      // 1. Addition Commutativity: ||(A + B) - (B + A)||_F == 0.0
      const commErr = A.add(B).subtract(B.add(A)).frobeniusNorm();
      records.push({
        seedName,
        rows: m,
        cols: n,
        dtype,
        property: 'addition_commutativity',
        passed: commErr === 0.0,
        errorMagnitude: commErr,
      });

      // 2. Transpose Involution: ||(A^T)^T - A||_F == 0.0
      const involErr = A.transpose().transpose().subtract(A).frobeniusNorm();
      records.push({
        seedName,
        rows: m,
        cols: n,
        dtype,
        property: 'transpose_involution',
        passed: involErr === 0.0,
        errorMagnitude: involErr,
      });

      // 3. Transpose of Product: ||(A * B)^T - B^T * A^T||_F <= tol (requires compatible GEMM)
      // Let P in R^{m x n}, Q in R^{n x m}
      const P = A;
      const Q = genMatrix(n, m);
      const transProdErr = P.multiply(Q).transpose().subtract(Q.transpose().multiply(P.transpose())).frobeniusNorm();
      records.push({
        seedName,
        rows: m,
        cols: n,
        dtype,
        property: 'transpose_of_product',
        passed: transProdErr <= tol,
        errorMagnitude: transProdErr,
      });

      // 4. Multiplication Distributivity: ||P * (Q1 + Q2) - (P*Q1 + P*Q2)||_F <= tol
      const Q1 = Q;
      const Q2 = genMatrix(n, m);
      const distErr = P.multiply(Q1.add(Q2)).subtract(P.multiply(Q1).add(P.multiply(Q2))).frobeniusNorm();
      records.push({
        seedName,
        rows: m,
        cols: n,
        dtype,
        property: 'gemm_distributivity',
        passed: distErr <= tol,
        errorMagnitude: distErr,
      });

      // 5. Cyclic Trace Property: |tr(P * Q) - tr(Q * P)| <= tol
      const trPQ = P.multiply(Q).trace();
      const trQP = Q.multiply(P).trace();
      const trDiff = Math.abs(trPQ - trQP);
      records.push({
        seedName,
        rows: m,
        cols: n,
        dtype,
        property: 'cyclic_trace',
        passed: trDiff <= tol,
        errorMagnitude: trDiff,
      });

      // 6. Frobenius Sub-multiplicativity: ||P * Q||_F <= ||P||_F * ||Q||_F + tol
      const normPQ = P.multiply(Q).frobeniusNorm();
      const prodNorms = P.frobeniusNorm() * Q.frobeniusNorm();
      const submultViol = Math.max(0, normPQ - prodNorms);
      records.push({
        seedName,
        rows: m,
        cols: n,
        dtype,
        property: 'frobenius_submultiplicativity',
        passed: submultViol <= tol,
        errorMagnitude: submultViol,
      });

      // 7. Matrix-Vector Linearity: ||A * (x + y) - (Ax + Ay)||_inf <= tol
      const xArr = new Array<number>(n);
      const yArr = new Array<number>(n);
      for (let j = 0; j < n; j++) {
        xArr[j] = (rng() * 10.0) - 5.0;
        yArr[j] = (rng() * 10.0) - 5.0;
      }
      const x = CanonicalVector.fromArray(xArr, dtype);
      const y = CanonicalVector.fromArray(yArr, dtype);
      const linErr = A.multiplyVector(x.add(y)).subtract(A.multiplyVector(x).add(A.multiplyVector(y))).normLinf();
      records.push({
        seedName,
        rows: m,
        cols: n,
        dtype,
        property: 'gemv_linearity',
        passed: linErr <= tol,
        errorMagnitude: linErr,
      });
    }
  }
}

const totalAssertions = records.length;
const passedAssertions = records.filter(r => r.passed).length;
const maxError = Math.max(...records.map(r => r.errorMagnitude));

console.log(`Total Property Invariant Assertions Evaluated: ${totalAssertions}`);
console.log(`Assertions Passed:                             ${passedAssertions}/${totalAssertions} (${((passedAssertions / totalAssertions) * 100).toFixed(1)}%)`);
console.log(`Maximum Observed Invariant Error:              ${maxError.toExponential(4)}`);

console.log('\nSample Property Runs (1 per seed):');
console.log('| Seed | Shape | DType | Property | Status | Error Mag |');
console.log('| :--- | :---: | :---: | :--- | :---: | :--- |');
for (const seedKey of Object.keys(SEEDS)) {
  const match = records.find(r => r.seedName === seedKey && r.property === 'transpose_of_product' && r.dtype === 'float64');
  if (match) {
    console.log(`| ${match.seedName} | ${match.rows}x${match.cols} | ${match.dtype} | ${match.property} | ${match.passed ? 'PASS' : 'FAIL'} | ${match.errorMagnitude.toExponential(3)} |`);
  }
}

console.log('\n============================================================');
console.log('CANONICAL MATRIX PHASE C2 PROPERTY-BASED TESTING COMPLETE');
console.log('============================================================');

if (passedAssertions !== totalAssertions) {
  process.exit(1);
}
