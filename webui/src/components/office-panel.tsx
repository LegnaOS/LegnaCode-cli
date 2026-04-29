/**
 * LegnaCode Office — Admin WebUI Panel
 *
 * Lightweight office visualization embedded in legna admin.
 * Connects to LegnaOfficeServer via WebSocket for real-time updates.
 * Handles snapshot on connect, then incremental agentUpdate/conversation/agentRemoved.
 *
 * Connection strategy: exponential backoff (2s → 4s → 8s → ... → 60s max),
 * stops after 10 consecutive failures. Manual reconnect always available.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface AgentStatus {
  id: string;
  name: string;
  state: 'idle' | 'writing' | 'researching' | 'executing' | 'syncing' | 'error';
  detail: string;
  updatedAt: number;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'gave-up';

const STATE_EMOJI: Record<string, string> = {
  idle: '\u{1F4A4}', writing: '\u{2328}\u{FE0F}', researching: '\u{1F50D}',
  executing: '\u{26A1}', syncing: '\u{1F504}', error: '\u{274C}',
};

const STATE_LABEL_ZH: Record<string, string> = {
  idle: '待命', writing: '编码中', researching: '搜索中',
  executing: '执行中', syncing: '同步中', error: '出错',
};

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 60000;

export function OfficePanel() {
  const [conn, setConn] = useState<ConnectionState>('disconnected');
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);

  const scheduleReconnect = useCallback(() => {
    if (retriesRef.current >= MAX_RETRIES) {
      setConn('gave-up');
      return;
    }
    const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retriesRef.current), MAX_DELAY_MS);
    retriesRef.current++;
    reconnectTimer.current = setTimeout(() => doConnect(), delay);
  }, []);

  const doConnect = useCallback(async () => {
    if (wsRef.current) return;
    setConn('connecting');

    // Discover Office server port via Admin API
    let port: number;
    try {
      const res = await fetch('/api/office-port');
      const info = await res.json();
      if (!info.running || !info.port) {
        setConn('disconnected');
        scheduleReconnect();
        return;
      }
      port = info.port;
    } catch {
      setConn('disconnected');
      scheduleReconnect();
      return;
    }

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

    ws.onopen = () => {
      setConn('connected');
      retriesRef.current = 0;
    };
    ws.onclose = () => {
      setConn('disconnected');
      wsRef.current = null;
      scheduleReconnect();
    };
    ws.onerror = () => { ws.close(); };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'snapshot') {
          setAgents((data.agents as AgentStatus[]) ?? []);
          setMessages((data.messages as ConversationMessage[]) ?? []);
        } else if (data.type === 'agentUpdate') {
          setAgents(prev => {
            const idx = prev.findIndex(a => a.id === data.agent.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = data.agent; return next; }
            return [...prev, data.agent];
          });
        } else if (data.type === 'conversation') {
          setMessages(prev => [...prev.slice(-199), data.message]);
        } else if (data.type === 'agentRemoved') {
          setAgents(prev => prev.filter(a => a.id !== data.agentId));
        }
      } catch {}
    };
    wsRef.current = ws;
  }, [scheduleReconnect]);

  const manualConnect = useCallback(() => {
    retriesRef.current = 0;
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    doConnect();
  }, [doConnect]);

  useEffect(() => {
    doConnect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [doConnect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            conn === 'connected' ? 'bg-green-500' :
            conn === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            conn === 'gave-up' ? 'bg-red-500' : 'bg-gray-600'
          }`} />
          <span className="text-sm text-gray-400">
            {conn === 'connected' ? '已连接 LegnaCode Office' :
             conn === 'connecting' ? '连接中...' :
             conn === 'gave-up' ? 'Office 服务未运行' : '未连接'}
          </span>
        </div>
        <div className="flex gap-2">
          {(conn === 'disconnected' || conn === 'gave-up') && (
            <button onClick={manualConnect}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">
              重新连接
            </button>
          )}
          <button onClick={() => setShowChat(!showChat)}
            className={`px-3 py-1 text-xs ${showChat ? 'bg-yellow-600' : 'bg-gray-600'} hover:opacity-80 text-white rounded transition-colors`}>
            {showChat ? '收起对话' : '展开对话'}
          </button>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {agents.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-gray-500 text-sm">
            {conn === 'connected' ? '暂无 Agent 活动' :
             conn === 'gave-up' ? '请先启动 LegnaCode Office 扩展或服务端' :
             '启动 LegnaCode Office 扩展后可查看 Agent 状态'}
          </div>
        ) : agents.map(agent => (
          <div key={agent.id} className="p-3 rounded-lg border border-gray-700 bg-gray-800/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{STATE_EMOJI[agent.state] ?? '❓'}</span>
              <span className="text-sm font-medium text-gray-200">{agent.name || `Agent ${agent.id.slice(0, 6)}`}</span>
              <span className="ml-auto text-xs text-gray-500">{STATE_LABEL_ZH[agent.state] ?? agent.state}</span>
            </div>
            <div className="text-xs text-gray-400 truncate">{agent.detail || '—'}</div>
          </div>
        ))}
      </div>

      {/* Conversation panel */}
      {showChat && (
        <div className="border border-gray-700 rounded-lg bg-gray-900/80 max-h-80 overflow-y-auto">
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-3 py-2 text-xs text-gray-400 font-medium">
            对话流
          </div>
          <div className="p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-gray-600 text-xs py-4">暂无对话消息</div>
            ) : messages.map(msg => (
              <div key={msg.id} className="text-xs">
                <span className={`font-medium ${
                  msg.role === 'user' ? 'text-blue-400' :
                  msg.role === 'assistant' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {msg.role === 'user' ? '用户' : msg.role === 'assistant' ? '助手' : `工具: ${msg.toolName ?? ''}`}
                </span>
                <span className="text-gray-600 ml-2">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                <div className="text-gray-300 mt-0.5 whitespace-pre-wrap break-words max-h-20 overflow-hidden">
                  {msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  );
}