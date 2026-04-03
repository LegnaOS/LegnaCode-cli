import { useState, useEffect } from 'react'
import type { Scope } from '../api/client'
import { getSettings, migrate } from '../api/client'

const FIELD_GROUPS = [
  { key: 'env', label: '环境变量 (env)' },
  { key: 'model', label: '模型配置 (model)' },
  { key: 'permissions', label: '权限模式 (permissions)' },
  { key: 'alwaysThinkingEnabled', label: '始终思考' },
  { key: 'skipDangerousModePermissionPrompt', label: '跳过确认' },
  { key: 'language', label: '语言' },
]

export function MigrationPanel() {
  const [from, setFrom] = useState<Scope>('claude')
  const [to, setTo] = useState<Scope>('legna')
  const [fromData, setFromData] = useState<Record<string, unknown>>({})
  const [toData, setToData] = useState<Record<string, unknown>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [includeSessions, setIncludeSessions] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    getSettings(from).then(setFromData).catch(() => setFromData({}))
    getSettings(to).then(setToData).catch(() => setToData({}))
  }, [from, to])

  const swap = () => { setFrom(to); setTo(from) }

  const toggleField = (key: string) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const doMigrate = async () => {
    setMigrating(true)
    setResult(null)
    try {
      const res = await migrate({
        from, to,
        fields: selected.length > 0 ? selected : undefined,
        includeSessions,
      })
      setResult(`迁移成功: ${res.migrated.join(', ')}`)
      getSettings(to).then(setToData).catch(() => {})
    } catch (e: any) {
      setResult(`迁移失败: ${e.message}`)
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-gray-300">从</span>
        <span className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-200">~/.{from}/</span>
        <button onClick={swap} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300">
          ⇄ 交换
        </button>
        <span className="text-sm text-gray-300">到</span>
        <span className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-200">~/.{to}/</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">源 (~/.{from}/settings.json)</h3>
          <pre className="text-xs bg-gray-900 p-3 rounded-lg overflow-auto max-h-48 text-gray-300">
            {JSON.stringify(fromData, null, 2) || '(空)'}
          </pre>
        </div>
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">目标 (~/.{to}/settings.json)</h3>
          <pre className="text-xs bg-gray-900 p-3 rounded-lg overflow-auto max-h-48 text-gray-300">
            {JSON.stringify(toData, null, 2) || '(空)'}
          </pre>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-gray-400 mb-2">选择迁移字段 (留空 = 全量迁移)</h3>
        <div className="flex flex-wrap gap-2">
          {FIELD_GROUPS.map(g => (
            <button
              key={g.key}
              onClick={() => toggleField(g.key)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selected.includes(g.key) ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={includeSessions}
            onChange={e => setIncludeSessions(e.target.checked)}
            className="rounded"
          />
          同时迁移会话记录 (projects/)
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={doMigrate}
          disabled={migrating}
          className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {migrating ? '迁移中...' : selected.length > 0 ? `迁移 ${selected.length} 个字段${includeSessions ? ' + 会话' : ''}` : `全量迁移${includeSessions ? ' + 会话' : ''}`}
        </button>
        {result && (
          <span className={`text-xs ${result.startsWith('迁移成功') ? 'text-green-400' : 'text-red-400'}`}>
            {result}
          </span>
        )}
      </div>
    </div>
  )
}
