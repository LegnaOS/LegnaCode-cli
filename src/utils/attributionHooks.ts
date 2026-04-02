/**
 * Attribution hooks — registers PostToolUse callbacks that track file
 * modifications for commit attribution. Gated by COMMIT_ATTRIBUTION.
 */
import { registerHookCallbacks } from '../bootstrap/state.js'
import type { HookCallback } from '../entrypoints/agentSdkTypes.js'
import { FILE_EDIT_TOOL_NAME } from '../tools/FileEditTool/constants.js'
import { FILE_WRITE_TOOL_NAME } from '../tools/FileWriteTool/prompt.js'
import { logForDebugging } from './debug.js'

// Simple LRU cache for file content snapshots (pre-edit baselines).
// Swept after compaction to avoid unbounded growth.
const fileContentCache = new Map<string, string>()
const MAX_CACHE_SIZE = 200

export function sweepFileContentCache(): void {
  if (fileContentCache.size > MAX_CACHE_SIZE) {
    const excess = fileContentCache.size - MAX_CACHE_SIZE
    const keys = fileContentCache.keys()
    for (let i = 0; i < excess; i++) {
      const k = keys.next().value
      if (k) fileContentCache.delete(k)
    }
  }
}

export function clearAttributionCaches(): void {
  fileContentCache.clear()
}

export function registerAttributionHooks(): void {
  const hook: HookCallback = {
    type: 'callback',
    callback: async (_input, _output) => {
      // Attribution tracking is handled inline by the tool implementations
      // (FileEditTool, FileWriteTool) which call trackFileModification
      // directly via AppState. This hook is a no-op placeholder that
      // ensures the hook registration path works for cache sweeping.
      return {}
    },
    timeout: 1,
    internal: true,
  }

  registerHookCallbacks({
    PostToolUse: [
      { matcher: FILE_EDIT_TOOL_NAME, hooks: [hook] },
      { matcher: FILE_WRITE_TOOL_NAME, hooks: [hook] },
    ],
  })

  logForDebugging('Attribution: hooks registered')
}
