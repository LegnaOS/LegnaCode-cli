/**
 * DeepSeek adaptive reasoning effort selection.
 *
 * Inspired by DeepSeek-TUI's auto_reasoning.rs — selects thinking effort
 * per-turn based on message content, reducing cost on simple queries and
 * maximizing depth on debugging tasks.
 *
 * Rules:
 *   - Sub-agent / tool-only contexts → 'low'
 *   - Message contains debug/error/bug keywords → 'max'
 *   - Message contains search/lookup/find keywords → 'low'
 *   - Default → 'high'
 */

import type { EffortLevel } from '../effort.js'

/**
 * Select reasoning effort for a DeepSeek request based on the last user message.
 *
 * @param isSubagent Whether this request is from a sub-agent context
 * @param lastUserMessage The most recent user message text
 * @returns The recommended effort level
 */
export function selectDeepSeekReasoning(
  isSubagent: boolean,
  lastUserMessage: string,
): EffortLevel {
  if (isSubagent) return 'low'

  const lower = lastUserMessage.toLowerCase()

  // Deep thinking for debugging tasks
  if (
    lower.includes('debug') ||
    lower.includes('error') ||
    lower.includes('bug') ||
    lower.includes('crash') ||
    lower.includes('panic') ||
    lower.includes('stacktrace') ||
    lower.includes('stack trace')
  ) {
    return 'max'
  }

  // Light thinking for lookup/search tasks
  if (
    lower.includes('search') ||
    lower.includes('lookup') ||
    lower.includes('find') ||
    lower.includes('grep') ||
    lower.includes('locate')
  ) {
    return 'low'
  }

  return 'high'
}

/**
 * Check if a model is a DeepSeek model that supports auto reasoning.
 */
export function isDeepSeekReasoningModel(model: string): boolean {
  const m = model.toLowerCase()
  return (
    m.startsWith('deepseek-') ||
    m.includes('deepseek-v4') ||
    m === 'deepseek-chat' ||
    m === 'deepseek-reasoner' ||
    m === 'deepseek-r1'
  )
}
