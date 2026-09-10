/**
 * Project JARVIS: BRAIN-001
 * Generates matrix_test_vectors.json for cross-language validation between Python and TypeScript.
 */

import * as fs from 'fs';

interface MatrixCase {
  id: string;
  description: string;
  dtype: 'float32' | 'float64';
  A_rows: number;
  A_cols: number;
  A: number[][];
  B_rows: number;
  B_cols: number;
  B: number[][];
  x: number[];
}

const cases: MatrixCase[] = [
  {
    id: 'mat_case_01_standard_3x3',
    description: 'Standard 3x3 general matrices and 3D vector',
    dtype: 'float64',
    A_rows: 3,
    A_cols: 3,
    A: [
      [1.2, -2.4, 3.6],
      [-4.8, 5.0, -6.2],
      [7.4, -8.6, 9.8],
    ],
    B_rows: 3,
    B_cols: 3,
    B: [
      [0.5, 1.5, -2.5],
      [3.5, -4.5, 5.5],
      [-6.5, 7.5, -8.5],
    ],
    x: [1.0, -2.0, 3.0],
  },
  {
    id: 'mat_case_02_rectangular_2x4_4x3',
    description: 'Rectangular GEMM (2x4) * (4x3) and 4D vector',
    dtype: 'float64',
    A_rows: 2,
    A_cols: 4,
    A: [
      [1.0, 2.0, 3.0, 4.0],
      [5.0, 6.0, 7.0, 8.0],
    ],
    B_rows: 4,
    B_cols: 3,
    B: [
      [1.0, 0.0, -1.0],
      [2.0, 1.0, 0.0],
      [0.0, 3.0, 1.0],
      [-1.0, 2.0, 4.0],
    ],
    x: [0.5, -1.5, 2.5, -3.5],
  },
  {
    id: 'mat_case_03_symmetric_4x4',
    description: 'Symmetric 4x4 covariance-like matrix and 4D vector',
    dtype: 'float64',
    A_rows: 4,
    A_cols: 4,
    A: [
      [4.0, 1.0, 2.0, 0.5],
      [1.0, 5.0, -1.0, 2.0],
      [2.0, -1.0, 6.0, 1.5],
      [0.5, 2.0, 1.5, 3.0],
    ],
    B_rows: 4,
    B_cols: 4,
    B: [
      [1.0, 0.0, 0.0, 0.0],
      [0.0, 2.0, 0.0, 0.0],
      [0.0, 0.0, 3.0, 0.0],
      [0.0, 0.0, 0.0, 4.0],
    ],
    x: [2.0, 1.0, -1.0, 0.5],
  },
  {
    id: 'mat_case_04_dynamic_range',
    description: 'High dynamic range components (1e8 and 1e-8)',
    dtype: 'float64',
    A_rows: 3,
    A_cols: 3,
    A: [
      [1e8, 2.0, 1e-8],
      [3.0, 1e8, 4.0],
      [1e-8, 5.0, 1e8],
    ],
    B_rows: 3,
    B_cols: 3,
    B: [
      [1e-8, 0.0, 1.0],
      [0.0, 1e-8, 2.0],
      [1.0, 2.0, 1e-8],
    ],
    x: [1e-8, 2.0, 1e8],
  },
  {
    id: 'mat_case_05_f32_8x8',
    description: 'Float32 8x8 matrix representation',
    dtype: 'float32',
    A_rows: 8,
    A_cols: 8,
    A: Array.from({ length: 8 }, (_, i) =>
      Array.from({ length: 8 }, (_, j) => Math.sin(i * 8 + j + 1) * 2.0)
    ),
    B_rows: 8,
    B_cols: 8,
    B: Array.from({ length: 8 }, (_, i) =>
      Array.from({ length: 8 }, (_, j) => Math.cos(i * 8 + j + 1) * 1.5)
    ),
    x: Array.from({ length: 8 }, (_, i) => (i + 1) * 0.25),
  },
];

fs.writeFileSync('src/math/matrix_test_vectors.json', JSON.stringify(cases, null, 2));
console.log('Successfully generated src/math/matrix_test_vectors.json');
