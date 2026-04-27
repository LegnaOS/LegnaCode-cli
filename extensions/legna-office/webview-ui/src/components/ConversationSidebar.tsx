/**
 * LegnaCode Office — Conversation Sidebar
 *
 * Collapsible sidebar showing full conversation stream per agent.
 * Renders alongside the pixel office canvas.
 */

import { useRef, useEffect } from 'react';
import type { Locale } from '../i18n/index.js';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
  agentId?: number;
}

interface Props {
  messages: ConversationMessage[];
  expanded: boolean;
  onToggle: () => void;
  locale: Locale;
}

const LABELS = {
  zh: { title: '对话', collapse: '收起', expand: '展开', user: '用户', assistant: '助手', tool: '工具', empty: '暂无消息' },
  en: { title: 'Chat', collapse: 'Collapse', expand: 'Expand', user: 'User', assistant: 'Assistant', tool: 'Tool', empty: 'No messages' },
} as const;

const ROLE_COLORS: Record<string, string> = {
  user: '#60a5fa',
  assistant: '#34d399',
  tool: '#fbbf24',
};

export function ConversationSidebar({ messages, expanded, onToggle, locale }: Props) {
  const l = LABELS[locale];
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!expanded) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'absolute', right: 8, top: 8, zIndex: 100,
          background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
          borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
        }}
      >
        {l.expand} {l.title}
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 320, zIndex: 90,
      background: '#0f172a', borderLeft: '1px solid #1e293b',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid #1e293b',
      }}>
        <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{l.title}</span>
        <button onClick={onToggle} style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12,
        }}>{l.collapse}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {messages.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 32 }}>
            {l.empty}
          </div>
        ) : messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ color: ROLE_COLORS[msg.role] ?? '#94a3b8', fontSize: 11, fontWeight: 600 }}>
                {msg.role === 'user' ? l.user : msg.role === 'assistant' ? l.assistant : `${l.tool}: ${msg.toolName ?? ''}`}
              </span>
              <span style={{ color: '#334155', fontSize: 10 }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div style={{
              color: '#cbd5e1', fontSize: 12, lineHeight: 1.4,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 80, overflow: 'hidden',
            }}>
              {msg.content.length > 300 ? msg.content.slice(0, 300) + '...' : msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
