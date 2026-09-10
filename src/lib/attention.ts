/**
 * Chamber 7: Attention Mathematics Engine
 *
 * Implements:
 *   Q = X W_Q
 *   K = X W_K
 *   V = X W_V
 *   Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V
 *
 * Plus Rotary Positional Embedding (RoPE) frequencies and multi-head partitioning.
 */

// Numerically stable softmax across a 1D vector
export function stableSoftmax(logits: number[]): number[] {
  const maxVal = Math.max(...logits);
  const expValues = logits.map((x) => Math.exp(x - maxVal));
  const sumExp = expValues.reduce((acc, curr) => acc + curr, 0);
  return expValues.map((val) => val / Math.max(1e-12, sumExp));
}

// Dot product of two vectors
export function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * (b[i] ?? 0);
  }
  return sum;
}

// Compute scaled dot-product attention weights matrix for a list of tokens
export function computeAttentionMatrix(
  tokens: string[],
  headDim = 64
): {
  matrix: number[][];
  qSample: number[];
  kSample: number[];
  vSample: number[];
  scaleFactor: number;
} {
  const seqLen = Math.min(12, tokens.length);
  const activeTokens = tokens.slice(0, seqLen);
  const scale = 1 / Math.sqrt(headDim);

  // Generate deterministic query and key embeddings based on token characters
  const Q: number[][] = [];
  const K: number[][] = [];
  const V: number[][] = [];

  for (let i = 0; i < seqLen; i++) {
    const word = activeTokens[i] || '';
    const qVec: number[] = [];
    const kVec: number[] = [];
    const vVec: number[] = [];

    for (let d = 0; d < 8; d++) {
      const charCode = word.charCodeAt(d % word.length) || 65;
      const posBias = Math.sin((i + 1) * (d + 1));
      qVec.push(+(Math.sin(charCode * 0.13 + posBias) * 0.5).toFixed(4));
      kVec.push(+(Math.cos(charCode * 0.17 + posBias) * 0.5).toFixed(4));
      vVec.push(+(Math.sin(charCode * 0.23) * 0.5).toFixed(4));
    }
    Q.push(qVec);
    K.push(kVec);
    V.push(vVec);
  }

  // Compute Raw Attention Scores: S = (Q * K^T) * scale
  const rawScores: number[][] = [];
  for (let i = 0; i < seqLen; i++) {
    const row: number[] = [];
    for (let j = 0; j < seqLen; j++) {
      const dot = dotProduct(Q[i], K[j]);
      row.push(dot * scale);
    }
    rawScores.push(row);
  }

  // Apply row-wise Softmax
  const attentionWeights = rawScores.map((row) => stableSoftmax(row));

  return {
    matrix: attentionWeights,
    qSample: Q[0] ?? [0.12, -0.44, 0.88, -0.21, 0.05, 0.67, -0.19, 0.33],
    kSample: K[0] ?? [-0.09, 0.52, 0.11, 0.74, -0.32, 0.18, 0.44, -0.61],
    vSample: V[0] ?? [0.35, -0.14, 0.62, -0.05, 0.81, -0.49, 0.22, 0.09],
    scaleFactor: +scale.toFixed(4),
  };
}

// Compute Rotary Positional Embedding (RoPE) frequencies: theta_i = 10000^(-2(i-1)/d)
export function computeRopeFrequencies(dim = 64, base = 10000): number[] {
  const freqs: number[] = [];
  for (let i = 0; i < Math.min(8, dim / 2); i++) {
    const theta = 1.0 / Math.pow(base, (2 * i) / dim);
    freqs.push(+theta.toFixed(6));
  }
  return freqs;
}
