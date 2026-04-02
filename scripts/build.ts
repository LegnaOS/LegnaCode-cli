/**
 * Build script for Claude Code CLI.
 *
 * Uses Bun's bundler with feature flags for dead code elimination
 * and MACRO.* compile-time replacements defined in bunfig.toml.
 *
 * Usage:
 *   bun run scripts/build.ts
 *   bun run scripts/build.ts --features BRIDGE_MODE,VOICE_MODE
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dir, '..')

// Parse --features flag from CLI args
const featuresArg = process.argv.find((a) => a.startsWith('--features'))
const enabledFeatures = new Set(
  featuresArg
    ? process.argv[process.argv.indexOf(featuresArg) + 1]?.split(',') ?? []
    : [],
)

// Read bunfig.toml to extract MACRO defines and feature flags
function parseBunfig(): {
  defines: Record<string, string>
  features: string[]
} {
  const content = readFileSync(resolve(ROOT, 'bunfig.toml'), 'utf-8')
  const defines: Record<string, string> = {}
  const features: string[] = []
  let section: 'define' | 'features' | null = null
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '[bundle.define]') {
      section = 'define'
      continue
    }
    if (trimmed === '[bundle.features]') {
      section = 'features'
      continue
    }
    if (trimmed.startsWith('[')) {
      section = null
      continue
    }
    if (!line.includes('=')) continue
    const [key, ...rest] = line.split('=')
    const k = key!.trim().replace(/"/g, '')
    const v = rest.join('=').trim()
    if (section === 'define') {
      defines[k] = v
    } else if (section === 'features') {
      // Include flag if enabled in bunfig.toml or via CLI --features override
      if (v === 'true' || enabledFeatures.has(k)) {
        features.push(k)
      }
    }
  }
  return { defines, features }
}

const { defines, features } = parseBunfig()

const result = await Bun.build({
  entrypoints: [resolve(ROOT, 'src/entrypoints/cli.tsx')],
  outdir: resolve(ROOT, 'dist'),
  target: 'bun',
  format: 'esm',
  splitting: true,
  sourcemap: 'external',
  define: defines,
  features,
  external: [
    // Anthropic internal packages (not available on npm)
    '@ant/claude-for-chrome-mcp',
    '@ant/computer-use-input',
    '@ant/computer-use-mcp',
    '@ant/computer-use-mcp/sentinelApps',
    '@ant/computer-use-mcp/types',
    '@ant/computer-use-swift',
    '@anthropic-ai/mcpb',
    '@anthropic-ai/sandbox-runtime',
    '@anthropic-ai/claude-agent-sdk',
    // Native addons
    'audio-capture.node',
    'audio-capture-napi',
    'modifiers-napi',
    'color-diff-napi',
  ],
})

if (!result.success) {
  console.error('Build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log(
  `Build succeeded: ${result.outputs.length} files written to dist/`,
)
