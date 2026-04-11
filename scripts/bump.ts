/**
 * Bump version across all files in one shot.
 *
 * Usage:
 *   bun run scripts/bump.ts 1.2.0
 *   bun run scripts/bump.ts patch   # 1.1.5 → 1.1.6
 *   bun run scripts/bump.ts minor   # 1.1.5 → 1.2.0
 *   bun run scripts/bump.ts major   # 1.1.5 → 2.0.0
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dir, '..')

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
const current = pkg.version as string

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: bun run scripts/bump.ts <version|patch|minor|major>')
  process.exit(1)
}

function bump(ver: string, type: string): string {
  const [ma, mi, pa] = ver.split('.').map(Number)
  if (type === 'patch') return `${ma}.${mi}.${pa! + 1}`
  if (type === 'minor') return `${ma}.${mi! + 1}.0`
  if (type === 'major') return `${ma! + 1}.0.0`
  return type // exact version
}

const next = ['patch', 'minor', 'major'].includes(arg) ? bump(current, arg) : arg
console.log(`${current} → ${next}`)

const PLATFORMS = [
  '@legna-lnc/legnacode-darwin-arm64',
  '@legna-lnc/legnacode-darwin-x64',
  '@legna-lnc/legnacode-linux-x64',
  '@legna-lnc/legnacode-linux-arm64',
  '@legna-lnc/legnacode-win32-x64',
  '@legna-lnc/legnacode-win32-ia32',
]

// 1. package.json — version + optionalDependencies
pkg.version = next
for (const p of PLATFORMS) {
  if (pkg.optionalDependencies?.[p]) pkg.optionalDependencies[p] = next
}
writeFileSync(resolve(ROOT, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
console.log('  ✓ package.json')

// 2. bunfig.toml — MACRO.VERSION
const bunfigPath = resolve(ROOT, 'bunfig.toml')
let bunfig = readFileSync(bunfigPath, 'utf-8')
bunfig = bunfig.replace(/"MACRO\.VERSION"\s*=\s*'"[^"]*"'/, `"MACRO.VERSION" = '"${next}"'`)
writeFileSync(bunfigPath, bunfig)
console.log('  ✓ bunfig.toml')

// 3. webui/package.json
const webuiPkgPath = resolve(ROOT, 'webui/package.json')
try {
  const webuiPkg = JSON.parse(readFileSync(webuiPkgPath, 'utf-8'))
  webuiPkg.version = next
  writeFileSync(webuiPkgPath, JSON.stringify(webuiPkg, null, 2) + '\n')
  console.log('  ✓ webui/package.json')
} catch {
  console.log('  ⊘ webui/package.json (not found, skipped)')
}

console.log(`\nAll versions set to ${next}`)
