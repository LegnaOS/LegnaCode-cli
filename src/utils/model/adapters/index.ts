/**
 * Model adapter interface and registry.
 *
 * Each third-party model provider can register an adapter that transforms
 * API request params before they're sent. Adapters are matched by model name
 * prefix — only the first matching adapter is applied.
 *
 * To add a new provider adapter:
 * 1. Create src/utils/model/adapters/<provider>.ts implementing ModelAdapter
 * 2. Register it in ADAPTERS below
 */

export interface ModelAdapter {
  /** Human-readable provider name */
  name: string

  /** Return true if this adapter should handle the given model */
  match(model: string, baseUrl?: string): boolean

  /**
   * Transform request params before sending to the API.
   * Return a new object — do not mutate the input.
   */
  transformParams(params: Record<string, any>): Record<string, any>

  /**
   * Transform response content blocks if needed (e.g. reorder thinking/text).
   * Return null to skip transformation.
   */
  transformResponse?(content: any[]): any[] | null

  /**
   * Return a user-facing message for provider-specific stop_reasons,
   * or undefined if the stop_reason is not handled by this adapter.
   */
  getStopReasonMessage?(stopReason: string): string | undefined
}

// Lazy-loaded adapter registry — adapters are imported on first use
let _adapters: ModelAdapter[] | null = null

function getAdapters(): ModelAdapter[] {
  if (!_adapters) {
    // Import adapters synchronously — they're lightweight
    const { MiMoAdapter } = require('./mimo.js')
    const { GLMAdapter } = require('./glm.js')
    const { DeepSeekAdapter } = require('./deepseek.js')
    const { KimiAdapter } = require('./kimi.js')
    const { MiniMaxAdapter } = require('./minimax.js')
    const { OpenAICompatAdapter } = require('./openaiCompat.js')
    _adapters = [
      OpenAICompatAdapter, // Must be first — catches all when OPENAI_COMPAT_BASE_URL is set
      MiMoAdapter,
      GLMAdapter,
      DeepSeekAdapter,
      KimiAdapter,
      MiniMaxAdapter,
    ]
  }
  return _adapters
}

/**
 * Find the matching adapter for a model, or null if none matches.
 */
export function getModelAdapter(model: string): ModelAdapter | null {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  for (const adapter of getAdapters()) {
    if (adapter.match(model, baseUrl)) return adapter
  }
  return null
}

/**
 * Apply model-specific transformations to API request params.
 * Called at the end of paramsFromContext() in claude.ts.
 * Returns the original params if no adapter matches.
 */
export function applyModelAdapter(params: Record<string, any>): Record<string, any> {
  const adapter = getModelAdapter(params.model)
  if (!adapter) return params
  return adapter.transformParams(params)
}

/**
 * Apply model-specific response transformations.
 * Called when processing response content blocks.
 */
export function applyResponseAdapter(model: string, content: any[]): any[] {
  const adapter = getModelAdapter(model)
  if (!adapter?.transformResponse) return content
  return adapter.transformResponse(content) ?? content
}

/**
 * Get a user-facing message for provider-specific stop_reasons.
 * Returns undefined if no adapter matches or the stop_reason is not handled.
 */
export function getAdapterStopReasonMessage(model: string, stopReason: string): string | undefined {
  const adapter = getModelAdapter(model)
  if (!adapter?.getStopReasonMessage) return undefined
  return adapter.getStopReasonMessage(stopReason)
}
