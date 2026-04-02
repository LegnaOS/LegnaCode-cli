import type { Message } from '../types/message.js'
import { getCompanion } from './companion.js'
import { getGlobalConfig } from '../utils/config.js'
import { getContentText } from '../utils/messages.js'

// Context-aware quip pools. The observer picks a pool based on the last
// assistant message content, then draws a random quip from it.
const QUIPS_CODE = [
  '代码写得不错嘛～ (ᵔᴥᵔ)',
  '又写了好多代码！辛苦啦～',
  '这段逻辑好优雅！✨',
  '嗯嗯，看起来能跑！大概…',
  '*认真做笔记中* 📝',
  '要不要跑个测试？(小声)',
  '哇，重构得真漂亮！',
]

const QUIPS_FIX = [
  'Bug 已消灭！🎉',
  '又修好一个～你真厉害！',
  '虫虫再见啦～ 🐛👋',
  '完美修复！给你比心 ♡',
  '*开心转圈圈*',
]

const QUIPS_ERROR = [
  '别灰心，我们再试试！💪',
  '没关系的，bug 都是这样的～',
  '深呼吸…一定能搞定的！',
  '*递上热可可* ☕',
  '报错不可怕，可怕的是放弃！',
]

const QUIPS_IDLE = [
  '(｡◕‿◕｡) ～',
  '*打了个小哈欠*',
  '今天也要加油鸭！🦆',
  '我在这里陪着你哦～',
  '*摇尾巴*',
  '嘿嘿，继续继续～',
  '(*´▽`*)',
  '有什么我能帮忙的吗？',
]

const QUIPS_LONG = [
  '好长的回复…我都看晕了 @_@',
  '信息量好大！容我消化一下～',
  '*翻页翻页*',
  '这么多内容，辛苦你啦！',
]

// Fire rate: ~30% chance per turn to avoid being annoying.
const FIRE_RATE = 0.3

function pickPool(lastText: string): string[] {
  const t = lastText.toLowerCase()
  if (t.includes('error') || t.includes('failed') || t.includes('报错') || t.includes('失败'))
    return QUIPS_ERROR
  if (t.includes('fix') || t.includes('修复') || t.includes('resolved') || t.includes('已修'))
    return QUIPS_FIX
  if (t.length > 2000)
    return QUIPS_LONG
  if (t.includes('```') || t.includes('function') || t.includes('const ') || t.includes('import '))
    return QUIPS_CODE
  return QUIPS_IDLE
}

export async function fireCompanionObserver(
  messages: Message[],
  onReaction: (reaction: string) => void,
): Promise<void> {
  const companion = getCompanion()
  if (!companion || getGlobalConfig().companionMuted) return
  if (messages.length < 2) return
  if (Math.random() > FIRE_RATE) return

  // Find the last assistant message to pick a context-aware quip pool
  let lastText = ''
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!
    if (msg.type === 'assistant') {
      lastText = getContentText(msg.message.content)
      break
    }
  }

  const pool = pickPool(lastText)
  const quip = pool[Math.floor(Math.random() * pool.length)]!
  onReaction(quip)
}
