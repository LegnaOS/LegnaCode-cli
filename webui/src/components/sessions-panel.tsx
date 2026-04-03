import { useState, useEffect, useMemo } from 'react'
import type { Scope, Session } from '../api/client'
import { getSessions } from '../api/client'

interface Props { scope: Scope }

export function SessionsPanel({ scope }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getSessions(scope).then(setSessions).catch(() => setSessions([])).finally(() => setLoading(false))
  }, [scope])

  const copyCmd = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  // Group sessions by project
  const grouped = useMemo(() => {
    const map = new Map<string, Session[]>()
    for (const s of sessions) {
      const key = s.projectPath || s.cwd || s.project || 'unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return Array.from(map.entries())
  }, [sessions])

  if (loading) return <div className="text-gray-500 text-sm">加载中...</div>

  if (sessions.length === 0) {
    return <div className="text-gray-500 text-sm">暂无会话记录</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-gray-300">
        会话记录 ({sessions.length}) · {grouped.length} 个项目
      </h2>
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {grouped.map(([project, items]) => (
          <div key={project}>
            <div className="text-xs text-blue-400 mb-1.5 truncate">{project}</div>
            <div className="space-y-1.5">
              {items.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-700 bg-gray-800/50">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500">
                      {s.slug && <span className="mr-2 text-gray-400">{s.slug}</span>}
                      {s.timestamp && <span className="mr-2">{new Date(s.timestamp).toLocaleString()}</span>}
                      <span>{s.promptCount} prompts</span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyCmd(s.resumeCommand, s.id)}
                    className="ml-3 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors shrink-0"
                  >
                    {copied === s.id ? '已复制' : '复制 resume'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
