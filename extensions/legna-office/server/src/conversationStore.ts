/**
 * LegnaCode Office — Conversation Store
 *
 * Server-side ring buffer for conversation messages per agent session.
 * Stores the most recent N messages per session for sidebar display.
 */

const MAX_MESSAGES_PER_SESSION = 200;

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
  sessionId: string;
}

const store = new Map<string, ConversationMessage[]>();

let _idCounter = 0;

export function pushMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'tool',
  content: string,
  meta?: { toolName?: string; timestamp?: number },
): ConversationMessage {
  const msg: ConversationMessage = {
    id: `msg_${++_idCounter}`,
    role,
    content,
    timestamp: meta?.timestamp ?? Date.now(),
    toolName: meta?.toolName,
    sessionId,
  };

  let buf = store.get(sessionId);
  if (!buf) {
    buf = [];
    store.set(sessionId, buf);
  }
  buf.push(msg);
  if (buf.length > MAX_MESSAGES_PER_SESSION) {
    buf.splice(0, buf.length - MAX_MESSAGES_PER_SESSION);
  }
  return msg;
}

export function getMessages(sessionId: string): ConversationMessage[] {
  return store.get(sessionId) ?? [];
}

export function getAllMessages(): ConversationMessage[] {
  const all: ConversationMessage[] = [];
  for (const msgs of store.values()) {
    all.push(...msgs);
  }
  all.sort((a, b) => a.timestamp - b.timestamp);
  return all;
}

export function clearSession(sessionId: string): void {
  store.delete(sessionId);
}

export function clearAll(): void {
  store.clear();
}
