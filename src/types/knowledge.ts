/**
 * PROJECT JARVIS: GRAPH 1 — 10M–50M KNOWLEDGE ENGINE TYPES
 * 
 * Formal data contracts for:
 * 1. Knowledge Units (KU) with token boundaries, vectors, and hierarchical metadata
 * 2. Strict provenance tracking (content hash, document lineage, revision history)
 * 3. PostgreSQL + pgvector storage schemas and query filters
 * 4. Multi-tier indexing (dense vector HNSW/IVFFlat, GIN lexical, B-tree metadata)
 * 5. Measurable scale benchmark profiles (10K -> 100K -> 1M -> 10M)
 */

export interface KnowledgeProvenance {
  source: string;
  contentHash: string;
  revision: number;
  parentDocumentId: string;
  ingestedAt: string;
  updatedAt: string;
  authorOrProcess: string;
}

export interface KnowledgeUnit<TMetadata = Record<string, unknown>> {
  id: string;
  documentId: string;
  chunkIndex: number;
  totalChunks: number;
  title?: string;
  content: string;
  headingHierarchy?: string[];
  tokenCount: number;
  charRange?: [number, number];
  embedding: Float32Array | number[];
  metadata: TMetadata;
  provenance: KnowledgeProvenance;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface KnowledgeFilter {
  documentId?: string | string[];
  source?: string | string[];
  isDeleted?: boolean;
  metadataMatch?: Record<string, unknown>;
  minTokenCount?: number;
  maxTokenCount?: number;
  customPredicate?: (metadata: Record<string, unknown>) => boolean;
}

export interface KnowledgeSearchOptions {
  topK?: number;
  minScore?: number;
  alpha?: number; // 1.0 = pure dense, 0.0 = pure lexical, 0.7 = standard hybrid
  filter?: KnowledgeFilter;
  useRRF?: boolean; // Reciprocal Rank Fusion
  rrfK?: number;    // Standard RRF smoothing constant (default 60)
  efSearch?: number; // HNSW search depth parameter
}

export interface KnowledgeSearchResult<TMetadata = Record<string, unknown>> {
  unit: KnowledgeUnit<TMetadata>;
  denseScore: number;
  lexicalScore: number;
  hybridScore: number;
  rank: number;
  provenance: KnowledgeProvenance;
}

export interface KnowledgeEngineStats {
  totalKnowledgeUnits: number;
  activeKnowledgeUnits: number;
  deletedKnowledgeUnits: number;
  distinctDocuments: number;
  dimension: number;
  vectorIndexType: 'HNSW' | 'IVFFLAT' | 'FLAT' | 'TIERED_PARTITION';
  lexicalIndexType: 'GIN_TSVECTOR' | 'BM25_INVERTED';
  metadataIndexType: 'BTREE_GIN_JSONB';
  estimatedStorageBytes: number;
  engineBackend: 'POSTGRESQL_PGVECTOR' | 'POSTGRESQL_EXTERNAL' | 'HYBRID_MEMORY_POSTGRES';
}

export interface KnowledgeScaleMetrics {
  scale: '10K' | '100K' | '1M' | '10M' | '50M';
  targetCount: number;
  actualCount: number;
  ingestionDurationMs: number;
  ingestionRatePerSec: number;
  queryP50LatencyMs: number;
  queryP95LatencyMs: number;
  queryP99LatencyMs: number;
  recallAt10: number; // Against ground-truth brute-force top-10
  memoryHeapUsedBytes: number;
  storageDiskBytes: number;
  indexBuildTimeMs: number;
  failuresEncountered: number;
  bottlenecksIdentified: string[];
}
