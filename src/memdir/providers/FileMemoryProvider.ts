/**
 * File Memory Provider — default built-in implementation.
 *
 * Now backed by DrawerStore (SQLite + TF-IDF vector search) with
 * 4-layer memory stack from mempalace architecture.
 * Falls back to plain .md file search when DrawerStore is not initialized.
 */

import { readFile, readdir, mkdir } from 'fs/promises'
import { join, basename } from 'path'
import { existsSync } from 'fs'
import { MemoryProvider, type ToolSchema } from './MemoryProvider.js'
import { getCwd } from '../../utils/cwd.js'
import { logForDebugging } from '../../utils/debug.js'
import { DrawerStore } from '../vectorStore/drawerStore.js'
import { LayeredStack } from '../vectorStore/layeredStack.js'
import { extractExchangePairs, pairsToDrawers } from '../vectorStore/exchangeExtractor.js'
import { migrateMemoryFiles, extractIdentity } from '../vectorStore/migration.js'

export class FileMemoryProvider extends MemoryProvider {
  readonly name = 'builtin'
  private memoryDir: string = ''
  private store: DrawerStore | null = null
  private stack: LayeredStack | null = null
  private projectSlug: string = '_project'

  isAvailable(): boolean {
    return true
  }

  async initialize(sessionId: string): Promise<void> {
    const cwd = getCwd()
    this.memoryDir = join(cwd, '.legna', 'memory')
    this.projectSlug = basename(cwd)
    await mkdir(this.memoryDir, { recursive: true })

    // Initialize DrawerStore
    const palaceDir = join(cwd, '.legna', '.palace')
    const dbPath = join(palaceDir, 'drawers.sqlite3')
    try {
      this.store = new DrawerStore(dbPath)
      const stats = this.store.stats()

      // Auto-migrate on first run (no drawers yet)
      if (stats.totalDrawers === 0) {
        logForDebugging('[FileMemoryProvider] First run — migrating .md files to DrawerStore...')
        const result = await migrateMemoryFiles(this.memoryDir, this.store, this.projectSlug)
        logForDebugging(`[FileMemoryProvider] Migration: ${result.migrated} drawers, ${result.skipped} skipped`)
      }

      // Build layered stack
      const identity = await extractIdentity(this.memoryDir)
      this.stack = new LayeredStack(this.store, identity)

      logForDebugging(`[FileMemoryProvider] Initialized with DrawerStore (${this.store.stats().totalDrawers} drawers) for session ${sessionId}`)
    } catch (err) {
      logForDebugging(`[FileMemoryProvider] DrawerStore init failed, falling back to plain files: ${err}`)
      this.store = null
      this.stack = null
    }
  }

  systemPromptBlock(): string {
    // Use layered stack wake-up (L0+L1) instead of full MEMORY.md
    if (this.stack) {
      const result = this.stack.wakeUp(this.projectSlug)
      if (result.text) {
        logForDebugging(`[FileMemoryProvider] Wake-up: ${result.tokenEstimate} tokens, ${result.drawerCount} drawers`)
        return result.text
      }
    }
    return ''
  }

  async prefetch(query: string): Promise<string> {
    // Use DrawerStore vector search (L2/L3) instead of keyword scan
    if (this.store && this.stack) {
      const drawers = this.stack.recallByQuery(query, this.projectSlug, 5)
      if (drawers.length > 0) {
        return this.stack.formatRecall(drawers, 'Relevant Context')
      }
    }

    // Fallback: plain keyword search
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    if (keywords.length === 0) return ''
    try {
      const files = (await readdir(this.memoryDir)).filter(f => f.endsWith('.md'))
      const matches: string[] = []
      for (const file of files) {
        const content = await readFile(join(this.memoryDir, file), 'utf-8')
        const lower = content.toLowerCase()
        const score = keywords.filter(kw => lower.includes(kw)).length
        if (score > 0) matches.push(`[${file}] ${content.slice(0, 200)}`)
      }
      if (matches.length > 0) return `Relevant memory:\n${matches.slice(0, 5).join('\n---\n')}`
    } catch {}
    return ''
  }

  async syncTurn(userContent: string, assistantContent: string): Promise<void> {
    logForDebugging(`[FileMemoryProvider] syncTurn (${userContent.length} + ${assistantContent.length} chars)`)
  }

  getToolSchemas(): ToolSchema[] {
    return []
  }

  async shutdown(): Promise<void> {
    if (this.store) {
      this.store.close()
      this.store = null
    }
    logForDebugging('[FileMemoryProvider] Shutdown')
  }

  onSessionEnd(messages: unknown[]): void {
    logForDebugging(`[FileMemoryProvider] Session ended with ${messages.length} messages`)
  }

  onPreCompress(messages: unknown[]): string {
    // Extract exchange pairs from messages about to be compressed
    // and save high-value ones to DrawerStore before they're lost.
    if (!this.store) return ''

    try {
      const simplified = (messages as any[])
        .filter(m => m.type === 'user' || m.type === 'assistant')
        .map(m => {
          const content = m.message?.content
          let text = ''
          if (typeof content === 'string') text = content
          else if (Array.isArray(content)) {
            text = content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join(' ')
          }
          return { type: m.type, content: text }
        })
        .filter(m => m.content.length > 20)

      const pairs = extractExchangePairs(simplified)
      const drawers = pairsToDrawers(pairs, this.projectSlug, `compact-${Date.now()}`)

      if (drawers.length > 0) {
        this.store.upsertMany(drawers, 'precompress')
        logForDebugging(`[FileMemoryProvider] onPreCompress: saved ${drawers.length} exchange pairs to DrawerStore`)
      }

      return drawers.length > 0
        ? `[Preserved ${drawers.length} key exchanges from compressed context]`
        : ''
    } catch (err) {
      logForDebugging(`[FileMemoryProvider] onPreCompress error: ${err}`)
      return ''
    }
  }
}
