/**
 * LegnaCode Office i18n system
 * Type-safe, hook-based, supports zh + en
 */

import { useState, useCallback, useMemo } from 'react';
import { zh } from './zh.js';
import { en } from './en.js';

export type Locale = 'zh' | 'en';

export interface I18nStrings {
  office: {
    title: string;
    idle: string;
    writing: string;
    researching: string;
    executing: string;
    syncing: string;
    error: string;
    thinking: string;
    waitingInput: string;
    connected: string;
    disconnected: string;
    agents: string;
    noAgents: string;
  };
  conversation: {
    title: string;
    collapse: string;
    expand: string;
    userMessage: string;
    assistantMessage: string;
    toolCall: string;
    toolResult: string;
    thinking: string;
    noMessages: string;
    clear: string;
  };
  settings: {
    title: string;
    language: string;
    sound: string;
    soundOn: string;
    soundOff: string;
    zoom: string;
    editMode: string;
    save: string;
    reset: string;
    close: string;
  };
  toolbar: {
    zoomIn: string;
    zoomOut: string;
    resetZoom: string;
    editLayout: string;
    settings: string;
    conversation: string;
    debug: string;
  };
}

const locales: Record<Locale, I18nStrings> = { zh, en };

function detectLocale(): Locale {
  // VS Code: vscode.env.language, Browser: navigator.language
  try {
    const nav = typeof navigator !== 'undefined' ? navigator.language : '';
    if (nav.startsWith('zh')) return 'zh';
  } catch {}
  return 'en';
}

export function useI18n(initial?: Locale) {
  const [locale, setLocale] = useState<Locale>(initial ?? detectLocale());
  const t = useMemo(() => locales[locale], [locale]);
  const toggle = useCallback(() => setLocale(l => l === 'zh' ? 'en' : 'zh'), []);
  return { t, locale, setLocale, toggle };
}
