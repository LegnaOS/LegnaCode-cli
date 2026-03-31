/**
 * SDK Settings Types (Generated) — TypeScript types for LegnaCode settings.
 *
 * This file would normally be auto-generated from the settings JSON schema.
 * Manually reconstructed as a permissive type to satisfy imports.
 */

/** LegnaCode settings object. */
export type Settings = {
  /** Permission mode for tool execution. */
  permissionMode?: string
  /** Model to use. */
  model?: string
  /** Custom API key. */
  apiKey?: string
  /** Max thinking tokens. */
  maxThinkingTokens?: number
  /** Minimum CLI version allowed. */
  minimumVersion?: string
  /** Additional settings are allowed. */
  [key: string]: unknown
}
