/**
 * Kiro Gateway client-side history optimization.
 *
 * When kiroGateway is enabled in settings, compresses history messages
 * and tool schemas before sending to reduce token consumption.
 * Aligned with kiro.py/anthropic_api/converter.py compression logic.
 */

// ── Constants (aligned with Gateway converter.py) ──────────────────────

const TOOL_RESULT_KEEP_WINDOW = 8
const TOOL_RESULT_MAX_CHARS = 8_000
const TOOL_RESULT_MAX_LINES = 150
const THINKING_KEEP_WINDOW = 5
const THINKING_MAX_CHARS = 2_000
const THINKING_MAX_LINES = 60
const MAX_TOOL_DESCRIPTION = 9216

const SCHEMA_ALLOWED_KEYS = new Set([
  'type', 'description', 'properties', 'required',
  'enum', 'items', 'nullable', 'additionalProperties',
])

// ── truncateMiddle (aligned with Gateway _truncate_middle) ─────────────

function truncateMiddle(text: string, maxChars: number, maxLines: number, label: string): string {
  const normalized = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!normalized) return ''

  const lines = normalized.split('\n')
  const lineCount = lines.length
  if (normalized.length <= maxChars && lineCount <= maxLines) return normalized

  const headLines = Math.max(1, Math.floor(maxLines / 2))
  const tailLines = Math.max(1, maxLines - headLines)
  const head = lines.slice(0, headLines).join('\n')
  const tail = tailLines < lineCount ? lines.slice(-tailLines).join('\n') : ''
  const omittedLines = Math.max(lineCount - headLines - tailLines, 0)
  const omittedChars = Math.max(normalized.length - head.length - tail.length, 0)
  const summary = `[${label} truncated: original ${normalized.length} chars / ${lineCount} lines; omitted middle ${omittedChars} chars / ${omittedLines} lines]`

  const parts = [head, summary]
  if (tail) parts.push(tail)
  const truncated = parts.filter(Boolean).join('\n')

  if (truncated.length <= maxChars) return truncated

  // Further truncate by chars
  const budget = Math.max(maxChars - summary.length - 2, 0)
  if (budget <= 0) return summary.slice(0, maxChars)
  const headBudget = Math.max(1, Math.floor(budget / 2))
  const tailBudget = Math.max(1, budget - headBudget)
  const headText = normalized.slice(0, headBudget).trimEnd()
  const tailText = tailBudget < normalized.length ? normalized.slice(-tailBudget).trimStart() : ''
  const finalParts = [headText, summary]
  if (tailText) finalParts.push(tailText)
  return finalParts.filter(Boolean).join('\n')
}

// ── compressHistoryMessages ────────────────────────────────────────────

function compressHistoryMessages(messages: any[]): any[] {
  if (!Array.isArray(messages) || messages.length === 0) return messages

  const total = messages.length
  return messages.map((msg, idx) => {
    const distance = total - 1 - idx
    if (!msg || !Array.isArray(msg.content)) return msg

    if (msg.role === 'assistant') {
      const newContent = msg.content
        .filter((block: any) => block.type !== 'redacted_thinking')
        .map((block: any) => {
          if (block.type === 'thinking' && distance > THINKING_KEEP_WINDOW) {
            const text = block.thinking || ''
            return { ...block, thinking: truncateMiddle(text, THINKING_MAX_CHARS, THINKING_MAX_LINES, 'thinking') }
          }
          return block
        })
      return { ...msg, content: newContent }
    }

    if (msg.role === 'user') {
      const newContent = msg.content.map((block: any) => {
        // tool_result truncation
        if (block.type === 'tool_result' && distance > TOOL_RESULT_KEEP_WINDOW) {
          const content = block.content
          if (typeof content === 'string') {
            return { ...block, content: truncateMiddle(content, TOOL_RESULT_MAX_CHARS, TOOL_RESULT_MAX_LINES, 'tool_result') }
          }
          if (Array.isArray(content)) {
            const text = content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text || '')
              .join('\n')
            if (text.length > TOOL_RESULT_MAX_CHARS) {
              return { ...block, content: truncateMiddle(text, TOOL_RESULT_MAX_CHARS, TOOL_RESULT_MAX_LINES, 'tool_result') }
            }
          }
          return block
        }
        // image replacement
        if (block.type === 'image' && distance > THINKING_KEEP_WINDOW) {
          return { type: 'text', text: '[image omitted from history]' }
        }
        return block
      })
      return { ...msg, content: newContent }
    }

    return msg
  })
}

// ── flattenAnyOfOneOf (aligned with Gateway _flatten_anyof_oneof) ──────

function flattenAnyOfOneOf(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema
  const result = { ...schema }

  for (const key of ['anyOf', 'oneOf'] as const) {
    if (!Array.isArray(result[key])) continue
    const branches = result[key] as any[]
    const nonNull = branches.filter((b: any) => !(b && b.type === 'null'))
    if (nonNull.length === 1) {
      const merged = { ...result, ...nonNull[0] }
      delete merged[key]
      if (branches.length > nonNull.length) merged.nullable = true
      return flattenAnyOfOneOf(merged)
    }
    // Can't simplify — keep first branch
    if (nonNull.length > 0) {
      const merged = { ...result, ...nonNull[0] }
      delete merged[key]
      merged.nullable = true
      return flattenAnyOfOneOf(merged)
    }
    delete result[key]
  }
  return result
}

// ── normalizeJsonSchema (aligned with Gateway normalize_json_schema) ───

function normalizeJsonSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object', properties: {}, required: [], additionalProperties: true }
  }

  const flattened = flattenAnyOfOneOf(schema)
  const result: any = {}

  for (const [key, value] of Object.entries(flattened)) {
    if (!SCHEMA_ALLOWED_KEYS.has(key)) continue

    if (key === 'properties') {
      result[key] = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).map(([k, v]) =>
            [k, typeof v === 'object' && v !== null ? normalizeJsonSchema(v) : v]))
        : {}
      continue
    }
    if (key === 'items') {
      result[key] = typeof value === 'object' && value !== null ? normalizeJsonSchema(value)
        : { type: 'object', properties: {}, required: [], additionalProperties: true }
      continue
    }
    if (key === 'required') {
      result[key] = Array.isArray(value) ? value.filter((r: any) => typeof r === 'string') : []
      continue
    }
    if (key === 'additionalProperties') {
      if (typeof value === 'boolean') result[key] = value
      else if (typeof value === 'object' && value !== null) result[key] = normalizeJsonSchema(value)
      else result[key] = true
      continue
    }
    result[key] = value
  }

  if (typeof result.type !== 'string' || !result.type) result.type = 'object'
  if (result.type === 'object' && typeof result.properties !== 'object') result.properties = {}
  if (!Array.isArray(result.required)) result.required = []
  if (!('additionalProperties' in result)) result.additionalProperties = true

  return result
}

// ── compactJsonSchema (aligned with Gateway _compact_json_schema) ──────

function compactJsonSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema
  const result = { ...schema }
  const schemaType = result.type || ''

  if (Array.isArray(result.required) && result.required.length === 0) delete result.required
  if (schemaType !== 'object') {
    if (result.additionalProperties === true) delete result.additionalProperties
    if (result.properties && typeof result.properties === 'object' && Object.keys(result.properties).length === 0) delete result.properties
  }

  if (result.properties && typeof result.properties === 'object') {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([k, v]) => [k, compactJsonSchema(v)])
    )
  }
  if (result.items && typeof result.items === 'object') result.items = compactJsonSchema(result.items)
  if (result.additionalProperties && typeof result.additionalProperties === 'object') {
    result.additionalProperties = compactJsonSchema(result.additionalProperties)
  }
  return result
}

// ── compactToolSchemas ─────────────────────────────────────────────────

function compactToolSchemas(tools: any[]): any[] {
  if (!Array.isArray(tools)) return tools
  return tools.map((tool: any) => {
    if (!tool) return tool
    const result = { ...tool }
    if (result.description && result.description.length > MAX_TOOL_DESCRIPTION) {
      result.description = result.description.slice(0, MAX_TOOL_DESCRIPTION)
    }
    if (result.input_schema) {
      result.input_schema = compactJsonSchema(normalizeJsonSchema(result.input_schema))
    }
    return result
  })
}

// ── Main entry point ───────────────────────────────────────────────────

export function applyKiroOptimizations(params: Record<string, any>): Record<string, any> {
  const result = { ...params }

  if (result.messages) {
    result.messages = compressHistoryMessages(result.messages)
  }

  if (result.tools) {
    result.tools = compactToolSchemas(result.tools)
  }

  return result
}
