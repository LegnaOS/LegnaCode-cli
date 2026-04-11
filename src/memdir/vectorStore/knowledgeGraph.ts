/**
 * Temporal Knowledge Graph — SQLite-backed entity-relation store.
 * Adapted from mempalace's knowledge_graph.py.
 *
 * Stores triples (subject, predicate, object) with validity windows,
 * enabling "what was true on date X" queries.
 */

import { Database } from 'bun:sqlite'
import { mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'

export interface Entity {
  id: number
  name: string
  type: string
  properties: Record<string, unknown>
}

export interface Triple {
  id: number
  subject: string
  predicate: string
  object: string
  validFrom: string
  validTo: string | null
  confidence: number
  sourceDrawer: string | null
}

export class KnowledgeGraph {
  private db: Database

  constructor(dbPath: string) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.db = new Database(dbPath)
    this.db.exec('PRAGMA journal_mode=WAL')
    this.initSchema()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT DEFAULT 'unknown',
        properties TEXT DEFAULT '{}'
      )
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS triples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        valid_to TEXT DEFAULT NULL,
        confidence REAL DEFAULT 1.0,
        source_drawer TEXT DEFAULT NULL
      )
    `)
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_triples_subject ON triples(subject)')
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_triples_object ON triples(object)')
  }

  /** Add or update an entity. */
  upsertEntity(name: string, type: string, properties: Record<string, unknown> = {}): void {
    this.db.query(`
      INSERT INTO entities (name, type, properties) VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET type = ?, properties = ?
    `).run(name, type, JSON.stringify(properties), type, JSON.stringify(properties))
  }

  /** Add a triple (fact). Auto-invalidates previous conflicting triples. */
  addTriple(
    subject: string, predicate: string, object: string,
    opts?: { confidence?: number; sourceDrawer?: string },
  ): void {
    const now = new Date().toISOString()
    // Invalidate previous triples with same subject+predicate
    this.db.query(`
      UPDATE triples SET valid_to = ?
      WHERE subject = ? AND predicate = ? AND valid_to IS NULL
    `).run(now, subject, predicate)

    this.db.query(`
      INSERT INTO triples (subject, predicate, object, valid_from, confidence, source_drawer)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(subject, predicate, object, now, opts?.confidence ?? 1.0, opts?.sourceDrawer ?? null)
  }

  /** Query entity: what is true about subject at a given time? */
  queryEntity(name: string, asOf?: string): Triple[] {
    const time = asOf || new Date().toISOString()
    return this.db.query(`
      SELECT * FROM triples
      WHERE subject = ? AND valid_from <= ? AND (valid_to IS NULL OR valid_to > ?)
      ORDER BY confidence DESC
    `).all(name, time, time) as any[]
  }

  /** Find all entities related to a subject. */
  relatedEntities(name: string): string[] {
    const rows = this.db.query(`
      SELECT DISTINCT object FROM triples WHERE subject = ? AND valid_to IS NULL
      UNION
      SELECT DISTINCT subject FROM triples WHERE object = ? AND valid_to IS NULL
    `).all(name, name) as { object?: string; subject?: string }[]
    return rows.map(r => r.object || r.subject || '').filter(Boolean)
  }

  /** Invalidate a specific triple. */
  invalidate(tripleId: number): void {
    this.db.query('UPDATE triples SET valid_to = ? WHERE id = ?')
      .run(new Date().toISOString(), tripleId)
  }

  /** Get all current facts as formatted text. */
  currentFacts(limit = 20): string {
    const rows = this.db.query(`
      SELECT subject, predicate, object FROM triples
      WHERE valid_to IS NULL ORDER BY confidence DESC LIMIT ?
    `).all(limit) as { subject: string; predicate: string; object: string }[]
    return rows.map(r => `${r.subject} ${r.predicate} ${r.object}`).join('\n')
  }

  close(): void {
    this.db.close()
  }
}
