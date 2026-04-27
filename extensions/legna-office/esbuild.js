const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

function copyAssets() {
  const srcDir = path.join(__dirname, 'webview-ui', 'public', 'assets');
  const dstDir = path.join(__dirname, 'dist', 'assets');
  if (fs.existsSync(srcDir)) {
    if (fs.existsSync(dstDir)) fs.rmSync(dstDir, { recursive: true });
    fs.cpSync(srcDir, dstDir, { recursive: true });
    console.log('✓ Copied assets/ → dist/assets/');
  }
}

function copyWebviewDist() {
  const srcDir = path.join(__dirname, 'webview-ui', 'dist');
  const dstDir = path.join(__dirname, 'dist', 'webview');
  if (fs.existsSync(srcDir)) {
    if (fs.existsSync(dstDir)) fs.rmSync(dstDir, { recursive: true });
    fs.cpSync(srcDir, dstDir, { recursive: true });
    console.log('✓ Copied webview-ui/dist/ → dist/webview/');
  } else {
    console.warn('⚠ webview-ui/dist/ not found — run webview build first');
  }
}

async function main() {
  // 1. Build extension host
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
  });

  // 2. Build hook script (standalone CJS, no vscode dependency)
  const hookCtx = await esbuild.context({
    entryPoints: ['server/src/providers/hook/claude/hooks/claude-hook.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    platform: 'node',
    outfile: 'dist/hooks/claude-hook.js',
    logLevel: 'silent',
  });

  if (watch) {
    await ctx.watch();
    await hookCtx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    await hookCtx.rebuild();
    await hookCtx.dispose();
    copyAssets();
    copyWebviewDist();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
