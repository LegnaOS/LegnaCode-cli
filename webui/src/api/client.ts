export type Scope = 'claude' | 'legna'

const BASE = ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any).error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function getSettings(scope: Scope) {
  return request<Record<string, unknown>>(`/api/${scope}/settings`)
}

export function saveSettings(scope: Scope, data: Record<string, unknown>) {
  return request<{ ok: boolean }>(`/api/${scope}/settings`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export interface Profile {
  filename: string
  baseUrl?: string
  model?: string
  isActive: boolean
}

export function getProfiles(scope: Scope) {
  return request<Profile[]>(`/api/${scope}/profiles`)
}

export function switchProfile(scope: Scope, filename: string) {
  return request<{ ok: boolean }>(`/api/${scope}/profiles/switch`, {
    method: 'POST',
    body: JSON.stringify({ filename }),
  })
}

export function cloneProfile(scope: Scope, source: string, target: string) {
  return request<{ ok: boolean; filename: string }>(`/api/${scope}/profiles/clone`, {
    method: 'POST',
    body: JSON.stringify({ source, target }),
  })
}

export function createProfile(scope: Scope, filename: string, content: Record<string, any>) {
  return request<{ ok: boolean; filename: string }>(`/api/${scope}/profiles/create`, {
    method: 'POST',
    body: JSON.stringify({ filename, content }),
  })
}

export function getProfileSettings(scope: Scope, filename: string) {
  return request<Record<string, unknown>>(`/api/${scope}/profiles/${filename}`)
}

export function saveProfileSettings(scope: Scope, filename: string, data: Record<string, unknown>) {
  return request<{ ok: boolean }>(`/api/${scope}/profiles/${filename}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export interface Session {
  id: string
  project: string
  projectPath: string
  cwd: string
  slug: string
  timestamp: string
  promptCount: number
  resumeCommand: string
}

export function getSessions(scope: Scope, limit = 50) {
  return request<Session[]>(`/api/${scope}/sessions?limit=${limit}`)
}

export function getVersion() {
  return request<{ version: string }>('/api/version')
}

export function getSessionMessages(scope: Scope, sessionId: string) {
  return request<any[]>(`/api/${scope}/sessions/${sessionId}/messages`)
}

export interface MigrateRequest {
  from: Scope
  to: Scope
  fields?: string[]
  includeSessions?: boolean
}

export function migrate(data: MigrateRequest) {
  return request<{ ok: boolean; migrated: string[] }>('/api/migrate', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getMigratePreview(from: Scope, to: Scope) {
  return request<{ from: Record<string, unknown>; to: Record<string, unknown> }>(`/api/${from}/settings`)
    .then(fromSettings =>
      request<Record<string, unknown>>(`/api/${to}/settings`)
        .then(toSettings => ({ from: fromSettings, to: toSettings }))
        .catch(() => ({ from: fromSettings, to: {} }))
    )
}
