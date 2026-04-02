/**
 * Template jobs CLI handler — dispatches `legna new`, `legna list`, `legna reply`.
 * Gated by feature('TEMPLATES').
 */
import { readdir, readFile, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

function getTemplatesDir(): string {
  return join(getClaudeConfigHomeDir(), 'templates')
}

function getJobsDir(): string {
  return join(getClaudeConfigHomeDir(), 'jobs')
}

async function listTemplates(): Promise<void> {
  const dir = getTemplatesDir()
  try {
    const files = await readdir(dir)
    const templates = files.filter(f => f.endsWith('.md'))
    if (templates.length === 0) {
      console.log('No templates found. Create .md files in ~/.claude/templates/')
      return
    }
    console.log('Available templates:')
    for (const t of templates) {
      console.log(`  ${t.replace('.md', '')}`)
    }
  } catch {
    console.log('No templates directory. Create ~/.claude/templates/ with .md files.')
  }
}

async function listJobs(): Promise<void> {
  const dir = getJobsDir()
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const jobs = entries.filter(e => e.isDirectory())
    if (jobs.length === 0) {
      console.log('No active jobs.')
      return
    }
    console.log('Active jobs:')
    for (const job of jobs) {
      try {
        const state = JSON.parse(
          await readFile(join(dir, job.name, 'state.json'), 'utf-8'),
        )
        console.log(`  ${job.name} — ${state.status} (${new Date(state.lastUpdated).toLocaleString()})`)
      } catch {
        console.log(`  ${job.name} — (no state)`)
      }
    }
  } catch {
    console.log('No jobs directory.')
  }
}

async function newJob(args: string[]): Promise<void> {
  const templateName = args[1]
  if (!templateName) {
    console.log('Usage: legna new <template-name>')
    await listTemplates()
    return
  }

  const templatePath = join(getTemplatesDir(), `${templateName}.md`)
  try {
    const content = await readFile(templatePath, 'utf-8')
    const jobId = `${templateName}-${Date.now().toString(36)}`
    const jobDir = join(getJobsDir(), jobId)
    await mkdir(jobDir, { recursive: true })
    await writeFile(join(jobDir, 'template.md'), content)
    await writeFile(
      join(jobDir, 'state.json'),
      JSON.stringify({ status: 'running', lastUpdated: Date.now(), turnCount: 0, summary: '' }, null, 2),
    )
    console.log(`Created job: ${jobId}`)
    console.log(`Job dir: ${jobDir}`)
    // Set env for the main REPL to pick up
    process.env.CLAUDE_JOB_DIR = jobDir
  } catch (e) {
    console.error(`Template not found: ${templateName}`)
    await listTemplates()
  }
}

export async function templatesMain(args: string[]): Promise<void> {
  const cmd = args[0]
  switch (cmd) {
    case 'new':
      await newJob(args)
      break
    case 'list':
      await listJobs()
      break
    case 'reply':
      console.log('Reply to job — use --continue with CLAUDE_JOB_DIR set')
      break
    default:
      console.log('Usage: legna [new|list|reply]')
  }
}
