/**
 * Room Detector — auto-classify content into rooms by keyword scoring.
 * Adapted from mempalace's 5-hall system (facts/events/discoveries/preferences/advice).
 */

const ROOM_KEYWORDS: Record<string, string[]> = {
  facts: [
    'name', 'age', 'lives', 'works', 'job', 'role', 'email', 'phone',
    'born', 'married', 'language', 'stack', 'framework', 'version',
  ],
  decisions: [
    'decided', 'chose', 'picked', 'switched', 'migrated', 'adopted',
    'replaced', 'moved', 'changed', 'selected', 'went with', 'prefer',
  ],
  events: [
    'yesterday', 'today', 'last week', 'deployed', 'released', 'shipped',
    'fixed', 'broke', 'merged', 'launched', 'started', 'finished', 'completed',
  ],
  discoveries: [
    'found', 'discovered', 'learned', 'realized', 'noticed', 'figured out',
    'turns out', 'apparently', 'interesting', 'bug', 'issue', 'root cause',
  ],
  preferences: [
    'like', 'prefer', 'hate', 'love', 'want', 'need', 'style', 'always',
    'never', 'favorite', 'dislike', 'avoid', 'convention', 'pattern',
  ],
  advice: [
    'should', 'must', 'remember', 'don\'t forget', 'important', 'note',
    'warning', 'careful', 'tip', 'best practice', 'rule', 'guideline',
  ],
}

/**
 * Detect the most likely room for a piece of content.
 * Returns the room name with the highest keyword score.
 */
export function detectRoom(content: string): string {
  const lower = content.toLowerCase()
  let bestRoom = 'facts'
  let bestScore = 0

  for (const [room, keywords] of Object.entries(ROOM_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestRoom = room
    }
  }

  return bestRoom
}

/**
 * Detect wing from file path or explicit tag.
 * Maps to mempalace's wing concept (person/project partition).
 */
export function detectWing(filePath: string, projectSlug?: string): string {
  // Team memory
  if (filePath.includes('/team/')) return '_team'
  // User-scoped memory
  if (filePath.includes('/user/') || filePath.includes('USER.md')) return '_global'
  // Project-scoped (default)
  return projectSlug || '_project'
}
