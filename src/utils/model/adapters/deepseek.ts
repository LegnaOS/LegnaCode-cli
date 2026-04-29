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

export const DeepSeekAdapter: ModelAdapter = {
  name: 'DeepSeek',
  apiFormat: 'auto',

  match(model: string, baseUrl?: string): boolean {
    if (model.startsWith(DEEPSEEK_MODEL_PREFIX)) return true
    if (baseUrl) {
      try { return new URL(baseUrl).host === DEEPSEEK_HOST } catch {}
    }
    return false
  },

  transformParams(params: Record<string, any>): Record<string, any> {
    const out = { ...params }
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
    // No injectTopP — DeepSeek defaults to 1.0, no need to override
    if (out.model && out.model.includes('reasoner')) {
      stripReasonerSamplingParams(out)
    }
    return out
  },

  transformResponse(content: any[]): any[] | null {
    return reorderThinkingBlocks(content)
  },
}
