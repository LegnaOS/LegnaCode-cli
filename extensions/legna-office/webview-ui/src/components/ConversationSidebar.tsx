/**
 * LegnaCode Office — Conversation Sidebar
 *
 * Collapsible sidebar showing full conversation stream per agent.
 * Renders alongside the pixel office canvas.
 */

import { useState, useRef, useEffect } from 'react';
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
