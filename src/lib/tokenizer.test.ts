import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeText, decodeTokens, tokenizeToIds, SPECIAL_TOKENS } from './tokenizer';

describe('Real Byte-Level Subword Tokenizer (Canonical Implementation)', () => {
  it('Roundtrip Invertibility Theorem: decode(encode(text)) === text for standard English', () => {
    const samples = [
      'Hello world',
      'The quick brown fox jumps over the lazy dog.',
      'Project JARVIS is a real cognitive system with verified mathematical foundations.',
      'A short test.',
      'SingleWord',
      '   leading and trailing spaces   ',
      'Multiple\nlines\nwith\r\nvarious\twhitespace\n\nand formatting.',
    ];

    for (const text of samples) {
      const result = tokenizeText(text, { addSpecialTokens: false });
      const decoded = decodeTokens(result.tokenIds);
      assert.equal(decoded, text, `Failed to invert text: "${text}"`);
    }
  });

  it('Roundtrip Invertibility Theorem: Source Code & Punctuation', () => {
    const codeSamples = [
      `function computeAttention(Q: CanonicalTensor, K: CanonicalTensor): CanonicalTensor {
  const scores = Q.batchedMatmul(K.transpose([0, 2, 1]));
  return scores.scale(1.0 / Math.sqrt(64));
}`,
      `SELECT id, chunk, 1 - (embedding <=> '[0.1, 0.2]') as sim FROM vectors WHERE sim > 0.85 ORDER BY sim DESC LIMIT 5;`,
      `#include <stdio.h>\nint main() { printf("Hello, JARVIS!\\n"); return 0; }`,
      `{"tensorShape": [1, 16, 64], "dtype": "float32", "contiguity": true, "values": [0.0, 1.23e-4, -9.8]}`,
    ];

    for (const code of codeSamples) {
      const result = tokenizeText(code, { addSpecialTokens: false });
      const decoded = decodeTokens(result.tokenIds);
      assert.equal(decoded, code, `Failed to invert code snippet: "${code}"`);
    }
  });

  it('Byte-Level Universality & Multilingual / Emoji Invertibility', () => {
    const unicodeSamples = [
      'こんにちは世界 (Japanese)',
      '你好，世界！这是真正的认知系统。(Chinese)',
      'مرحبا بالعالم (Arabic)',
      'Привет, мир! Математический тензор. (Russian)',
      'Γειά σου Κόσμε (Greek)',
      'שלום עולם (Hebrew)',
      '🧠 🚀 ⚡ 🔬 🛡️ (Complex Emojis)',
      'Family emoji with ZWJ: 👨‍👩‍👧‍👦',
      'Accented characters: café, résumé, naïve, señor, Über',
    ];

    for (const sample of unicodeSamples) {
      const result = tokenizeText(sample, { addSpecialTokens: false });
      const decoded = decodeTokens(result.tokenIds);
      assert.equal(decoded, sample, `Failed to invert Unicode sample: "${sample}"`);
    }
  });

  it('Exact Byte Offsets Integrity', () => {
    const text = 'Project JARVIS verifies mathematical contracts.';
    const encoder = new TextEncoder();
    const rawBytes = encoder.encode(text);
    const decoder = new TextDecoder('utf-8');

    const result = tokenizeText(text, { addSpecialTokens: false });
    for (const token of result.tokens) {
      const [start, end] = token.byteOffset;
      assert(start >= 0 && end <= rawBytes.length && start <= end, `Invalid byte offset range: [${start}, ${end}]`);
      const sliceBytes = rawBytes.subarray(start, end);
      const reconstructedSlice = decoder.decode(sliceBytes);
      assert.equal(token.text, reconstructedSlice, `Token text mismatch at offset [${start}, ${end}]`);
    }
  });

  it('Special Tokens and Attention Mask Construction', () => {
    const text = 'Cognitive verification';
    const result = tokenizeText(text, { addSpecialTokens: true });

    assert.equal(result.tokens[0]!.id, SPECIAL_TOKENS.BOS);
    assert.equal(result.tokens[0]!.isSpecial, true);
    assert.equal(result.tokens[result.tokens.length - 1]!.id, SPECIAL_TOKENS.EOS);
    assert.equal(result.tokens[result.tokens.length - 1]!.isSpecial, true);

    // Attention mask and Position IDs
    assert.equal(result.attentionMask.length, result.sequenceLength);
    assert.equal(result.positionIds.length, result.sequenceLength);
    assert(result.attentionMask.every((m) => m === 1));
    assert(result.positionIds.every((pos, idx) => pos === idx));

    // Decode with special tokens stripped
    const cleanTokens = result.tokenIds.filter((id) => id !== SPECIAL_TOKENS.BOS && id !== SPECIAL_TOKENS.EOS);
    assert.equal(decodeTokens(cleanTokens), text);
  });

  it('Edge Cases: Empty string, Single char, Repeated patterns', () => {
    // Empty string
    const emptyRes = tokenizeText('', { addSpecialTokens: false });
    assert.equal(emptyRes.tokens.length, 0);
    assert.equal(emptyRes.tokenIds.length, 0);
    assert.equal(decodeTokens(emptyRes.tokenIds), '');

    // Single character
    const single = tokenizeText('a', { addSpecialTokens: false });
    assert.equal(single.tokens.length, 1);
    assert.equal(decodeTokens(single.tokenIds), 'a');

    // Repeated identical bytes
    const repeated = 'X'.repeat(500);
    const repeatedRes = tokenizeText(repeated, { addSpecialTokens: false });
    assert.equal(decodeTokens(repeatedRes.tokenIds), repeated);
  });

  it('Adversarial Stress Test: Binary byte sweeps and large payload', () => {
    // Generate all 256 byte values
    const allBytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) allBytes[i] = i;
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const arbitraryStr = decoder.decode(allBytes);

    const tokenized = tokenizeText(arbitraryStr, { addSpecialTokens: false });
    const recovered = decodeTokens(tokenized.tokenIds);
    assert.equal(recovered, arbitraryStr, 'Arbitrary byte sweep recovery failed');

    // Large payload (10,000 words)
    const largeStr = 'const x = CanonicalVector.fromArray([1.0, 2.0, 3.0]);\n'.repeat(500);
    const t0 = performance.now();
    const largeResult = tokenizeText(largeStr, { addSpecialTokens: false });
    const elapsed = performance.now() - t0;
    const decodedLarge = decodeTokens(largeResult.tokenIds);
    assert.equal(decodedLarge, largeStr);
    assert(elapsed < 200, `Tokenization took too long: ${elapsed}ms for 500 lines`);
  });
});
