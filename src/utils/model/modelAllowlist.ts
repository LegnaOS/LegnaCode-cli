import { getSettings_DEPRECATED } from '../settings/settings.js'
import { isModelAlias, isModelFamilyAlias } from './aliases.js'
import { parseUserSpecifiedModel } from './model.js'
import { resolveOverriddenModel } from './modelStrings.js'

/**
 * Check if a model belongs to a given family by checking if its name
 * (or resolved name) contains the family identifier.
 */
function modelBelongsToFamily(model: string, family: string): boolean {
  if (model.includes(family)) {
    return true
  }
  // Resolve aliases like "best" → "claude-opus-4-6" to check family membership
  if (isModelAlias(model)) {
    const resolved = parseUserSpecifiedModel(model).toLowerCase()
    return resolved.includes(family)
  }
  return false
}

/**
 * Check if a model name starts with a prefix at a segment boundary.
 * The prefix must match up to the end of the name or a "-" separator.
 * e.g. "claude-opus-4-5" matches "claude-opus-4-5-20251101" but not "claude-opus-4-50".
 */
function prefixMatchesModel(modelName: string, prefix: string): boolean {
  if (!modelName.startsWith(prefix)) {
    return false
  }
  return modelName.length === prefix.length || modelName[prefix.length] === '-'
}

/**
 * Check if a model matches a version-prefix entry in the allowlist.
 * Supports shorthand like "opus-4-5" (mapped to "claude-opus-4-5") and
 * full prefixes like "claude-opus-4-5". Resolves input aliases before matching.
 */
function modelMatchesVersionPrefix(model: string, entry: string): boolean {
  // Resolve the input model to a full name if it's an alias
  const resolvedModel = isModelAlias(model)
    ? parseUserSpecifiedModel(model).toLowerCase()
    : model

  // Try the entry as-is (e.g. "claude-opus-4-5")
  if (prefixMatchesModel(resolvedModel, entry)) {
    return true
  }
  // Try with "claude-" prefix (e.g. "opus-4-5" → "claude-opus-4-5")
  if (
    !entry.startsWith('claude-') &&
    prefixMatchesModel(resolvedModel, `claude-${entry}`)
  ) {
    return true
  }
  return false
}

/**
 * Check if a family alias is narrowed by more specific entries in the allowlist.
 * When the allowlist contains both "opus" and "opus-4-5", the specific entry
 * takes precedence — "opus" alone would be a wildcard, but "opus-4-5" narrows
 * it to only that version.
 */
function familyHasSpecificEntries(
  family: string,
  allowlist: string[],
): boolean {
  for (const entry of allowlist) {
    if (isModelFamilyAlias(entry)) {
      continue
    }
    // Check if entry is a version-qualified variant of this family
    // e.g., "opus-4-5" or "claude-opus-4-5-20251101" for the "opus" family
    // Must match at a segment boundary (followed by '-' or end) to avoid
    // false positives like "opusplan" matching "opus"
    const idx = entry.indexOf(family)
    if (idx === -1) {
      continue
    }
    const afterFamily = idx + family.length
    if (afterFamily === entry.length || entry[afterFamily] === '-') {
      return true
    }
  }
  return false
}

/**
 * Model allowlist disabled — LegnaCode allows any model name.
 * Third-party providers use arbitrary model names (gpt-5-codex, deepseek-v4-flash, etc.)
 * that would never pass a Claude-centric allowlist.
 */
export function isModelAllowed(_model: string): boolean {
  return true
}
