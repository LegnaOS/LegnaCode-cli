/**
 * DrawerStore — SQLite-backed vector memory store with WAL audit trail.
 * Adapted from mempalace's palace.py. Uses bun:sqlite for zero-dependency persistence.
 */

import { Database } from 'bun:sqlite'
import { createHash } from 'crypto'
import { mkdirSync, existsSync, statSync } from 'fs'
import { dirname } from 'path'
import { TfidfVectorizer, cosineSimilarity } from './tfidfVectorizer.js'
import type {
  Drawer, SearchResult, SearchOptions, WalEntry, StoreStats, MetadataFilter,
} from './types.js'

/** Generate deterministic drawer ID. */
export function drawerId(wing: string, room: string, sourceFile: string, chunkIndex: number): string {
  return createHash('sha256')
    .update(`${wing}\0${room}\0${sourceFile}\0${chunkIndex}`)
    .digest('hex')
    .slice(0, 24)
}

export class DrawerStore {
  private db: Database
  private vectorizer: TfidfVectorizer
  private dirty = false

  constructor(dbPath: string) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    this.db = new Database(dbPath)
    this.db.exec('PRAGMA journal_mode=WAL')
    this.db.exec('PRAGMA synchronous=NORMAL')
    this.initSchema()
    this.vectorizer = new TfidfVectorizer()
    this.rebuildVectorizer()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS drawers (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        wing TEXT NOT NULL,
        room TEXT NOT NULL,
        source_file TEXT DEFAULT '',
        chunk_index INTEGER DEFAULT 0,
        importance REAL DEFAULT 0.5,
        added_by TEXT DEFAULT 'system',
        filed_at TEXT NOT NULL,
        source_mtime REAL DEFAULT 0
      )
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_drawers_wing ON drawers(wing)
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_drawers_room ON drawers(room)
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_drawers_importance ON drawers(importance DESC)
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL,
        drawer_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        agent TEXT DEFAULT 'system'
      )
    `)
    // IDF model cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS idf_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)
  }

  /** Rebuild TF-IDF vectorizer from all stored drawers. */
  private rebuildVectorizer(): void {
    const rows = this.db.query('SELECT content FROM drawers').all() as { content: string }[]
    if (rows.length === 0) return
    this.vectorizer.fit(rows.map(r => r.content))
    // Cache the IDF model
    this.db.query('INSERT OR REPLACE INTO idf_cache (key, value) VALUES (?, ?)')
      .run('idf_model', JSON.stringify(this.vectorizer.serialize()))
  }

  /** Upsert a drawer. Idempotent — same ID overwrites. */
  upsert(drawer: Drawer, agent = 'system'): void {
    this.db.query(`
      INSERT OR REPLACE INTO drawers
        (id, content, wing, room, source_file, chunk_index, importance, added_by, filed_at, source_mtime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      drawer.id, drawer.content, drawer.wing, drawer.room,
      drawer.sourceFile ?? '', drawer.chunkIndex ?? 0,
      drawer.importance, drawer.addedBy, drawer.filedAt,
      drawer.sourceMtime ?? 0,
    )
    // WAL
    this.db.query('INSERT INTO wal (operation, drawer_id, timestamp, agent) VALUES (?, ?, ?, ?)')
      .run('insert', drawer.id, new Date().toISOString(), agent)
    // Incremental IDF update
    this.vectorizer.addDocument(drawer.content)
    this.dirty = true
  }

  /** Bulk upsert for migration. */
  upsertMany(drawers: Drawer[], agent = 'system'): void {
    const tx = this.db.transaction(() => {
      for (const d of drawers) this.upsert(d, agent)
    })
    tx()
    if (this.dirty) this.rebuildVectorizer()
    this.dirty = false
  }

  /** Delete a drawer by ID. */
  delete(id: string, agent = 'system'): void {
    this.db.query('DELETE FROM drawers WHERE id = ?').run(id)
    this.db.query('INSERT INTO wal (operation, drawer_id, timestamp, agent) VALUES (?, ?, ?, ?)')
      .run('delete', id, new Date().toISOString(), agent)
  }

  /** Get a drawer by ID. */
  get(id: string): Drawer | null {
    const row = this.db.query('SELECT * FROM drawers WHERE id = ?').get(id) as any
    return row ? this.rowToDrawer(row) : null
  }

  /** Search drawers by vector similarity with optional metadata filtering. */
  search(query: string, opts: SearchOptions = {}): SearchResult[] {
    const topK = opts.topK ?? 10
    const minSim = opts.minSimilarity ?? 0.3

    // Build WHERE clause for metadata filtering
    const conditions: string[] = []
    const params: any[] = []
    if (opts.wing) { conditions.push('wing = ?'); params.push(opts.wing) }
    if (opts.room) { conditions.push('room = ?'); params.push(opts.room) }
    if (opts.minImportance) { conditions.push('importance >= ?'); params.push(opts.minImportance) }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = this.db.query(`SELECT * FROM drawers ${where}`).all(...params) as any[]

    if (rows.length === 0) return []

    // Vectorize query
    const queryVec = this.vectorizer.vectorize(query)

    // Score each candidate
    const results: SearchResult[] = []
    for (const row of rows) {
      const docVec = this.vectorizer.vectorize(row.content)
      const sim = cosineSimilarity(queryVec, docVec)
      if (sim >= minSim) {
        results.push({ drawer: this.rowToDrawer(row), similarity: sim })
      }
    }

    // Sort by similarity desc, take topK
    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, topK)
  }

  /** Get top drawers by importance (for L1 layer). */
  topByImportance(limit = 15, wing?: string): Drawer[] {
    const where = wing ? 'WHERE wing = ?' : ''
    const params = wing ? [limit, wing] : [limit]
    // Note: wing param goes before limit in the query if present
    const sql = wing
      ? 'SELECT * FROM drawers WHERE wing = ? ORDER BY importance DESC LIMIT ?'
      : 'SELECT * FROM drawers ORDER BY importance DESC LIMIT ?'
    const rows = this.db.query(sql).all(...(wing ? [wing, limit] : [limit])) as any[]
    return rows.map(r => this.rowToDrawer(r))
  }

  /** Get all unique wings. */
  wings(): string[] {
    return (this.db.query('SELECT DISTINCT wing FROM drawers').all() as { wing: string }[])
      .map(r => r.wing)
  }

  /** Get all unique rooms within a wing. */
  rooms(wing?: string): string[] {
    const sql = wing
      ? 'SELECT DISTINCT room FROM drawers WHERE wing = ?'
      : 'SELECT DISTINCT room FROM drawers'
    const rows = wing
      ? this.db.query(sql).all(wing) as { room: string }[]
      : this.db.query(sql).all() as { room: string }[]
    return rows.map(r => r.room)
  }

  /** Get store statistics. */
  stats(): StoreStats {
    const count = (this.db.query('SELECT COUNT(*) as c FROM drawers').get() as any).c
    return {
      totalDrawers: count,
      wings: this.wings(),
      rooms: this.rooms(),
      dbSizeBytes: existsSync(this.db.filename) ? statSync(this.db.filename).size : 0,
    }
  }

  /** Get WAL entries for audit. */
  walEntries(limit = 50): WalEntry[] {
    return this.db.query('SELECT * FROM wal ORDER BY id DESC LIMIT ?').all(limit) as WalEntry[]
  }

  /** Close the database. */
  close(): void {
    if (this.dirty) this.rebuildVectorizer()
    this.db.close()
  }

  private rowToDrawer(row: any): Drawer {
    return {
      id: row.id,
      content: row.content,
      wing: row.wing,
      room: row.room,
      sourceFile: row.source_file || undefined,
      chunkIndex: row.chunk_index ?? 0,
      importance: row.importance ?? 0.5,
      addedBy: row.added_by || 'system',
      filedAt: row.filed_at,
      sourceMtime: row.source_mtime || undefined,
    }
  }
}
