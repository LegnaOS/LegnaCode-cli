/**
 * OpenAI-Compatible Bridge Adapter
 *
 * Translates between Anthropic Messages API format and OpenAI Chat Completions format.
 * Enables LegnaCode to work with any OpenAI-compatible endpoint:
 * OpenAI, DeepSeek (native), Qwen, GLM, SiliconFlow, Ollama, vLLM, LM Studio.
 *
 * Ported from AtomCode's provider abstraction (Rust → TypeScript).
 *
 * Activation: set OPENAI_COMPAT_BASE_URL + OPENAI_COMPAT_API_KEY env vars,
 * or configure in settings.json: { "openaiCompat": { "baseUrl": "...", "apiKey": "..." } }
 */

import type { ModelAdapter } from './index.js'

// Lazy import to avoid circular dependency at module load time
let _getApiKey: (() => string | null) | undefined
function resolveApiKey(): string {
  if (!_getApiKey) {
    try {
      const auth = require('../../auth.js')
      _getApiKey = auth.getAnthropicApiKey
    } catch {
      _getApiKey = () => null
    }
  }
  return _getApiKey!() || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || ''
}

// ── Message Format Translation ──────────────────────────────────────

interface AnthropicMessage {
  role: string
  content: any
  [key: string]: any
}

interface OpenAIMessage {
  role: string
  content: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
  name?: string
  [key: string]: any
}

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/** Convert Anthropic system blocks to a single OpenAI system message */
function convertSystem(system: any): string {
  if (!system) return ''
  if (typeof system === 'string') return system
  if (Array.isArray(system)) {
    return system
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n\n')
  }
  return ''
}

/** Convert Anthropic content blocks to OpenAI message format */
function convertAnthropicToOpenAI(msg: AnthropicMessage): OpenAIMessage[] {
  const { role, content } = msg

  // Simple string content
  if (typeof content === 'string') {
    const result: OpenAIMessage = { role, content }
    // Preserve reasoning_content for DeepSeek/Kimi multi-turn
    if (role === 'assistant' && msg.reasoning_content) {
      result.reasoning_content = msg.reasoning_content
    }
    return [result]
  }

  if (!Array.isArray(content)) {
    return [{ role, content: JSON.stringify(content) }]
  }

  // tool_result → OpenAI tool message
  const toolResults = content.filter((b: any) => b.type === 'tool_result')
  if (toolResults.length > 0) {
    return toolResults.map((b: any) => ({
      role: 'tool' as const,
      content: typeof b.content === 'string'
        ? b.content
        : Array.isArray(b.content)
          ? b.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
          : JSON.stringify(b.content ?? ''),
      tool_call_id: b.tool_use_id,
    }))
  }

  // assistant with tool_use blocks
  const toolUses = content.filter((b: any) => b.type === 'tool_use')
  const textParts = content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  const thinkingBlocks = content.filter((b: any) => b.type === 'thinking')
  const thinkingParts = thinkingBlocks.map((b: any) => b.thinking ?? '').join('')

  if (toolUses.length > 0 && role === 'assistant') {
    const msg: OpenAIMessage = {
      role: 'assistant',
      content: textParts || null,
      tool_calls: toolUses.map((b: any) => ({
        id: b.id,
        type: 'function' as const,
        function: {
          name: b.name,
          arguments: typeof b.input === 'string' ? b.input : JSON.stringify(b.input ?? {}),
        },
      })),
    }
    // DeepSeek/Kimi OpenAI endpoints require reasoning_content to be passed back
    if (thinkingBlocks.length > 0) msg.reasoning_content = thinkingParts || ''
    return [msg]
  }

  // Default: concatenate text blocks
  const text = content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text ?? '')
    .join('')
  const result: OpenAIMessage = { role, content: text || '' }
  // Pass back reasoning_content for assistant messages with thinking
  if (role === 'assistant' && thinkingBlocks.length > 0) {
    result.reasoning_content = thinkingParts || ''
  }
  return [result]
}

/** Convert Anthropic tool schema to OpenAI function calling format */
function convertToolSchema(tools: any[]): any[] {
  if (!tools || !Array.isArray(tools)) return []
  return tools.map((tool: any) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description ?? '',
      parameters: tool.input_schema ?? tool.parameters ?? { type: 'object', properties: {} },
    },
  }))
}

/** Repair malformed JSON from weak models (trailing commas, markdown fences, unbalanced brackets) */
function repairToolArgs(raw: string): string {
  let s = raw.trim()
  // Strip markdown code fences
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1')
  // Try to balance brackets
  const opens = (s.match(/\{/g) || []).length
  const closes = (s.match(/\}/g) || []).length
  if (opens > closes) s += '}'.repeat(opens - closes)
  return s
}

/** Normalize base URL: ensure no trailing slash, append /v1 if missing */
function normalizeBaseUrl(url: string): string {
  let u = url.replace(/\/+$/, '')
  if (!u.endsWith('/v1')) u += '/v1'
  return u
}

/**
 * Derive OpenAI base URL from ANTHROPIC_BASE_URL by stripping /anthropic suffix.
 * e.g. https://api.deepseek.com/anthropic → https://api.deepseek.com
 */
function deriveOpenAIBaseUrl(): string | undefined {
  const anthropicBase = process.env.ANTHROPIC_BASE_URL
  if (!anthropicBase) return undefined
  return anthropicBase.replace(/\/anthropic\/?$/, '')
}

/** Check if OpenAI compat mode is active */
export function isOpenAICompatActive(): boolean {
  return !!(process.env.OPENAI_COMPAT_BASE_URL || process.env.OPENAI_COMPAT_API_KEY)
}

/**
 * Transform Anthropic Messages API params into OpenAI Chat Completions params.
 * This is the core bridge — called instead of sending to Anthropic API.
 *
 * URL resolution priority:
 *   1. options.baseUrl (explicit override)
 *   2. OPENAI_COMPAT_BASE_URL env var
 *   3. Derived from ANTHROPIC_BASE_URL (strip /anthropic suffix)
 *   4. Fallback: http://localhost:11434/v1
 */
export function anthropicToOpenAI(params: Record<string, any>, options?: {
  baseUrl?: string
  apiKey?: string
}): {
  url: string
  headers: Record<string, string>
  body: Record<string, any>
} {
  const baseUrl = normalizeBaseUrl(
    options?.baseUrl
      || process.env.OPENAI_COMPAT_BASE_URL
      || deriveOpenAIBaseUrl()
      || 'http://localhost:11434/v1'
  )
  const apiKey = options?.apiKey
    || resolveApiKey()
    || 'ollama'

  // Convert messages
  const openaiMessages: OpenAIMessage[] = []

  // System message
  const systemText = convertSystem(params.system)
  if (systemText) {
    openaiMessages.push({ role: 'system', content: systemText })
  }

  // Conversation messages
  if (params.messages && Array.isArray(params.messages)) {
    for (const msg of params.messages) {
      openaiMessages.push(...convertAnthropicToOpenAI(msg))
    }
  }

  // Build body
  const body: Record<string, any> = {
    model: params.model,
    messages: openaiMessages,
    stream: params.stream ?? true,
    max_tokens: params.max_tokens,
  }

  // Tools
  if (params.tools && params.tools.length > 0) {
    body.tools = convertToolSchema(params.tools)
    body.tool_choice = 'auto'
  }

  // Sampling params
  if (params.temperature !== undefined) body.temperature = params.temperature
  if (params.top_p !== undefined) body.top_p = params.top_p

  return {
    url: `${baseUrl}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body,
  }
}

// ── Adapter Registration ────────────────────────────────────────────

export const OpenAICompatAdapter: ModelAdapter = {
  name: 'OpenAI-Compatible',

  match(_model: string, baseUrl?: string): boolean {
    return isOpenAICompatActive()
  },

  transformParams(params: Record<string, any>): Record<string, any> {
    // Mark for the API layer to use OpenAI bridge instead of Anthropic
    return { ...params, __openaiCompat: true }
  },
}

export { repairToolArgs, normalizeBaseUrl, convertToolSchema }
