# LegnaCode Developer Guide

🌐 [中文版](./developer.md)

This guide is for developers who want to contribute to LegnaCode, build plugins/skills, or integrate with the Admin API.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Development Workflow](#development-workflow)
- [Build System](#build-system)
- [Feature Flags](#feature-flags)
- [Core Architecture](#core-architecture)
- [Tool System](#tool-system)
- [Commands & Skills](#commands--skills)
- [Permission System](#permission-system)
- [Hook System](#hook-system)
- [Plugin System](#plugin-system)
- [MCP Integration](#mcp-integration)
- [Agent / Subagent System](#agent--subagent-system)
- [Session Management](#session-management)
- [Admin WebUI](#admin-webui)
- [Admin REST API](#admin-rest-api)
- [npm Distribution](#npm-distribution)
- [Release Process](#release-process)
- [Security Hardening](#security-hardening)
- [Key Design Patterns](#key-design-patterns)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) >= 1.2.0 |
| Language | TypeScript (ES2022, strict) |
| Terminal UI | React + [Ink](https://github.com/vadimdemedes/ink) (JSX → terminal rendering) |
| CLI Framework | [Commander.js](https://github.com/tj/commander.js) |
| WebUI Frontend | React 18 + Vite 6 + Tailwind CSS 3 |
| Bundler | Bun bundler (ESM, code splitting, standalone compile) |
| Validation | [Zod](https://zod.dev) (all external data) |
| Build Output | Platform-native binaries (no Bun/Node runtime required) |

---

## Project Structure

```
├── src/
│   ├── entrypoints/          # Bootstrap entry points
│   │   ├── cli.tsx           # Main entry — fast-path cascade, dynamic imports
│   │   └── init.ts           # Initialization (memoized) — config, security, telemetry
│   ├── main.tsx              # Full CLI main function (Commander + REPL launch)
│   ├── bootstrap/
│   │   └── state.ts          # Global singleton STATE — session, billing, hooks registry
│   ├── state/
│   │   └── store.ts          # Reactive UI state (custom createStore implementation)
│   ├── server/
│   │   ├── admin.ts          # Bun.serve REST API (port 3456)
│   │   └── admin-ui-html.ts  # Auto-generated — inlined WebUI strings (do not edit)
│   ├── commands/             # Slash commands (/help, /compact, /model …)
│   ├── tools/                # Built-in tools (Bash, Read, Edit, Grep …)
│   ├── services/             # API calls, MCP client, analytics
│   │   └── mcp/             # MCP protocol integration
│   ├── hooks/                # React hooks (useCanUseTool, etc.)
│   ├── permissions/          # Permission evaluation logic
│   ├── security/             # Process hardening (processHardening.ts)
│   ├── plugins/              # Plugin system
│   ├── skills/               # Skill system (bundled + dynamic discovery)
│   ├── components/           # React/Ink terminal UI components
│   ├── native-ts/            # Pure TS replacements for native modules (syntax highlighting, etc.)
│   ├── bridge/               # Remote control / Bridge mode
│   ├── daemon/               # Long-running daemon process
│   ├── migrations/           # Data migrations (model renames, settings migration)
│   ├── context.ts            # System prompt context (git status, LEGNA.md)
│   ├── Tool.ts               # Tool type definition + buildTool()
│   ├── tools.ts              # getAllBaseTools() — tool registry
│   ├── commands.ts           # getCommands() — command registry
│   ├── types/                # TypeScript type declarations
│   │   └── bun-bundle.d.ts   # feature() + MACRO types
│   └── utils/
│       ├── legnaPathResolver.ts  # Path resolution (PROJECT_FOLDER, etc.)
│       └── envUtils.ts           # Config directory, env vars, migration
├── webui/                    # Admin WebUI frontend
│   ├── src/
│   │   ├── App.tsx           # SPA main component (scope switching + panel navigation)
│   │   ├── api/client.ts     # Typed API client
│   │   └── components/       # Panel components (settings, sessions, chat …)
│   ├── vite.config.ts        # Vite config (dev proxy → :3456)
│   └── package.json
├── scripts/
│   ├── build.ts              # Dev build → dist/
│   ├── compile.ts            # Single-platform compile → ./legna binary
│   ├── compile-all.ts        # 7-platform cross-compilation
│   ├── publish.ts            # Full release pipeline
│   ├── bump.ts               # Version number sync
│   ├── build-webui.ts        # WebUI build + inline
│   ├── inline-webui.ts       # Vite output → TS string constants
│   └── postbuild-fix.py      # Bun bundler bug patches
├── npm/
│   ├── bin/legna.cjs         # npm bin shim (locates platform binary)
│   └── postinstall.cjs       # Post-install auto-fetch of platform package
├── stubs/                    # Native module placeholders
├── bunfig.toml               # Build macros + Feature Flags
├── tsconfig.json             # TypeScript configuration
└── package.json              # Project metadata + 8 platform optional dependencies
```

---

## Environment Setup

```bash
# 1. Install Bun (>= 1.2.0)
curl -fsSL https://bun.sh/install | bash

# 2. Clone the repository
git clone https://github.com/LegnaOS/LegnaCode-cli.git
cd LegnaCode-cli

# 3. Install dependencies
bun install

# 4. Type check
bun run typecheck

# 5. Lint
bun run lint
```

---

## Development Workflow

### CLI Development

```bash
# Dev mode with hot reload
bun --watch src/main.tsx

# Build to dist/ (ESM bundle with sourcemaps)
bun run build

# Compile standalone binary for current platform
bun run compile    # outputs ./legna

# Clean build artifacts
bun run clean
```

### WebUI Development

```bash
cd webui
npm install
npm run dev        # Vite dev server, /api proxied to localhost:3456
```

The Admin backend must be running concurrently during WebUI development:

```bash
# In another terminal
bun run src/server/admin.ts
```

### WebUI Build + Inline

After modifying the frontend, you must re-inline for changes to take effect in the compiled binary:

```bash
bun run scripts/build-webui.ts
# Equivalent to: cd webui && npm install && npm run build && bun run scripts/inline-webui.ts
```

This script:
1. Runs `npm install` + `npm run build` (tsc + Vite) in `webui/`
2. Reads the `webui/dist/` output and inlines HTML/JS/CSS as string constants
3. Generates `src/server/admin-ui-html.ts` (exports `ADMIN_HTML`, `ADMIN_JS`, `ADMIN_CSS`)

The compiled binary contains the complete SPA with zero external file dependencies at runtime.

---

## Build System

### Three Build Modes

| Command | Output | Purpose |
|---------|--------|---------|
| `bun run build` | `dist/` (ESM chunks + sourcemaps) | Development & debugging |
| `bun run compile` | `./legna` binary | Local testing |
| `bun run compile:all` | 7 platform binaries → `.npm-packages/` | Release |

### Build Pipeline Details

**`build.ts`** — Development build:
1. Parses `bunfig.toml` to extract `MACRO.*` defines and Feature Flags
2. Calls `Bun.build()`: entry `src/entrypoints/cli.tsx`, ESM format, code splitting
3. Externals: `@ant/*`, `@anthropic-ai/*`, native NAPI modules
4. Runs `postbuild-fix.py` to patch known Bun bundler bugs

**`compile.ts`** — Single-platform compilation:
1. Parses `bunfig.toml`, overrides `MACRO.BUILD_TIME` with current timestamp
2. `Bun.build({ compile: true })` — produces standalone binary with no external dependencies
3. Outputs to `.compile-tmp/`, then moves to project root

**`compile-all.ts`** — Cross-compilation:

| Target | Platform | npm Package |
|--------|----------|-------------|
| `bun-darwin-arm64` | macOS ARM | `@legna-lnc/legnacode-darwin-arm64` |
| `bun-darwin-x64` | macOS Intel | `@legna-lnc/legnacode-darwin-x64` |
| `bun-darwin-x64-baseline` | macOS Intel (no AVX) | `@legna-lnc/legnacode-darwin-x64-baseline` |
| `bun-linux-x64` | Linux x64 | `@legna-lnc/legnacode-linux-x64` |
| `bun-linux-x64-baseline` | Linux x64 (no AVX) | `@legna-lnc/legnacode-linux-x64-baseline` |
| `bun-linux-arm64` | Linux ARM | `@legna-lnc/legnacode-linux-arm64` |
| `bun-windows-x64` | Windows x64 | `@legna-lnc/legnacode-win32-x64` |

Supports `--skip=os-cpu` to skip specific platforms (e.g., `--skip=win32-x64,linux-arm64`).

### Build Macros (bunfig.toml)

Macros in `[bundle.define]` are replaced with string literals at compile time:

```toml
[bundle.define]
MACRO.VERSION = '"1.8.0"'
MACRO.BUILD_TIME = '"2024-01-01T00:00:00.000Z"'
MACRO.PACKAGE_URL = '"https://www.npmjs.com/package/@legna-lnc/legnacode"'
# ...
```

Use `MACRO.VERSION` directly in code. Type declarations are in `src/types/bun-bundle.d.ts`.

---

## Feature Flags

`bunfig.toml`'s `[bundle.features]` defines 87+ boolean Feature Flags, evaluated at compile time via Bun's `import { feature } from 'bun:bundle'` for dead code elimination.

```typescript
// Usage in code
import { feature } from 'bun:bundle'

if (feature('VOICE_MODE')) {
  // Only compiled into the output when VOICE_MODE = true
  const voiceModule = await import('./voice.js')
}
```

**Key Flag Examples:**

| Flag | Description |
|------|-------------|
| `BUDDY` | Companion pet UI |
| `KAIROS` | Kairos assistant mode |
| `MCP_SKILLS` | MCP-provided skills as commands |
| `BG_SESSIONS` | Background sessions (ps/logs/attach/kill) |
| `BRIDGE_MODE` | Remote control mode |
| `DAEMON` | Daemon process mode |
| `WEB_BROWSER_TOOL` | Browser tool |
| `MONITOR_TOOL` | Monitor tool |
| `TOKEN_BUDGET` | Token budget management |
| `ULTRAPLAN` / `ULTRATHINK` | Advanced planning/thinking modes |
| `TEMPLATES` | Template system (new/list/reply) |

Flags can be overridden at build time via CLI: `bun run scripts/build.ts --features FLAG1,FLAG2`

---

## Core Architecture

### Startup Flow

```
legna [args]
  │
  ├─ cli.tsx: fast-path cascade (zero-import fast paths)
  │   ├─ --version → prints MACRO.VERSION directly, exits
  │   ├─ admin → imports server/admin.ts, launches WebUI
  │   ├─ migrate → imports commands/migrate/
  │   ├─ process hardening → security/processHardening.ts
  │   ├─ [various feature-gated subcommands]
  │   └─ default → imports main.tsx → cliMain()
  │
  └─ main.tsx: cliMain()
      ├─ Commander.js argument parsing
      ├─ init() — config, security, telemetry (memoized, runs once)
      ├─ Authentication + trust dialog
      ├─ Session restore / creation
      └─ REPL launch (React/Ink rendering)
```

Design principle: **all imports are dynamic** — each path loads only the modules it needs. The `--version` path has zero imports.

### Global State

**`src/bootstrap/state.ts`** — Singleton `STATE` object:
- Session ID, CWD, billing stats, model usage
- Registered hooks, agent color maps
- Exported via getter/setter functions
- Deliberately a leaf node in the import DAG — imports almost nothing from `src/` to avoid circular dependencies

**`src/state/store.ts`** — Reactive UI state:
- Custom `createStore<T>()` (not Redux/Zustand)
- Returns `{ getState, setState, subscribe }`
- `AppState` type includes: settings, permission context, MCP connections, plugins, tasks, agent definitions, etc.

### Context System (`src/context.ts`)

Two memoized functions build the system prompt:
- `getSystemContext()` — git status snapshot (branch, recent commits, status)
- `getUserContext()` — LEGNA.md content (traverses up from `~/.legna/LEGNA.md` and project directory)

---

## Tool System

Tools are LLM-callable capability units, defined in `src/Tool.ts` and registered in `src/tools.ts`.

### Tool Type Definition

```typescript
// Core fields (simplified)
interface Tool {
  name: string
  inputSchema: ZodSchema          // Zod validation
  call(input, context): Promise<ToolResult>
  checkPermissions(input): PermissionDecision
  prompt(): string                // Generates system prompt fragment
  isEnabled(state): boolean       // Whether enabled in current context
  isReadOnly(): boolean           // Read-only tools skip permission confirmation
  isConcurrencySafe(): boolean    // Whether safe for concurrent execution
  isDestructive(): boolean        // Destructive operation marker
  renderToolUseMessage(): ReactNode    // Ink terminal rendering
  renderToolResultMessage(): ReactNode
}
```

Constructed via `buildTool(def)`, defaults are fail-closed (`isConcurrencySafe` and `isReadOnly` default to `false`).

### Built-in Tool List

`getAllBaseTools()` returns all built-in tools, including:

| Category | Tools |
|----------|-------|
| File Operations | `FileReadTool`, `FileEditTool`, `FileWriteTool`, `NotebookEditTool` |
| Search | `GlobTool`, `GrepTool`, `WebSearchTool`, `WebFetchTool` |
| Execution | `BashTool`, `PowerShellTool` |
| Agent | `AgentTool`, `SendMessageTool`, `TeamCreateTool`, `TeamDeleteTool` |
| Tasks | `TaskCreateTool`, `TaskGetTool`, `TaskUpdateTool`, `TaskListTool` |
| Planning | `EnterPlanModeTool`, `ExitPlanModeV2Tool` |
| Worktree | `EnterWorktreeTool`, `ExitWorktreeTool` |
| MCP | `ListMcpResourcesTool`, `ReadMcpResourceTool` |
| Other | `SkillTool`, `TodoWriteTool`, `AskUserQuestionTool`, `MonitorTool`, `WorkflowTool`, `CronTools`, etc. |

Many tools are conditionally compiled via `feature()` — disabled flags strip the corresponding tool code from the output entirely.

### Tool Pool Assembly

```
getAllBaseTools()          → built-in tool array
  ↓ isEnabled() filter
  ↓ permission deny rules filter
getTools()                → available built-in tools
  ↓ + MCP tools (built-ins take precedence on name collision)
assembleToolPool()        → final tool pool
```

### Adding a New Tool

1. Create a tool file under `src/tools/`, construct with `buildTool()`
2. Register in `getAllBaseTools()` in `src/tools.ts`
3. If feature-gated, wrap with `feature('FLAG_NAME')`

---

## Commands & Skills

### Commands

Commands are user interactions triggered via the `/` prefix, defined in `src/commands.ts`. Three types:

| Type | Description | Examples |
|------|-------------|----------|
| `PromptCommand` | Expands to text sent to the model | Skill-based commands |
| `LocalCommand` | Runs locally, returns text | `/help`, `/clear` |
| `LocalJSXCommand` | Renders Ink UI (lazy-loaded) | `/model`, `/config` |

`getCommands(cwd)` is memoized by CWD, aggregating from:
- Built-in commands (~80+)
- Bundled skills
- User/project skill directories
- Plugin skills
- Workflow commands
- MCP-provided prompts (when `MCP_SKILLS` is enabled)

### Skills

Skills are Markdown-based prompt commands loaded from multiple locations:

```
~/.legna/skills/          # User global
<project>/.legna/skills/  # Project-level (traverses up to home)
~/.codex/skills/          # Codex compatibility
```

Each skill is a directory containing `SKILL.md` with YAML frontmatter:

```markdown
---
description: "Skill description"
when_to_use: "When to auto-trigger"
allowed-tools: ["BashTool", "FileReadTool"]
user-invocable: true
model: "opus"
hooks:
  - event: PreToolUse
    command: "echo checking..."
paths:
  - "src/components/**"    # Only activates on matching paths
---

Skill prompt content...

Argument substitution: $ARGUMENTS
Variables: ${CLAUDE_SKILL_DIR}, ${CLAUDE_SESSION_ID}
Inline shell: `! ls -la`
```

**Bundled skills** (`src/skills/bundledSkills.ts`) are compiled into the binary and registered via `registerBundledSkill()`.

**Dynamic discovery**: file operations automatically traverse upward to find `.legna/skills/` directories, merging newly discovered skills at runtime.

---

## Permission System

Permissions control the security boundary for tool execution, defined in `src/types/permissions.ts` with evaluation logic in `src/hooks/useCanUseTool.tsx`.

### Permission Modes

| Mode | Description |
|------|-------------|
| `default` | Default mode, dangerous operations require confirmation |
| `acceptEdits` | Auto-accept file edits |
| `bypassPermissions` | Skip all permission checks |
| `dontAsk` | Don't ask, deny unauthorized operations |
| `plan` | Plan mode, write operations forbidden |
| `auto` | Auto mode, AI classifier decides |
| `bubble` | Bubble mode (subagent escalates to parent) |

### Permission Evaluation Flow

```
Tool call request
  ↓
hasPermissionsToUseTool()
  ↓ Check rules (alwaysAllow / alwaysDeny / alwaysAsk)
  ↓ Rule source priority: policySettings > userSettings > projectSettings > ...
  │
  ├─ allow → execute directly
  ├─ deny  → reject
  └─ ask   → enter handler chain:
      ├─ 1. Coordinator handler (background worker)
      ├─ 2. Swarm worker handler (forward to team leader)
      ├─ 3. Speculative bash classifier (2-second race)
      └─ 4. Interactive handler (show permission dialog)
```

`ToolPermissionContext` carries the current mode, working directory list, and rule sets grouped by source.

---

## Hook System

Hooks are user-configurable scripts triggered at specific lifecycle events. Configured in the `hooks` field of `settings.json`.

### Supported Events

| Event | Trigger | Capabilities |
|-------|---------|-------------|
| `PreToolUse` | Before tool execution | Approve/reject, modify input |
| `PostToolUse` | After tool execution | Audit, post-processing |
| `UserPromptSubmit` | User submits a prompt | Inject context, intercept |
| `SessionStart` | Session begins | Inject initial context, register file watchers |
| `Setup` | First-time setup | Environment initialization |
| `SubagentStart` | Subagent launches | Configure subagent |
| `PermissionDenied` | Permission rejected | Logging |
| `CwdChanged` | Working directory changes | Reload configuration |
| `FileChanged` | File changes | Trigger rebuilds, etc. |

### Hook Output Format

Synchronous hooks return JSON:

```json
{
  "continue": true,
  "decision": "approve",   // "approve" | "block"
  "reason": "Auto-approved",
  "systemMessage": "System message injected into conversation"
}
```

Async hooks return `{ "async": true }` with an optional timeout.

Hook sources: `settings.json`, skill frontmatter `hooks` field, plugin `hooksConfig`, SDK callbacks.

---

## Plugin System

Plugins are Git-repository-based extensions, defined in `src/plugins/`.

### Plugin Structure

```typescript
interface LoadedPlugin {
  manifest: PluginManifest
  path: string
  source: string
  repository: string
  // Optional extension points:
  commands?: string      // Command directory
  agents?: string        // Agent definitions
  skills?: string        // Skill directory
  outputStyles?: string  // Output styles
  hooksConfig?: object   // Hook configuration
  mcpServers?: object    // MCP servers
  lspServers?: object    // LSP servers
}
```

Built-in plugins use `{name}@builtin` identifiers and can be enabled/disabled via the `/plugin` UI.

---

## Model Adapters & OpenAI Routing

### Architecture

```
paramsFromContext() → applyModelAdapter() → [fork point]
  ├─ __openaiCompat: false → anthropic.beta.messages.create() (Anthropic SDK)
  └─ __openaiCompat: true  → openAIStreamingRequest() (fetch-based)
                                ├─ anthropicToOpenAI(params) → build request
                                └─ OpenAI SSE → convert to Anthropic events
```

Internal message format is always Anthropic. Session storage, tool execution, skills, memory — all unchanged. Format conversion happens only at the API boundary.

### Adapter Interface

Each adapter in `src/utils/model/adapters/` implements:

```typescript
interface ModelAdapter {
  name: string
  apiFormat?: 'anthropic' | 'openai' | 'auto'  // default: 'anthropic'
  match(model: string, baseUrl?: string): boolean
  transformParams(params: Record<string, any>): Record<string, any>
  transformResponse?(content: any[]): any[] | null
  getStopReasonMessage?(stopReason: string): string | undefined
}
```

`apiFormat: 'auto'` detects from `ANTHROPIC_BASE_URL`: `/anthropic` suffix → Anthropic SDK, otherwise → OpenAI fetch bridge.

### Registered Adapters (priority order)

| Adapter | Provider | apiFormat | Key Features |
|---------|----------|-----------|-------------|
| OpenAICompatAdapter | Any OpenAI endpoint | openai | Activated by `OPENAI_COMPAT_BASE_URL` env |
| MiMoAdapter | Xiaomi | auto | mimo-v2.5-pro/v2.5, Token Plan host |
| GLMAdapter | ZhipuAI | auto | glm-5.1 to glm-4.5, Coding Plan, cached_tokens |
| DeepSeekAdapter | DeepSeek | auto | v4-flash/v4-pro, reasoning_content passback |
| KimiAdapter | Moonshot | auto | kimi-k2.6 thinking, Preserved Thinking |
| MiniMaxAdapter | MiniMax | auto | reasoning_details array, China/Global hosts |
| QwenAdapter | Alibaba | auto | DashScope Beijing/Singapore/Coding Plan |

### OpenAI Streaming Bridge

`src/services/api/openaiStreamBridge.ts` converts OpenAI SSE to Anthropic events:

- `delta.content` → `content_block_delta` (text_delta)
- `delta.tool_calls` → `content_block_start` (tool_use) + `content_block_delta` (input_json_delta)
- `delta.reasoning_content` → `content_block_delta` (thinking_delta) — DeepSeek/Kimi/MiMo
- `delta.reasoning_details` → `content_block_delta` (thinking_delta) — MiniMax
- `finish_reason` mapping: stop→end_turn, tool_calls→tool_use, length→max_tokens, sensitive→content_filter

### Shared Utilities (`src/utils/model/adapters/shared.ts`)

- `simplifyThinking` — `{type: "enabled"}` only, no budget_tokens
- `forceAutoToolChoice` — strips `disable_parallel_tool_use`
- `normalizeTools` / `normalizeToolsKeepCache` — sets `type: "custom"`
- `stripUnsupportedContentBlocks` — filters image/document/redacted_thinking
- `stripUnsupportedFields` — preserves `output_config.effort`
- `stripReasoningContent` — removes reasoning from assistant messages (Anthropic path)
- `reorderThinkingBlocks` — thinking before text in response

### Configuration

Settings.json `apiFormat` field:
- `"anthropic"` — force Anthropic SDK path
- `"openai"` — force OpenAI fetch bridge
- omitted — use adapter's `apiFormat` declaration (default: auto-detect from URL)

Admin WebUI: Settings panel → "API 路由模式" dropdown.

---

## Kiro Gateway Optimization

When `kiroGateway: true` is set in settings, LegnaCode compresses history messages before sending to reduce token consumption. This is aligned with the Kiro Gateway's `converter.py` compression logic.

File: `src/utils/model/kiroOptimize.ts`

### Compression Rules

| Target | Condition | Action |
|--------|-----------|--------|
| thinking blocks | distance > 5 turns | truncateMiddle to 2000 chars / 60 lines |
| redacted_thinking | always | remove |
| tool_result content | distance > 8 turns | truncateMiddle to 8000 chars / 150 lines |
| image blocks | distance > 5 turns | replace with `[image omitted from history]` |
| tool description | > 9216 chars | truncate |
| JSON schema | always | whitelist filter + anyOf/oneOf flatten + compact |

### Integration Point

Called in `paramsFromContext()` after `applyModelAdapter()`, only when `kiroGateway` setting is enabled. Uses lazy `require()` to avoid import overhead when disabled.

---

## MCP Integration

MCP (Model Context Protocol) is deeply integrated in `src/services/mcp/`.

### Supported Transports

| Transport | Description |
|-----------|-------------|
| `stdio` | Standard input/output |
| `sse` | Server-Sent Events |
| `http` | HTTP requests |
| `ws` | WebSocket |
| `sdk` | SDK direct connection |
| `claudeai-proxy` | Claude.ai proxy |

### Configuration Scopes

`local` → `user` → `project` → `dynamic` → `enterprise` → `managed`

MCP server tools are wrapped as `MCPTool` instances and merged with built-in tools via `assembleToolPool()` (built-ins take precedence on name collision). MCP prompts can be exposed as skills (requires `MCP_SKILLS` flag).

---

## Agent / Subagent System

`AgentTool` spawns subagents as independent conversation threads, supporting multiple collaboration modes.

### Agent Definitions

Agent definitions are loaded from `~/.legna/agents/` and `<project>/.legna/agents/`. `AppState.agentNameRegistry` maintains the name-to-ID mapping.

### Collaboration Modes

| Mode | Description |
|------|-------------|
| Subagent (fork) | Independent conversation thread, inherits parent context |
| Agent Swarm | Team create/delete, inter-member messaging |
| Coordinator | Coordinator dispatches tasks to workers |
| In-process teammate | Same process, shared transcript |
| Tmux teammate | Separate process, tmux pane |

`AppState.teamContext` tracks team membership.

---

## Session Management

Sessions are identified by UUID (`SessionId`) and persisted as `.jsonl` files.

### Storage Locations (3-level fallback)

```
1. <project>/.legna/sessions/<uuid>.jsonl   ← new sessions (v1.3.0+)
2. ~/.legna/projects/<sanitized-cwd>/       ← legacy legna format
3. ~/.claude/projects/<sanitized-cwd>/      ← legacy claude format
```

### JSONL Line Format

```json
{"type": "user", "sessionId": "uuid", "cwd": "/path", "slug": "session title", "timestamp": 1234567890}
```

### Key Operations

- `switchSession()` — atomically updates sessionId + sessionProjectDir
- `regenerateSessionId()` — creates a new session (used by `/clear`)
- `--resume` / `--continue` — restores conversation state from file
- Fork — branches a new session from the current one

---

## Admin WebUI

### Architecture

```
Browser ←→ Bun.serve (port 3456)
              │
              ├─ Static assets: inlined SPA (ADMIN_HTML/JS/CSS)
              │   Routes: /__admin__/app.js, /__admin__/app.css
              │
              └─ REST API: /api/*
                  ├─ Data endpoints scoped by (claude | legna)
                  └─ Live chat via SSE streaming
```

### Frontend Panels

| Panel | Function |
|-------|----------|
| Chat | SSE streaming chat with thinking blocks, tool use display, abort |
| Settings | Visual editor for settings.json (API endpoint, keys, model mapping, timeout, etc.) |
| Profiles | Lists all `settings*.json` files, one-click switching |
| Sessions | Browse session history grouped by project, one-click copy `legna --resume` command |
| Migration | Bidirectional Claude ↔ LegnaCode migration with field selection + diff preview |

### Scope Mechanism

All data endpoints are isolated via the `scope` parameter:
- `claude` → `~/.claude/`
- `legna` → `~/.legna/`

---

## Admin REST API

The following REST API is exposed by the Admin backend (`src/server/admin.ts`) and can be used for external tool integration.

### General Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/version` | Returns the build version |
| `POST` | `/api/migrate` | Bidirectional config migration (supports field selection, session inclusion) |
| `POST` | `/api/chat` | Live chat (SSE streaming response) |
| `POST` | `/api/chat/abort` | Terminate the current chat process |

### Scoped Endpoints (`:scope` = `claude` | `legna`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/:scope/settings` | Read settings.json |
| `PUT` | `/api/:scope/settings` | Write settings.json |
| `GET` | `/api/:scope/profiles` | List all `settings*.json` files with metadata |
| `POST` | `/api/:scope/profiles/switch` | Atomically switch the active config profile |
| `GET` | `/api/:scope/sessions` | List session history (grouped by project) |
| `GET` | `/api/:scope/sessions/:id/messages` | Read full JSONL session content |

### Live Chat SSE Protocol

`POST /api/chat` returns an SSE stream with the following event types:

| Event | Description |
|-------|-------------|
| `partial` | Assistant text delta |
| `thinking_partial` | Thinking process delta |
| `text` | Complete text block |
| `thinking` | Complete thinking block |
| `tool_use` | Tool invocation |
| `tool_result` | Tool result |
| `result` | Final result |
| `error` | Error |
| `done` | Stream end |

Internal implementation: spawns a child process `legna -p --output-format stream-json --include-partial-messages`, pipes the user message via stdin, and converts stdout to SSE events.

---

## npm Distribution

### Architecture

```
@legna-lnc/legnacode (main package)
  ├── npm/bin/legna.cjs      ← "legna" command entry (pure Node.js launcher)
  ├── npm/postinstall.cjs    ← Post-install auto-fetch of platform binary
  └── optionalDependencies:
      ├── @legna-lnc/legnacode-darwin-arm64
      ├── @legna-lnc/legnacode-darwin-x64
      ├── @legna-lnc/legnacode-darwin-x64-baseline
      ├── @legna-lnc/legnacode-linux-x64
      ├── @legna-lnc/legnacode-linux-x64-baseline
      ├── @legna-lnc/legnacode-linux-arm64
      ├── @legna-lnc/legnacode-win32-x64
      └── @legna-lnc/legnacode-win32-ia32
```

### Binary Resolution Strategy (`npm/bin/legna.cjs`)

Tried in priority order:
1. `require.resolve()` to find the platform package
2. Sibling scope directory (flat `node_modules/@legna-lnc/` layout)
3. Nested `node_modules` (postinstall `--no-save` install)
4. Global npm prefix paths
5. Fallback: auto-install the platform package from the official npm registry

Set `LEGNA_DEBUG=1` to print all searched paths. `EACCES` errors are auto-fixed with `chmod 755`.

### Postinstall Behavior

`npm/postinstall.cjs` runs after `npm install`:
- Checks if the platform binary already exists
- If not, installs from `https://registry.npmjs.org` (bypasses mirror sync delays)
- Falls back to global install if local install fails

---

## Release Process

### Full Release Command

```bash
# Full release (bump → webui build → compile all → npm publish)
bun run scripts/publish.ts

# Dry run (no actual publishing)
bun run scripts/publish.ts --dry-run
```

### Release Pipeline (`scripts/publish.ts`)

```
1. bump.ts — sync all version numbers
   ├─ package.json: version + 8 optionalDependencies
   ├─ bunfig.toml: MACRO.VERSION
   └─ webui/package.json: version
       ↓
2. build-webui.ts — build WebUI
   ├─ npm install (webui/)
   ├─ npm run build (tsc + vite)
   └─ inline-webui.ts → src/server/admin-ui-html.ts
       ↓
3. compile-all.ts — 7-platform cross-compilation
   └─ each platform → .npm-packages/<pkg>/bin/legna
       ↓
4. npm publish
   ├─ 7 platform packages (--access public)
   └─ 1 main package @legna-lnc/legnacode
```

### Version Sync Checklist

All of the following must be updated in sync for each release:

1. `package.json` — `"version"` field
2. `bunfig.toml` — `MACRO.VERSION`
3. `webui/package.json` — `"version"` field
4. `package.json` — all platform package versions in `optionalDependencies`
5. `README.md` — add a new row to the changelog table
6. `CHANGELOG.md` — add a new version entry

`scripts/bump.ts` handles 1–4 automatically; 5–6 require manual updates.

```bash
# Version bumping
bun run scripts/bump.ts patch   # 1.8.0 → 1.8.1
bun run scripts/bump.ts minor   # 1.8.0 → 1.9.0
bun run scripts/bump.ts major   # 1.8.0 → 2.0.0
bun run scripts/bump.ts 1.9.0   # Specify exact version
```

---

## Security Hardening

`src/security/processHardening.ts` runs at startup before any business logic.

### Hardening Measures

| Measure | Platform | Description |
|---------|----------|-------------|
| Disable core dumps | Linux: `/proc/self/coredump_filter`; macOS: `kern.coredump` sysctl | Prevents memory dumps from leaking sensitive data |
| Strip dangerous env vars | All platforms | `LD_PRELOAD`, `DYLD_INSERT_LIBRARIES`, `ELECTRON_RUN_AS_NODE`, etc. |
| Sanitize NODE_OPTIONS | All platforms | Removes `--require`, `--loader`, `--import`, `-r` injection vectors |
| ptrace detection | Linux | Detects debugger attachment via `/proc/self/status` TracerPid |

All failures are non-fatal (reported as warnings) and do not block startup.

---

## Key Design Patterns

### 1. Compile-Time Dead Code Elimination

`feature()` from `bun:bundle` is evaluated at compile time — disabled flags strip entire code branches from the output. This is the core mechanism for managing the large feature surface.

### 2. Dynamic Imports for Fast Startup

The CLI entry point uses exclusively dynamic `import()` calls — each execution path loads only the modules it needs. The `--version` path has zero imports for millisecond-level response.

### 3. Memoization

Extensive use of `lodash-es/memoize` to cache expensive operations: settings loading, command assembly, git operations, etc. `init()` itself is also memoized.

### 4. Zod Validation Boundaries

All external data (hook outputs, MCP configs, settings) is validated with Zod schemas, often paired with `lazySchema()` for deferred evaluation.

### 5. Signal Pattern

`createSignal()` provides lightweight pub/sub for cross-module communication without introducing import cycles (session switches, dynamic skill loading, settings changes).

### 6. Circular Dependency Breaking

- Types extracted to `src/types/` (no runtime dependencies)
- `bootstrap/state.ts` as an import DAG leaf node
- Lazy `require()` to break cycles

### 7. React/Ink Terminal UI

The terminal UI uses React + Ink for rendering. Tool results, permission dialogs, and progress indicators are all React components. The WebUI uses standard React DOM.

### 8. `--bare` Minimal Mode

Setting the `CLAUDE_CODE_SIMPLE` environment variable skips hooks, LSP, plugin sync, skill discovery, attribution, background prefetches, and keychain reads. Approximately 30 code paths check this flag.

---

## Configuration Path Reference

### Project-Level (`<project>/.legna/`, auto-gitignored)

```
sessions/       # Session records (JSONL)
skills/         # Project skills
rules/          # Project rules
agents/         # Project agent definitions
settings.json   # Project settings
LEGNA.md        # Project instruction file
memory/         # Project memory
workflows/      # Workflow definitions
```

### User-Level (`~/.legna/`)

```
settings.json       # Global settings
.credentials.json   # Authentication credentials
plugins/            # Installed plugins
skills/             # User skills
rules/              # User rules
agents/             # User agent definitions
```

### Core Path Resolution Modules

- `src/utils/legnaPathResolver.ts` — `PROJECT_FOLDER` / `LEGACY_FOLDER` / `resolveProjectPath()`
- `src/utils/envUtils.ts` — `getClaudeConfigHomeDir()` → `~/.legna`, `runGlobalMigration()` one-time migration
- `src/utils/ensureLegnaGitignored.ts` — automatically adds `.legna/` to `.gitignore`
