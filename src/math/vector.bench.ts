/**
 * Project JARVIS: BRAIN-001
 * Mathematical Kernel: Canonical Vector High-Precision Microbenchmark
 * 
 * Strict Measurement Protocol:
 * - Records OS, Node.js version, hardware arch
 * - Explicit JIT warm-up phase (5,000 iterations)
 * - Measurement phase (20,000 iterations per benchmark)
 * - Computes p50, p95, mean latency, throughput (Mops/sec)
 * - Zero artificial/invented figures
 */

import os from 'os';
import { CanonicalVector } from './vector';

interface BenchResult {
  operation: string;
  dimension: number;
  dtype: string;
  target: 'KERNEL' | 'KERNEL+ALLOC';
  iterations: number;
  warmupIterations: number;
  minNs: number;
  maxNs: number;
  p50Ns: number;
  p95Ns: number;
  meanNs: number;
  opsPerSec: number;
}

function runBenchmark(
  opName: string,
  dimension: number,
  dtype: 'float32' | 'float64',
  target: 'KERNEL' | 'KERNEL+ALLOC',
  setupFn: () => () => void,
  warmupCount = 5000,
  measureCount = 20000
): BenchResult {
  const benchFn = setupFn();

  // Warm-up phase
  for (let i = 0; i < warmupCount; i++) {
    benchFn();
  }

  // Measurement phase
  const timingsNs: number[] = new Array(measureCount);
  for (let i = 0; i < measureCount; i++) {
    const t0 = process.hrtime.bigint();
    benchFn();
    const t1 = process.hrtime.bigint();
    timingsNs[i] = Number(t1 - t0);
  }

  timingsNs.sort((a, b) => a - b);
  const minNs = timingsNs[0]!;
  const maxNs = timingsNs[measureCount - 1]!;
  const p50Ns = timingsNs[Math.floor(measureCount * 0.50)]!;
  const p95Ns = timingsNs[Math.floor(measureCount * 0.95)]!;
  const sumNs = timingsNs.reduce((a, b) => a + b, 0);
  const meanNs = sumNs / measureCount;
  const totalSec = sumNs / 1e9;
  const opsPerSec = measureCount / totalSec;

  return {
    operation: opName,
    dimension,
    dtype,
    target,
    iterations: measureCount,
    warmupIterations: warmupCount,
    minNs,
    maxNs,
    p50Ns,
    p95Ns,
    meanNs,
    opsPerSec,
  };
}

console.log('============================================================');
console.log('PROJECT JARVIS: CANONICAL VECTOR RIGOROUS BENCHMARK');
console.log('============================================================');
console.log(`OS:              ${os.type()} ${os.release()} (${os.arch()})`);
console.log(`Runtime:         Node.js ${process.version}`);
console.log(`V8 Version:      ${process.versions.v8}`);
console.log(`CPUs:            ${os.cpus()[0]?.model || 'Container vCPU'} x ${os.cpus().length}`);
console.log(`Total RAM:       ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log('============================================================\n');

const dimensions = [64, 512, 4096];
const results: BenchResult[] = [];

for (const dim of dimensions) {
  // 1. Dot Product (float32) - Pure Kernel (zero allocation)
  const dotResF32 = runBenchmark('Dot Product (Inner Product)', dim, 'float32', 'KERNEL', () => {
    const arrA = new Float32Array(dim);
    const arrB = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      arrA[i] = Math.sin(i * 0.1);
      arrB[i] = Math.cos(i * 0.1);
    }
    const u = CanonicalVector.fromArray(arrA, 'float32');
    const v = CanonicalVector.fromArray(arrB, 'float32');
    return () => {
      u.dot(v);
    };
  });
  results.push(dotResF32);

  // 2. Vector Addition (float32) - Kernel + Allocation (allocates TypedArray & instance)
  const addResF32 = runBenchmark('Vector Addition (u + v)', dim, 'float32', 'KERNEL+ALLOC', () => {
    const arrA = new Float32Array(dim);
    const arrB = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      arrA[i] = i * 0.05;
      arrB[i] = -i * 0.03;
    }
    const u = CanonicalVector.fromArray(arrA, 'float32');
    const v = CanonicalVector.fromArray(arrB, 'float32');
    return () => {
      u.add(v);
    };
  });
  results.push(addResF32);

  // 3. Scaled Euclidean L2 Norm (float32) - Pure Kernel (zero allocation)
  const normResF32 = runBenchmark('Scaled Euclidean Norm (||v||_2)', dim, 'float32', 'KERNEL', () => {
    const arr = new Float32Array(dim);
    for (let i = 0; i < dim; i++) arr[i] = (i + 1) * 0.15;
    const v = CanonicalVector.fromArray(arr, 'float32');
    return () => {
      v.normL2();
    };
  });
  results.push(normResF32);

  // 4. Vector Normalization (float32) - Kernel + Allocation
  const normUnitF32 = runBenchmark('Vector Normalization (v / ||v||)', dim, 'float32', 'KERNEL+ALLOC', () => {
    const arr = new Float32Array(dim);
    for (let i = 0; i < dim; i++) arr[i] = (i + 1) * 0.15;
    const v = CanonicalVector.fromArray(arr, 'float32');
    return () => {
      v.normalize();
    };
  });
  results.push(normUnitF32);
}

// Print Tabulated Benchmark Evidence
console.log('| Operation | Target | Dim | DType | Min (ns) | p50 (ns) | p95 (ns) | Max (ns) | Mean (ns) | Throughput |');
console.log('|-----------|--------|-----|-------|----------|----------|----------|----------|-----------|------------|');
for (const r of results) {
  console.log(
    `| ${r.operation.padEnd(30)} | ${r.target.padEnd(12)} | ${String(r.dimension).padStart(4)} | ${r.dtype} | ${r.minNs.toFixed(0).padStart(8)} | ${r.p50Ns.toFixed(0).padStart(8)} | ${r.p95Ns.toFixed(0).padStart(8)} | ${r.maxNs.toFixed(0).padStart(8)} | ${r.meanNs.toFixed(1).padStart(9)} | ${(r.opsPerSec / 1e6).toFixed(2).padStart(6)} Mops/s |`
  );
}
console.log('\n============================================================');
console.log('BENCHMARK COMPLETE: EVIDENCE RECORD READY');
console.log('============================================================');
