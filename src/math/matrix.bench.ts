/**
 * Project JARVIS: BRAIN-001
 * CanonicalMatrix Microbenchmark Suite
 * 
 * Measures throughput and latency across GEMM, GEMV, Transpose, and Addition.
 * Formats statistics: min, p50, p95, max, mean, and GFLOP/s.
 * Provides fresh empirical evidence for the Rust Decision Record.
 */

import { CanonicalMatrix } from './matrix';
import { CanonicalVector } from './vector';

interface BenchResult {
  operation: string;
  size: string;
  iterations: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  meanMs: number;
  throughputGflops: number;
}

function runBench(
  name: string,
  sizeDesc: string,
  flopsPerOp: number,
  iterations: number,
  warmup: number,
  fn: () => void
): BenchResult {
  // Warmup
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // Timed measurements
  const durations: number[] = new Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    const t1 = performance.now();
    durations[i] = t1 - t0;
  }

  durations.sort((a, b) => a - b);
  const minMs = durations[0]!;
  const maxMs = durations[durations.length - 1]!;
  const p50Ms = durations[Math.floor(iterations * 0.50)]!;
  const p95Ms = durations[Math.floor(iterations * 0.95)]!;
  const sumMs = durations.reduce((acc, v) => acc + v, 0);
  const meanMs = sumMs / iterations;

  // GFLOP/s = (flopsPerOp / (meanMs * 1e-3)) / 1e9
  const throughputGflops = flopsPerOp > 0 && meanMs > 0 ? (flopsPerOp / (meanMs * 1e-3)) / 1e9 : 0;

  return {
    operation: name,
    size: sizeDesc,
    iterations,
    minMs,
    p50Ms,
    p95Ms,
    maxMs,
    meanMs,
    throughputGflops,
  };
}

console.log('============================================================');
console.log('BRAIN-001: CANONICAL MATRIX BENCHMARK SUITE');
console.log('============================================================\n');

const results: BenchResult[] = [];

// 1. GEMM Benchmarks: N x N * N x N (FLOPs = 2 * N^3)
const gemmSizes = [16, 64, 128, 256];
for (const N of gemmSizes) {
  const A = CanonicalMatrix.fromFlatArray(
    N,
    N,
    Array.from({ length: N * N }, (_, i) => Math.sin(i + 1)),
    'float32'
  );
  const B = CanonicalMatrix.fromFlatArray(
    N,
    N,
    Array.from({ length: N * N }, (_, i) => Math.cos(i + 1)),
    'float32'
  );
  const flops = 2 * N * N * N;
  const iters = N <= 64 ? 500 : N <= 128 ? 100 : 25;
  const warmup = N <= 64 ? 50 : 10;

  const res = runBench('GEMM (A*B)', `${N}x${N}`, flops, iters, warmup, () => {
    A.multiply(B);
  });
  results.push(res);
}

// 2. GEMV Benchmarks: N x N * N (FLOPs = 2 * N^2)
const gemvSizes = [64, 256, 1024];
for (const N of gemvSizes) {
  const A = CanonicalMatrix.fromFlatArray(
    N,
    N,
    Array.from({ length: N * N }, (_, i) => Math.sin(i + 1)),
    'float32'
  );
  const x = CanonicalVector.fromArray(
    Array.from({ length: N }, (_, i) => Math.cos(i + 1)),
    'float32'
  );
  const flops = 2 * N * N;
  const iters = N <= 256 ? 1000 : 200;
  const warmup = 50;

  const res = runBench('GEMV (A*x)', `${N}x${N}`, flops, iters, warmup, () => {
    A.multiplyVector(x);
  });
  results.push(res);
}

// 3. Transpose Benchmarks: N x N (Read/Write N^2 elements)
const transSizes = [64, 256];
for (const N of transSizes) {
  const A = CanonicalMatrix.fromFlatArray(
    N,
    N,
    Array.from({ length: N * N }, (_, i) => (i % 100) * 0.1),
    'float32'
  );
  const flops = 0; // Data movement
  const iters = 1000;
  const warmup = 50;

  const res = runBench('Transpose (A^T)', `${N}x${N}`, flops, iters, warmup, () => {
    A.transpose();
  });
  results.push(res);
}

// 4. Addition Benchmarks: N x N + N x N (FLOPs = N^2)
const addSizes = [64, 256];
for (const N of addSizes) {
  const A = CanonicalMatrix.fromFlatArray(
    N,
    N,
    Array.from({ length: N * N }, (_, i) => (i % 50) * 0.2),
    'float32'
  );
  const B = CanonicalMatrix.fromFlatArray(
    N,
    N,
    Array.from({ length: N * N }, (_, i) => (i % 30) * 0.3),
    'float32'
  );
  const flops = N * N;
  const iters = 1000;
  const warmup = 50;

  const res = runBench('Addition (A+B)', `${N}x${N}`, flops, iters, warmup, () => {
    A.add(B);
  });
  results.push(res);
}

// Print Results Table
console.log('| Operation | Dimensions | Iters | Min (ms) | Median (ms) | p95 (ms) | Max (ms) | Mean (ms) | Throughput (GFLOP/s) |');
console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
for (const r of results) {
  console.log(
    `| ${r.operation} | ${r.size} | ${r.iterations} | ${r.minMs.toFixed(4)} | ${r.p50Ms.toFixed(4)} | ${r.p95Ms.toFixed(4)} | ${r.maxMs.toFixed(4)} | ${r.meanMs.toFixed(4)} | ${r.throughputGflops > 0 ? r.throughputGflops.toFixed(3) : 'N/A'} |`
  );
}
console.log('============================================================\n');
