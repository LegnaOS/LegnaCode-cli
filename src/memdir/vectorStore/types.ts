/**
 * Types for the DrawerStore vector memory system.
 * Adapted from mempalace's palace.py + miner.py.
 */

/** A single memory unit — the atomic storage element. */
export interface Drawer {
  /** Deterministic ID: sha256(wing + room + sourceFile + chunkIndex) */
  id: string
  /** Raw verbatim text content. Never summarized. */
  content: string
  /** Top-level partition (project slug or "_global" / "_team") */
  wing: string
  /** Topic within a wing (e.g. "architecture", "decisions", "user") */
  room: string
  /** Original source file path (relative) */
  sourceFile?: string
  /** Chunk index within the source file */
  chunkIndex?: number
  /** Importance score 0.0–1.0 (default 0.5) */
  importance: number
  /** Who created this drawer */
  addedBy: string
  /** ISO timestamp when filed */
  filedAt: string
  /** Source file mtime for change detection */
  sourceMtime?: number
}

/** Metadata filter for narrowing search scope. */
export interface MetadataFilter {
  wing?: string
  room?: string
  minImportance?: number
}

/** A search result with similarity score. */
export interface SearchResult {
  drawer: Drawer
  /** Cosine similarity 0.0–1.0 */
  similarity: number
}

/** Write-Ahead Log entry for audit trail. */
export interface WalEntry {
  operation: 'insert' | 'update' | 'delete'
  drawerId: string
  timestamp: string
  agent: string
}

/** Stats for diagnostics. */
export interface StoreStats {
  totalDrawers: number
  wings: string[]
  rooms: string[]
  dbSizeBytes: number
}

/** Options for DrawerStore.search() */
export interface SearchOptions extends MetadataFilter {
  topK?: number
  /** Minimum similarity threshold (default 0.3) */
  minSimilarity?: number
}

/** Chunking options for ingest. */
export const CHUNK_SIZE = 800
export const CHUNK_OVERLAP = 100
export const MIN_CHUNK_SIZE = 50
