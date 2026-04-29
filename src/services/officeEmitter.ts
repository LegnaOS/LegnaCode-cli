/**
 * LegnaCode Office — CLI Event Emitter
 *
 * Pushes agent events to the Office plugin on fixed port 19960.
 * No discovery file, no caching, no bullshit.
 */

import { homedir } from 'os';
import { join } from 'path';

const PORT = 19960;
const TOKEN_PATH = join(homedir(), '.legna-office', 'server.json');

let _token: string | null = null;
let _sessionId: string | null = null;

function getToken(): string | null {
  if (_token) return _token;
  try {
    const { readFileSync, existsSync } = require('fs');
    if (!existsSync(TOKEN_PATH)) return null;
    const raw = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    _token = raw.token ?? null;
    return _token;
  } catch {
    return null;
  }
}

async function post(path: string, body: Record<string, unknown>): Promise<void> {
  const token = getToken();
  try {
    await fetch(`http://127.0.0.1:${PORT}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Token might have changed after plugin reload
    _token = null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export function setSessionId(id: string): void {
  _sessionId = id;
}

export function emitOfficeEvent(hookName: string, data: Record<string, unknown> = {}): void {
  if (!_sessionId) return;
  post('/api/hooks/legna', {
    session_id: _sessionId,
    hook_name: hookName,
    ...data,
  });
}

export function emitConversation(role: 'user' | 'assistant' | 'tool', content: string, meta?: Record<string, unknown>): void {
  if (!_sessionId) return;
  post('/api/conversation', {
    session_id: _sessionId,
    role,
    content,
    timestamp: Date.now(),
    ...meta,
  });
}

/** Reset cached token (e.g., after plugin reload) */
export function resetOfficeEmitter(): void {
  _token = null;
}
