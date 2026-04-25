/**
 * OpenAI Streaming Bridge
 *
 * Translates OpenAI Chat Completions SSE stream into Anthropic
 * BetaRawMessageStreamEvent sequence. Downstream code (tool execution,
 * content block accumulation, session storage) sees identical events
 * as the native Anthropic SDK path — zero changes needed.
 *
 * Also handles non-streaming requests with response format conversion.
 */

import { randomUUID } from 'crypto'
import { anthropicToOpenAI, repairToolArgs } from '../../utils/model/adapters/openaiCompat.js'
import { logForDebugging } from '../../utils/debug.js'

// ── SSE Parser ──────────────────────────────────────────────────────────────

async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6)
          if (payload === '[DONE]') return
          yield payload
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ── Finish Reason Mapping ───────────────────────────────────────────────────

function mapFinishReason(reason: string | null): string {
  switch (reason) {
    case 'stop': return 'end_turn'
    case 'length': return 'max_tokens'
    case 'tool_calls': return 'tool_use'
    case 'function_call': return 'tool_use' // deprecated but some providers still use it
    case 'content_filter': return 'end_turn'
    default: return 'end_turn'
  }
}

// ── Streaming Request ───────────────────────────────────────────────────────

/**
 * Execute an OpenAI-compatible streaming request and yield Anthropic-format
 * stream events. Drop-in replacement for the Anthropic SDK stream.
 */
export async function* openAIStreamingRequest(
  params: Record<string, any>,
  signal: AbortSignal,
): AsyncGenerator<any> {
  const { url, headers, body } = anthropicToOpenAI(params)
  body.stream = true
  body.stream_options = { include_usage: true } // Request usage in final chunk

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`)
  }

  if (!response.body) {
    throw new Error('OpenAI API returned no response body')
  }

  const messageId = `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`
  let contentBlockIndex = 0
  let textBlockOpen = false
  let thinkingBlockOpen = false
  const toolCallBlocks = new Map<number, { id: string; name: string; blockIndex: number }>()
  let inputTokens = 0
  let outputTokens = 0

  // Emit message_start
  yield {
    type: 'message_start',
    message: {
      id: messageId,
      type: 'message',
      role: 'assistant',
      model: params.model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  }

  for await (const chunk of parseSSEStream(response.body as any)) {
    let data: any
    try {
      data = JSON.parse(chunk)
    } catch {
      logForDebugging(`[openai-bridge] Failed to parse SSE chunk: ${chunk.slice(0, 200)}`)
      continue
    }

    const choice = data.choices?.[0]
    if (!choice) {
      // Usage-only chunk (some providers send usage separately)
      if (data.usage) {
        inputTokens = data.usage.prompt_tokens ?? inputTokens
        outputTokens = data.usage.completion_tokens ?? outputTokens
      }
      continue
    }

    const delta = choice.delta
    if (!delta) continue

    // --- Refusal (OpenAI content filter) ---
    if (delta.refusal != null && delta.refusal !== '') {
      logForDebugging(`[openai-bridge] Model refusal: ${delta.refusal}`)
    }

    // --- Reasoning/thinking content (DeepSeek, Kimi, Qwen) ---
    // Non-standard field: some CN providers put thinking in reasoning_content
    if (delta.reasoning_content != null && delta.reasoning_content !== '') {
      if (!thinkingBlockOpen) {
        yield {
          type: 'content_block_start',
          index: contentBlockIndex,
          content_block: { type: 'thinking', thinking: '', signature: '' },
        }
        thinkingBlockOpen = true
      }
      yield {
        type: 'content_block_delta',
        index: contentBlockIndex,
        delta: { type: 'thinking_delta', thinking: delta.reasoning_content },
      }
    }

    // --- Text content (delta.content is string | null per OpenAI SDK) ---
    if (delta.content != null && delta.content !== '') {
      // Close thinking block if transitioning to text
      if (thinkingBlockOpen) {
        yield { type: 'content_block_stop', index: contentBlockIndex }
        thinkingBlockOpen = false
        contentBlockIndex++
      }
      if (!textBlockOpen) {
        yield {
          type: 'content_block_start',
          index: contentBlockIndex,
          content_block: { type: 'text', text: '' },
        }
        textBlockOpen = true
      }
      yield {
        type: 'content_block_delta',
        index: contentBlockIndex,
        delta: { type: 'text_delta', text: delta.content },
      }
    }

    // --- Tool calls ---
    if (delta.tool_calls) {
      // Close open blocks before tool calls
      if (thinkingBlockOpen) {
        yield { type: 'content_block_stop', index: contentBlockIndex }
        thinkingBlockOpen = false
        contentBlockIndex++
      }
      if (textBlockOpen) {
        yield { type: 'content_block_stop', index: contentBlockIndex }
        textBlockOpen = false
        contentBlockIndex++
      }

      for (const tc of delta.tool_calls) {
        // Per OpenAI SDK: Delta.ToolCall.index is required number,
        // id/function.name are optional (only present on first chunk for each tool call)
        const tcIndex: number = tc.index

        if (tc.id && tc.function?.name) {
          // New tool call
          const blockIdx = contentBlockIndex + tcIndex
          toolCallBlocks.set(tcIndex, { id: tc.id, name: tc.function.name, blockIndex: blockIdx })
          yield {
            type: 'content_block_start',
            index: blockIdx,
            content_block: {
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: '',  // Must be string for streaming accumulation
            },
          }
        }

        if (tc.function?.arguments) {
          const info = toolCallBlocks.get(tcIndex)
          if (info) {
            yield {
              type: 'content_block_delta',
              index: info.blockIndex,
              delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
            }
          }
        }
      }
    }

    // Track usage from chunks
    if (data.usage) {
      inputTokens = data.usage.prompt_tokens ?? inputTokens
      outputTokens = data.usage.completion_tokens ?? outputTokens
    }

    // Finish reason on final chunk
    if (choice.finish_reason) {
      // Close any open blocks
      if (thinkingBlockOpen) {
        yield { type: 'content_block_stop', index: contentBlockIndex }
        contentBlockIndex++
      }
      if (textBlockOpen) {
        yield { type: 'content_block_stop', index: contentBlockIndex }
        contentBlockIndex++
      }
      for (const [, info] of toolCallBlocks) {
        yield { type: 'content_block_stop', index: info.blockIndex }
      }

      yield {
        type: 'message_delta',
        delta: { stop_reason: mapFinishReason(choice.finish_reason), stop_sequence: null },
        usage: { output_tokens: outputTokens },
      }
      yield { type: 'message_stop' }
      return
    }
  }

  // Stream ended without explicit finish_reason — close gracefully
  if (thinkingBlockOpen) {
    yield { type: 'content_block_stop', index: contentBlockIndex }
    contentBlockIndex++
  }
  if (textBlockOpen) {
    yield { type: 'content_block_stop', index: contentBlockIndex }
    contentBlockIndex++
  }
  for (const [, info] of toolCallBlocks) {
    yield { type: 'content_block_stop', index: info.blockIndex }
  }
  yield {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn', stop_sequence: null },
    usage: { output_tokens: outputTokens },
  }
  yield { type: 'message_stop' }
}

// ── Non-Streaming Request ───────────────────────────────────────────────────

/**
 * Execute an OpenAI-compatible non-streaming request and return
 * an Anthropic BetaMessage-shaped object.
 */
export async function openAINonStreamingRequest(
  params: Record<string, any>,
  signal: AbortSignal,
): Promise<any> {
  const { url, headers, body } = anthropicToOpenAI(params)
  body.stream = false

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`)
  }

  const data = await response.json() as any
  const choice = data.choices?.[0]
  const message = choice?.message ?? {}
  const content: any[] = []

  // Non-streaming: refusal field
  if (message.refusal) {
    content.push({ type: 'text', text: `[Refusal] ${message.refusal}` })
  }

  // Text content
  if (message.content) {
    content.push({ type: 'text', text: message.content })
  }

  // Tool calls
  if (message.tool_calls) {
    for (const tc of message.tool_calls) {
      let parsedInput: any = {}
      try {
        parsedInput = JSON.parse(repairToolArgs(tc.function.arguments))
      } catch {
        parsedInput = {}
      }
      content.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input: parsedInput,
      })
    }
  }

  return {
    id: `msg_${(data.id ?? randomUUID()).replace(/-/g, '').slice(0, 24)}`,
    type: 'message',
    role: 'assistant',
    model: params.model,
    content,
    stop_reason: mapFinishReason(choice?.finish_reason),
    stop_sequence: null,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
  }
}
