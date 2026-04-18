/**
 * Parallel File Edit — "one sub-agent per file" mode.
 *
 * Ported from AtomCode's sub_agent.rs parallel execution model.
 * Each sub-agent gets: target file full text + sibling file skeletons + interface contracts.
 * Results are collected and conflict-checked.
 */

import { readFileSync, existsSync } from 'fs'
import { join, relative, dirname, basename } from 'path'
import { logForDebugging } from '../../utils/debug.js'

interface FileEditTask {
  filePath: string
  instruction: string
  fullContent: string
  siblingSkeletons: string[]
}

interface FileEditResult {
  filePath: string
  success: boolean
  error?: string
}

/** Extract skeleton (exports + function signatures) from a file */
function extractSkeleton(content: string, filePath: string): string {
  const lines = content.split('\n')
  const skeleton: string[] = [`// --- ${basename(filePath)} skeleton ---`]
  for (const line of lines) {
    const trimmed = line.trim()
    if (
      /^(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|enum)\s/.test(trimmed) ||
      /^(?:pub\s+)?(?:async\s+)?(?:fn|struct|trait|enum|impl)\s/.test(trimmed) ||
      /^(?:def|class)\s/.test(trimmed) ||
      /^(?:func)\s/.test(trimmed)
    ) {
      skeleton.push(trimmed)
    }
  }
  return skeleton.join('\n')
}

/** Get sibling file skeletons (same directory, same extension) */
function getSiblingSkeletons(filePath: string, cwd: string, maxSiblings = 5): string[] {
  const dir = dirname(filePath)
  const ext = filePath.slice(filePath.lastIndexOf('.'))
  const skeletons: string[] = []

  try {
    const { readdirSync } = require('fs')
    const entries = readdirSync(dir) as string[]
    for (const entry of entries) {
      if (skeletons.length >= maxSiblings) break
      if (entry === basename(filePath)) continue
      if (!entry.endsWith(ext)) continue
      const sibPath = join(dir, entry)
      try {
        const content = readFileSync(sibPath, 'utf-8')
        skeletons.push(extractSkeleton(content, sibPath))
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return skeletons
}

/** Build parallel file edit tasks from a plan */
export function buildFileEditTasks(
  files: Array<{ path: string; instruction: string }>,
  cwd: string,
): FileEditTask[] {
  return files.map(f => {
    const absPath = f.path.startsWith('/') ? f.path : join(cwd, f.path)
    const fullContent = existsSync(absPath) ? readFileSync(absPath, 'utf-8') : ''
    const siblingSkeletons = getSiblingSkeletons(absPath, cwd)
    return {
      filePath: f.path,
      instruction: f.instruction,
      fullContent,
      siblingSkeletons,
    }
  })
}

/** Generate sub-agent prompt for a single file edit */
export function generateFileEditPrompt(task: FileEditTask): string {
  const parts = [
    `You are editing ONE file: ${task.filePath}`,
    `Your ONLY job is to make the requested changes to this file. Do NOT edit any other file.`,
    '',
    `## Current file content`,
    '```',
    task.fullContent || '(new file)',
    '```',
  ]

  if (task.siblingSkeletons.length > 0) {
    parts.push('', '## Sibling file skeletons (for reference only, do NOT edit)')
    for (const skel of task.siblingSkeletons) {
      parts.push('```', skel, '```')
    }
  }

  parts.push('', `## Instruction`, task.instruction)
  parts.push('', `Call the Edit or Write tool IMMEDIATELY. Do not explain, do not ask questions.`)

  return parts.join('\n')
}

/** Check for conflicts between parallel edit results */
export function detectConflicts(
  results: FileEditResult[],
): Array<{ file1: string; file2: string; reason: string }> {
  // Simple conflict detection: same file edited by multiple agents
  const fileMap = new Map<string, number>()
  const conflicts: Array<{ file1: string; file2: string; reason: string }> = []

  for (const r of results) {
    const count = (fileMap.get(r.filePath) ?? 0) + 1
    fileMap.set(r.filePath, count)
    if (count > 1) {
      conflicts.push({
        file1: r.filePath,
        file2: r.filePath,
        reason: `File ${r.filePath} was edited by ${count} agents`,
      })
    }
  }

  return conflicts
}

export { extractSkeleton, getSiblingSkeletons }
