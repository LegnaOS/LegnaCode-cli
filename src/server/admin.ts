/**
 * LegnaCode Admin WebUI — HTTP API + static file server.
 *
 * Bun.serve on port 3456. REST endpoints scoped by "claude" | "legna",
 * mapping to ~/.claude/ and ~/.legna/ respectively.
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, join, extname } from 'path'
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
    return json({ version: typeof MACRO !== 'undefined' ? MACRO.VERSION : '1.5.4' })
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

  // GET /api/:scope/sessions/:id/messages — read full JSONL session for chat viewer
  if (sub.startsWith('sessions/') && sub.endsWith('/messages') && method === 'GET') {
    const sessionId = sub.replace('sessions/', '').replace('/messages', '')
    return handleSessionMessages(dir, scope, sessionId)
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

      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
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
              // Streaming partial message — extract latest text delta
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
              // Complete assistant message — extract all blocks
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
        // Flush remaining buffer
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer)
            sendEvent('message', parsed)
          } catch {
            if (buffer.trim()) sendEvent('text', { content: buffer })
          }
        }
        sendEvent('done', { code })
        controller.close()
        if (activeChatProcess === child) activeChatProcess = null
      })

      child.on('error', (err) => {
        sendEvent('error', { content: err.message })
        controller.close()
        if (activeChatProcess === child) activeChatProcess = null
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

export async function startAdminServer(opts: { port?: number } = {}) {
  let port = opts.port || 3456

  // Auto-find available port if default is in use
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
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