import { randomUUID } from 'crypto'
import type { Message, SystemMessage } from '../../types/message.js'
import { getContextWindowForModel } from '../../utils/context.js'

export function isSnipRuntimeEnabled(): boolean {
  return true // Build-time feature gate is sufficient
}

export const SNIP_NUDGE_TEXT =
  'Consider using the snip tool to free context space by removing old messages.'

export function isSnipMarkerMessage(msg: Message): boolean {
  return msg.type === 'system' && (msg as SystemMessage).subtype === 'snip_marker'
}

/**
 * Dynamic snip thresholds based on model context window size.
 * 1M models get much higher limits to avoid premature snipping.
 */
function getSnipThresholds(model?: string): { keepRecent: number; minToSnip: number } {
  if (!model) return { keepRecent: 10, minToSnip: 4 }
  const contextWindow = getContextWindowForModel(model)
  if (contextWindow >= 1_000_000) {
    return { keepRecent: 200, minToSnip: 50 }
  }
  if (contextWindow >= 500_000) {
    return { keepRecent: 100, minToSnip: 25 }
  }
  return { keepRecent: 10, minToSnip: 4 }
}

/**
 * Throttled check: should we nudge the model to use the snip tool?
 * Looks for growth since the last snip boundary, compact boundary, or nudge.
 */
export function shouldNudgeForSnips(messages: Message[], model?: string): boolean {
  let countSinceBoundary = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!
    if (
      msg.type === 'system' &&
      ((msg as SystemMessage).subtype === 'snip_boundary' ||
        (msg as SystemMessage).subtype === 'compact_boundary' ||
        (msg as SystemMessage).subtype === 'snip_marker')
    ) {
      break
    }
    if (
      (msg.type === 'user' || msg.type === 'assistant') &&
      !('isMeta' in msg && msg.isMeta)
    ) {
      countSinceBoundary++
    }
  }
  const threshold = model ? (getContextWindowForModel(model) >= 1_000_000 ? 100 : 20) : 20
  return countSinceBoundary >= threshold
}

/**
 * Synchronous snip compaction. Identifies old messages to remove from the
 * model's view and creates a snip boundary marker. The REPL keeps full
 * history for UI scrollback; this only affects the model-facing projection.
 *
 * Returns the filtered message array, a boundary message (if any snipping
 * occurred), the estimated tokens freed, and an `executed` flag consumed
 * by QueryEngine's snipReplay callback.
 */
export function snipCompactIfNeeded(
  messages: Message[],
  opts?: { force?: boolean; model?: string },
): {
  messages: Message[]
  tokensFreed: number
  boundaryMessage: Message | null
  executed: boolean
} {
  if (!isSnipRuntimeEnabled()) {
    return { messages, tokensFreed: 0, boundaryMessage: null, executed: false }
  }

  const { keepRecent, minToSnip } = getSnipThresholds(opts?.model)

  const nonMetaIndices: number[] = []
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!
    if (
      (msg.type === 'user' || msg.type === 'assistant') &&
      !('isMeta' in msg && msg.isMeta)
    ) {
      nonMetaIndices.push(i)
    }
  }

  const snipCandidateCount = nonMetaIndices.length - keepRecent
  if (!opts?.force && snipCandidateCount < minToSnip) {
    return { messages, tokensFreed: 0, boundaryMessage: null, executed: false }
  }

  const snipCount = Math.max(0, snipCandidateCount)
  if (snipCount === 0) {
    return { messages, tokensFreed: 0, boundaryMessage: null, executed: false }
  }

  const indicesToRemove = new Set(nonMetaIndices.slice(0, snipCount))
  const removedUuids: string[] = []
  let estimatedTokensFreed = 0

  for (const idx of indicesToRemove) {
    const msg = messages[idx]!
    if ('uuid' in msg && typeof msg.uuid === 'string') {
      removedUuids.push(msg.uuid)
    }
    estimatedTokensFreed += 500
  }

  const boundaryMessage: Message = {
    type: 'system',
    subtype: 'snip_boundary',
    content: `Snipped ${removedUuids.length} old messages from context.`,
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    level: 'info',
    snipMetadata: {
      removedUuids,
      removedCount: removedUuids.length,
      tokensFreed: estimatedTokensFreed,
    },
  } as Message

  const filtered: Message[] = []
  let boundaryInserted = false
  for (let i = 0; i < messages.length; i++) {
    if (indicesToRemove.has(i)) {
      if (!boundaryInserted) {
        filtered.push(boundaryMessage)
        boundaryInserted = true
      }
      continue
    }
    filtered.push(messages[i]!)
  }

  return {
    messages: filtered,
    tokensFreed: estimatedTokensFreed,
    boundaryMessage,
    executed: true,
  }
}