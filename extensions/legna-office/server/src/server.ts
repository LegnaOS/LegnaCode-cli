import * as crypto from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { pushMessage, getAllMessages } from './conversationStore.js';
import {
  HOOK_API_PREFIX,
  MAX_HOOK_BODY_SIZE,
  SERVER_JSON_DIR,
  SERVER_JSON_NAME,
} from './constants.js';

/** Discovery file written to ~/.legna-office/server.json so hook scripts can find the server. */
export interface ServerConfig {
  /** Port the HTTP server is listening on */
  port: number;
  /** PID of the process that owns the server */
  pid: number;
  /** Auth token required in Authorization header for hook requests */
  token: string;
  /** Join key for remote CLI instances to connect (shorter, shareable) */
  joinKey: string;
  /** Timestamp (ms) when the server started */
  startedAt: number;
}

/** Callback invoked when a hook event is received from a provider's hook script. */
type HookEventCallback = (providerId: string, event: Record<string, unknown>) => void;

/** Minimal WebSocket frame writer (RFC 6455). No external deps. */
function wsFrame(data: string): Buffer {
  const payload = Buffer.from(data, 'utf-8');
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

/** Unmask a WebSocket frame payload in-place (RFC 6455 §5.3). */
function wsUnmask(data: Buffer, mask: Buffer): void {
  for (let i = 0; i < data.length; i++) {
    data[i] ^= mask[i & 3];
  }
}

/**
 * HTTP server that receives hook events from CLI tool hook scripts.
 *
 * Routes:
 * - `POST /api/hooks/:providerId` -- hook event (auth required, 64KB body limit)
 * - `GET /api/health` -- health check (no auth)
 *
 * Discovery: writes `~/.legna-office/server.json` with port, PID, and auth token.
 * Multi-window: second VS Code window detects running server via server.json and
 * reuses it (does not start a second server).
 *
 * This will becomes the standalone server with added WebSocket and SPA serving.
 */
export class LegnaOfficeServer {
  private server: http.Server | null = null;
  private config: ServerConfig | null = null;
  private ownsServer = false;
  private callback: HookEventCallback | null = null;
  private startTime = Date.now();
  private wsClients = new Set<import('net').Socket>();
  private agentStates = new Map<string, Record<string, unknown>>();

  /** Register a callback for incoming hook events from any provider. */
  onHookEvent(callback: HookEventCallback): void {
    this.callback = callback;
  }

  /**
   * Start the HTTP server. If another instance is already running (detected via
   * server.json PID check), reuses that server's config without starting a new one.
   * @returns The server config (port, token) for hook script discovery.
   */
  async start(): Promise<ServerConfig> {
    // Check if another instance already has a server running
    const existing = this.readServerJson();
    if (existing && isProcessRunning(existing.pid)) {
      // Another VS Code window owns the server, reuse its config
      this.config = existing;
      this.ownsServer = false;
      console.log(
        `[LegnaCode Office] Reusing existing server on port ${existing.port} (PID ${existing.pid})`,
      );
      return existing;
    }

    // Start our own server on fixed port 19960
    const FIXED_PORT = 19960;
    const token = crypto.randomUUID();
    const joinKey = crypto.randomBytes(4).toString('hex'); // 8-char shareable key
    this.startTime = Date.now();

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          // Port occupied by stale process — try to kill it via server.json PID
          const stale = this.readServerJson();
          if (stale?.pid && stale.pid !== process.pid) {
            try { process.kill(stale.pid, 'SIGTERM'); } catch {}
          }
          // Retry after a short delay
          setTimeout(() => {
            this.server?.listen(FIXED_PORT, '127.0.0.1');
          }, 500);
        } else {
          reject(err);
        }
      });
      this.server.setTimeout(5000);

      // WebSocket upgrade handler
      this.server.on('upgrade', (req, socket, head) => {
        if (req.url !== '/ws') { socket.destroy(); return; }
        this.handleWsUpgrade(req, socket, head);
      });

      this.server.listen(FIXED_PORT, '127.0.0.1', () => {
        const addr = this.server?.address();
        if (addr && typeof addr === 'object') {
          this.config = {
            port: addr.port,
            pid: process.pid,
            token,
            joinKey,
            startedAt: this.startTime,
          };
          this.ownsServer = true;
          this.writeServerJson(this.config);
          // Replace startup error handler with runtime error handler
          this.server!.removeListener('error', reject);
          this.server!.on('error', (err) => {
            console.error(`[LegnaCode Office] Server: error: ${err}`);
          });
          console.log(`[LegnaCode Office] Server: listening on 127.0.0.1:${addr.port}`);
          resolve(this.config);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });
    });
  }

  /** Stop the HTTP server and clean up server.json (only if we own it). */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    // Only delete server.json if we own it (our PID)
    if (this.ownsServer) {
      this.deleteServerJson();
    }
    this.config = null;
    this.ownsServer = false;
  }

  /** Returns the current server config, or null if not started. */
  getConfig(): ServerConfig | null {
    return this.config;
  }

  /** Top-level request router. Dispatches to health or hook handler based on method + path. */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url ?? '';

    // CORS for admin panel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Health endpoint (no auth required)
    if (req.method === 'GET' && url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          pid: process.pid,
        }),
      );
      return;
    }

    // Join-key endpoint (auth required — only the local extension should see this)
    if (req.method === 'GET' && url === '/api/join-key') {
      if (!this.checkAuth(req)) { res.writeHead(401); res.end('unauthorized'); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ joinKey: this.config?.joinKey ?? '' }));
      return;
    }

    // State endpoint: current agent states + recent messages
    if (req.method === 'GET' && url === '/api/state') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        agents: Array.from(this.agentStates.values()),
        messages: getAllMessages().slice(-50),
      }));
      return;
    }

    // Layout persistence endpoints
    if (url === '/api/layout') {
      if (req.method === 'GET') {
        const layout = this.loadLayout();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(layout));
        return;
      }
      if (req.method === 'POST' || req.method === 'PUT') {
        if (!this.checkAuth(req)) { res.writeHead(401); res.end('unauthorized'); return; }
        this.handleLayoutSave(req, res);
        return;
      }
    }

    // Conversation endpoint: POST /api/conversation (auth required)
    if (req.method === 'POST' && url === '/api/conversation') {
      this.handleConversationRequest(req, res);
      return;
    }

    // Hook event endpoint: POST /api/hooks/:providerId
    if (req.method === 'POST' && url.startsWith(HOOK_API_PREFIX + '/')) {
      this.handleHookRequest(req, res, url);
      return;
    }

    res.writeHead(404);
    res.end();
  }

  /** Handle POST /api/hooks/:providerId. Validates auth, enforces body size limit, parses JSON. */
  private handleHookRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    url: string,
  ): void {
    if (!this.checkAuth(req)) { res.writeHead(401); res.end('unauthorized'); return; }

    // Extract and validate provider ID from URL: /api/hooks/claude -> "claude"
    const providerId = url.slice(HOOK_API_PREFIX.length + 1);
    if (!providerId || !/^[a-z0-9-]+$/.test(providerId)) {
      res.writeHead(400);
      res.end('invalid provider id');
      return;
    }

    // Read body with size limit and response guard
    let body = '';
    let bodySize = 0;
    let responded = false;

    req.on('data', (chunk: Buffer) => {
      bodySize += chunk.length;
      if (bodySize > MAX_HOOK_BODY_SIZE && !responded) {
        responded = true;
        res.writeHead(413);
        res.end('payload too large');
        req.destroy();
        return;
      }
      if (!responded) {
        body += chunk.toString();
      }
    });

    req.on('end', () => {
      if (responded) return;
      try {
        const event = JSON.parse(body) as Record<string, unknown>;
        // Normalize field name: CLI sends hook_name, Claude hook scripts send hook_event_name
        if (!event.hook_event_name && event.hook_name) {
          event.hook_event_name = event.hook_name;
        }
        if (event.session_id && event.hook_event_name) {
          this.callback?.(providerId, event);
        }
        res.writeHead(200);
        res.end('ok');
      } catch {
        res.writeHead(400);
        res.end('invalid json');
      }
    });
  }

  /** Handle POST /api/conversation. Stores message and broadcasts to WebSocket clients. */
  private handleConversationRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.checkAuth(req)) { res.writeHead(401); res.end('unauthorized'); return; }

    let body = '';
    let bodySize = 0;
    let responded = false;

    req.on('data', (chunk: Buffer) => {
      bodySize += chunk.length;
      if (bodySize > MAX_HOOK_BODY_SIZE && !responded) {
        responded = true; res.writeHead(413); res.end('payload too large'); req.destroy(); return;
      }
      if (!responded) body += chunk.toString();
    });

    req.on('end', () => {
      if (responded) return;
      try {
        const data = JSON.parse(body) as Record<string, unknown>;
        const sessionId = String(data.session_id ?? 'unknown');
        const role = data.role as 'user' | 'assistant' | 'tool';
        const content = String(data.content ?? '');
        const msg = pushMessage(sessionId, role, content, {
          toolName: data.tool_name as string | undefined,
          timestamp: data.timestamp as number | undefined,
        });
        this.broadcast({ type: 'conversation', message: msg });
        res.writeHead(200); res.end('ok');
      } catch {
        res.writeHead(400); res.end('invalid json');
      }
    });
  }

  /** Handle WebSocket upgrade on /ws (RFC 6455 handshake).
   *  Accepts connections with valid join-key (?key=xxx) or local connections without key. */
  private handleWsUpgrade(req: http.IncomingMessage, socket: import('net').Socket, _head: Buffer): void {
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }

    // Join-key auth: remote clients must provide ?key=<joinKey>
    // Local webview connections (same machine) are allowed without key
    const reqUrl = new URL(req.url ?? '/ws', `http://${req.headers.host ?? 'localhost'}`);
    const providedKey = reqUrl.searchParams.get('key');
    const isLocal = req.socket.remoteAddress === '127.0.0.1' || req.socket.remoteAddress === '::1';
    if (!isLocal && providedKey !== this.config?.joinKey) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    const accept = crypto.createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-5AB5DC11CE85')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n',
    );

    this.wsClients.add(socket);
    socket.on('close', () => this.wsClients.delete(socket));
    socket.on('error', () => { this.wsClients.delete(socket); socket.destroy(); });

    // Handle incoming frames (ping/pong, close)
    socket.on('data', (buf: Buffer) => {
      if (buf.length < 2) return;
      const opcode = buf[0] & 0x0f;
      if (opcode === 0x08) { // close
        this.wsClients.delete(socket);
        socket.end(Buffer.from([0x88, 0x00]));
      } else if (opcode === 0x09) { // ping → pong
        const pong = Buffer.from(buf);
        pong[0] = (pong[0] & 0xf0) | 0x0a;
        socket.write(pong);
      }
    });

    // Send current state snapshot on connect
    const snapshot = {
      type: 'snapshot',
      agents: Array.from(this.agentStates.values()),
      messages: getAllMessages().slice(-50),
    };
    socket.write(wsFrame(JSON.stringify(snapshot)));
  }

  /** Check Bearer token or join-key query param auth. */
  private checkAuth(req: http.IncomingMessage): boolean {
    const expectedToken = this.config?.token ?? '';
    const expectedJoinKey = this.config?.joinKey ?? '';
    const authHeader = req.headers.authorization ?? '';
    const authToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    // Bearer token
    if (authToken && expectedToken) {
      const a = Buffer.from(authToken), b = Buffer.from(expectedToken);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    }
    // Join-key from query param
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const keyParam = url.searchParams.get('key') ?? '';
    if (keyParam && expectedJoinKey) {
      const a = Buffer.from(keyParam), b = Buffer.from(expectedJoinKey);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    }
    return false;
  }

  /** Broadcast a JSON message to all connected WebSocket clients. */
  broadcast(data: Record<string, unknown>): void {
    if (this.wsClients.size === 0) return;
    const frame = wsFrame(JSON.stringify(data));
    for (const client of this.wsClients) {
      try { client.write(frame); } catch { this.wsClients.delete(client); }
    }
  }

  /** Update an agent's state and broadcast the change. */
  updateAgentState(agentId: string, state: Record<string, unknown>): void {
    const agent = { id: agentId, ...state, updatedAt: Date.now() };
    this.agentStates.set(agentId, agent);
    this.broadcast({ type: 'agentUpdate', agent });
  }

  /** Remove an agent and broadcast the removal. */
  removeAgent(agentId: string): void {
    this.agentStates.delete(agentId);
    this.broadcast({ type: 'agentRemoved', agentId });
  }

  /** Returns the absolute path to ~/.legna-office/server.json. */
  private getServerJsonPath(): string {
    return path.join(os.homedir(), SERVER_JSON_DIR, SERVER_JSON_NAME);
  }

  private getLayoutPath(): string {
    return path.join(os.homedir(), SERVER_JSON_DIR, 'layout.json');
  }

  /** Load persisted layout from ~/.legna-office/layout.json. Returns null if not found. */
  loadLayout(): Record<string, unknown> | null {
    try {
      const p = this.getLayoutPath();
      if (!fs.existsSync(p)) return null;
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch { return null; }
  }

  /** Handle POST /api/layout — save layout to disk. */
  private handleLayoutSave(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    let bodySize = 0;
    let responded = false;
    req.on('data', (chunk: Buffer) => {
      bodySize += chunk.length;
      if (bodySize > MAX_HOOK_BODY_SIZE && !responded) {
        responded = true; res.writeHead(413); res.end('payload too large'); req.destroy(); return;
      }
      if (!responded) body += chunk.toString();
    });
    req.on('end', () => {
      if (responded) return;
      try {
        const layout = JSON.parse(body);
        const p = this.getLayoutPath();
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        const tmp = p + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(layout, null, 2), { mode: 0o600 });
        fs.renameSync(tmp, p);
        this.broadcast({ type: 'layoutUpdate', layout });
        res.writeHead(200); res.end('ok');
      } catch {
        res.writeHead(400); res.end('invalid json');
      }
    });
  }

  /** Read and parse server.json. Returns null if missing or malformed. */
  private readServerJson(): ServerConfig | null {
    try {
      const filePath = this.getServerJsonPath();
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ServerConfig;
    } catch {
      return null;
    }
  }

  /** Write server.json atomically (tmp + rename) with mode 0o600. */
  private writeServerJson(config: ServerConfig): void {
    const filePath = this.getServerJsonPath();
    const dir = path.dirname(filePath);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
      // Atomic write with restricted permissions
      const tmpPath = filePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), { mode: 0o600 });
      fs.renameSync(tmpPath, filePath);
    } catch (e) {
      console.error(`[LegnaCode Office] Failed to write server.json: ${e}`);
    }
  }

  /** Delete server.json only if the PID inside matches our process (safe for multi-window). */
  private deleteServerJson(): void {
    try {
      const filePath = this.getServerJsonPath();
      if (!fs.existsSync(filePath)) return;
      // Only delete if our PID matches (don't delete another instance's server file)
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ServerConfig;
      if (existing.pid === process.pid) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // File may already be gone
    }
  }
}

/** Check if a process is alive by sending signal 0 (no-op, just checks existence). */
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
