/**
 * Workflow Engine — structured step execution with conditions and state.
 *
 * Ported from AtomCode's routine system. Parses markdown workflow files
 * into executable steps with success conditions, retry logic, and
 * inter-step context passing.
 *
 * Workflow format:
 * ```markdown
 * ## Step 1: Setup
 * Install dependencies and verify environment.
 * **check:** `npm test --run 2>&1 | tail -1` contains "passed"
 * **on_fail:** retry 2
 *
 * ## Step 2: Implement
 * Write the feature code.
 * **depends:** Step 1
 * ```
 */

import { logForDebugging } from '../../utils/debug.js'

// ── Types ───────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: number
  name: string
  instruction: string
  check?: { command: string; contains?: string; exitCode?: number }
  onFail?: 'retry' | 'skip' | 'abort'
  maxRetries: number
  depends?: number[]
}

export interface WorkflowState {
  steps: WorkflowStep[]
  completed: Set<number>
  failed: Set<number>
  context: Record<string, string>
  currentStep: number
}

// ── Parser ──────────────────────────────────────────────────────────

const STEP_RE = /^##\s+Step\s+(\d+):\s*(.+)$/
const CHECK_RE = /^\*\*check:\*\*\s*`([^`]+)`(?:\s+contains\s+"([^"]+)")?/
const ON_FAIL_RE = /^\*\*on_fail:\*\*\s*(retry\s*\d*|skip|abort)/
const DEPENDS_RE = /^\*\*depends:\*\*\s*Step\s+([\d,\s]+)/

/** Parse a markdown workflow file into structured steps */
export function parseWorkflow(markdown: string): WorkflowStep[] {
  const lines = markdown.split('\n')
  const steps: WorkflowStep[] = []
  let current: Partial<WorkflowStep> | null = null
  let instructionLines: string[] = []

  const flush = () => {
    if (current && current.id !== undefined) {
      current.instruction = instructionLines.join('\n').trim()
      steps.push({
        id: current.id,
        name: current.name ?? `Step ${current.id}`,
        instruction: current.instruction,
        check: current.check,
        onFail: current.onFail ?? 'retry',
        maxRetries: current.maxRetries ?? 2,
        depends: current.depends,
      })
    }
  }

  for (const line of lines) {
    const stepMatch = line.match(STEP_RE)
    if (stepMatch) {
      flush()
      current = { id: parseInt(stepMatch[1]!, 10), name: stepMatch[2]!.trim() }
      instructionLines = []
      continue
    }

    if (!current) continue

    const checkMatch = line.match(CHECK_RE)
    if (checkMatch) {
      current.check = { command: checkMatch[1]!, contains: checkMatch[2] }
      continue
    }

    const failMatch = line.match(ON_FAIL_RE)
    if (failMatch) {
      const val = failMatch[1]!.trim()
      if (val.startsWith('retry')) {
        current.onFail = 'retry'
        const n = parseInt(val.replace('retry', '').trim(), 10)
        if (!isNaN(n)) current.maxRetries = n
      } else {
        current.onFail = val as 'skip' | 'abort'
      }
      continue
    }

    const depMatch = line.match(DEPENDS_RE)
    if (depMatch) {
      current.depends = depMatch[1]!.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      continue
    }

    instructionLines.push(line)
  }
  flush()
  return steps
}

// ── Execution Engine ────────────────────────────────────────────────

/** Create initial workflow state */
export function createWorkflowState(steps: WorkflowStep[]): WorkflowState {
  return {
    steps,
    completed: new Set(),
    failed: new Set(),
    context: {},
    currentStep: steps.length > 0 ? steps[0]!.id : 0,
  }
}

/** Get next executable step (dependencies satisfied, not completed/failed) */
export function getNextStep(state: WorkflowState): WorkflowStep | null {
  for (const step of state.steps) {
    if (state.completed.has(step.id) || state.failed.has(step.id)) continue
    // Check dependencies
    if (step.depends && step.depends.some(d => !state.completed.has(d))) continue
    return step
  }
  return null
}

/** Mark step as completed */
export function completeStep(state: WorkflowState, stepId: number): void {
  state.completed.add(stepId)
  logForDebugging(`[workflow] Step ${stepId} completed`)
}

/** Mark step as failed */
export function failStep(state: WorkflowState, stepId: number): void {
  state.failed.add(stepId)
  logForDebugging(`[workflow] Step ${stepId} failed`)
}

/** Check if workflow is done (all steps completed or failed with abort) */
export function isWorkflowDone(state: WorkflowState): boolean {
  return state.steps.every(s => state.completed.has(s.id) || state.failed.has(s.id))
}

/** Generate a status summary of the workflow */
export function workflowStatus(state: WorkflowState): string {
  const lines = state.steps.map(s => {
    const status = state.completed.has(s.id) ? '✓' : state.failed.has(s.id) ? '✗' : '○'
    return `${status} Step ${s.id}: ${s.name}`
  })
  return lines.join('\n')
}
