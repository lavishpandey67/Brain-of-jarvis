/**
 * Project JARVIS: BRAIN-001
 * CanonicalTensor Microbenchmark Suite
 * 
 * Measures throughput and latency across Batched MatMul, Elementwise Add,
 * Scaled Frobenius Norm, Zero-Copy Permute, and Contiguous Materialization.
 * Formats statistics: min, p50, p95, max, mean, and GFLOP/s.
 * Provides fresh empirical evidence for the Rust Decision Record.
 */

import { CanonicalTensor } from './tensor';

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

console.log('========================================================================================================');
console.log('BRAIN-001 CANONICAL TENSOR: EMPIRICAL PERFORMANCE BENCHMARK (V8 JIT)');
console.log('========================================================================================================');

const results: BenchResult[] = [];

// 1. Batched GEMM: [4, 64, 64] x [4, 64, 64] -> FLOPs = 4 * 2 * 64^3 = 2,097,152
{
  const shape = [4, 64, 64];
  const total = 4 * 64 * 64;
  const A = CanonicalTensor.fromFlatArray(shape, Array.from({ length: total }, (_, i) => Math.sin(i)), 'float32');
  const B = CanonicalTensor.fromFlatArray(shape, Array.from({ length: total }, (_, i) => Math.cos(i)), 'float32');
  const flops = 4 * 2 * 64 * 64 * 64;

  results.push(
    runBench('batchedMatMul', '[4,64,64]x[4,64,64]', flops, 50, 10, () => {
      A.batchedMatMul(B);
    })
  );
}

// 2. Batched GEMM: [8, 32, 32] x [8, 32, 32] -> FLOPs = 8 * 2 * 32^3 = 524,288
{
  const shape = [8, 32, 32];
  const total = 8 * 32 * 32;
  const A = CanonicalTensor.fromFlatArray(shape, Array.from({ length: total }, (_, i) => Math.sin(i)), 'float32');
  const B = CanonicalTensor.fromFlatArray(shape, Array.from({ length: total }, (_, i) => Math.cos(i)), 'float32');
  const flops = 8 * 2 * 32 * 32 * 32;

  results.push(
    runBench('batchedMatMul', '[8,32,32]x[8,32,32]', flops, 100, 20, () => {
      A.batchedMatMul(B);
    })
  );
}

// 3. Elementwise Add: [4, 128, 128] -> 65,536 elements -> 65,536 FLOPs
{
  const shape = [4, 128, 128];
  const total = 4 * 128 * 128;
  const A = CanonicalTensor.ones(shape, 'float32');
  const B = CanonicalTensor.ones(shape, 'float32');

  results.push(
    runBench('elementwiseAdd', '[4,128,128]', total, 200, 30, () => {
      A.add(B);
    })
  );
}

// 4. Scaled Frobenius Norm: [4, 128, 128] -> 65,536 elements -> 131,072 FLOPs
{
  const shape = [4, 128, 128];
  const total = 4 * 128 * 128;
  const A = CanonicalTensor.fromFlatArray(shape, Array.from({ length: total }, (_, i) => i * 0.01), 'float32');

  results.push(
    runBench('frobeniusNorm', '[4,128,128]', total * 2, 200, 30, () => {
      A.frobeniusNorm();
    })
  );
}

// 5. Zero-Copy Permute View: [4, 16, 32, 64] -> Latency test (0 FLOPs)
{
  const shape = [4, 16, 32, 64];
  const A = CanonicalTensor.zeros(shape, 'float32');

  results.push(
    runBench('permuteView (zero-copy)', '[4,16,32,64]', 0, 1000, 100, () => {
      A.permute(3, 0, 2, 1);
    })
  );
}

// 6. Contiguous Materialization of Strided Tensor: [4, 16, 32, 64] -> 131,072 elements
{
  const shape = [4, 16, 32, 64];
  const total = 4 * 16 * 32 * 64;
  const A = CanonicalTensor.fromFlatArray(shape, Array.from({ length: total }, (_, i) => i), 'float32');
  const transposed = A.permute(3, 0, 2, 1);

  results.push(
    runBench('contiguousMaterialize', '[4,16,32,64] (strided->C)', total, 50, 10, () => {
      transposed.contiguous();
    })
  );
}

// Format markdown table
console.log('| Operation | Shape / Size | Iterations | Min (ms) | P50 (ms) | P95 (ms) | Mean (ms) | Throughput (GFLOP/s) |');
console.log('| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |');
for (const r of results) {
  const gflopsStr = r.throughputGflops > 0 ? r.throughputGflops.toFixed(3) : 'N/A (view)';
  console.log(
    `| ${r.operation.padEnd(23)} | ${r.size.padEnd(25)} | ${r.iterations.toString().padStart(10)} | ${r.minMs.toFixed(4).padStart(8)} | ${r.p50Ms.toFixed(4).padStart(8)} | ${r.p95Ms.toFixed(4).padStart(8)} | ${r.meanMs.toFixed(4).padStart(9)} | ${gflopsStr.padStart(20)} |`
  );
}
console.log('========================================================================================================\n');
