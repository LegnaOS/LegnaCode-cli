/**
 * SDK Tool Types — tool-related type definitions.
 *
 * Marked @internal until SDK API stabilizes.
 * Re-exported by agentSdkTypes.ts.
 */

/** @internal */
export type ToolPermissionBehavior = 'allow' | 'deny' | 'ask'

/** @internal */
export type ToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
}
