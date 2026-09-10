/**
 * Project JARVIS: BRAIN-001
 * Deterministic Tensor Test Vector Generator for Cross-Language Verification
 */

import * as fs from 'fs';
import * as path from 'path';
import { CanonicalTensor } from './tensor';

const testVectors = {
  version: '1.0',
  timestamp: '2026-09-07T12:00:00Z',
  cases: [
    {
      id: 'tensor_case_01_3d_f64',
      shape: [2, 3, 4],
      dtype: 'float64',
      dataA: Array.from({ length: 24 }, (_, i) => Math.sin(i + 1) * 2.5),
      dataB: Array.from({ length: 24 }, (_, i) => Math.cos(i + 1) * 1.5),
    },
    {
      id: 'tensor_case_02_4d_f64',
      shape: [2, 2, 3, 2],
      dtype: 'float64',
      dataA: Array.from({ length: 24 }, (_, i) => (i + 1) * 0.25),
      dataB: Array.from({ length: 24 }, (_, i) => (24 - i) * 0.125),
    },
    {
      id: 'tensor_case_03_batched_matmul_f64',
      shapeA: [2, 2, 3],
      shapeB: [2, 3, 2],
      dtype: 'float64',
      dataA: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3],
      dataB: [1, 0, 0, 1, 1, 1, 2, 1, 0, 1, 1, 0],
    },
    {
      id: 'tensor_case_04_dynamic_range_f64',
      shape: [2, 2, 2],
      dtype: 'float64',
      dataA: [1e8, 1.0, 1e-8, 2.5, -1e8, -1.0, -1e-8, 0.5],
      dataB: [2.0, 1e8, 3.0, 1e-8, -2.0, -1e8, -3.0, -1e-8],
    },
    {
      id: 'tensor_case_05_3d_f32',
      shape: [2, 4, 4],
      dtype: 'float32',
      dataA: Array.from({ length: 32 }, (_, i) => Math.sin(i + 1)),
      dataB: Array.from({ length: 32 }, (_, i) => Math.cos(i + 1)),
    },
  ],
};

const outputPath = path.join(process.cwd(), 'src', 'math', 'tensor_test_vectors.json');
fs.writeFileSync(outputPath, JSON.stringify(testVectors, null, 2), 'utf-8');
console.log(`Generated ${testVectors.cases.length} tensor test vector cases at ${outputPath}`);
