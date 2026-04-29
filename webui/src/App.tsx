import { useState, useEffect, useCallback } from 'react'
import type { Scope } from './api/client'
import { getVersion } from './api/client'
import { SettingsPanel } from './components/settings-panel'
import { ProfilesPanel } from './components/profiles-panel'
import { SessionsPanel } from './components/sessions-panel'
import { MigrationPanel } from './components/migration-panel'
import { ChatPanel } from './components/chat-panel'
import { ProjectsPanel } from './components/projects-panel'
import { MemoryPanel } from './components/memory-panel'
import { GraphPanel } from './components/graph-panel'

const TABS: { key: Scope; label: string }[] = [
  { key: 'claude', label: 'Claude' },
  { key: 'legna', label: 'LegnaCode' },
]

const PANELS = ['projects', 'chat', 'memory', 'graph', 'settings', 'profiles', 'sessions', 'migration'] as const
type Panel = typeof PANELS[number]

const PANEL_LABELS: Record<Panel, string> = {
  projects: '项目总览',
  chat: '聊天记录',
  memory: '记忆管理',
  graph: '关系图谱',
  settings: '配置编辑',
  profiles: '配置文件',
  sessions: '会话记录',
  migration: '配置迁移',
}

export default function App() {
  const [scope, setScope] = useState<Scope>('claude')
  const [panel, setPanel] = useState<Panel>('projects')
  const [version, setVersion] = useState('')

  useEffect(() => {
    getVersion().then(v => setVersion(v.version)).catch(() => {})
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-100">LegnaCode Admin</h1>
      </header>

      {/* Scope tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setScope(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              scope === t.key
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-500">~/.{t.key}/</span>
          </button>
        ))}
      </div>

      {/* Panel nav */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {PANELS.map(p => (
          <button
            key={p}
            onClick={() => setPanel(p)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              panel === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {PANEL_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {panel === 'projects' && <ProjectsPanel />}
      {panel === 'chat' && <ChatPanel scope={scope} />}
      {panel === 'memory' && <MemoryPanel />}
      {panel === 'graph' && <GraphPanel />}
      {panel === 'settings' && <SettingsPanel scope={scope} />}
      {panel === 'profiles' && <ProfilesPanel scope={scope} />}
      {panel === 'sessions' && <SessionsPanel scope={scope} />}
      {panel === 'migration' && <MigrationPanel />}
    </div>
  )
}
