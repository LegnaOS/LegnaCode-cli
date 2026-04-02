/**
 * Reactive compaction — triggers compaction in response to 413/overloaded
 * API errors instead of proactively. Gated by feature('REACTIVE_COMPACT').
 */
import type { Message } from '../../types/message.js'
import type { CompactionResult } from './compact.js'
import { compactConversation } from './compact.js'
import { runPostCompactCleanup } from './postCompactCleanup.js'
import { logForDebugging } from '../../utils/debug.js'

export function isReactiveOnlyMode(): boolean {
  return false
}

export function isReactiveCompactEnabled(): boolean {
  return true
}

/** Check if an API error message indicates prompt-too-long (413). */
export function isWithheldPromptTooLong(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false
  const msg = message as Record<string, unknown>
  // Match 413 / prompt_too_long / overloaded error shapes
  if (msg.type === 'error' || msg.error) {
    const err = (msg.error ?? msg) as Record<string, unknown>
    const status = err.status ?? err.statusCode
    if (status === 413) return true
    const errType = typeof err.type === 'string' ? err.type : ''
    if (errType === 'prompt_too_long' || errType === 'request_too_large') return true
  }
  return false
}

/** Check if an API error indicates media/content size exceeded. */
export function isWithheldMediaSizeError(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false
  const msg = message as Record<string, unknown>
  if (msg.type === 'error' || msg.error) {
    const err = (msg.error ?? msg) as Record<string, unknown>
    const errMsg = typeof err.message === 'string' ? err.message : ''
    if (errMsg.includes('media') && errMsg.includes('size')) return true
    if (errMsg.includes('image') && errMsg.includes('too large')) return true
  }
  return false
}

export async function tryReactiveCompact(opts: {
  hasAttempted: boolean
  querySource: string
  aborted: boolean
  messages: Message[]
  cacheSafeParams: {
    systemPrompt: string
    userContext: string
    systemContext: string
    toolUseContext: any
    forkContextMessages: Message[]
  }
}): Promise<CompactionResult | null> {
  if (opts.hasAttempted || opts.aborted) return null
  if (opts.messages.length < 4) return null

  try {
    logForDebugging('ReactiveCompact: attempting compaction after 413')
    const result = await compactConversation(
      opts.messages,
      opts.cacheSafeParams.toolUseContext,
      opts.cacheSafeParams,
      false,
      undefined,
      false,
    )
    runPostCompactCleanup()
    return result
  } catch (e) {
    logForDebugging(`ReactiveCompact: failed: ${e}`)
    return null
  }
}

type ReactiveOutcome =
  | ({ ok: true } & { result: CompactionResult })
  | { ok: false; reason: 'too_few_groups' | 'aborted' | 'exhausted' | 'error' | 'media_unstrippable' }

export async function reactiveCompactOnPromptTooLong(
  messages: Message[],
  cacheSafeParams: unknown,
  opts: { customInstructions?: string; trigger: 'manual' | 'auto' },
): Promise<ReactiveOutcome> {
  if (messages.length < 4) {
    return { ok: false, reason: 'too_few_groups' }
  }

  try {
    logForDebugging(`ReactiveCompact: prompt-too-long compaction (${opts.trigger})`)
    const result = await compactConversation(
      messages,
      cacheSafeParams as any,
      cacheSafeParams as any,
      false,
      opts.customInstructions,
      false,
    )
    runPostCompactCleanup()
    return { ok: true, result }
  } catch (e) {
    logForDebugging(`ReactiveCompact: prompt-too-long failed: ${e}`)
    return { ok: false, reason: 'error' }
  }
}
