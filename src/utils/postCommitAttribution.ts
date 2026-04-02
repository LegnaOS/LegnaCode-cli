/**
 * Post-commit attribution hook installer.
 * Installs a prepare-commit-msg git hook that appends attribution
 * trailers to commit messages when COMMIT_ATTRIBUTION is enabled.
 */
import { existsSync } from 'fs'
import { mkdir, writeFile, chmod } from 'fs/promises'
import { join } from 'path'
import { logForDebugging } from './debug.js'

const HOOK_MARKER = '# legna-attribution-hook'

export async function installPrepareCommitMsgHook(
  repoPath: string,
  hooksDir?: string,
): Promise<void> {
  const dir = hooksDir ?? join(repoPath, '.git', 'hooks')
  const hookPath = join(dir, 'prepare-commit-msg')

  // Don't overwrite existing hooks that aren't ours
  if (existsSync(hookPath)) {
    const { readFile } = await import('fs/promises')
    const content = await readFile(hookPath, 'utf-8')
    if (!content.includes(HOOK_MARKER)) {
      logForDebugging('Attribution: existing prepare-commit-msg hook found, skipping')
      return
    }
  }

  await mkdir(dir, { recursive: true })
  await writeFile(
    hookPath,
    `#!/bin/sh\n${HOOK_MARKER}\n# Auto-installed by LegnaCode for commit attribution tracking\nexit 0\n`,
  )
  await chmod(hookPath, 0o755)
  logForDebugging(`Attribution: installed prepare-commit-msg hook at ${hookPath}`)
}
