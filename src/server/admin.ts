/**
 * LegnaCode Admin WebUI — HTTP API + static file server.
 *
 * Bun.serve on port 3456. REST endpoints scoped by "claude" | "legna",
 * mapping to ~/.claude/ and ~/.legna/ respectively.
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, copyFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { resolve, join, extname, basename } from 'path'
import { spawn, type ChildProcess } from 'child_process'
import { ADMIN_HTML, ADMIN_JS, ADMIN_CSS } from './admin-ui-html.js'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'
import { isInBundledMode } from '../utils/bundledMode.js'

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
    return json({ version: typeof MACRO !== 'undefined' ? MACRO.VERSION : '1.5.7' })
  }

  // POST /api/migrate
  if (parts[0] === 'migrate' && method === 'POST') {
    return handleMigrate(await req.json())
  }

  // POST /api/chat — live chat via SSE (must be before scope check)
  if (parts[0] === 'chat' && method === 'POST' && parts.length === 1) {
    const body = await req.json() as { message: string; cwd?: string; sessionId?: string }
    return handleChatSSE(body.message, body.cwd, body.sessionId)
  }

  // POST /api/chat/abort
  if (parts[0] === 'chat' && parts[1] === 'abort' && method === 'POST') {
    return handleChatAbort()
  }

  // ============================================================================
  // Project-level APIs (no scope prefix)
  // ============================================================================

  // GET /api/projects
  if (parts[0] === 'projects' && parts.length === 1 && method === 'GET') {
    return handleProjects()
  }

  // GET/PUT /api/projects/:id/memory
  if (parts[0] === 'projects' && parts[2] === 'memory') {
    const id = parts[1]!
    const filePath = parts.length > 3 ? parts.slice(3).join('/') : undefined
    if (method === 'GET') return handleProjectMemory(id, 'read', undefined, filePath)
    if (method === 'PUT') {
      const body = await req.json() as { content: string }
      return handleProjectMemory(id, 'write', body.content, filePath)
    }
  }

  // POST /api/projects/:id/migrate-local
  if (parts[0] === 'projects' && parts[2] === 'migrate-local' && method === 'POST') {
    return handleProjectMigrateLocal(parts[1]!)
  }

  // POST /api/projects/:id/restore
  if (parts[0] === 'projects' && parts[2] === 'restore' && method === 'POST') {
    return handleProjectRestore(parts[1]!)
  }

  // GET /api/graph
  if (parts[0] === 'graph' && parts.length === 1 && method === 'GET') {
    return handleGraph()
  }

  // Computer Use setup (CLI/WebUI)
  if (parts[0] === 'computer-use' && parts[1] === 'setup' && method === 'POST') {
    try {
      const { ensurePythonEnv } = await import('../utils/computerUse/pythonSetup.js')
      await ensurePythonEnv()
      return json({ ok: true })
    } catch (e: any) {
      return json({ ok: false, error: e.message }, 500)
    }
  }
  if (parts[0] === 'computer-use' && parts[1] === 'status' && method === 'GET') {
    try {
      const { isComputerUseSetup } = await import('../utils/computerUse/pythonSetup.js')
      const ready = await isComputerUseSetup()
      return json({ ready })
    } catch {
      return json({ ready: false })
    }
  }

  // Scoped endpoints: /api/:scope/...
  const scope = parts[0] as Scope
  if (scope !== 'claude' && scope !== 'legna') return err('Invalid scope', 404)
  const dir = scopeDir(scope)
  const sub = parts.slice(1).join('/')

  // GET /api/:scope/settings
  if (sub === 'settings' && method === 'GET') {
    try {
      const activeFile = getActiveProfile(dir)
      const data = JSON.parse(readFileSync(join(dir, activeFile), 'utf-8'))
      return json(data)
    } catch {
      return json({})
    }
  }

  // PUT /api/:scope/settings
  if (sub === 'settings' && method === 'PUT') {
    const body = await req.json()
    mkdirSync(dir, { recursive: true })
    const activeFile = getActiveProfile(dir)
    writeFileSync(join(dir, activeFile), JSON.stringify(body, null, 2) + '\n')
    // If active profile IS settings.json, no sync needed.
    // If it's a different file, also sync to settings.json so CLI picks it up.
    if (activeFile !== 'settings.json') {
      writeFileSync(join(dir, 'settings.json'), JSON.stringify(body, null, 2) + '\n')
    }
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

  // POST /api/:scope/profiles/clone
  if (sub === 'profiles/clone' && method === 'POST') {
    const { source, target } = await req.json() as { source: string; target: string }
    if (!target || !target.startsWith('settings') || !target.endsWith('.json')) {
      return err('文件名必须以 settings 开头，.json 结尾', 400)
    }
    const srcPath = join(dir, source)
    const dstPath = join(dir, target)
    if (!existsSync(srcPath)) return err('源配置不存在', 404)
    if (existsSync(dstPath)) return err('目标文件已存在', 409)
    try {
      copyFileSync(srcPath, dstPath)
      return json({ ok: true, filename: target })
    } catch (e: any) {
      return err(e.message, 500)
    }
  }

  // POST /api/:scope/profiles/create — create new profile with preset content
  if (sub === 'profiles/create' && method === 'POST') {
    const { filename, content } = await req.json() as { filename: string; content: Record<string, any> }
    if (!filename || !filename.startsWith('settings') || !filename.endsWith('.json')) {
      return err('文件名必须以 settings 开头，.json 结尾', 400)
    }
    const dstPath = join(dir, filename)
    if (existsSync(dstPath)) return err('目标文件已存在', 409)
    try {
      mkdirSync(dir, { recursive: true })
      writeFileSync(dstPath, JSON.stringify(content, null, 2) + '\n')
      return json({ ok: true, filename })
    } catch (e: any) {
      return err(e.message, 500)
    }
  }

  // GET /api/:scope/sessions
  if (sub === 'sessions' && method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    return handleSessions(dir, scope, limit)
  }

  // GET /api/:scope/sessions/:id/messages — read full JSONL session for chat viewer
  if (sub.startsWith('sessions/') && sub.endsWith('/messages') && method === 'GET') {
    const sessionId = sub.replace('sessions/', '').replace('/messages', '')
    return handleSessionMessages(dir, scope, sessionId)
  }

  return err('Not found', 404)
}

function handleProfiles(dir: string): Response {
  try {
    const activeProfile = getActiveProfile(dir)
    const files = readdirSync(dir).filter(f => f.startsWith('settings') && f.endsWith('.json'))
    const profiles = files.map(f => {
      try {
        const data = JSON.parse(readFileSync(join(dir, f), 'utf-8'))
        return {
          filename: f,
          baseUrl: data.env?.ANTHROPIC_BASE_URL || undefined,
          model: data.env?.ANTHROPIC_MODEL || data.env?.CLAUDE_MODEL || undefined,
          isActive: f === activeProfile,
        }
      } catch {
        return { filename: f, isActive: f === activeProfile }
      }
    })
    return json(profiles)
  } catch {
    return json([])
  }
}

function handleProfileSwitch(dir: string, filename: string): Response {
  const target = join(dir, filename)
  if (!existsSync(target)) return err('Profile not found', 404)
  // Write a pointer file instead of renaming — keeps original filenames intact
  try {
    writeFileSync(join(dir, '.active-profile'), filename)
    // Also copy content to settings.json so CLI reads the right config
    const content = readFileSync(target, 'utf-8')
    writeFileSync(join(dir, 'settings.json'), content)
    return json({ ok: true, active: filename })
  } catch (e: any) {
    return err(e.message, 500)
  }
}

/** Get the active profile filename (defaults to settings.json) */
function getActiveProfile(dir: string): string {
  const pointer = join(dir, '.active-profile')
  if (existsSync(pointer)) {
    const name = readFileSync(pointer, 'utf-8').trim()
    if (name && existsSync(join(dir, name))) return name
  }
  return 'settings.json'
}

function handleSessions(dir: string, scope: Scope, limit: number): Response {
  const historyPath = join(dir, 'projects')
  const sessions: any[] = []
  const seenIds = new Set<string>()

  // Helper: scan a directory of JSONL files and add sessions
  const scanDir = (sessionDir: string, proj: string, projectPathHint?: string) => {
    let files: string[]
    try { files = readdirSync(sessionDir).filter(f => f.endsWith('.jsonl')) } catch { return }
    for (const file of files) {
      const sessionId = file.replace('.jsonl', '')
      if (seenIds.has(sessionId)) continue
      seenIds.add(sessionId)
      const filePath = join(sessionDir, file)
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
              if (!cwd && entry.cwd) cwd = entry.cwd === '.' ? undefined : entry.cwd
              if (!slug && entry.slug) slug = entry.slug
            }
          } catch {}
        }
        if (!timestamp) continue
        const projectPath = cwd || projectPathHint || proj.replace(/-/g, '/')
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

  // 1. Scan global sessions: ~/.legna/projects/<slug>/*.jsonl
  try {
    const projects = readdirSync(historyPath)
    for (const proj of projects) {
      scanDir(join(historyPath, proj), proj)
    }
  } catch {}

  // 2. Scan project-local sessions: <realPath>/.legna/sessions/*.jsonl
  //    Use scanProjects() to find all known project paths
  for (const p of scanProjects()) {
    if (!p.path || !p.exists) continue
    const localDir = join(p.path, '.legna', 'sessions')
    if (existsSync(localDir)) {
      scanDir(localDir, p.id, p.path)
    }
  }

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

function handleSessionMessages(dir: string, scope: Scope, sessionId: string): Response {
  // Search for the JSONL file across all project directories
  const historyPath = join(dir, 'projects')
  try {
    const projects = readdirSync(historyPath)
    for (const proj of projects) {
      const filePath = join(historyPath, proj, `${sessionId}.jsonl`)
      if (existsSync(filePath)) {
        const raw = readFileSync(filePath, 'utf-8')
        const lines = raw.trim().split('\n').filter(Boolean)
        const messages: any[] = []
        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            // Normalize to UnifiedMessage-compatible format
            const msg: any = {
              uuid: entry.uuid || `${sessionId}-${messages.length}`,
              type: entry.type || 'user',
              timestamp: entry.timestamp || '',
              message: entry.message || undefined,
              toolCall: undefined,
            }

            // Extract tool_use blocks from assistant messages
            if (entry.type === 'assistant' && entry.message?.content) {
              const content = entry.message.content
              if (Array.isArray(content)) {
                const toolUse = content.find((b: any) => b.type === 'tool_use')
                if (toolUse) {
                  msg.type = 'assistant'
                  msg.toolCall = {
                    tool: toolUse.name,
                    status: 'completed',
                    input: toolUse.input,
                    content: [],
                  }
                }
                // Extract thinking blocks
                const thinking = content.find((b: any) => b.type === 'thinking')
                if (thinking && !toolUse) {
                  msg.type = 'assistant'
                  msg.thinking = thinking.thinking || thinking.text || ''
                }
              }
            }

            // Extract tool results
            if (entry.type === 'tool_result') {
              msg.type = 'tool_result'
              msg.toolResult = {
                tool_use_id: entry.tool_use_id,
                content: entry.content,
                is_error: entry.is_error || false,
              }
            }

            messages.push(msg)
          } catch {}
        }
        return json(messages)
      }
    }

    // Also check project-local sessions: <cwd>/.legna/sessions/
    // This is a best-effort search — we don't know the CWD here
    return err('Session not found', 404)
  } catch (e: any) {
    return err(e.message, 500)
  }
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

      // Auto-fill ANTHROPIC_MODEL from ANTHROPIC_DEFAULT_OPUS_MODEL if missing.
      // Claude Code configs typically set OPUS_MODEL but not ANTHROPIC_MODEL.
      // Without ANTHROPIC_MODEL, the CLI defaults to claude-opus-4-6 which
      // fails on third-party providers.
      try {
        const dstData = JSON.parse(readFileSync(dstFile, 'utf-8'))
        if (dstData.env && dstData.env.ANTHROPIC_DEFAULT_OPUS_MODEL && !dstData.env.ANTHROPIC_MODEL) {
          dstData.env.ANTHROPIC_MODEL = dstData.env.ANTHROPIC_DEFAULT_OPUS_MODEL
          writeFileSync(dstFile, JSON.stringify(dstData, null, 2) + '\n')
          migrated.push('env.ANTHROPIC_MODEL (auto-filled from OPUS)')
        }
      } catch {}
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

    // Migrate .mcp.json (MCP server config)
    const srcMcp = join(srcDir, '.mcp.json')
    const dstMcp = join(dstDir, '.mcp.json')
    if (existsSync(srcMcp) && !existsSync(dstMcp)) {
      copyFileSync(srcMcp, dstMcp)
      migrated.push('.mcp.json')
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
      copyFileSync(srcPath, dstPath)
    }
  }
}

/** Recursive copy with path rewriting for JSONL/JSON files */
function copyDirWithRewrite(src: string, dst: string, rewrite: (s: string) => string) {
  mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name)
    const dstPath = join(dst, entry.name)
    if (entry.isDirectory()) {
      copyDirWithRewrite(srcPath, dstPath, rewrite)
    } else if (!existsSync(dstPath)) {
      if (entry.name.endsWith('.jsonl') || entry.name.endsWith('.json')) {
        writeFileSync(dstPath, rewrite(readFileSync(srcPath, 'utf-8')))
      } else {
        copyFileSync(srcPath, dstPath)
      }
    }
  }
}

// ============================================================================
// Live Chat via subprocess — spawn `legna -p` and stream stdout as SSE
// ============================================================================

let activeChatProcess: ChildProcess | null = null

function handleChatSSE(message: string, cwd?: string, _sessionId?: string): Response {
  // Kill any existing chat process
  if (activeChatProcess) {
    activeChatProcess.kill('SIGTERM')
    activeChatProcess = null
  }

  // In bundled mode (compiled binary), process.execPath IS the binary.
  // In dev mode (node/bun running script), need process.argv[0] + process.argv[1].
  const bundled = isInBundledMode()
  const binaryPath = bundled ? process.execPath : process.argv[0]!
  const baseArgs = ['--print', '--output-format', 'stream-json', '--include-partial-messages']
  const args = bundled ? baseArgs : [process.argv[1]!, ...baseArgs]

  // Log spawn command for debugging
  console.log(`  [chat] spawn: ${binaryPath} ${args.join(' ')}`)

  const child = spawn(binaryPath, args, {
    cwd: cwd || process.cwd(),
    env: { ...process.env, NO_COLOR: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  activeChatProcess = child

  // Write message via stdin then close it
  child.stdin?.write(message)
  child.stdin?.end()

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let closed = false

      const sendEvent = (event: string, data: any) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch { /* controller already closed by client disconnect */ }
      }

      const closeOnce = () => {
        if (closed) return
        closed = true
        try { controller.close() } catch { /* already closed */ }
        if (activeChatProcess === child) activeChatProcess = null
      }

      let buffer = ''

      child.stdout?.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const parsed = JSON.parse(line)

            if (parsed.type === 'partial') {
              const content = parsed.message?.content
              if (Array.isArray(content)) {
                const lastText = content.filter((b: any) => b.type === 'text').pop()
                if (lastText?.text) {
                  sendEvent('partial', { content: lastText.text })
                }
                const lastThinking = content.filter((b: any) => b.type === 'thinking').pop()
                if (lastThinking?.thinking) {
                  sendEvent('thinking_partial', { content: lastThinking.thinking })
                }
              }
            } else if (parsed.type === 'assistant') {
              const content = parsed.message?.content
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text') {
                    sendEvent('text', { content: block.text || '' })
                  } else if (block.type === 'thinking') {
                    sendEvent('thinking', { content: block.thinking || '' })
                  } else if (block.type === 'tool_use') {
                    sendEvent('tool_use', { name: block.name, input: block.input, id: block.id })
                  }
                }
              }
            } else if (parsed.type === 'user') {
              const content = parsed.message?.content
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'tool_result') {
                    sendEvent('tool_result', {
                      tool_use_id: block.tool_use_id,
                      content: block.content,
                      is_error: block.is_error,
                    })
                  }
                }
              }
            } else if (parsed.type === 'result') {
              sendEvent('result', {
                session_id: parsed.session_id,
                cost: parsed.total_cost_usd,
                duration: parsed.duration_ms,
                result: parsed.result,
              })
            } else if (parsed.type === 'system') {
              sendEvent('system', { subtype: parsed.subtype, session_id: parsed.session_id })
            } else {
              sendEvent('message', parsed)
            }
          } catch {
            if (line.trim()) sendEvent('text', { content: line })
          }
        }
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString().trim()
        if (text) sendEvent('error', { content: text })
      })

      child.on('close', (code) => {
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer)
            sendEvent('message', parsed)
          } catch {
            if (buffer.trim()) sendEvent('text', { content: buffer })
          }
        }
        sendEvent('done', { code })
        closeOnce()
      })

      child.on('error', (err) => {
        sendEvent('error', { content: err.message })
        closeOnce()
      })
    },
    cancel() {
      child.kill('SIGTERM')
      if (activeChatProcess === child) activeChatProcess = null
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// ============================================================================
// Project APIs — scan, memory, migrate, restore, graph
// ============================================================================

interface ProjectInfo {
  id: string
  name: string
  path: string
  exists: boolean
  source: 'claude' | 'legna' | 'both'
  sessionCount: number
  lastActive: string | null
  memorySize: number | null
  migratedLocal: boolean
}

function unsanitizePath(slug: string): string {
  // Naive reverse: -Users-legna-foo → /Users/legna/foo
  // This is a fallback — prefer reading cwd from JSONL files directly.
  return slug.replace(/^-/, '/').replace(/-/g, '/')
}

/** Read the real project path from the first JSONL file's cwd field */
function resolveProjectPath(slug: string, projectDir: string): string {
  try {
    const files = readdirSync(projectDir).filter(f => f.endsWith('.jsonl'))
    for (const f of files) {
      try {
        const head = readFileSync(join(projectDir, f), 'utf-8').split('\n')[0] || ''
        const match = head.match(/"cwd"\s*:\s*"([^"]+)"/)
        if (match && match[1]) {
          if (match[1] === '.') {
            // Relative path — this is a migrated project. The real path is
            // the project directory that contains .legna/sessions/ with this file,
            // OR we can derive it from the slug (which was the original sanitized path).
            // Try to find the project by scanning known locations.
            continue
          }
          return match[1]
        }
      } catch {}
    }
  } catch {}

  // For migrated projects, also check if there's a .legna/sessions/ dir
  // that contains JSONL files with cwd:"." — the project path IS the parent
  // of .legna/. Scan common parent directories.
  const unsanitized = unsanitizePath(slug)
  if (existsSync(unsanitized)) return unsanitized

  // Try to find project-local .legna/sessions/ by checking if the slug
  // corresponds to a real directory that has .legna/ inside
  if (existsSync(join(unsanitized, '.legna', 'sessions'))) return unsanitized

  return unsanitized
}

function scanProjects(): ProjectInfo[] {
  const home = process.env.HOME || ''
  const claudeProjects = join(home, '.claude', 'projects')
  const legnaProjects = join(home, '.legna', 'projects')
  const projectMap = new Map<string, ProjectInfo>()

  for (const [dir, source] of [[claudeProjects, 'claude'], [legnaProjects, 'legna']] as const) {
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const slug = entry.name
      const projectDir = join(dir, slug)
      const projectPath = resolveProjectPath(slug, projectDir)

      // Count sessions (JSONL files)
      let sessionCount = 0
      let lastActive: string | null = null
      try {
        const files = readdirSync(projectDir).filter(f => f.endsWith('.jsonl'))
        sessionCount = files.length
        for (const f of files) {
          try {
            const st = statSync(join(projectDir, f))
            const mtime = st.mtime.toISOString()
            if (!lastActive || mtime > lastActive) lastActive = mtime
          } catch {}
        }
      } catch {}

      // Check memory
      let memorySize: number | null = null
      const memDir = join(projectDir, 'memory')
      const memFile = join(memDir, 'MEMORY.md')
      if (existsSync(memFile)) {
        try { memorySize = statSync(memFile).size } catch {}
      }

      // Check if already migrated to project-local .legna/
      const migratedLocal = existsSync(join(projectPath, '.legna', 'sessions'))

      const existing = projectMap.get(slug)
      if (existing) {
        existing.source = 'both'
        existing.sessionCount += sessionCount
        if (lastActive && (!existing.lastActive || lastActive > existing.lastActive)) {
          existing.lastActive = lastActive
        }
        if (memorySize !== null && (existing.memorySize === null || memorySize > existing.memorySize)) {
          existing.memorySize = memorySize
        }
      } else {
        projectMap.set(slug, {
          id: slug,
          name: basename(projectPath),
          path: projectPath,
          exists: existsSync(projectPath),
          source,
          sessionCount,
          lastActive,
          memorySize,
          migratedLocal,
        })
      }
    }
  }

  return Array.from(projectMap.values()).sort((a, b) => {
    if (a.lastActive && b.lastActive) return b.lastActive.localeCompare(a.lastActive)
    if (a.lastActive) return -1
    if (b.lastActive) return 1
    return a.name.localeCompare(b.name)
  })
}

function handleProjects(): Response {
  return json(scanProjects())
}

function handleProjectMemory(id: string, mode: 'read' | 'write', content?: string, filePath?: string): Response {
  const home = process.env.HOME || ''
  const srcDir = existsSync(join(home, '.legna', 'projects', id)) ? join(home, '.legna', 'projects', id) : join(home, '.claude', 'projects', id)
  const projectPath = resolveProjectPath(id, srcDir)

  // All possible memory directories
  const memDirs = [
    join(projectPath, '.legna', 'memory'),
    join(home, '.legna', 'projects', id, 'memory'),
    join(home, '.claude', 'projects', id, 'memory'),
  ]

  if (mode === 'read' && !filePath) {
    // Return file tree of all memory files across all locations
    const fileTree: { path: string; relativePath: string; size: number; lastModified: string; isDir: boolean }[] = []
    const seen = new Set<string>()

    const scanDir = (dir: string, prefix: string) => {
      if (!existsSync(dir)) return
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name
        if (seen.has(rel)) continue
        seen.add(rel)
        const full = join(dir, entry.name)
        try {
          const st = statSync(full)
          fileTree.push({
            path: full,
            relativePath: rel,
            size: st.isFile() ? st.size : 0,
            lastModified: st.mtime.toISOString(),
            isDir: entry.isDirectory(),
          })
          if (entry.isDirectory()) scanDir(full, rel)
        } catch {}
      }
    }

    for (const d of memDirs) scanDir(d, '')
    return json({ files: fileTree })
  }

  if (mode === 'read' && filePath) {
    // Read a specific file
    for (const d of memDirs) {
      const full = join(d, filePath)
      if (existsSync(full)) {
        try {
          const data = readFileSync(full, 'utf-8')
          const st = statSync(full)
          return json({ content: data, path: full, lastModified: st.mtime.toISOString(), size: st.size })
        } catch {}
      }
    }
    return json({ content: '', path: null, lastModified: null, size: 0 })
  }

  // Write
  const writePath = existsSync(projectPath)
    ? join(projectPath, '.legna', 'memory', filePath || 'MEMORY.md')
    : join(home, '.legna', 'projects', id, 'memory', filePath || 'MEMORY.md')

  try {
    mkdirSync(join(writePath, '..'), { recursive: true })
    writeFileSync(writePath, content || '')
    return json({ ok: true, path: writePath })
  } catch (e: any) {
    return err(e.message, 500)
  }
}

function handleProjectMigrateLocal(id: string): Response {
  const home = process.env.HOME || ''
  const srcDir = existsSync(join(home, '.legna', 'projects', id)) ? join(home, '.legna', 'projects', id) : join(home, '.claude', 'projects', id)
  const projectPath = resolveProjectPath(id, srcDir)

  if (!existsSync(projectPath)) {
    return err(`Project path does not exist: ${projectPath}`, 400)
  }

  const migrated: string[] = []
  const localLegna = join(projectPath, '.legna')
  mkdirSync(localLegna, { recursive: true })

  // Helper: replace absolute project path with relative in file content,
  // but PRESERVE "cwd" field values (LegnaCode uses cwd to locate sessions).
  // Only rewrite paths in other fields like fileStates, file references, etc.
  // Replace ALL absolute project paths with relative — including cwd.
  // Handles: Windows backslash paths, spaces, special chars, JSON-escaped paths.
  // LegnaCode runtime resolves "." back to current working directory.
  const rewritePaths = (content: string): string => {
    // Build variants of the project path that might appear in JSONL:
    // 1. Forward slash (Unix + JSON default)
    const fwd = projectPath.replace(/\\/g, '/')
    // 2. Backslash (Windows native, rare in JSON but possible)
    const bck = projectPath.replace(/\//g, '\\')
    // 3. JSON-escaped backslash (\\\\) — how Windows paths appear inside JSON strings
    const jsonBck = bck.replace(/\\/g, '\\\\')
    // 4. JSON-escaped forward slash (rare but some serializers do it)
    const jsonFwd = fwd.replace(/\//g, '\\/')

    // Escape for regex — handles spaces, parens, brackets, dots, etc.
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Replace each variant: path + separator → ./ , standalone path → .
    let result = content
    for (const variant of [fwd, bck, jsonBck, jsonFwd]) {
      const e = esc(variant)
      // Path followed by separator → ./
      result = result.replace(new RegExp(e + '[/\\\\]', 'g'), './')
      // Standalone path in quotes → "."
      result = result.replace(new RegExp('"' + e + '"', 'g'), '"."')
    }
    return result
  }

  // Migrate sessions (JSONL + subagents + tool-results) with path rewriting
  for (const src of ['legna', 'claude'] as const) {
    const srcDir = join(home, `.${src}`, 'projects', id)
    if (!existsSync(srcDir)) continue
    const dstDir = join(localLegna, 'sessions')
    mkdirSync(dstDir, { recursive: true })

    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
      // JSONL session files — rewrite paths
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const dstFile = join(dstDir, entry.name)
        if (!existsSync(dstFile)) {
          const raw = readFileSync(join(srcDir, entry.name), 'utf-8')
          writeFileSync(dstFile, rewritePaths(raw))
          migrated.push(`session:${entry.name}`)
        }
      }
      // Session subdirectories (subagents/, tool-results/) — recursive copy with path rewriting
      if (entry.isDirectory() && entry.name !== 'memory') {
        const srcSub = join(srcDir, entry.name)
        const dstSub = join(dstDir, entry.name)
        if (!existsSync(dstSub)) {
          copyDirWithRewrite(srcSub, dstSub, rewritePaths)
          migrated.push(`dir:${entry.name}/`)
        }
      }
    }
  }

  // Migrate memory (MEMORY.md, .consolidate-lock, etc.)
  for (const src of ['legna', 'claude'] as const) {
    const srcMem = join(home, `.${src}`, 'projects', id, 'memory')
    if (!existsSync(srcMem)) continue
    const dstMem = join(localLegna, 'memory')
    mkdirSync(dstMem, { recursive: true })
    for (const f of readdirSync(srcMem)) {
      const dstFile = join(dstMem, f)
      if (!existsSync(dstFile)) {
        copyFileSync(join(srcMem, f), dstFile)
        migrated.push(`memory:${f}`)
      }
    }
  }

  // Migrate project-level CLAUDE.md / LEGNA.md / settings.json
  for (const src of ['legna', 'claude'] as const) {
    const srcDir = join(home, `.${src}`, 'projects', id)
    if (!existsSync(srcDir)) continue
    for (const f of readdirSync(srcDir)) {
      if (f.endsWith('.jsonl') || f === 'memory') continue
      const srcFile = join(srcDir, f)
      try {
        const st = statSync(srcFile)
        if (!st.isFile()) continue
      } catch { continue }
      const dstFile = join(localLegna, f)
      if (!existsSync(dstFile)) {
        if (f.endsWith('.json') || f.endsWith('.jsonl')) {
          const raw = readFileSync(srcFile, 'utf-8')
          writeFileSync(dstFile, rewritePaths(raw))
        } else {
          copyFileSync(srcFile, dstFile)
        }
        migrated.push(`file:${f}`)
      }
    }
  }

  // Also check project-local .claude/ directory for CLAUDE.md, settings.json, etc.
  const projectClaudeDir = join(projectPath, '.claude')
  if (existsSync(projectClaudeDir)) {
    const items = ['CLAUDE.md', 'settings.json', 'settings.local.json', '.mcp.json']
    for (const f of items) {
      const srcFile = join(projectClaudeDir, f)
      if (!existsSync(srcFile)) continue
      const dstFile = join(localLegna, f === 'CLAUDE.md' ? 'LEGNA.md' : f)
      if (!existsSync(dstFile)) {
        copyFileSync(srcFile, dstFile)
        migrated.push(`claude-local:${f}`)
      }
    }
    // Copy skills/ and agents/ directories
    for (const dir of ['skills', 'agents', 'rules']) {
      const srcSub = join(projectClaudeDir, dir)
      if (!existsSync(srcSub)) continue
      const dstSub = join(localLegna, dir)
      if (!existsSync(dstSub)) {
        copyDirRecursive(srcSub, dstSub)
        migrated.push(`claude-local:${dir}/`)
      }
    }
  }

  // Save manifest for restore (records original absolute path)
  const manifest = {
    originalPath: projectPath,
    migratedAt: new Date().toISOString(),
    files: migrated,
  }
  writeFileSync(join(localLegna, '.migration-manifest.json'), JSON.stringify(manifest, null, 2))

  return json({ ok: true, migrated, manifest })
}

function handleProjectRestore(id: string): Response {
  const home = process.env.HOME || ''
  const srcDir = existsSync(join(home, '.legna', 'projects', id)) ? join(home, '.legna', 'projects', id) : join(home, '.claude', 'projects', id)
  const projectPath = resolveProjectPath(id, srcDir)
  const localLegna = join(projectPath, '.legna')
  const restored: string[] = []

  // Restore sessions back to ~/.claude/projects/
  const localSessions = join(localLegna, 'sessions')
  if (existsSync(localSessions)) {
    const dstDir = join(home, '.claude', 'projects', id)
    mkdirSync(dstDir, { recursive: true })
    for (const f of readdirSync(localSessions).filter(f => f.endsWith('.jsonl'))) {
      const dstFile = join(dstDir, f)
      if (!existsSync(dstFile)) {
        copyFileSync(join(localSessions, f), dstFile)
        restored.push(`session:${f}`)
      }
    }
  }

  return json({ ok: true, restored })
}

function handleGraph(): Response {
  const projects = scanProjects()

  // Build nodes
  const nodes = projects.map(p => ({
    id: p.id,
    name: p.name,
    path: p.path,
    exists: p.exists,
    sessionCount: p.sessionCount,
    lastActive: p.lastActive,
  }))

  // Build edges — projects active on the same day are linked
  const dayMap = new Map<string, string[]>() // day -> project ids
  for (const p of projects) {
    if (!p.lastActive) continue
    const day = p.lastActive.slice(0, 10) // YYYY-MM-DD
    if (!dayMap.has(day)) dayMap.set(day, [])
    dayMap.get(day)!.push(p.id)
  }

  const edgeSet = new Set<string>()
  const edges: { source: string; target: string; weight: number }[] = []
  const edgeWeights = new Map<string, number>()

  for (const [, ids] of dayMap) {
    if (ids.length < 2) continue
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join('|')
        edgeWeights.set(key, (edgeWeights.get(key) || 0) + 1)
      }
    }
  }

  for (const [key, weight] of edgeWeights) {
    const [source, target] = key.split('|')
    edges.push({ source: source!, target: target!, weight })
  }

  return json({ nodes, edges })
}

function handleChatAbort(): Response {
  if (activeChatProcess) {
    activeChatProcess.kill('SIGTERM')
    activeChatProcess = null
    return json({ ok: true, message: 'Chat aborted' })
  }
  return json({ ok: true, message: 'No active chat' })
}

// Serve the inlined SPA HTML for all non-API routes
function serveStatic(): Response {
  return new Response(ADMIN_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}

// ============================================================================
// Desktop API handlers — removed (no desktop client)
// ============================================================================

export async function startAdminServer(opts: { port?: number } = {}) {
  let port = opts.port || 3456

  // Auto-find available port if default is in use
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const server = Bun.serve({
        port,
        idleTimeout: 255,
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

          if (url.pathname === '/__admin__/app.js') {
            return new Response(ADMIN_JS, {
              headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable' },
            })
          }
          if (url.pathname === '/__admin__/app.css') {
            return new Response(ADMIN_CSS, {
              headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable' },
            })
          }

          if (url.pathname === '/health') {
            return new Response(JSON.stringify({ ok: true }), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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

      // Clean shutdown
      const shutdown = () => {
        server.stop()
        process.stdout.write('\x1b[2J\x1b[H')
        process.exit(0)
      }
      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)

      return server
    } catch (e: any) {
      if (e.code === 'EADDRINUSE') {
        console.log(`  Port ${port} in use, trying ${port + 1}...`)
        port++
        continue
      }
      throw e
    }
  }
  throw new Error(`Could not find available port (tried ${opts.port || 3456}–${port})`)
}

if (import.meta.main) {
  startAdminServer()
}