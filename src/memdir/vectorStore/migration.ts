/**
 * Migration — auto-migrate existing .legna/memory/*.md files into DrawerStore.
 * Runs once on first startup with the new system.
 */

import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'
import { DrawerStore, drawerId } from './drawerStore.js'
import { detectRoom, detectWing } from './roomDetector.js'
import type { Drawer } from './types.js'
import { CHUNK_SIZE, CHUNK_OVERLAP, MIN_CHUNK_SIZE } from './types.js'
import { logForDebugging } from '../../utils/debug.js'

/**
 * Chunk text into overlapping segments.
 * Adapted from mempalace's exchange-pair chunking but generalized.
 */
function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + size, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk.length >= MIN_CHUNK_SIZE) {
      chunks.push(chunk)
    }
    start += size - overlap
  }
  return chunks
}

/**
 * Migrate all .md files from a memory directory into DrawerStore.
 */
export async function migrateMemoryFiles(
  memoryDir: string,
  store: DrawerStore,
  projectSlug?: string,
): Promise<{ migrated: number; skipped: number }> {
  let migrated = 0
  let skipped = 0

  let files: string[]
  try {
    files = (await readdir(memoryDir)).filter(f => f.endsWith('.md'))
  } catch {
    return { migrated: 0, skipped: 0 }
  }

  for (const file of files) {
    const filePath = join(memoryDir, file)
    try {
      const content = await readFile(filePath, 'utf-8')
      if (content.trim().length < MIN_CHUNK_SIZE) {
        skipped++
        continue
      }

      const fileStat = await stat(filePath)
      const wing = detectWing(filePath, projectSlug)
      const chunks = chunkText(content)

      const drawers: Drawer[] = chunks.map((chunk, idx) => ({
        id: drawerId(wing, detectRoom(chunk), file, idx),
        content: chunk,
        wing,
        room: detectRoom(chunk),
        sourceFile: file,
        chunkIndex: idx,
        importance: file.toLowerCase().includes('user') ? 0.8
          : file.toLowerCase().includes('identity') ? 0.9
          : 0.5,
        addedBy: 'migration',
        filedAt: new Date().toISOString(),
        sourceMtime: fileStat.mtimeMs,
      }))

      store.upsertMany(drawers, 'migration')
      migrated += drawers.length
      logForDebugging(`[migration] ${file} → ${drawers.length} drawers (wing=${wing})`)
    } catch (err) {
      logForDebugging(`[migration] Failed to migrate ${file}: ${err}`)
      skipped++
    }
  }

  logForDebugging(`[migration] Complete: ${migrated} drawers migrated, ${skipped} files skipped`)
  return { migrated, skipped }
}

/**
 * Extract identity text from user-type memory files for L0.
 */
export async function extractIdentity(memoryDir: string): Promise<string> {
  const candidates = ['USER.md', 'user.md', 'identity.md', 'IDENTITY.md']
  for (const name of candidates) {
    try {
      const content = await readFile(join(memoryDir, name), 'utf-8')
      if (content.trim()) {
        // Take first 400 chars as identity
        return content.trim().slice(0, 400)
      }
    } catch {
      // File doesn't exist, try next
    }
  }
  return ''
}
