/**
 * LegnaCode Office — WebSocket Message Hook
 *
 * Provides the same agent/tool state as useExtensionMessages but connects
 * to LegnaOfficeServer via WebSocket instead of VS Code postMessage.
 * Used by the Admin WebUI panel and standalone browser mode.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { OfficeState } from '../office/engine/officeState.js';
import type { ToolActivity } from '../office/types.js';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface AgentSnapshot {
  id: string;
  name?: string;
  state?: string;
  detail?: string;
  updatedAt?: number;
}

export type ConversationMsg = {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
  agentId?: number;
};

interface ServerMessageState {
  connectionState: ConnectionState;
  agents: number[];
  agentTools: Record<number, ToolActivity[]>;
  agentStatuses: Record<number, string>;
  connect: () => void;
}

export function useServerMessages(
  getOfficeState: () => OfficeState,
  wsUrl?: string,
  onConversationMessage?: (msg: ConversationMsg) => void,
  onConversationSnapshot?: (msgs: ConversationMsg[]) => void,
): ServerMessageState {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [agents, setAgents] = useState<number[]>([]);
  const [agentTools] = useState<Record<number, ToolActivity[]>>({});
  const [agentStatuses, setAgentStatuses] = useState<Record<number, string>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const agentIdMap = useRef(new Map<string, number>());
  let nextId = useRef(1);

  const resolveAgentId = useCallback((strId: string): number => {
    let num = agentIdMap.current.get(strId);
    if (num === undefined) {
      num = nextId.current++;
      agentIdMap.current.set(strId, num);
    }
    return num;
  }, []);

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    const os = getOfficeState();

    if (data.type === 'snapshot') {
      const snapshotAgents = (data.agents as AgentSnapshot[]) ?? [];
      const ids: number[] = [];
      const statuses: Record<number, string> = {};
      for (const a of snapshotAgents) {
        const id = resolveAgentId(a.id);
        ids.push(id);
        statuses[id] = a.state ?? 'idle';
        if (!os.characters.has(id)) {
          os.addAgent(id);
        }
      }
      setAgents(ids);
      setAgentStatuses(statuses);
      // Load conversation snapshot
      const snapshotMessages = (data.messages as ConversationMsg[]) ?? [];
      if (snapshotMessages.length > 0) {
        onConversationSnapshot?.(snapshotMessages);
      }
    } else if (data.type === 'agentUpdate') {
      const agent = data.agent as AgentSnapshot;
      const id = resolveAgentId(agent.id);
      setAgents(prev => prev.includes(id) ? prev : [...prev, id]);
      setAgentStatuses(prev => ({ ...prev, [id]: agent.state ?? 'idle' }));
      if (!os.characters.has(id)) {
        os.addAgent(id);
      }
    } else if (data.type === 'agentRemoved') {
      const agentId = data.agentId as string;
      const id = agentIdMap.current.get(agentId);
      if (id !== undefined) {
        setAgents(prev => prev.filter(a => a !== id));
        setAgentStatuses(prev => { const n = { ...prev }; delete n[id]; return n; });
        os.removeAgent(id);
        agentIdMap.current.delete(agentId);
      }
    } else if (data.type === 'conversation') {
      const msg = data.message as ConversationMsg;
      if (msg) {
        onConversationMessage?.(msg);
      }
    }
  }, [getOfficeState, resolveAgentId, onConversationMessage, onConversationSnapshot]);

  const connect = useCallback(() => {
    if (wsRef.current) return;
    const url = wsUrl ?? 'ws://127.0.0.1:3457/ws';
    const ws = new WebSocket(url);
    setConnectionState('connecting');

    ws.onopen = () => setConnectionState('connected');
    ws.onclose = () => { setConnectionState('disconnected'); wsRef.current = null; };
    ws.onerror = () => { setConnectionState('disconnected'); ws.close(); };
    ws.onmessage = (ev) => {
      try { handleMessage(JSON.parse(ev.data)); } catch {}
    };
    wsRef.current = ws;
  }, [wsUrl, handleMessage]);

  useEffect(() => {
    connect();
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [connect]);

  return { connectionState, agents, agentTools, agentStatuses, connect };
}
