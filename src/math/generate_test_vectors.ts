/**
 * Project JARVIS: BRAIN-001
 * Generate Deterministic Test Vectors for Cross-Language Verification
 */

import fs from 'fs';
import path from 'path';
import { CanonicalVector } from './vector';

export interface VectorTestVector {
  id: string;
  dimension: number;
  dtype: 'float32' | 'float64';
  u: number[];
  v: number[];
  alpha: number;
  expectedAdd: number[];
  expectedSub: number[];
  expectedScaleU: number[];
  expectedDot: number;
  expectedNormL1U: number;
  expectedNormL2U: number;
  expectedNormLinfU: number;
  expectedCosineSim: number;
}

const testCases: VectorTestVector[] = [];

// Case 1: Simple 4D vector
{
  const uArr = [1.5, -2.0, 3.25, -0.5];
  const vArr = [0.5, 4.0, -1.25, 2.0];
  const alpha = 2.5;

  const u = CanonicalVector.fromArray(uArr, 'float64');
  const v = CanonicalVector.fromArray(vArr, 'float64');

  testCases.push({
    id: 'case_1_4d_general',
    dimension: 4,
    dtype: 'float64',
    u: uArr,
    v: vArr,
    alpha,
    expectedAdd: u.add(v).toArray(),
    expectedSub: u.subtract(v).toArray(),
    expectedScaleU: u.scale(alpha).toArray(),
    expectedDot: u.dot(v),
    expectedNormL1U: u.normL1(),
    expectedNormL2U: u.normL2(),
    expectedNormLinfU: u.normLinf(),
    expectedCosineSim: u.cosineSimilarity(v),
  });
}

// Case 2: Orthogonal vectors in R^3
{
  const uArr = [3.0, 4.0, 0.0];
  const vArr = [-4.0, 3.0, 0.0];
  const alpha = -1.0;

  const u = CanonicalVector.fromArray(uArr, 'float64');
  const v = CanonicalVector.fromArray(vArr, 'float64');

  testCases.push({
    id: 'case_2_orthogonal_3d',
    dimension: 3,
    dtype: 'float64',
    u: uArr,
    v: vArr,
    alpha,
    expectedAdd: u.add(v).toArray(),
    expectedSub: u.subtract(v).toArray(),
    expectedScaleU: u.scale(alpha).toArray(),
    expectedDot: u.dot(v),
    expectedNormL1U: u.normL1(),
    expectedNormL2U: u.normL2(),
    expectedNormLinfU: u.normLinf(),
    expectedCosineSim: u.cosineSimilarity(v),
  });
}

// Case 3: 64D Attention Head Vector Space
{
  const dim = 64;
  const uArr = new Array(dim);
  const vArr = new Array(dim);
  for (let i = 0; i < dim; i++) {
    uArr[i] = Math.sin(i * 0.25) * 0.5;
    vArr[i] = Math.cos(i * 0.35) * 0.5;
  }
  const alpha = 0.125; // 1 / sqrt(64)

  const u = CanonicalVector.fromArray(uArr, 'float32');
  const v = CanonicalVector.fromArray(vArr, 'float32');

  testCases.push({
    id: 'case_3_attention_head_64d',
    dimension: dim,
    dtype: 'float32',
    u: Array.from(u.data),
    v: Array.from(v.data),
    alpha,
    expectedAdd: Array.from(u.add(v).data),
    expectedSub: Array.from(u.subtract(v).data),
    expectedScaleU: Array.from(u.scale(alpha).data),
    expectedDot: u.dot(v),
    expectedNormL1U: u.normL1(),
    expectedNormL2U: u.normL2(),
    expectedNormLinfU: u.normLinf(),
    expectedCosineSim: u.cosineSimilarity(v),
  });
}

const outputPath = path.join(process.cwd(), 'src/math/test_vectors.json');
fs.writeFileSync(outputPath, JSON.stringify(testCases, null, 2), 'utf-8');
console.log(`Generated ${testCases.length} canonical test vectors at ${outputPath}`);
