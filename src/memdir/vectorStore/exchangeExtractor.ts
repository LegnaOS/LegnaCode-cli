/**
 * Exchange Extractor — extract Q+A pairs from conversation for memory mining.
 * Adapted from mempalace's miner.py exchange-pair chunking.
 *
 * Scores each pair on 5 markers: decisions, preferences, milestones, problems, emotional.
 * High-scoring pairs get upserted to DrawerStore.
 */

import { createHash } from 'crypto'
import { detectRoom } from './roomDetector.js'
import type { Drawer } from './types.js'

interface ExchangePair {
  user: string
  assistant: string
  score: number
  markers: string[]
}

const MARKER_PATTERNS: Record<string, RegExp[]> = {
  decisions: [/decided|chose|picked|switched|went with|let's go with|i'll use/i],
  preferences: [/prefer|like|hate|love|always|never|style|convention/i],
  milestones: [/deployed|released|shipped|launched|completed|finished|merged|fixed/i],
  problems: [/bug|error|issue|broken|failed|crash|doesn't work|can't|won't/i],
  emotional: [/frustrated|excited|happy|worried|confused|surprised|annoyed/i],
}

const MIN_SCORE_THRESHOLD = 2
const MIN_CONTENT_LENGTH = 50

/**
 * Extract exchange pairs from a conversation message array.
 * Messages should alternate user/assistant.
 */
export function extractExchangePairs(
  messages: Array<{ type: string; content: string }>,
): ExchangePair[] {
  const pairs: ExchangePair[] = []

  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i]!
    const next = messages[i + 1]!

    if (msg.type === 'user' && next.type === 'assistant') {
      const combined = `${msg.content}\n${next.content}`
      if (combined.length < MIN_CONTENT_LENGTH) continue

      const markers: string[] = []
      for (const [name, patterns] of Object.entries(MARKER_PATTERNS)) {
        for (const pat of patterns) {
          if (pat.test(combined)) {
            markers.push(name)
            break
          }
        }
      }

      pairs.push({
        user: msg.content,
        assistant: next.content,
        score: markers.length,
        markers,
      })
    }
  }

  return pairs
}

/**
 * Convert high-scoring exchange pairs into Drawers for storage.
 */
export function pairsToDrawers(
  pairs: ExchangePair[],
  wing: string,
  sourceId: string,
): Drawer[] {
  return pairs
    .filter(p => p.score >= MIN_SCORE_THRESHOLD)
    .map((pair, idx) => {
      const content = `Q: ${pair.user.slice(0, 400)}\nA: ${pair.assistant.slice(0, 400)}`
      const id = createHash('sha256')
        .update(`${wing}\0${sourceId}\0${idx}`)
        .digest('hex')
        .slice(0, 24)

      return {
        id,
        content,
        wing,
        room: detectRoom(content),
        sourceFile: sourceId,
        chunkIndex: idx,
        importance: Math.min(1.0, 0.3 + pair.score * 0.15),
        addedBy: 'exchange_extractor',
        filedAt: new Date().toISOString(),
      }
    })
}
