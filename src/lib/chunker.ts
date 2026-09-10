/**
 * PROJECT JARVIS: BRAIN-001 KNOWLEDGE INGESTION
 * Hierarchical Token-Aware Semantic Chunker
 * 
 * Invariants & Capabilities:
 * 1. HIERARCHICAL SPLITTING: Respects markdown headings (#, ##, ###), code fences (```),
 *    tables (|), bullet lists, and double newlines.
 * 2. TOKEN BUDGET INTEGRITY: Chunks are bounded by token counts calculated via the canonical tokenizer,
 *    preventing context budget overflow.
 * 3. CONTROLLED SLIDING OVERLAP: Configurable overlap (in tokens) between consecutive chunks
 *    to preserve semantic continuity across boundaries.
 * 4. PROVENANCE & CONTEXT PRESERVATION: Each chunk retains its parent document ID,
 *    current heading hierarchy, chunk sequence index, character byte offsets, and token count.
 */

import { encode } from './tokenizer';

export interface ChunkMetadata {
  documentId: string;
  chunkIndex: number;
  totalChunks: number;
  headingHierarchy: string[];
  tokenCount: number;
  charRange: [number, number];
  isCodeBlock: boolean;
  hasTable: boolean;
  source: string;
}

export interface Chunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

export interface ChunkerOptions {
  maxTokens?: number;
  overlapTokens?: number;
  minTokens?: number;
}

/**
 * Fast deterministic hash for chunk ID generation.
 */
function hashChunkContent(content: string, docId: string, index: number): string {
  let h = 0x811c9dc5;
  const str = `${docId}:${index}:${content}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `CHK-${(h >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Token-aware semantic chunker that splits documents while respecting document hierarchy.
 */
export function chunkDocument(
  text: string,
  documentId: string,
  source: string = 'knowledge_base',
  options: ChunkerOptions = {}
): Chunk[] {
  const maxTokens = options.maxTokens ?? 200;
  const overlapTokens = options.overlapTokens ?? 30;
  const minTokens = options.minTokens ?? 10;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split into structural blocks by lines while tracking code fences and headings
  const lines = text.split('\n');
  interface StructuralBlock {
    text: string;
    headingHierarchy: string[];
    isCode: boolean;
    isTable: boolean;
    startChar: number;
    endChar: number;
  }

  const blocks: StructuralBlock[] = [];
  let currentHeadingHierarchy: string[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let codeStartChar = 0;
  let currentBlockBuffer: string[] = [];
  let blockStartChar = 0;
  let runningCharPos = 0;

  const flushBlock = (isCode: boolean, isTable: boolean) => {
    const linesToFlush = isCode ? codeBlockBuffer : currentBlockBuffer;
    if (linesToFlush.length === 0) return;
    const blockText = linesToFlush.join('\n').trim();
    if (blockText.length > 0) {
      blocks.push({
        text: blockText,
        headingHierarchy: [...currentHeadingHierarchy],
        isCode,
        isTable,
        startChar: isCode ? codeStartChar : blockStartChar,
        endChar: runningCharPos,
      });
    }
    if (isCode) {
      codeBlockBuffer = [];
    } else {
      currentBlockBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineStart = runningCharPos;
    const lineEnd = runningCharPos + line.length;
    const trimmed = line.trim();

    // Code block fence toggle
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        // Flushing previous normal text
        flushBlock(false, false);
        inCodeBlock = true;
        codeStartChar = lineStart;
        codeBlockBuffer.push(line);
      } else {
        // Ending code block
        codeBlockBuffer.push(line);
        runningCharPos = lineEnd + 1;
        flushBlock(true, false);
        inCodeBlock = false;
        continue;
      }
    } else if (inCodeBlock) {
      codeBlockBuffer.push(line);
    } else if (trimmed.startsWith('#')) {
      // Heading encountered
      flushBlock(false, false);
      const match = trimmed.match(/^(#+)\s*(.*)$/);
      if (match) {
        const level = match[1]!.length;
        const headingTitle = match[2]!.trim();
        // Update hierarchy: keep only parents shallower than this level
        currentHeadingHierarchy = currentHeadingHierarchy.slice(0, level - 1);
        currentHeadingHierarchy[level - 1] = headingTitle;
      }
      blockStartChar = lineStart;
      currentBlockBuffer.push(line);
      flushBlock(false, false);
    } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Table row
      if (currentBlockBuffer.length > 0 && !currentBlockBuffer[0]?.trim().startsWith('|')) {
        flushBlock(false, false);
      }
      if (currentBlockBuffer.length === 0) {
        blockStartChar = lineStart;
      }
      currentBlockBuffer.push(line);
    } else if (trimmed === '') {
      // Empty line -> paragraph boundary
      if (currentBlockBuffer.length > 0) {
        const isTable = currentBlockBuffer[0]?.trim().startsWith('|') ?? false;
        flushBlock(false, isTable);
      }
    } else {
      if (currentBlockBuffer.length === 0) {
        blockStartChar = lineStart;
      }
      currentBlockBuffer.push(line);
    }

    runningCharPos = lineEnd + 1; // +1 for the newline
  }

  // Flush remaining buffers
  if (inCodeBlock) {
    flushBlock(true, false);
  } else {
    const isTable = currentBlockBuffer[0]?.trim().startsWith('|') ?? false;
    flushBlock(false, isTable);
  }

  // Now aggregate blocks into chunks bounded by maxTokens with overlapTokens
  const rawChunks: {
    text: string;
    headingHierarchy: string[];
    tokenCount: number;
    charRange: [number, number];
    isCodeBlock: boolean;
    hasTable: boolean;
  }[] = [];

  let currentChunkTokens: number = 0;
  let currentChunkTextParts: string[] = [];
  let currentChunkHeadings: string[] = [];
  let chunkStartChar = 0;
  let chunkEndChar = 0;
  let chunkHasCode = false;
  let chunkHasTable = false;

  const pushChunk = () => {
    if (currentChunkTextParts.length === 0) return;
    const chunkText = currentChunkTextParts.join('\n\n').trim();
    if (chunkText.length === 0) return;

    const tokenCount = encode(chunkText).length;
    if (tokenCount >= minTokens || rawChunks.length === 0) {
      rawChunks.push({
        text: chunkText,
        headingHierarchy: [...currentChunkHeadings],
        tokenCount,
        charRange: [chunkStartChar, chunkEndChar],
        isCodeBlock: chunkHasCode,
        hasTable: chunkHasTable,
      });
    }

    // Retain overlap if requested
    if (overlapTokens > 0 && currentChunkTextParts.length > 1) {
      let overlapBudget = overlapTokens;
      const preservedParts: string[] = [];
      for (let j = currentChunkTextParts.length - 1; j >= 0; j--) {
        const part = currentChunkTextParts[j]!;
        const partTokens = encode(part).length;
        if (overlapBudget >= partTokens) {
          preservedParts.unshift(part);
          overlapBudget -= partTokens;
        } else {
          break;
        }
      }
      currentChunkTextParts = preservedParts;
      currentChunkTokens = preservedParts.reduce((acc, p) => acc + encode(p).length, 0);
    } else {
      currentChunkTextParts = [];
      currentChunkTokens = 0;
    }

    currentChunkHeadings = [];
    chunkHasCode = false;
    chunkHasTable = false;
  };

  for (const block of blocks) {
    const blockTokens = encode(block.text).length;

    // If adding this block to the current chunk (plus any preserved overlap) exceeds maxTokens
    if (currentChunkTextParts.length > 0 && currentChunkTokens + blockTokens > maxTokens) {
      pushChunk();
      // If preserved overlap itself plus blockTokens still exceeds maxTokens, drop overlap
      if (currentChunkTokens + blockTokens > maxTokens) {
        currentChunkTextParts = [];
        currentChunkTokens = 0;
        currentChunkHeadings = [];
      }
    }

    // If a single block exceeds maxTokens (e.g. huge paragraph or huge code file)
    if (blockTokens > maxTokens) {
      if (currentChunkTextParts.length > 0) {
        pushChunk();
      }

      // Split large block by sentences or smaller lines
      const subLines = block.text.split('\n');
      let subBuffer: string[] = [];
      let subTokens = 0;

      for (const sLine of subLines) {
        const sTokens = encode(sLine).length;
        if (sTokens > maxTokens) {
          // If subBuffer has content, flush it first
          if (subBuffer.length > 0) {
            const sText = subBuffer.join('\n');
            rawChunks.push({
              text: sText,
              headingHierarchy: [...block.headingHierarchy],
              tokenCount: subTokens,
              charRange: [block.startChar, block.endChar],
              isCodeBlock: block.isCode,
              hasTable: block.isTable,
            });
            subBuffer = [];
            subTokens = 0;
          }
          // Split oversized line by words
          const words = sLine.split(' ');
          let wordBuffer: string[] = [];
          let wordTokens = 0;
          for (const w of words) {
            const wT = encode(w + ' ').length;
            if (wordTokens + wT > maxTokens && wordBuffer.length > 0) {
              const wText = wordBuffer.join(' ');
              rawChunks.push({
                text: wText,
                headingHierarchy: [...block.headingHierarchy],
                tokenCount: wordTokens,
                charRange: [block.startChar, block.endChar],
                isCodeBlock: block.isCode,
                hasTable: block.isTable,
              });
              wordBuffer = [];
              wordTokens = 0;
            }
            wordBuffer.push(w);
            wordTokens += wT;
          }
          if (wordBuffer.length > 0) {
            const wText = wordBuffer.join(' ');
            rawChunks.push({
              text: wText,
              headingHierarchy: [...block.headingHierarchy],
              tokenCount: wordTokens,
              charRange: [block.startChar, block.endChar],
              isCodeBlock: block.isCode,
              hasTable: block.isTable,
            });
          }
          continue;
        }

        if (subTokens + sTokens > maxTokens && subBuffer.length > 0) {
          const sText = subBuffer.join('\n');
          rawChunks.push({
            text: sText,
            headingHierarchy: [...block.headingHierarchy],
            tokenCount: subTokens,
            charRange: [block.startChar, block.endChar],
            isCodeBlock: block.isCode,
            hasTable: block.isTable,
          });
          subBuffer = [];
          subTokens = 0;
        }
        subBuffer.push(sLine);
        subTokens += sTokens;
      }

      if (subBuffer.length > 0) {
        const sText = subBuffer.join('\n');
        rawChunks.push({
          text: sText,
          headingHierarchy: [...block.headingHierarchy],
          tokenCount: subTokens,
          charRange: [block.startChar, block.endChar],
          isCodeBlock: block.isCode,
          hasTable: block.isTable,
        });
      }
      continue;
    }

    if (currentChunkTextParts.length === 0) {
      chunkStartChar = block.startChar;
    }

    for (const h of block.headingHierarchy) {
      if (!currentChunkHeadings.includes(h)) {
        currentChunkHeadings.push(h);
      }
    }

    currentChunkTextParts.push(block.text);
    currentChunkTokens += blockTokens;
    chunkEndChar = block.endChar;
    if (block.isCode) chunkHasCode = true;
    if (block.isTable) chunkHasTable = true;
  }

  if (currentChunkTextParts.length > 0) {
    pushChunk();
  }

  // Format final chunks with IDs and metadata
  const totalChunks = rawChunks.length;
  return rawChunks.map((rc, idx) => ({
    id: hashChunkContent(rc.text, documentId, idx),
    text: rc.text,
    metadata: {
      documentId,
      chunkIndex: idx,
      totalChunks,
      headingHierarchy: rc.headingHierarchy,
      tokenCount: rc.tokenCount,
      charRange: rc.charRange,
      isCodeBlock: rc.isCodeBlock,
      hasTable: rc.hasTable,
      source,
    },
  }));
}
