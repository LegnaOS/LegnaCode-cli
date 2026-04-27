/**
 * LegnaCode Office — CLI Event Emitter
 *
 * Reads ~/.legna-office/server.json to discover the local office server,
 * then pushes agent events (tool calls, conversation messages) via HTTP POST.
 *
 * Auto-detect + configurable: checks server.json on startup,
 * respects settings.legnaOffice.enabled.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface ServerConfig {
  port: number;
  pid: number;
  token: string;
  startedAt: number;
}

let _serverConfig: ServerConfig | null = null;
let _enabled: boolean | null = null;
let _sessionId: string | null = null;

const DISCOVERY_PATH = join(homedir(), '.legna-office', 'server.json');

function loadServerConfig(): ServerConfig | null {
  try {
    if (!existsSync(DISCOVERY_PATH)) return null;
    const raw = JSON.parse(readFileSync(DISCOVERY_PATH, 'utf-8'));
    if (!raw.port || !raw.token) return null;
    // Check if the server process is still alive
    try { process.kill(raw.pid, 0); } catch { return null; }
    return raw as ServerConfig;
  } catch {
    return null;
  }
}

function getConfig(): ServerConfig | null {
  if (_serverConfig === null) {
    _serverConfig = loadServerConfig();
  }
  return _serverConfig;
}

function isEnabled(): boolean {
  if (_enabled !== null) return _enabled;
  try {
    const { getInitialSettings } = require('../utils/settings/settings.js');
    const settings = getInitialSettings?.() ?? {};
    const office = settings.legnaOffice;
    if (office && typeof office === 'object') {
      if (office.enabled === false) { _enabled = false; return false; }
    }
  } catch {}
  _enabled = getConfig() !== null;
  return _enabled;
}

async function postEvent(path: string, body: Record<string, unknown>): Promise<void> {
  const config = getConfig();
  if (!config) return;
  try {
    await fetch(`http://127.0.0.1:${config.port}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Non-critical — don't break CLI flow
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export function setSessionId(id: string): void {
  _sessionId = id;
}

export function emitOfficeEvent(hookName: string, data: Record<string, unknown> = {}): void {
  if (!isEnabled() || !_sessionId) return;
  postEvent('/api/hooks/legna', {
    session_id: _sessionId,
    hook_name: hookName,
    ...data,
  });
}

export function emitConversation(role: 'user' | 'assistant' | 'tool', content: string, meta?: Record<string, unknown>): void {
  if (!isEnabled() || !_sessionId) return;
  postEvent('/api/conversation', {
    session_id: _sessionId,
    role,
    content,
    timestamp: Date.now(),
    ...meta,
  });
}

/** Reset cached state (e.g., when settings change) */
export function resetOfficeEmitter(): void {
  _serverConfig = null;
  _enabled = null;
}
