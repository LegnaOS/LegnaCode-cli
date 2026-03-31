/**
 * SDK Runtime Types — non-serializable types (callbacks, interfaces with methods).
 *
 * This file would normally be auto-generated. Manually reconstructed from usage sites.
 */

import type { z } from 'zod/v4'
import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import type { SDKMessage } from './coreTypes.js'

// ============================================================================
// Effort
// ============================================================================

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

// ============================================================================
// Session & Query Types
// ============================================================================

export type AnyZodRawShape = Record<string, z.ZodType>
export type InferShape<T extends AnyZodRawShape> = { [K in keyof T]: z.infer<T[K]> }

export type Query = {
  prompt: string
  abortController?: AbortController
  sigintController?: AbortController
}

export type InternalQuery = Query & {
  [key: string]: unknown
}

export type InternalOptions = {
  [key: string]: unknown
}

export type Options = {
  model?: string
  permissionMode?: string
  maxThinkingTokens?: number
  systemPrompt?: string
  appendSystemPrompt?: string
  cwd?: string
  [key: string]: unknown
}

export type SDKSessionOptions = Options & {
  [key: string]: unknown
}

export type SDKSession = {
  id: string
  [key: string]: unknown
}

export type SessionMessage = SDKMessage

export type McpSdkServerConfigWithInstance = {
  name: string
  [key: string]: unknown
}

export type SdkMcpToolDefinition<Schema extends AnyZodRawShape = AnyZodRawShape> = {
  name: string
  description: string
  inputSchema: Schema
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>
  annotations?: ToolAnnotations
  searchHint?: string
  alwaysLoad?: boolean
}

// ============================================================================
// Session Management Types
// ============================================================================

export type ListSessionsOptions = {
  limit?: number
  offset?: number
}

export type GetSessionInfoOptions = {
  sessionId: string
}

export type GetSessionMessagesOptions = {
  sessionId: string
  limit?: number
}

export type SessionMutationOptions = {
  sessionId: string
}

export type ForkSessionOptions = {
  sessionId: string
  messageId?: string
}

export type ForkSessionResult = {
  sessionId: string
}
