<div align="center">

# LegnaCode CLI

**An AI-powered terminal programming assistant, supercharged.**

[![version](https://img.shields.io/badge/version-1.9.2-blue)](./CHANGELOG.md)
[![platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-brightgreen)](#platform-support)
[![license](https://img.shields.io/badge/license-MIT-yellow)](./LICENSE)
[![Claude Code](https://img.shields.io/badge/based%20on-Claude%20Code-blueviolet)](https://github.com/anthropics/claude-code)

🌐 [中文文档](./README.zh-CN.md) · 🛠️ [开发者文档](./developer.md) · 🛠️ [Developer Guide](./developer.en.md) · 📊 [vs Claude Code](./COMPARISON.md) · 📊 [vs Codex](./COMPARISON-CODEX.md) · 📋 [Changelog](./CHANGELOG.md)

<img width="855" height="319" alt="image" src="https://github.com/user-attachments/assets/02c7ba2f-4ef7-4799-8e3c-b469279c44e8" />


</div>

---

LegnaCode is built on top of [Claude Code CLI](https://github.com/anthropics/claude-code) with deep enhancements — fully compatible with the original, while adding multimodal tools, smarter memory, better UX, and more.

### Highlights

🧠 **88% less memory tokens** — 4-layer memory stack with vector search replaces flat MEMORY.md injection\
🎨 **6 multimodal tools** — Image, video, speech, music, vision, web search (MiniMax models)\
⚡ **Instant feedback** — Token counter from second 1, status in spinner line, no silent operations\
🔌 **Pluggable memory** — DrawerStore (SQLite + TF-IDF), temporal knowledge graph, WAL audit\
🤖 **Smarter agents** — RPC subprocess execution, autonomous skill detection, smart model routing

---

## Changelog

| Version | Summary |
|---------|---------|
| **1.9.2** | Computer Use Python bridge (macOS + Windows); auto Python 3.12+ venv setup; feature gate removal for Computer Use |
| **1.9.0** | Portable sessions (relative cwd); WebUI overhaul (project browser, memory editor, force-directed graph); full project migration (sessions + subagents + memory + skills + agents + rules + MCP config); profile switching via pointer file |
| **1.8.5** | Token optimization: compress tool prompts (BashTool/AgentTool/TodoWrite/EnterPlanMode); fix cache_control for Kimi/MiniMax/MiMo adapters |

<details>
<summary>1.8.x patches</summary>

| Version | Summary |
|---------|---------|
| 1.8.4 | Fix `isVirtual in m` crash — null guards for session transcript processing |
| 1.8.3 | GitHub Actions CI release workflow; OML agent type fix; cross-platform Rust native addon builds |
| 1.8.2 | Null-guard fixes for message pipeline crashes; Rust native addons (sandbox/file-search/apply-patch) for darwin-arm64 |

</details>

| **1.8.0** | Codex full compat: plugin adapter + marketplace, skills discovery, config interop; TS/Python SDK; TTS + WebRTC voice |

<details>
<summary>Older versions</summary>

| Version | Summary |
|---------|---------|
| 1.6.1 | Rust NAPI addon (cosine/tfidf/hash/tokens); kernel sandbox (Seatbelt/seccomp); two-pass wake-up; keyword-density L1 |
| 1.6.0 | Collaboration modes (`/mode`); JS REPL bridge; JSON-RPC app-server; agent config migration (`/migrate`) |
| 1.5.9 | Guardian sub-agent; shell escalation protocol; network policy agent |
| 1.5.8 | Process hardening; exec policy engine; secret detector; rollback implementation |
| 1.5.7 | Git-style `/fork` command: fork from any message (`@N`), list branches, switch between forks |
| 1.5.6 | WebUI SSE timeout fix (255s max); controller double-close crash fix |
| 1.5.4 | Republish with all platform binaries in sync |
| 1.5.3 | Hermes self-evolution loop; Qwen adapter; WebUI chat viewer & live chat; auto skill creation |
| 1.5.2 | Perf audit: async CodeGraph, undoTracker size guard, compacting i18n, TTL caches |
| 1.5.1 | Proactive skill invocation (OML 1% rule); auto-inject frontend/design guidelines; enhanced designer agent |
| 1.5.0 | Fix REPL startup deadlock; remove /undo static import; all AtomCode features fully wired |
| 1.4.9 | Baseline (no-AVX) builds for older x64 CPUs (darwin-x64-baseline, linux-x64-baseline) |
| 1.4.8 | AtomCode fusion (Pangu CJK spacing, frustration detection, loop guard, error file injection, first-read full) |
| 1.4.7 | claude-mem fusion (content-hash dedup, token economics, relevance feedback, 90-day decay, privacy tags) |
| 1.4.6 | OML skill crash fix; plans + memory → project-local; compound engineering fusion |
| 1.4.5 | OpenViking content tiering (L0/L1/L2 degradation + budget-capped injection) |
| 1.4.4 | Status messages → spinner line; comparison doc |
| 1.4.3 | Mempalace memory fusion (DrawerStore + TF-IDF + 4-layer stack + knowledge graph) |
| 1.4.2 | Progress feedback (8 silent paths fixed); verbose default on |
| 1.3.6 | Windows path separator fix for Edit tool |
| 1.3.5 | SessionStart hook fix; Windows alt-screen rendering |
| 1.3.4 | OML Superpowers (11 skills); SessionStart guidance |
| 1.3.3 | OML smart orchestration (19 agent skills) |
| 1.3.2 | Disabled History Snip; Windows streaming fix |
| 1.3.1 | 1M model snip threshold fix |
| 1.3.0 | Project-local storage; `legna migrate` |
| 1.2.1 | Model adapter layer (MiMo, GLM, DeepSeek, Kimi, MiniMax) |
| 1.2.0 | Sessions grouped by project; native Windows compilation |
| 1.1.5–1.1.9 | Windows install fixes; WebUI admin panel |
| 1.0.0–1.0.9 | Initial release; feature flags; i18n; BUDDY pet |

</details>

Full details → [CHANGELOG.md](./CHANGELOG.md)

---

## Acknowledgments

Built on [Claude Code CLI](https://github.com/anthropics/claude-code) by Anthropic — the pioneering terminal AI programming tool. LegnaCode extends it with multimodal capabilities, smarter memory, and enhanced UX while maintaining full upstream compatibility. Thanks to the Anthropic team for open-sourcing this excellent foundation.

---

## Features

<table>
<tr><td>

**🎨 Multimodal** (MiniMax)
- Image / Video / Speech generation
- Music generation / Vision / Web search
- Auto-orchestrated pipelines
- `/auth-minimax` configuration

</td><td>

**🧠 Memory**
- 4-layer stack (~800 tokens/turn)
- TF-IDF vector search (<5ms)
- Temporal knowledge graph
- PreCompact auto-save

</td></tr>
<tr><td>

**⚡ Agent**
- RPC subprocess tool execution
- Smart model routing
- Autonomous skill detection
- Cross-session `/recall` search

</td><td>

**🛡️ Core**
- 45+ built-in tools
- Multi-cloud backends
- MCP protocol support
- Multi-agent collaboration

</td></tr>
<tr><td>

**🖥️ UX**
- Verbose on by default
- Token counter from second 1
- Status in spinner line
- Interrupt reason visible

</td><td>

**🔧 DevOps**
- WebUI admin panel
- `legna migrate` tool
- Pure TS syntax highlighting
- Cross-platform binaries

</td></tr>
</table>

---

## Requirements

| Dependency | Version |
|------------|---------|
| [Bun](https://bun.sh) | >= 1.2.0 |
| Node.js | >= 18 (optional) |
| Git | >= 2.0 |
| OS | macOS / Linux |

---

## Installation

### Option 1: npm Global Install (Recommended)

```bash
npm install -g @legna-lnc/legnacode
```

If using a mirror registry (e.g., cnpm, Taobao mirror) and the install fails or the version is out of sync, you can specify the official registry:

```bash
npm install -g @legna-lnc/legnacode --registry=https://registry.npmjs.org
```

Once installed, the `legna` command is available in any directory. It automatically downloads the precompiled binary for your platform (supports macOS arm64/x64, Linux x64/arm64, Windows x64).

### Older CPUs without AVX

If you see `warn: CPU lacks AVX support, strange crashes may occur`, install the baseline build instead:

```bash
# macOS Intel (pre-2011 or Hackintosh without AVX)
npm i -g @legna-lnc/legnacode-darwin-x64-baseline

# Linux x64 (older servers/VMs without AVX)
npm i -g @legna-lnc/legnacode-linux-x64-baseline
```

The baseline binary is in `node_modules/@legna-lnc/legnacode-<platform>-baseline/bin/legna`. Add it to your PATH or create an alias.

```bash
# Verify installation
legna --version

# Update to the latest version
npm update -g @legna-lnc/legnacode
```

### Option 2: Build from Source

```bash
git clone https://github.com/LegnaOS/LegnaCode-cli.git
cd LegnaCode-cli
bun install
bun run compile
# The compiled binary is ./legna — move it to your PATH
```

---

## Quick Start

```bash
# Interactive mode
legna

# Non-interactive mode (ask directly)
legna -p "Explain what this code does"

# Continue the last session
legna --continue

# Check version
legna --version
```

---

## Project Structure

```
├── src/
│   ├── entrypoints/       # Entry point (cli.tsx)
│   ├── server/            # HTTP server (admin WebUI)
│   ├── components/        # React/Ink terminal UI components
│   ├── tools/             # Built-in tools (Bash, file ops, search, etc.)
│   ├── services/          # API calls, MCP client, analytics, etc.
│   ├── native-ts/         # Pure TS replacements for native modules (syntax highlighting, etc.)
│   ├── utils/             # Utility functions
│   └── hooks/             # React hooks
├── webui/                 # Admin WebUI frontend (React + Vite + Tailwind)
├── stubs/                 # Native module stubs (compile-time external dependency placeholders)
├── scripts/               # Build scripts
├── bunfig.toml            # Bun build config (Feature Flags, macro definitions)
└── package.json
```

---

## Build

LegnaCode uses Bun's bundler for building, with two modes:

- `bun run build` — Build to `dist/` directory, suitable for development and debugging
- `bun run compile` — Compile to a standalone `legna` binary, no Bun runtime required

### Admin WebUI

`legna admin` launches a browser-based admin panel that lets you manage all configuration through a web interface — no manual JSON editing needed.

```bash
# Launch admin panel (default port 3456, auto-opens browser)
legna admin

# Custom port
legna admin 8080
```

Tabs at the top of the panel switch between management scopes: **Claude** (`~/.claude/`) and **LegnaCode** (`~/.legna/`). Each scope provides four panels:

| Panel | Function |
|-------|----------|
| Config Editor | Visual editing of settings.json: API endpoint, API key, model mapping (Opus/Sonnet/Haiku), timeout, permission mode, language, etc. |
| Config Profiles | Lists all settings*.json files, shows baseUrl/model, one-click to switch active profile |
| Session History | Browse past sessions showing project path, slug, timestamp, prompt count; one-click copy `legna --resume` command |
| Config Migration | Bidirectional Claude ↔ LegnaCode migration; supports full or selective field migration with pre-migration diff preview |

> When running from source, build the frontend first: `cd webui && npm install && npm run build`, then `bun run src/server/admin.ts`. The npm global install version includes the pre-built WebUI.

Build-time constants such as version numbers are injected via `[bundle.define]` in `bunfig.toml`. Feature Flags in `[bundle.features]` enable dead code elimination.

Native modules (`color-diff-napi`, `modifiers-napi`, etc.) are marked as `external` and load placeholder implementations from `stubs/` at runtime. Syntax highlighting has been switched to a pure TypeScript implementation under `src/native-ts/color-diff/`, requiring no native compilation dependencies.

---

## Configuration

LegnaCode uses `~/.legna/` as the global config directory, with project-level data stored in `<project>/.legna/`:

- `~/.legna/settings.json` — Global user settings
- `~/.legna/.credentials.json` — Authentication credentials
- `<project>/.legna/sessions/` — Project session records (JSONL)
- `<project>/.legna/skills/` — Project skills
- `<project>/.legna/rules/` — Project rules
- `<project>/.legna/settings.json` — Project-level settings
- `LEGNA.md` — Project instruction file, automatically read and followed by the AI

> On first launch, global data is automatically migrated one-way from `~/.claude/` to `~/.legna/` (existing files are not overwritten). Legacy sessions under `~/.claude/projects/` are read automatically via a fallback chain — no manual migration needed. Set `LEGNA_NO_CONFIG_SYNC=1` to disable automatic migration.

### legna migrate

Manually migrate data:

```bash
# Migrate everything (global + current project sessions)
legna migrate

# Migrate global data only: ~/.claude/ → ~/.legna/
legna migrate --global

# Migrate current project sessions to local .legna/sessions/ only
legna migrate --sessions

# Dry run (no files are actually moved)
legna migrate --dry-run
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `CLAUDE_CODE_USE_BEDROCK` | Use AWS Bedrock backend |
| `CLAUDE_CODE_USE_VERTEX` | Use GCP Vertex backend |
| `CLAUDE_CODE_SYNTAX_HIGHLIGHT` | Set to `0` to disable syntax highlighting |
| `MINIMAX_API_KEY` | MiniMax API key (enables multimodal tools) |
| `MINIMAX_REGION` | MiniMax region: `global` (default) or `cn` |
| `MINIMAX_BASE_URL` | Custom MiniMax API URL (overrides region default) |

---

## MiniMax Multimodal Integration

When using a MiniMax model (`ANTHROPIC_BASE_URL` pointing to `api.minimax.io` or `api.minimaxi.com`) with `MINIMAX_API_KEY` configured, LegnaCode automatically registers 6 native multimodal tools that the AI can call directly.

### Configuration

```bash
# Option 1: Environment variables
export MINIMAX_API_KEY="your-api-key"
export MINIMAX_REGION="global"  # or "cn"

# Option 2: Interactive configuration (persisted to ~/.legna/minimax-credentials.json)
legna
> /auth-minimax your-api-key
```

Get your API key: [MiniMax Global](https://platform.minimax.io) or [MiniMax China](https://platform.minimaxi.com)

### Multimodal Tools

| Tool | Function | Example |
|------|----------|---------|
| `MiniMaxImageGenerate` | Text-to-image generation | "Generate a cyberpunk cityscape at night" |
| `MiniMaxVideoGenerate` | Text/image-to-video generation | "Turn this image into a 5-second animation" |
| `MiniMaxSpeechSynthesize` | Text-to-speech | "Convert this text to spoken audio" |
| `MiniMaxMusicGenerate` | Text-to-music generation | "Generate an upbeat piano background track" |
| `MiniMaxVisionDescribe` | Image understanding and analysis | "Describe the contents of this image" |
| `MiniMaxWebSearch` | Web search | "Search for the latest TypeScript 5.x features" |

These tools are only enabled when using MiniMax models and do not affect the tool list for other models.

### Multimodal Workflow

The AI can automatically orchestrate multiple tools to complete complex tasks:

```
User: Help me create a promotional video for my project

AI auto-orchestrates:
1. Analyze the project README, extract key selling points
2. MiniMaxImageGenerate → Generate keyframe images
3. MiniMaxVideoGenerate → Generate video from keyframes
4. MiniMaxSpeechSynthesize → Generate narration voiceover
5. Return URLs for all generated assets
```

### Schema Export

MiniMax tool schemas can be exported in Anthropic-compatible format for external integration:

```typescript
import { exportMiniMaxToolSchemasJSON } from './src/tools/MiniMaxTools/schemaExport.js'
console.log(exportMiniMaxToolSchemasJSON())
```

---

## License

This project follows the open-source license of the upstream Claude Code CLI. See the [Claude Code CLI](https://github.com/anthropics/claude-code) original repository for details.

---

<div align="center">

**[Claude Code CLI](https://github.com/anthropics/claude-code)** · **[Anthropic](https://www.anthropic.com)** · **[Model Context Protocol](https://modelcontextprotocol.io)**

</div>
