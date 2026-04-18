/**
 * Code Graph — lightweight symbol index for codebase structure awareness.
 *
 * Ported from AtomCode's code_graph.rs. Uses regex-based symbol extraction
 * (no tree-sitter dependency) for zero-install portability.
 *
 * Builds a symbol → file mapping + file → file dependency graph.
 * Persisted to <cwd>/.legna/.palace/graph.json (incremental mtime updates).
 * Injected into prefetch context so the agent knows file relationships.
 */

import { existsSync, statSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, relative, extname, basename } from 'path'
import { logForDebugging } from '../../utils/debug.js'

// ── Types ───────────────────────────────────────────────────────────

interface SymbolDef {
  name: string
  kind: 'function' | 'class' | 'interface' | 'type' | 'const' | 'export'
  file: string
  line: number
}

interface FileDeps {
  imports: string[]      // files this file imports from
  importedBy: string[]   // files that import this file
  symbols: string[]      // symbols defined in this file
  mtime: number
}

interface CodeGraphData {
  files: Record<string, FileDeps>
  symbols: Record<string, { file: string; kind: string; line: number }>
  buildTime: string
}

// ── Symbol Extraction (regex-based, no tree-sitter) ─────────────────

const SYMBOL_PATTERNS: Record<string, RegExp[]> = {
  '.ts': [
    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm,
    /^(?:export\s+)?class\s+(\w+)/gm,
    /^(?:export\s+)?interface\s+(\w+)/gm,
    /^(?:export\s+)?type\s+(\w+)\s*=/gm,
    /^(?:export\s+)?const\s+(\w+)\s*=/gm,
  ],
  '.tsx': [], // same as .ts, filled below
  '.js': [],
  '.jsx': [],
  '.py': [
    /^(?:async\s+)?def\s+(\w+)/gm,
    /^class\s+(\w+)/gm,
  ],
  '.go': [
    /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/gm,
    /^type\s+(\w+)\s+(?:struct|interface)/gm,
  ],
  '.rs': [
    /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/gm,
    /^(?:pub\s+)?struct\s+(\w+)/gm,
    /^(?:pub\s+)?trait\s+(\w+)/gm,
    /^(?:pub\s+)?enum\s+(\w+)/gm,
  ],
}
SYMBOL_PATTERNS['.tsx'] = SYMBOL_PATTERNS['.ts']!
SYMBOL_PATTERNS['.js'] = SYMBOL_PATTERNS['.ts']!
SYMBOL_PATTERNS['.jsx'] = SYMBOL_PATTERNS['.ts']!

const IMPORT_PATTERNS: Record<string, RegExp> = {
  '.ts': /(?:import|from)\s+['"]([^'"]+)['"]/g,
  '.tsx': /(?:import|from)\s+['"]([^'"]+)['"]/g,
  '.js': /(?:import|from)\s+['"]([^'"]+)['"]/g,
  '.jsx': /(?:import|from)\s+['"]([^'"]+)['"]/g,
  '.py': /(?:from\s+(\S+)\s+import|import\s+(\S+))/g,
  '.go': /^\s*"([^"]+)"/gm,
  '.rs': /(?:use\s+(?:crate::)?)([\w:]+)/g,
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'target',
  'vendor', '__pycache__', '.legna', '.claude', 'coverage',
])

const SUPPORTED_EXTS = new Set(Object.keys(SYMBOL_PATTERNS))

// ── CodeGraph Class ─────────────────────────────────────────────────

export class CodeGraph {
  private data: CodeGraphData
  private cwd: string
  private persistPath: string

  constructor(cwd: string) {
    this.cwd = cwd
    const palaceDir = join(cwd, '.legna', '.palace')
    this.persistPath = join(palaceDir, 'graph.json')
    this.data = { files: {}, symbols: {}, buildTime: '' }
    this.load()
  }

  /** Load persisted graph or build fresh */
  private load(): void {
    try {
      if (existsSync(this.persistPath)) {
        this.data = JSON.parse(readFileSync(this.persistPath, 'utf-8'))
      }
    } catch { /* rebuild */ }
  }

  /** Persist graph to disk */
  private save(): void {
    try {
      const dir = join(this.cwd, '.legna', '.palace')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(this.persistPath, JSON.stringify(this.data), 'utf-8')
    } catch (e) {
      logForDebugging(`[codeGraph] save error: ${e}`)
    }
  }

  /** Incremental build: only re-parse files with changed mtime */
  build(maxFiles = 500): void {
    const files = this.walkDir(this.cwd, maxFiles)
    let updated = 0

    for (const absPath of files) {
      const rel = relative(this.cwd, absPath)
      const ext = extname(absPath)
      try {
        const mtime = statSync(absPath).mtimeMs
        const existing = this.data.files[rel]
        if (existing && existing.mtime === mtime) continue

        const content = readFileSync(absPath, 'utf-8')
        const symbols = this.extractSymbols(content, ext, rel)
        const imports = this.extractImports(content, ext)

        // Update file entry
        this.data.files[rel] = {
          imports,
          importedBy: existing?.importedBy ?? [],
          symbols: symbols.map(s => s.name),
          mtime,
        }

        // Update symbol index
        for (const sym of symbols) {
          this.data.symbols[sym.name] = { file: rel, kind: sym.kind, line: sym.line }
        }
        updated++
      } catch { /* skip unreadable */ }
    }

    // Rebuild importedBy edges
    if (updated > 0) {
      for (const file of Object.keys(this.data.files)) {
        this.data.files[file]!.importedBy = []
      }
      for (const [file, deps] of Object.entries(this.data.files)) {
        for (const imp of deps.imports) {
          const resolved = this.resolveImport(imp, file)
          if (resolved && this.data.files[resolved]) {
            this.data.files[resolved]!.importedBy.push(file)
          }
        }
      }
      this.data.buildTime = new Date().toISOString()
      this.save()
      logForDebugging(`[codeGraph] Built: ${Object.keys(this.data.files).length} files, ${Object.keys(this.data.symbols).length} symbols, ${updated} updated`)
    }
  }

  /** Get file dependencies summary for prefetch injection */
  getFileSummary(filePath: string): string | null {
    const rel = relative(this.cwd, filePath).replace(/\\/g, '/')
    const entry = this.data.files[rel]
    if (!entry) return null

    const parts: string[] = []
    if (entry.symbols.length > 0) parts.push(`defines: ${entry.symbols.slice(0, 10).join(', ')}`)
    if (entry.imports.length > 0) parts.push(`imports: ${entry.imports.slice(0, 5).join(', ')}`)
    if (entry.importedBy.length > 0) parts.push(`used by: ${entry.importedBy.slice(0, 5).join(', ')}`)
    return parts.length > 0 ? `[Graph: ${rel}] ${parts.join(' | ')}` : null
  }

  /** Find callers of a symbol */
  traceCallers(symbolName: string): string[] {
    const def = this.data.symbols[symbolName]
    if (!def) return []
    const entry = this.data.files[def.file]
    return entry?.importedBy ?? []
  }

  /** Blast radius: files affected if this file changes */
  blastRadius(filePath: string): string[] {
    const rel = relative(this.cwd, filePath).replace(/\\/g, '/')
    const visited = new Set<string>()
    const queue = [rel]
    while (queue.length > 0) {
      const f = queue.pop()!
      if (visited.has(f)) continue
      visited.add(f)
      const entry = this.data.files[f]
      if (entry) {
        for (const dep of entry.importedBy) {
          if (!visited.has(dep)) queue.push(dep)
        }
      }
    }
    visited.delete(rel)
    return [...visited]
  }

  /** Get graph stats */
  get stats() {
    return {
      files: Object.keys(this.data.files).length,
      symbols: Object.keys(this.data.symbols).length,
      buildTime: this.data.buildTime,
    }
  }

  // ── Private helpers ─────────────────────────────────────────────

  private extractSymbols(content: string, ext: string, file: string): SymbolDef[] {
    const patterns = SYMBOL_PATTERNS[ext]
    if (!patterns) return []
    const symbols: SymbolDef[] = []
    for (const pattern of patterns) {
      const re = new RegExp(pattern.source, pattern.flags)
      let match: RegExpExecArray | null
      while ((match = re.exec(content)) !== null) {
        const name = match[1]
        if (!name || name.length < 2) continue
        const line = content.slice(0, match.index).split('\n').length
        const kind = this.inferKind(match[0])
        symbols.push({ name, kind, file, line })
      }
    }
    return symbols
  }

  private inferKind(matchText: string): SymbolDef['kind'] {
    if (/\bclass\b/.test(matchText)) return 'class'
    if (/\binterface\b/.test(matchText)) return 'interface'
    if (/\btype\b/.test(matchText)) return 'type'
    if (/\bfunction\b|\bfn\b|\bdef\b|\bfunc\b/.test(matchText)) return 'function'
    if (/\bconst\b/.test(matchText)) return 'const'
    return 'export'
  }

  private extractImports(content: string, ext: string): string[] {
    const pattern = IMPORT_PATTERNS[ext]
    if (!pattern) return []
    const re = new RegExp(pattern.source, pattern.flags)
    const imports: string[] = []
    let match: RegExpExecArray | null
    while ((match = re.exec(content)) !== null) {
      const imp = match[1] || match[2]
      if (imp && !imp.startsWith('.') === false) imports.push(imp)
      else if (imp) imports.push(imp)
    }
    return [...new Set(imports)]
  }

  private resolveImport(imp: string, fromFile: string): string | null {
    if (!imp.startsWith('.')) return null
    const dir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/')) : ''
    const resolved = join(dir, imp).replace(/\\/g, '/')
    // Try common extensions
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js']) {
      const candidate = resolved.endsWith(ext) ? resolved : resolved + ext
      if (this.data.files[candidate]) return candidate
    }
    return null
  }

  private walkDir(dir: string, maxFiles: number): string[] {
    const results: string[] = []
    const walk = (d: string) => {
      if (results.length >= maxFiles) return
      try {
        for (const entry of readdirSync(d, { withFileTypes: true })) {
          if (results.length >= maxFiles) return
          if (entry.isDirectory()) {
            if (!IGNORED_DIRS.has(entry.name)) walk(join(d, entry.name))
          } else if (SUPPORTED_EXTS.has(extname(entry.name))) {
            results.push(join(d, entry.name))
          }
        }
      } catch { /* permission denied etc */ }
    }
    walk(dir)
    return results
  }
}
