/**
 * LegnaCode Admin WebUI — HTTP API + static file server.
 *
 * Bun.serve on port 3456. REST endpoints scoped by "claude" | "legna",
 * mapping to ~/.claude/ and ~/.legna/ respectively.
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, join, extname } from 'path'
import { ADMIN_HTML } from './admin-ui-html.js'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'

type Scope = 'claude' | 'legna'

function scopeDir(scope: Scope): string {
  const home = process.env.HOME || process.env.USERPROFILE || '~'
  return scope === 'claude' ? resolve(home, '.claude') : getClaudeConfigHomeDir()
}

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status)
}

async function handleApi(req: Request, url: URL): Promise<Response> {
  const parts = url.pathname.replace(/^\/api\//, '').split('/')
  const method = req.method

  // GET /api/version
  if (parts[0] === 'version' && method === 'GET') {
    return json({ version: typeof MACRO !== 'undefined' ? MACRO.VERSION : '1.3.0' })
  }

  // POST /api/migrate
  if (parts[0] === 'migrate' && method === 'POST') {
    return handleMigrate(await req.json())
  }

  // Scoped endpoints: /api/:scope/...
  const scope = parts[0] as Scope
  if (scope !== 'claude' && scope !== 'legna') return err('Invalid scope', 404)
  const dir = scopeDir(scope)
  const sub = parts.slice(1).join('/')

  // GET /api/:scope/settings
  if (sub === 'settings' && method === 'GET') {
    try {
      const data = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf-8'))
      return json(data)
    } catch {
      return json({})
    }
  }

  // PUT /api/:scope/settings
  if (sub === 'settings' && method === 'PUT') {
    const body = await req.json()
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'settings.json'), JSON.stringify(body, null, 2) + '\n')
    return json({ ok: true })
  }

  // GET /api/:scope/profiles
  if (sub === 'profiles' && method === 'GET') {
    return handleProfiles(dir)
  }

  // POST /api/:scope/profiles/switch
  if (sub === 'profiles/switch' && method === 'POST') {
    const { filename } = await req.json() as { filename: string }
    return handleProfileSwitch(dir, filename)
  }

  // GET /api/:scope/sessions
  if (sub === 'sessions' && method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    return handleSessions(dir, scope, limit)
  }

  return err('Not found', 404)
}

function handleProfiles(dir: string): Response {
  try {
    const files = readdirSync(dir).filter(f => f.startsWith('settings') && f.endsWith('.json'))
    const profiles = files.map(f => {
      try {
        const data = JSON.parse(readFileSync(join(dir, f), 'utf-8'))
        return {
          filename: f,
          baseUrl: data.env?.ANTHROPIC_BASE_URL || undefined,
          model: data.env?.ANTHROPIC_MODEL || data.env?.CLAUDE_MODEL || undefined,
          isActive: f === 'settings.json',
        }
      } catch {
        return { filename: f, isActive: f === 'settings.json' }
      }
    })
    return json(profiles)
  } catch {
    return json([])
  }
}

function handleProfileSwitch(dir: string, filename: string): Response {
  const active = join(dir, 'settings.json')
  const target = join(dir, filename)
  if (!existsSync(target)) return err('Profile not found', 404)
  if (filename === 'settings.json') return json({ ok: true })
  const tmp = join(dir, `settings.tmp.${Date.now()}.json`)
  try {
    if (existsSync(active)) {
      renameSync(active, tmp)
      renameSync(target, active)
      renameSync(tmp, target)
    } else {
      renameSync(target, active)
    }
    return json({ ok: true })
  } catch (e: any) {
    return err(e.message, 500)
  }
}

function handleSessions(dir: string, scope: Scope, limit: number): Response {
  const historyPath = join(dir, 'projects')
  const sessions: any[] = []
  try {
    const projects = readdirSync(historyPath)
    for (const proj of projects) {
      const projDir = join(historyPath, proj)
      let files: string[]
      try { files = readdirSync(projDir).filter(f => f.endsWith('.jsonl')) } catch { continue }
      for (const file of files) {
        const sessionId = file.replace('.jsonl', '')
        const filePath = join(projDir, file)
        try {
          const raw = readFileSync(filePath, 'utf-8')
          const lines = raw.trim().split('\n').filter(Boolean)
          let timestamp = ''
          let cwd = ''
          let slug = ''
          let promptCount = 0
          for (const line of lines) {
            try {
              const entry = JSON.parse(line)
              if (entry.type === 'user') {
                promptCount++
                if (!timestamp && entry.timestamp) timestamp = entry.timestamp
                if (!cwd && entry.cwd) cwd = entry.cwd
                if (!slug && entry.slug) slug = entry.slug
              }
            } catch {}
          }
          if (!timestamp) continue
          const projectPath = cwd || proj.replace(/-/g, '/')
          sessions.push({
            id: sessionId,
            project: proj,
            projectPath,
            cwd,
            slug,
            timestamp,
            promptCount,
            resumeCommand: buildResumeCommand(projectPath, sessionId),
          })
        } catch {}
      }
    }
  } catch {}
  sessions.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
  return json(sessions.slice(0, limit))
}

function buildResumeCommand(cwd: string, sessionId: string): string {
  // Windows: cd /d "path" && legna --resume id
  // Unix: cd "path" && legna --resume id
  const isWin = process.platform === 'win32'
  const cd = isWin ? `cd /d "${cwd}"` : `cd "${cwd}"`
  return `${cd} && legna --resume ${sessionId}`
}

function handleMigrate(body: any): Response {
  const { from, to, fields } = body as { from: Scope; to: Scope; fields?: string[]; includeSessions?: boolean }
  if (!from || !to) return err('Missing from/to')
  const srcDir = scopeDir(from)
  const dstDir = scopeDir(to)
  const srcFile = join(srcDir, 'settings.json')
  const dstFile = join(dstDir, 'settings.json')
  const migrated: string[] = []
  try {
    mkdirSync(dstDir, { recursive: true })

    // Migrate settings
    if (existsSync(srcFile)) {
      const srcData = JSON.parse(readFileSync(srcFile, 'utf-8'))
      if (!fields || fields.length === 0) {
        writeFileSync(dstFile, JSON.stringify(srcData, null, 2) + '\n')
        migrated.push(...Object.keys(srcData))
      } else {
        let dstData: Record<string, any> = {}
        try { dstData = JSON.parse(readFileSync(dstFile, 'utf-8')) } catch {}
        for (const f of fields) {
          if (f in srcData) { dstData[f] = srcData[f]; migrated.push(f) }
        }
        writeFileSync(dstFile, JSON.stringify(dstData, null, 2) + '\n')
      }
    }

    // Migrate sessions (projects/ directory)
    if (body.includeSessions) {
      const srcProjects = join(srcDir, 'projects')
      const dstProjects = join(dstDir, 'projects')
      if (existsSync(srcProjects)) {
        copyDirRecursive(srcProjects, dstProjects)
        migrated.push('sessions')
      }
    }

    return json({ ok: true, migrated })
  } catch (e: any) {
    return err(e.message, 500)
  }
}

function copyDirRecursive(src: string, dst: string) {
  mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name)
    const dstPath = join(dst, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath)
    } else if (!existsSync(dstPath)) {
      // Only copy if not already exists (don't overwrite)
      copyFileSync(srcPath, dstPath)
    }
  }
}

// Serve the inlined SPA HTML for all non-API routes
function serveStatic(): Response {
  return new Response(ADMIN_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function startAdminServer(opts: { port?: number } = {}) {
  const port = opts.port || 3456

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)

      if (req.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      }

      if (url.pathname.startsWith('/api/')) {
        try {
          return await handleApi(req, url)
        } catch (e: any) {
          return err(e.message, 500)
        }
      }

      return serveStatic()
    },
  })

  console.log(`\n  LegnaCode Admin WebUI`)
  console.log(`  http://localhost:${port}`)
  console.log(`  Ctrl+C 退出\n`)

  // Try to open browser
  try {
    const { exec } = await import('child_process')
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
    exec(`${cmd} http://localhost:${port}`)
  } catch {}

  // Clean shutdown: stop server, clear output, restore terminal
  const shutdown = () => {
    server.stop()
    // Clear the lines we printed + move cursor to top-left
    process.stdout.write('\x1b[2J\x1b[H')
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return server
}

if (import.meta.main) {
  startAdminServer()
}