import { useState, useEffect } from 'react'
import type { Scope } from '../api/client'
import { getSettings, saveSettings } from '../api/client'

interface Props { scope: Scope }

interface SettingField {
  key: string
  label: string
  envKey?: string
  type: 'text' | 'password' | 'select' | 'toggle' | 'number'
  options?: { value: string; label: string }[]
  nested?: string // dot path like "env.ANTHROPIC_BASE_URL"
}

const FIELDS: SettingField[] = [
  { key: 'apiFormat', label: 'API 路由模式', type: 'select', options: [
    { value: '', label: '自动 (根据 URL 推断)' },
    { value: 'anthropic', label: 'Anthropic Messages API' },
    { value: 'openai', label: 'OpenAI Chat Completions API' },
  ]},
  { key: 'env.ANTHROPIC_BASE_URL', label: 'API 端点', type: 'text', nested: 'env.ANTHROPIC_BASE_URL' },
  { key: 'env.ANTHROPIC_AUTH_TOKEN', label: 'API Key', type: 'password', nested: 'env.ANTHROPIC_AUTH_TOKEN' },
  { key: 'env.ANTHROPIC_MODEL', label: '指定模型 (覆盖所有层级)', type: 'text', nested: 'env.ANTHROPIC_MODEL' },
  { key: 'model', label: '模型别名 (sonnet/opus/haiku)', type: 'text' },
  { key: 'env.ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus 模型映射', type: 'text', nested: 'env.ANTHROPIC_DEFAULT_OPUS_MODEL' },
  { key: 'env.ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet 模型映射', type: 'text', nested: 'env.ANTHROPIC_DEFAULT_SONNET_MODEL' },
  { key: 'env.ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku 模型映射', type: 'text', nested: 'env.ANTHROPIC_DEFAULT_HAIKU_MODEL' },
  { key: 'env.CLAUDE_CODE_MAX_OUTPUT_TOKENS', label: '最大输出 Tokens', type: 'number', nested: 'env.CLAUDE_CODE_MAX_OUTPUT_TOKENS' },
  { key: 'env.API_TIMEOUT_MS', label: 'API 超时 (ms)', type: 'number', nested: 'env.API_TIMEOUT_MS' },
  { key: 'alwaysThinkingEnabled', label: '始终思考', type: 'toggle' },
  { key: 'skipDangerousModePermissionPrompt', label: '跳过危险确认', type: 'toggle' },
  { key: 'env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS', label: 'Agent Teams', type: 'select', nested: 'env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS', options: [
    { value: '', label: '关闭' }, { value: '1', label: '开启' },
  ]},
  { key: 'permissions.defaultMode', label: '权限模式', type: 'select', nested: 'permissions.defaultMode', options: [
    { value: 'default', label: 'Default' }, { value: 'plan', label: 'Plan' },
    { value: 'bypassPermissions', label: 'Bypass' }, { value: 'acceptEdits', label: 'Accept Edits' },
  ]},
  { key: 'language', label: '语言', type: 'text' },
]

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function setNestedValue(obj: any, path: string, value: any): any {
  const clone = JSON.parse(JSON.stringify(obj))
  const keys = path.split('.')
  let cur = clone
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]!]) cur[keys[i]!] = {}
    cur = cur[keys[i]!]
  }
  cur[keys[keys.length - 1]!] = value
  return clone
}

export function SettingsPanel({ scope }: Props) {
  const [data, setData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    getSettings(scope).then(setData).catch(() => setData({})).finally(() => setLoading(false))
  }, [scope])

  const getValue = (field: SettingField) => {
    const path = field.nested || field.key
    return getNestedValue(data, path) ?? ''
  }

  const setValue = (field: SettingField, value: any) => {
    const path = field.nested || field.key
    setData(prev => setNestedValue(prev, path, value))
  }

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      await saveSettings(scope, data)
      setMsg('已保存')
      setTimeout(() => setMsg(''), 2000)
    } catch (e: any) {
      setMsg(`保存失败: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500 text-sm">加载中...</div>

  return (
    <div className="space-y-4">
      {FIELDS.map(field => (
        <div key={field.key} className="flex items-center gap-4">
          <label className="w-40 text-sm text-gray-400 shrink-0">{field.label}</label>
          {field.type === 'toggle' ? (
            <button
              onClick={() => setValue(field, !getValue(field))}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                getValue(field) ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                getValue(field) ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          ) : field.type === 'select' ? (
            <select
              value={String(getValue(field))}
              onChange={e => setValue(field, e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200"
            >
              <option value="">--</option>
              {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
              value={String(getValue(field))}
              onChange={e => setValue(field, field.type === 'number' ? Number(e.target.value) || '' : e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200"
              placeholder={field.label}
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        {msg && <span className={`text-xs ${msg.startsWith('已') ? 'text-green-400' : 'text-red-400'}`}>{msg}</span>}
      </div>
    </div>
  )
}
