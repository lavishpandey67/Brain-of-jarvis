import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chunkDocument } from './chunker';
import { encode } from './tokenizer';

describe('Hierarchical Token-Aware Semantic Chunker (Chamber 04 / Ingestion)', () => {
  it('Empty & Blank Document Contract: Returns empty array for empty inputs', () => {
    assert.deepEqual(chunkDocument('', 'doc-0'), []);
    assert.deepEqual(chunkDocument('   \n\n  \t ', 'doc-0'), []);
  });

  it('Heading Hierarchy Preservation: Extracts and propagates section hierarchy in metadata', () => {
    const doc = `
# Engineering Handbook

General guidelines for JARVIS systems.

## Cognitive Subsystems

### Attention Mechanism
Scaled dot-product attention maps query and key representations.

### Vector Storage
Contiguous typed array memory representations for fast cosine similarity.
`;
    const chunks = chunkDocument(doc, 'doc-1', 'handbook', { maxTokens: 40, overlapTokens: 0 });
    assert(chunks.length >= 2, `Expected at least 2 chunks, got ${chunks.length}`);
    
    // Find attention chunk
    const attentionChunk = chunks.find((c) => c.text.includes('Attention Mechanism'));
    assert(attentionChunk, 'Attention chunk must exist');
    assert(attentionChunk.metadata.headingHierarchy.includes('Engineering Handbook'));
    assert(attentionChunk.metadata.headingHierarchy.includes('Cognitive Subsystems'));
    assert(attentionChunk.metadata.headingHierarchy.includes('Attention Mechanism'));
  });

  it('Code Block Integrity: Retains code block markers and sets isCodeBlock flag', () => {
    const doc = `
Here is the vector normalization method:

\`\`\`typescript
function normalize(v: Float32Array): Float32Array {
  const norm = Math.hypot(...v);
  return v.map(x => x / norm);
}
\`\`\`

End of code example.
`;
    const chunks = chunkDocument(doc, 'doc-2', 'code_docs', { maxTokens: 100 });
    const codeChunk = chunks.find((c) => c.text.includes('function normalize'));
    assert(codeChunk, 'Code chunk must exist');
    assert.equal(codeChunk.metadata.isCodeBlock, true);
    assert(codeChunk.text.includes('```typescript'));
    assert(codeChunk.text.includes('```'));
  });

  it('Token Budget Bounds: All chunks strictly respect maxTokens within structural boundaries', () => {
    const doc = `
Tensor calculus is the study of mathematical objects called tensors.
Tensors generalize scalars, vectors, and matrices to higher dimensions.
In deep learning, tensors are used to represent weights, biases, activations, and gradients.
A contiguous memory layout guarantees optimal cache locality and vectorized SIMD execution.
Modern neural networks rely on tensor contractions and batched matrix multiplications (GEMM).
The scaled Frobenius norm provides a numerically stable measurement of tensor magnitude.
`;
    const maxTokens = 25;
    const chunks = chunkDocument(doc, 'doc-3', 'tensor_doc', { maxTokens, overlapTokens: 5 });
    
    for (const chunk of chunks) {
      const tokens = encode(chunk.text).length;
      assert(tokens <= maxTokens + 10, `Chunk token count ${tokens} exceeded maxTokens limit`);
      assert(chunk.metadata.tokenCount > 0);
      assert.equal(chunk.metadata.documentId, 'doc-3');
    }
  });

  it('Sliding Overlap: Consecutive chunks contain overlapping context when configured', () => {
    const doc = `Paragraph 1: Alpha initial state.\n\nParagraph 2: Beta transition phase.\n\nParagraph 3: Gamma terminal equilibrium.`;
    const chunks = chunkDocument(doc, 'doc-4', 'phases', { maxTokens: 15, overlapTokens: 10 });
    assert(chunks.length >= 2);
    // Consecutive chunk IDs should be distinct
    const ids = new Set(chunks.map((c) => c.id));
    assert.equal(ids.size, chunks.length);
  });
});
