/**
 * 4-Layer Memory Stack — dramatically reduces per-turn token cost.
 * Adapted from mempalace's layers.py.
 *
 * L0: Identity (~100 tokens) — always loaded
 * L1: Top 15 high-importance drawer summaries (~500-800 tokens) — always loaded
 * L2: Wing/room filtered retrieval (~0-500 tokens) — on-demand when topic matches
 * L3: Full vector search (~0-1000 tokens) — explicit recall only
 */

import type { DrawerStore } from './drawerStore.js'
import type { Drawer } from './types.js'

const L1_MAX_DRAWERS = 15
const L1_MAX_CHARS_PER_DRAWER = 120
const L2_MAX_DRAWERS = 8
const L3_MAX_DRAWERS = 10

export interface WakeUpResult {
  /** Combined L0+L1 text for system prompt injection */
  text: string
  /** Approximate token count */
  tokenEstimate: number
  /** Number of drawers included */
  drawerCount: number
}

export class LayeredStack {
  constructor(
    private store: DrawerStore,
    private identityText: string = '',
  ) {}

  /** Set L0 identity text (from identity.md or user memory). */
  setIdentity(text: string): void {
    this.identityText = text
  }

  /**
   * Wake-up: return L0 + L1 for system prompt injection.
   * This replaces the current ~8K MEMORY.md injection with ~800 tokens.
   */
  wakeUp(wing?: string): WakeUpResult {
    const parts: string[] = []

    // L0: Identity
    if (this.identityText) {
      parts.push(`[Identity]\n${this.identityText}`)
    }

    // L1: Top drawers by importance
    const topDrawers = this.store.topByImportance(L1_MAX_DRAWERS, wing)
    if (topDrawers.length > 0) {
      const summaries = topDrawers.map(d => {
        const preview = d.content.length > L1_MAX_CHARS_PER_DRAWER
          ? d.content.slice(0, L1_MAX_CHARS_PER_DRAWER) + '...'
          : d.content
        return `- [${d.room}] ${preview}`
      })
      parts.push(`[Key Memories]\n${summaries.join('\n')}`)
    }

    const text = parts.join('\n\n')
    // Rough token estimate: ~4 chars per token
    const tokenEstimate = Math.ceil(text.length / 4)

    return { text, tokenEstimate, drawerCount: topDrawers.length }
  }

  /**
   * L2: Topic-filtered retrieval. Called when the user's message
   * matches a known wing/room.
   */
  recallByTopic(wing: string, room?: string, limit = L2_MAX_DRAWERS): Drawer[] {
    return this.store.search('', {
      wing,
      room,
      topK: limit,
      minSimilarity: 0,
      minImportance: 0.4,
    }).map(r => r.drawer)
  }

  /**
   * L3: Full vector search. Called for explicit recall (/recall command)
   * or when L2 returns nothing relevant.
   */
  recallByQuery(query: string, wing?: string, limit = L3_MAX_DRAWERS): Drawer[] {
    return this.store.search(query, {
      wing,
      topK: limit,
      minSimilarity: 0.25,
    }).map(r => r.drawer)
  }

  /**
   * Format recalled drawers as context text for injection.
   */
  formatRecall(drawers: Drawer[], label = 'Recalled Memories'): string {
    if (drawers.length === 0) return ''
    const lines = drawers.map(d =>
      `- [${d.wing}/${d.room}] ${d.content.slice(0, 300)}${d.content.length > 300 ? '...' : ''}`
    )
    return `[${label}]\n${lines.join('\n')}`
  }
}
