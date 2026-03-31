// Stub: @anthropic-ai/mcpb — not published to npm
// MCP binary/manifest handling for Claude Code plugins.

export const McpbManifestSchema = {
  safeParse: (_: any) => ({ success: true, data: _ }),
}

export type McpbManifest = {
  name: string
  version: string
  [key: string]: any
}

export type McpbUserConfigurationOption = {
  name: string
  type: string
  description?: string
  required?: boolean
  default?: any
}

export async function getMcpConfigForManifest(_opts: any): Promise<any> {
  return null
}
