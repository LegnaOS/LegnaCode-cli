import type { LocalCommandCall } from '../types/command.js'
import { snipCompactIfNeeded } from '../services/compact/snipCompact.js'

export const call: LocalCommandCall = async (_args, context) => {
  const { messages } = context
  const result = snipCompactIfNeeded(messages, { force: true, model: context.options?.mainLoopModel })

  if (!result.executed) {
    return { type: 'text', value: 'No messages available to snip.' }
  }

  return {
    type: 'text',
    value: `Snipped ${result.tokensFreed} estimated tokens (${(result.boundaryMessage as Record<string, unknown>).snipMetadata ? ((result.boundaryMessage as Record<string, unknown>).snipMetadata as { removedCount: number }).removedCount : 0} messages) from context.`,
  }
}
