/**
 * Converts Zod v4 schemas to JSON Schema using native toJSONSchema.
 */

import { toJSONSchema, type ZodTypeAny } from 'zod/v4'

export type JsonSchema7Type = Record<string, unknown>

// toolToAPISchema() runs this for every tool on every API request (~60-250
// times/turn). Tool schemas are wrapped with lazySchema() which guarantees the
// same ZodTypeAny reference per session, so we can cache by identity.
const cache = new WeakMap<ZodTypeAny, JsonSchema7Type>()

/**
 * Converts a Zod v4 schema to JSON Schema format.
 */
export function zodToJsonSchema(schema: ZodTypeAny): JsonSchema7Type {
  if (!schema || !('_zod' in schema)) {
    // Defensive: some tools use getter-based lazy schemas that may resolve
    // to undefined during early init. Return a permissive schema instead of
    // crashing with "undefined is not an object (evaluating 'schema._zod.def')".
    return { type: 'object', properties: {} }
  }
  const hit = cache.get(schema)
  if (hit) return hit
  const result = toJSONSchema(schema) as JsonSchema7Type
  cache.set(schema, result)
  return result
}
