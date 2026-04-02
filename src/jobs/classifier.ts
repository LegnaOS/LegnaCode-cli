/**
 * Job classifier — analyzes assistant turn messages and writes job state.
 * Used by TEMPLATES to track structured workflow progress.
 * Gated by feature('TEMPLATES').
 */
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { AssistantMessage } from '../types/message.js'
import { logForDebugging } from '../utils/debug.js'
import { getContentText } from '../utils/messages.js'

type JobState = {
  status: 'running' | 'completed' | 'failed' | 'blocked'
  lastUpdated: number
  turnCount: number
  summary: string
}

/**
 * Classify the current turn's assistant messages and write state to the job dir.
 * Called at the end of each turn when CLAUDE_JOB_DIR is set.
 */
export async function classifyAndWriteState(
  jobDir: string,
  turnAssistantMessages: AssistantMessage[],
): Promise<void> {
  if (!jobDir || turnAssistantMessages.length === 0) return

  const lastMessage = turnAssistantMessages[turnAssistantMessages.length - 1]!
  const text = getContentText(lastMessage.message.content)

  // Simple heuristic classification based on content
  let status: JobState['status'] = 'running'
  const lower = text.toLowerCase()
  if (lower.includes('complete') || lower.includes('done') || lower.includes('finished')) {
    status = 'completed'
  } else if (lower.includes('error') || lower.includes('failed') || lower.includes('cannot')) {
    status = 'failed'
  } else if (lower.includes('waiting') || lower.includes('blocked') || lower.includes('need')) {
    status = 'blocked'
  }

  const state: JobState = {
    status,
    lastUpdated: Date.now(),
    turnCount: turnAssistantMessages.length,
    summary: text.slice(0, 200),
  }

  try {
    await mkdir(jobDir, { recursive: true })
    await writeFile(join(jobDir, 'state.json'), JSON.stringify(state, null, 2))
  } catch (e) {
    logForDebugging(`[job] failed to write state: ${e}`)
  }
}
