/**
 * SDK Utility Types — manually maintained types that can't be expressed as Zod schemas.
 */

/** Usage stats with all fields guaranteed non-null. */
export type NonNullableUsage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
}
