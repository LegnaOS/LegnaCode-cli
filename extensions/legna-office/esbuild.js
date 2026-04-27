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

async function main() {
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
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    copyAssets();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
