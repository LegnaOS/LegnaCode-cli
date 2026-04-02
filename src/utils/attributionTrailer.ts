/**
 * Attribution trailer formatting for PR descriptions.
 * Separated from commitAttribution.ts for tree-shaking — this module
 * contains user-facing strings that should only load when needed.
 */
import type { AttributionData, AttributionState } from './commitAttribution.js'

export function buildPRTrailers(
  data: AttributionData,
  _state: AttributionState,
): string[] {
  const trailers: string[] = []
  const { summary } = data

  if (summary.claudePercent > 0) {
    trailers.push(
      `Claude-Contribution: ${summary.claudePercent}% (${summary.claudeChars} chars)`,
    )
  }

  if (summary.surfaces.length > 0) {
    trailers.push(`Claude-Surfaces: ${summary.surfaces.join(', ')}`)
  }

  return trailers
}
