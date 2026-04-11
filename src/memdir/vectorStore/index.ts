/**
 * Vector Store — barrel export.
 * mempalace-inspired memory system for LegnaCode.
 */

export { DrawerStore, drawerId } from './drawerStore.js'
export { TfidfVectorizer, cosineSimilarity, tokenize } from './tfidfVectorizer.js'
export { LayeredStack } from './layeredStack.js'
export { KnowledgeGraph } from './knowledgeGraph.js'
export { detectRoom, detectWing } from './roomDetector.js'
export { extractExchangePairs, pairsToDrawers } from './exchangeExtractor.js'
export { migrateMemoryFiles, extractIdentity } from './migration.js'
export type {
  Drawer, SearchResult, SearchOptions, WalEntry, StoreStats, MetadataFilter,
} from './types.js'
