/**
 * DeepSeek model adapter.
 *
 * DeepSeek provides dual API endpoints:
 *   - Anthropic: https://api.deepseek.com/anthropic
 *   - OpenAI:    https://api.deepseek.com
 *
 * apiFormat: 'auto' — detects from ANTHROPIC_BASE_URL:
 *   /anthropic suffix → Anthropic SDK, otherwise → OpenAI fetch bridge
 *
 * Anthropic API compatibility (from DeepSeek docs):
 *   - model: use DeepSeek model names (deepseek-v4-flash, deepseek-v4-pro)
 *   - thinking: supported (budget_tokens ignored)
 *   - output_config: only effort is supported
 *   - tool_choice: auto/none/any/tool supported (disable_parallel_tool_use ignored)
 *   - cache_control: ignored everywhere
 *   - image/document/server_tool_use/redacted_thinking: not supported
 *   - reasoning_content: strip from assistant messages to avoid 400 errors
 *   - deepseek-reasoner: temperature/top_p ignored — strip them
 *   - Response: thinking blocks may appear after text — reorder
 *
 * Models: deepseek-v4-flash, deepseek-v4-pro,
 *         deepseek-chat (deprecated 2026/07/24), deepseek-reasoner (deprecated 2026/07/24)
 *
 * Tool name encoding: DeepSeek API restricts function names to [a-zA-Z0-9_-]{1,64}.
 * MCP tools may contain '/', '.', ':' etc. We encode on request and decode on response.
 */

import type { ModelAdapter } from './index.js'
import {
  simplifyThinking,
  forceAutoToolChoice,
  normalizeTools,
  stripBetas,
  stripUnsupportedFields,
  stripCacheControl,
  stripReasonerSamplingParams,
  stripUnsupportedContentBlocks,
  reorderThinkingBlocks,
} from './shared.js'

const DEEPSEEK_MODEL_PREFIX = 'deepseek-'
const DEEPSEEK_HOST = 'api.deepseek.com'

/**
 * Model alias map — deprecated/legacy names → canonical DeepSeek model IDs.
 * Inspired by DeepSeek-TUI's ModelRegistry (crates/agent/src/lib.rs).
 */
const DEEPSEEK_MODEL_ALIASES: Record<string, string> = {
  'deepseek-r1': 'deepseek-v4-flash',
  'deepseek-v3': 'deepseek-v4-flash',
  'deepseek-v3.2': 'deepseek-v4-flash',
  'deepseek-chat': 'deepseek-v4-flash',
  'deepseek-reasoner': 'deepseek-v4-flash',
}

/**
 * Encode a tool name for DeepSeek API compatibility.
 * Replaces characters outside [a-zA-Z0-9_-] with __hex__ sequences.
 * Truncates to 64 characters.
 */
export function encodeToolName(name: string): string {
  const encoded = name.replace(/[^a-zA-Z0-9_-]/g, (ch) => `__${ch.charCodeAt(0).toString(16)}__`)
  return encoded.slice(0, 64)
}

/**
 * Decode a tool name encoded by encodeToolName.
 */
export function decodeToolName(encoded: string): string {
  return encoded.replace(/__([0-9a-f]+)__/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/**
 * Returns true if the tool name contains characters that need encoding.
 */
function needsToolNameEncoding(name: string): boolean {
  return /[^a-zA-Z0-9_-]/.test(name)
}

/**
 * Normalize a model name through the alias table.
 * Returns the canonical name if aliased, otherwise the original.
 */
export function normalizeDeepSeekModel(model: string): string {
  return DEEPSEEK_MODEL_ALIASES[model.toLowerCase()] ?? model
}

export const DeepSeekAdapter: ModelAdapter = {
  name: 'DeepSeek',
  apiFormat: 'auto',

  match(model: string, baseUrl?: string): boolean {
    const m = model.toLowerCase()
    if (m.startsWith(DEEPSEEK_MODEL_PREFIX)) return true
    if (m in DEEPSEEK_MODEL_ALIASES) return true
    if (baseUrl) {
      try { return new URL(baseUrl).host === DEEPSEEK_HOST } catch {}
    }
    return false
  },

  transformParams(params: Record<string, any>): Record<string, any> {
    const out = { ...params }

    // Normalize deprecated model names to canonical IDs
    if (out.model) {
      out.model = normalizeDeepSeekModel(out.model)
    }

    simplifyThinking(out)
    forceAutoToolChoice(out)
    normalizeTools(out)
    stripBetas(out)
    stripUnsupportedFields(out)
    stripCacheControl(out)
    // NOTE: Do NOT call stripReasoningContent here.
    // DeepSeek OpenAI endpoint requires reasoning_content to be passed back in multi-turn.
    // Anthropic endpoint ignores unknown fields, so keeping it is safe for both paths.
    stripUnsupportedContentBlocks(out)

    // Encode tool names that contain illegal characters for DeepSeek API
    if (out.tools && Array.isArray(out.tools)) {
      for (const tool of out.tools) {
        if (tool?.name && needsToolNameEncoding(tool.name)) {
          tool.name = encodeToolName(tool.name)
        }
        // OpenAI function-calling format
        if (tool?.function?.name && needsToolNameEncoding(tool.function.name)) {
          tool.function.name = encodeToolName(tool.function.name)
        }
      }
    }

    // Encode tool names in tool_use blocks within messages
    if (out.messages && Array.isArray(out.messages)) {
      for (const msg of out.messages) {
        if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'tool_use' && block.name && needsToolNameEncoding(block.name)) {
              block.name = encodeToolName(block.name)
            }
            if (block.type === 'tool_result' && block.tool_use_id) {
              // tool_result references tool_use by ID, no name encoding needed
            }
          }
        }
        // OpenAI format: tool_calls array
        if (Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            if (tc.function?.name && needsToolNameEncoding(tc.function.name)) {
              tc.function.name = encodeToolName(tc.function.name)
            }
          }
        }
      }
    }

    // No injectTopP — DeepSeek defaults to 1.0, no need to override
    if (out.model && out.model.includes('reasoner')) {
      stripReasonerSamplingParams(out)
    }
    return out
  },

  transformResponse(content: any[]): any[] | null {
    // Decode tool names in response
    if (content) {
      for (const block of content) {
        if (block.type === 'tool_use' && block.name) {
          block.name = decodeToolName(block.name)
        }
      }
    }
    return reorderThinkingBlocks(content)
  },
}
