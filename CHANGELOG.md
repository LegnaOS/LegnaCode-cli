# Changelog

🌐 [中文文档](./CHANGELOG.zh-CN.md)

All notable changes to LegnaCode CLI will be documented in this file.

## [1.9.2] - 2026-04-25

### Features

- **Computer Use Python Bridge** — Replaced native Swift/Rust modules (`@ant/computer-use-swift` + `@ant/computer-use-input`) with pure Python subprocess bridge (`runtime/mac_helper.py` + `runtime/win_helper.py`). Zero NAPI dependencies. Supports 28 commands: screenshot, mouse, keyboard, app management, clipboard, permission detection. Cross-platform: macOS and Windows.
- **Auto Python Environment Setup** — First Computer Use invocation automatically detects system Python 3.12+, creates a venv at `~/.legna/computer-use-venv/`, installs platform-specific dependencies. Search order: `LEGNA_PYTHON_BIN` env → `python3.14`..`python3.12` → `python3`/`python` → Windows `py` launcher. Requirements hash invalidation triggers reinstall on dependency changes.
- **Platform-Specific Dependencies** — Split `requirements.txt` into `requirements-macos.txt` (pyobjc), `requirements-windows.txt` (pywin32/psutil/screeninfo/pyperclip), `requirements-common.txt` (mss/Pillow/pyautogui).

### Improvements

- **Feature Gate Removal** — Removed all GrowthBook remote feature flags and Max/Pro subscription checks for Computer Use. Now controlled by local `settings.json` (`computerUse.enabled`, default `true`). Available to all users.
- **Executor Simplification** — `executor.ts` rewritten from ~800 lines to ~200 lines. No CFRunLoop drain, no NAPI, no animated mouse movement — pure subprocess I/O.

## [1.9.0] - 2026-04-24

### Features

- **Portable Sessions** — Migrated session JSONL files use `"cwd":"."` relative paths instead of absolute paths. Projects can be moved, copied, or synced via git — resume works from any location. Runtime resolves `"."` to current working directory at 5 points in `sessionStorage.ts`, `crossProjectResume.ts`, and `listSessionsImpl.ts`.
- **WebUI Project Browser** — New "项目总览" tab with card layout showing all projects from `~/.claude/` and `~/.legna/`. Displays session count, last active time, migration status, source (Claude/Legna/Both). Missing paths highlighted in red.
- **WebUI Memory Editor** — Three-column layout: project list → file tree with expand/collapse for subdirectories → Markdown editor. Banner: "记忆是 AI 的建议性笔记，随项目演进自动更新，内容仅供参考".
- **WebUI Force-Directed Graph** — Interactive project relationship visualization with physics simulation (repulsion + attraction + center gravity + damping). Draggable nodes. Node size = session count, color = recency, edges = same-day activity with weight labels.
- **Full Project Migration** — Migrates sessions (JSONL + subagents/ + tool-results/), memory, skills/, agents/, rules/, CLAUDE.md → LEGNA.md, settings.json, .mcp.json. Path rewriting handles Windows backslash, spaces, special characters, JSON-escaped paths.
- **Multi-Source Migration** — Scans `~/.claude/projects/`, `~/.legna/projects/` with correct path resolution from JSONL `cwd` field (no more `-` to `/` misparse for paths like `claude-code-main`).
- **Profile Pointer Switching** — Config profile switching uses `.active-profile` pointer file instead of physically renaming files. Original filenames preserved permanently.

### Improvements

- **Migration Panel Redesign** — Two-tab layout: "项目迁移" (project-level with checkboxes, source badges, status tags) and "配置同步" (field-level with icons, collapsible JSON preview).
- **MCP Config Migration** — Global `~/.claude/.mcp.json` and project-level `.claude/.mcp.json` included in migration.
- **Co-Authored-By Attribution** — Changed from `noreply@anthropic.com` to `@LegnaOS` contributor identity.

## [1.8.5] - 2026-04-23

### Optimizations

- **Tool Prompt Compression** — Compressed tool descriptions for BashTool (~21K→~12K chars), AgentTool (~16K→~13K chars), TodoWriteTool (~9.5K→~2K chars), and EnterPlanModeTool (~7.7K→~2K chars). Reduces first-request token cost by ~8,000-10,000 tokens.

### Bug Fixes

- **Model Adapter cache_control Fix** — Added `normalizeToolsKeepCache()` variant in `src/utils/model/adapters/shared.ts` that preserves `cache_control` on tool definitions. Kimi, MiniMax, and MiMo adapters now use it, fixing tool-level prompt caching that was silently stripped by `normalizeTools()`. MiMo adapter also drops unnecessary `stripCacheControl()` since its API supports server-side auto caching.

## [1.8.4] - 2026-04-22

### Bug Fixes

- **Session Transcript Null Guard** — Added defensive null/type checks to `isLoggableMessage`, `collectReplIds`, and `transformMessagesForExternalTranscript` in `src/utils/sessionStorage.ts`. Prevents `m4 is not an Object (evaluating '"isVirtual" in m4')` crash when the messages array contains undefined/null elements during React effect processing in `useLogMessages`.

## [1.8.3] - 2026-04-22

### Features

- **GitHub Actions Release Workflow** — 4-stage CI pipeline: prepare (bump + webui) → native (Rust addons on 4 platform runners) → compile (7 Bun cross-compile targets) → publish (npm). Trigger via `v*` tag push or manual `workflow_dispatch`.
- **Cross-Platform Rust Native Addons** — CI builds `sandbox`, `file-search`, `apply-patch` NAPI addons for darwin-arm64, darwin-x64, linux-x64, linux-arm64 using native runners.
- **compile.ts --target flag** — Support cross-compilation target override for CI usage.

### Bug Fixes

- **OML Agent Type Mismatch** — Fixed `agent` field in OML skill definitions passing an object `{ type, model }` instead of a string. Caused all 19 OML agent skills to silently fallback to `general-purpose` in fork mode.

## [1.8.2] - 2026-04-22

### Bug Fixes

- **Message Pipeline Null Guards** — Added defensive null checks to 11 functions in `src/utils/messages.ts` (`normalizeMessages`, `isNotEmptyMessage`, `isSyntheticMessage`, `isToolUseRequestMessage`, `isToolUseResultMessage`, `isHookAttachmentMessage`, `isSystemLocalCommandMessage`, `isThinkingMessage`, `getAssistantMessageText`, `getUserMessageText`, `reorderMessagesInUI`). Prevents `undefined is not an object (evaluating 'message.type')` runtime crash when message arrays contain undefined elements.
- **Mode Command Disabled** — Removed `/mode` slash command registration to fix Bun compiled binary startup hang caused by JIT compilation stall.

### Build

- **Rust Native Addons (darwin-arm64)** — Compiled and bundled `sandbox`, `file-search`, `apply-patch` NAPI addons. Fixed missing `regex-lite` dependency in file-search crate and `Result` type mismatch in apply-patch crate.

## [1.8.0] - 2026-04-21

> Codex Full Fusion Release — 5-phase integration of OpenAI Codex CLI capabilities into LegnaCode.

### Security (Phase 1 + Phase 2)

- **Process Hardening** — Disable core dumps, detect ptrace attachment, sanitize dangerous env vars (`LD_PRELOAD`, `DYLD_INSERT_LIBRARIES`, `NODE_OPTIONS` injection).
- **Static Exec Policy Engine** — TOML-based command execution rules (`prefix`/`glob`/`regex` matching). Built-in defaults block destructive commands (`rm -rf /`, `mkfs`), prompt for package installs, allow read-only operations. Evaluated before LLM classifier — `forbidden` → instant deny, `allow` → instant pass, `prompt` → existing approval flow.
- **Secret Detector** — Regex pattern library for AWS keys, GitHub tokens, JWTs, Slack tokens, private keys, generic API keys. Auto-redaction in memory pipeline (`[REDACTED:type]`).
- **Rollback** — Full implementation with timeline scanning, `--dry-run` preview, `--safe` backup branch creation.
- **Guardian Sub-Agent** — Dedicated tool call risk assessment with 6-category taxonomy (data_exfiltration, credential_probing, security_weakening, destructive_action, privilege_escalation, supply_chain). Rule-based pre-classification (30+ patterns), compact transcript builder (<2000 tokens), fail-closed design.
- **Shell Escalation Protocol** — Three-tier execution: `sandbox` (restricted), `escalate` (user confirm), `deny` (refuse). Platform-aware wrapping: macOS Seatbelt, Linux bubblewrap, fallback `unshare --net`.
- **Network Policy Agent** — Domain-level access control with `full`/`limited`/`blocked` modes, wildcard patterns, denylist priority, JSONL audit log.

### Performance (Phase 4)

- **Rust Native NAPI Addon** — `cosine_similarity` (SIMD f32), `tfidf_vectorize` (Rayon parallel), `content_hash` (SHA-256 streaming), `estimate_tokens` (branchless CJK-aware). ~10-50x speedup with automatic TS fallback.
- **Kernel-Level Sandbox** — Seatbelt via `sandbox_init()` (macOS), seccomp-bpf via `prctl` (Linux). No external dependency (`sandbox-exec`/`bwrap`).
- **Two-Pass Wake-Up** — Greedy L1 fill + L0 backfill for maximum depth and coverage within token budget.
- **Keyword-Density L1** — Sentence ranking by `(keyword_ratio × √keyword_count)` replaces naive first-3-sentences.
- **Token ROI Ranking** — Memories ranked by recall-to-cost ratio; compact frequently-recalled memories outrank verbose one-shot memories.

### Features (Phase 3 + Phase 5)

- **Collaboration Mode System** — Templated `.md` modes with YAML frontmatter. Built-in: `default`, `plan`, `execute`, `pair`. Three-tier loading (built-in → user → project). Runtime switching via programmatic API (note: `/mode` slash command disabled in compiled binary due to Bun JIT limitation).
- **JS REPL Bridge** — Public `legnacode` object in REPL scope: `tool()`, `readFile()`, `exec()`, `glob()`, `grep()`, `emitImage()`.
- **App-Server JSON-RPC** — Full JSON-RPC 2.0 with 7 method groups (`thread/*`, `turn/*`, `fs/*`, `config/*`, `mcpServer/*`, `model/*`, `skills/*`). Streaming notifications. stdio + WebSocket transports.
- **Agent Config Migration** — `/migrate` detects Codex, Cursor, Copilot, Windsurf, Aider, Continue. Imports config, MCP servers, rules.
- **Codex Plugin Compatibility** — Adapter for `codex-plugin.json` manifests. Marketplace registry fetcher with cache. Installation + auth policy engines. Integrated into plugin loader (CWD auto-scan) and marketplace browser.
- **Codex Skills Compatibility** — Auto-discovery of `~/.codex/skills/`. Frontmatter normalizer (`triggers` → `when_to_use`, `tools` → `allowed-tools`, `invoke` → `argument-hint`).
- **Codex Config Interoperability** — Bidirectional `~/.codex/config.toml` mapping. Auto-import as lowest-priority settings base.
- **TypeScript SDK** (`@legna/legnacode-sdk`) — `LegnaCode` client, `Thread` class, stdio/WebSocket transports, structured output. `Codex` alias.
- **Python SDK** (`legnacode-sdk`) — Async client, Thread, JSON-RPC transport, dataclass types. `Codex` alias.
- **TTS Voice Output** — Native backend (macOS `say`, Linux `espeak`). Streaming queue. Graceful degradation.
- **WebRTC Voice Transport** — Bidirectional audio via WebRTC. Signalling, ICE exchange, peer connection. Stub fallback.

## [1.6.1] - 2026-04-24

### Performance

- **Rust Native NAPI Addon** — Core hot-path operations rewritten in Rust via `napi-rs`. `cosine_similarity` (SIMD-accelerated f32 dot product), `tfidf_vectorize` (parallel TF-IDF with Rayon), `content_hash` (SHA-256 with streaming), and `estimate_tokens` (branchless CJK-aware counting). TypeScript bindings with automatic fallback to pure-TS implementations when the native module is unavailable. ~10-50x speedup on vector operations.

### Security

- **Kernel-Level Sandbox Integration** — Rust-native sandbox profiles replace shell-exec wrappers. macOS: Seatbelt profile compiled in-process via `sandbox_init()` (no `sandbox-exec` child process). Linux: direct `prctl` seccomp-bpf syscall filter (no `bwrap`/`unshare` dependency). Platform capability detection with graceful degradation. `SandboxNative` class with `applySeatbelt()` / `applySeccomp()` / `detect()` API.

### Improvements

- **Two-Pass Wake-Up Filling** — `LayeredStack.wakeUp()` now uses a two-pass strategy: Pass 1 greedily fills with L1 summaries (richer context), Pass 2 backfills remaining budget with L0 summaries from skipped drawers. Maximizes both depth and coverage within the same token budget.
- **Keyword-Density L1 Generation** — `generateL1()` replaced naive "first 3 sentences" with keyword-density scoring. Sentences ranked by `(keyword_ratio × √keyword_count)`, first sentence always anchored for context, top-density sentences greedily packed into 400 chars, re-sorted by original position for coherent reading.
- **Token ROI Ranking** — `topByImportance()` and `search()` now factor in token ROI: memories with high recall-to-cost ratio are boosted. A compact memory recalled frequently outranks a verbose memory recalled once. Content-hash index added for faster dedup lookups.

## [1.6.0] - 2026-04-23

### Features

- **Collaboration Mode System** — Templated collaboration modes with YAML frontmatter `.md` files. Three-tier loading: built-in (`src/services/collaborationModes/templates/`), user-level (`~/.legnacode/modes/`), project-level (`.legnacode/modes/`). Later tiers override earlier by mode ID. Modes control system prompt injection, tool restrictions (allow/deny lists), and behavior flags (`readOnly`, `autoExecute`, `stepByStep`, `requirePlan`). Ships with four built-in modes: `default`, `plan`, `execute`, `pair`. New `/mode` slash command for listing and switching modes at runtime.
- **JS REPL Bridge** — Public `legnacode` object injected into the JavaScript REPL global scope. Provides `tool()` for calling any LegnaCode tool by name, `readFile()`, `exec()`, `glob()`, `grep()` shortcuts, and `emitImage()` for rendering base64/Buffer/file-path images. Enables scripting LegnaCode capabilities from within REPL sessions.
- **App-Server JSON-RPC Layer** — Full JSON-RPC 2.0 infrastructure for IDE integration. Router with method registration and dispatch. Seven method groups: `thread/*` (session lifecycle, fork, rollback, compact), `turn/*` (message send, steer, interrupt), `fs/*` (read/write/metadata), `config/*` (read/write/batch), `mcpServer/*` (status, resource, tool call), `model/list`, `skills/list` + `collaborationMode/list`. Streaming notifier pushes `item/*`, `turn/*`, `agentMessage/delta` notifications. Two transports: stdio (JSONL) and WebSocket (with heartbeat keepalive). Standalone entrypoint via `legnacode app-server --transport stdio|websocket`.
- **External Agent Config Migration** — Detect and import configurations from other AI coding tools. Detectors for Codex, Cursor, GitHub Copilot, Windsurf, Aider, and Continue. Importers for Codex (TOML/JSON config → model + MCP servers), Cursor (settings.json → MCP servers + `.cursorrules` → `LEGNACODE.md`), and Copilot (`copilot-instructions.md` → `LEGNACODE.md`). Integrated into `/migrate --agents` flag and available standalone. Supports `--dry-run` preview and `--force` overwrite.

## [1.5.9] - 2026-04-22

### Security

- **Guardian Sub-Agent** — Dedicated approval agent for tool call risk assessment. Six-category risk taxonomy (data_exfiltration, credential_probing, security_weakening, destructive_action, privilege_escalation, supply_chain). Rule-based fast pre-classification with 30+ signal patterns. Compact transcript builder compresses conversation history to <2000 tokens for context. Fail-closed design: timeout/error/malformed response → deny. Structured JSON assessment output. Configurable via `guardian` settings field.
- **Shell Escalation Protocol** — Three-tier per-command execution decision: `sandbox` (restricted environment), `escalate` (user confirmation required), `deny` (refuse). Platform-aware sandbox wrapping: macOS Seatbelt (`sandbox-exec`), Linux bubblewrap (`bwrap`), Linux fallback (`unshare --net`). Integrates execPolicy + Guardian pre-classification for decision making. Detects commands needing external write access or network.
- **Network Policy Agent** — Domain-level network access control for all outbound requests. Three modes: `full` (unrestricted), `limited` (GET/HEAD/OPTIONS only), `blocked` (deny all). Wildcard domain patterns (`*.example.com`). Denylist takes precedence over allowlist. JSONL audit logging to `~/.legnacode/logs/network-audit.jsonl`. Configurable via `~/.legnacode/network-policy.toml`.

## [1.5.8] - 2026-04-22

### Security

- **Process Hardening** — Startup module inspired by Codex's `process-hardening`. Strips dangerous environment variables (`LD_PRELOAD`, `DYLD_INSERT_LIBRARIES`, `ELECTRON_RUN_AS_NODE`), sanitizes `NODE_OPTIONS` (removes `--require`/`--loader` injection flags), disables core dumps on Linux, and detects ptrace attachment.
- **Static Execution Policy Engine** — Rule-based command evaluation before shell execution. Supports prefix, glob, regex, and host_executable matchers. Ships with built-in defaults (forbids `rm -rf /`, pipe-to-shell, fork bombs; prompts for package installs and `sudo`; allows read-only git/file ops). User-configurable via `.legnacode/exec-policy.toml` (project) or `~/.legnacode/exec-policy.toml` (global). Codex-compatible function-call syntax supported.
- **Secret Detection & Redaction** — Pattern-based detector for 25+ secret types (AWS keys, GitHub PATs, Stripe keys, OpenAI/Anthropic API keys, JWTs, private keys, database URLs, etc.). Integrated into the auto-memory write pipeline — secrets are replaced with `[REDACTED:type]` before persisting to `.legna/memory/`.

### Features

- **Rollback CLI** — Full implementation of the rollback command. Lists checkpoint history, resolves targets by index or message-ID prefix, supports `--dry-run` (preview changes), `--safe` (creates git backup branch before restoring), and `--list` (show all rollback points). Built on the existing fileHistory snapshot infrastructure.

## [1.5.7] - 2026-04-21

### Features

- **Git-style `/fork` command** — Unified conversation forking with sub-commands:
  - `/fork` — Fork from current position (replaces `/branch`)
  - `/fork @N` — Fork from the Nth user message, truncating subsequent history
  - `/fork list` — Display branch tree with ASCII art, marking current branch
  - `/fork switch <id|name>` — Switch between conversation branches
  - `/fork <name>` — Fork with a custom name
  - `/branch` is now an alias for `/fork`

## [1.5.6] - 2026-04-21

### Bug Fixes

- **WebUI SSE timeout** — Bun.serve `idleTimeout` raised to 255s (max); SSE streaming no longer drops after 10s.
- **WebUI controller double-close crash** — Guard `sendEvent` and `controller.close()` against repeated invocation after client disconnect.

## [1.5.4] - 2026-04-21

Republish of 1.5.3 with all platform binaries in sync.

## [1.5.3] - 2026-04-21

### Features

- **Hermes Self-Evolution Loop** — Automatic learning closed loop: repeated tool patterns (3x) auto-generate SKILL.md via side-channel LLM; behavior corrections auto-write to `.legna/memory/`; no user confirmation needed. Background Review Agent extracts experience insights after each session.
- **Qwen Model Adapter** — Dedicated adapter for Qwen full series (qwen-plus, qwen-max, qwen-turbo, qwen-coder-plus, qwq-plus, qwen3-235b). Supports `thinking_budget` mapping, DashScope server-side web search (`enable_search`), `reasoning_content` streaming, and `content_filter` stop reason.
- **WebUI Chat Viewer** — New "聊天记录" panel in admin WebUI. Browse session history with full message rendering, collapsible thinking blocks, tool call visualization (input/output/error), and auto-scroll. Backend `/api/:scope/sessions/:id/messages` endpoint reads JSONL session files.
- **WebUI Live Chat** — `legna admin` WebUI now supports live chat via SSE streaming. Send messages, see streaming responses with thinking/tool-use visualization. Note: each message starts a new independent session (no multi-turn conversation); intended for quick API connectivity testing, not as a full chat client.
- **Skill Auto-Create** — `SkillPatternDetector.record()` was already wired but results were never surfaced. Now auto-creates skills from detected patterns and notifies user after the fact.
- **Skill Improvement Path B** — `skillImprovement` no longer gated to active skill execution. General conversation learning detects workflow preferences, behavior corrections, and coding style preferences every 10 user messages.
- **Nudge System** — Counter-driven session learning summary. Reports what was automatically learned (skills created, corrections captured, insights recorded) instead of suggesting the user go learn.

### Improvements

- **onPreCompress Enhanced** — Working state extraction added alongside existing exchange pair extraction. Captures current task, key decisions, file paths, and error patterns before context compression. High-priority drawer written to DrawerStore.
- **Skill Version Backup** — `applySkillImprovement` now backs up current SKILL.md to `.versions/` before overwriting. Changelog with last 20 versions maintained automatically.
- **`/skillify` Unlocked** — Removed `USER_TYPE === 'ant'` gate. All users can now capture session workflows as reusable skills.

### Bug Fixes

- **WebUI inline script crash** — Fixed `Unexpected token '<'` error caused by unescaped `</` sequences in inlined JavaScript. JS and CSS are now served as separate files (`/__admin__/app.js`, `/__admin__/app.css`) instead of being inlined into `<script>` tags.

## [1.5.2] - 2026-04-20

### Performance

- **Async CodeGraph** — `build()` and `walkDir()` converted from sync to async, yielding the event loop every 50 files. Added `maxDepth=10` depth limit and `visitedInodes` symlink loop protection. `save()` now uses async `writeFile`.
- **undoTracker size guard** — Added 1MB file size limit; files exceeding it skip undo snapshot recording (prevents OOM). `readFileSync` → async `readFile`.
- **Async error file pre-injection** — `extractErrorFiles` converted from `existsSync`+`readFileSync` to async `access`+`readFile`.
- **stripCode dedup** — `magicKeywords.ts` reduced `stripCode()` from 3-4 calls to 1, passing the result to all downstream functions.
- **FileMemoryProvider TTL cache** — `searchSolutions` and fallback file search now use 60s TTL cache, avoiding repeated disk reads on every prefetch.
- **OML_SESSION_GUIDANCE cache** — `attachments.ts` dynamic import cached at module level after first load.
- **frustrationHint patterns hoisted** — Regex array moved from function body to module-level constant.

### i18n

- **Compacting status messages localized** — "Compacting context…" → "凝练上下文…", "Compacting conversation" → "精炼对话中" for Chinese users.
- **Turn completion verbs localized** — New `getTurnCompletionVerbs()` function; Chinese users see "烹制了 5s" instead of "Baked for 5s".

### Cleanup

- Deleted dead code `src/commands/undo.ts` (was never registered in command list).
- Fixed dead conditional in `extractImports`.

## [1.5.1] - 2026-04-19

### Features

- **Proactive skill invocation** — Wired `OML_SESSION_GUIDANCE` (the "1% rule") into the `skill_listing` attachment. The AI now proactively considers available skills before every response, instead of only responding to explicit `/slash` commands.
- **Frontend/design auto-guidelines** — New `designPrompt.ts` detects frontend intent (UI, prototype, design exploration) from user input and transparently injects layered design guidelines (oklch colors, responsive layout, animation best practices, design exploration methodology). Zero user action required.
- **Enhanced designer agent** — `/oml:designer` now carries a full design methodology prompt (oklch palettes, mobile-first, ARIA accessibility, 3+ variation exploration) instead of a one-line description.

### Bug Fixes

- **Skills were never proactively used** — `OML_SESSION_GUIDANCE` was defined in `superpowers.ts` but never imported or injected anywhere. Now wired into the skill listing attachment.

## [1.5.0] - 2026-04-19

### Bug Fixes

- **Fix REPL startup deadlock** — The `/undo` command was registered via static `import` in `commands.ts`, creating a circular dependency (`commands.ts` → `undo.ts` → `commands.ts`) that caused Bun's module loader to deadlock. The REPL would hang with no output on launch. Fixed by removing the static import entirely. The `/undo` feature remains available via `src/services/undoTracker.ts` (wired into Edit/Write tools) but is no longer registered as a slash command to avoid the circular dependency.

### Features (carried from 1.4.8/1.4.9)

- **AtomCode intelligence fusion** — Pangu CJK spacing, negative feedback detection, tool call loop detection, error file pre-injection, first-read full file
- **OpenAI-compatible bridge adapter** — Anthropic ↔ OpenAI format translation for DeepSeek/Qwen/GLM/Ollama/vLLM/LM Studio
- **Code Graph** — Regex-based symbol index + file dependency graph (TS/JS/Python/Go/Rust)
- **Parallel File Edit** — One sub-agent per file with sibling skeletons
- **Workflow Engine** — Structured markdown step execution with checks and dependencies
- **Cross-session knowledge** — Auto-writes `.legna/knowledge.md` on session end
- **Baseline builds** — No-AVX binaries for older x64 CPUs (darwin-x64-baseline, linux-x64-baseline)

## [1.4.9] - 2026-04-17

### Features

- **Baseline (no-AVX) builds** — New platform packages for older x64 CPUs without AVX instruction set support:
  - `@legna-lnc/legnacode-darwin-x64-baseline` — macOS Intel (pre-2011 or Hackintosh without AVX)
  - `@legna-lnc/legnacode-linux-x64-baseline` — Linux x64 servers/VMs without AVX
  - Fixes `warn: CPU lacks AVX support, strange crashes may occur` error
  - Install: `npm i -g @legna-lnc/legnacode-darwin-x64-baseline` (use directly, not via main package)

## [1.4.8] - 2026-04-17

### Features

- **AtomCode intelligence fusion (Layer A)** — Lightweight agent intelligence, zero new dependencies:
  - **Pangu CJK spacing** — Auto-inserts spaces between CJK and ASCII in Markdown rendering
  - **Negative feedback detection** — Detects frustration ("still broken"/"错了"/"まだ壊れ"), injects strategy-shift hint (EN/ZH/JA)
  - **Tool call loop detection** — Same (tool, args) 3+ times → blocks. Resets per user message
  - **Error file pre-injection** — Bash fail → extracts file paths from stderr, auto-reads first 30 lines
  - **First-read full file** — First encounter ignores offset/limit, forces full read

- **OpenAI-compatible bridge adapter (Layer B1)** — Full Anthropic ↔ OpenAI format translation:
  - Message format: `tool_use` ↔ `tool_calls`, `tool_result` ↔ `role: "tool"`
  - Tool schema: `input_schema` ↔ `function.parameters`
  - JSON repair for weak models (markdown fences, trailing commas, unbalanced brackets)
  - Supports: OpenAI, DeepSeek, Qwen, GLM, SiliconFlow, Ollama, vLLM, LM Studio
  - Activate: `OPENAI_COMPAT_BASE_URL` + `OPENAI_COMPAT_API_KEY` env vars

- **Code Graph (Layer B2)** — Regex-based symbol index + file dependency graph:
  - Languages: TypeScript/TSX, JavaScript, Python, Go, Rust
  - Incremental mtime updates, persisted to `<cwd>/.legna/.palace/graph.json`
  - **Wired:** auto-builds on session start, injects file summaries into prefetch context

- **Parallel File Edit (Layer B3)** — "One sub-agent per file" execution model:
  - Target file full text + sibling skeletons + interface contracts
  - **Wired:** integrated into `/dispatch` skill prompt with parallel edit instructions

- **Workflow Engine (Layer B4)** — Structured step execution:
  - Markdown `## Step N:` format with checks, failure handling, dependencies
  - **Wired:** WorkflowTool now parses steps, shows status, substitutes args

- **/undo command** — Reverts the last file edit (Edit or Write tool):
  - Tracks original content before each edit, max 20 entries per session
  - New file creation → undo deletes the file

- **Cross-session knowledge persistence** — Auto-writes `<cwd>/.legna/knowledge.md`:
  - Extracts key decisions/actions from last 10 assistant messages on session end
  - Appends timestamped entries, caps at 50KB

- **Enhanced compiler error detection** — Extended error file pre-injection:
  - Now matches compiler-style paths (`file.ts:42`, `file.py(10)`) in addition to standard paths

## [1.4.7] - 2026-04-16

### Features

- **claude-mem memory intelligence fusion** — Ported 5 lightweight techniques from claude-mem's persistent memory system into DrawerStore, zero new dependencies:
  - **Content-hash deduplication** — `sha256(wing + room + content)` with 30-second window prevents duplicate observations during rapid compaction cycles
  - **Token economics tracking** — Each drawer records `discoveryTokens` (cost to create) and `readTokens` (accumulated recall cost) for memory ROI analysis
  - **Relevance feedback** — `relevanceCount` incremented on each search hit; frequently recalled memories get up to +100% importance boost via `importance * (1 + 0.1 * min(count, 10))`
  - **90-day time decay** — `max(0.3, 1.0 - age_days / 90)` applied to both search similarity and importance ranking. Old memories fade but never fully disappear
  - **Privacy tag filtering** — `<private>...</private>` content stripped to `[REDACTED]` before memory extraction. Zero config, just wrap sensitive text in tags

### Architecture

- Modified `src/memdir/vectorStore/types.ts` — Drawer gains `discoveryTokens`, `readTokens`, `relevanceCount`, `contentHash` fields
- Modified `src/memdir/vectorStore/drawerStore.ts` — Schema migration (4 new columns), content-hash dedup in upsert, relevance feedback in search, time decay in search + topByImportance
- Modified `src/memdir/vectorStore/exchangeExtractor.ts` — `stripPrivate()` applied before pair extraction

## [1.4.6] - 2026-04-16

### Bug Fixes

- **OML skill crash fix** — All 40 OML skills (16 superpowers + 5 orchestrators + 19 agents) returned `string` instead of `ContentBlockParam[]` from `getPromptForCommand`, causing `result.filter is not a function` crash on `/ultrawork`, `/ralph`, `/autopilot`, etc. Now wrapped as `Promise<[{ type: 'text', text }]>`.
- **Statusline writes to wrong config dir** — `statuslineSetup` agent hardcoded `~/.claude/settings.json` and `~/.claude/statusline-command.sh`. Fixed to `~/.legna/`.

### Improvements

- **Plans moved to project-local** — Default plan directory changed from `~/.legna/plans/` to `<cwd>/.legna/plans/`. Plans now live alongside the project they belong to.
- **Auto-memory moved to project-local** — Default auto-memory path changed from `~/.legna/projects/<slug>/memory/` to `<cwd>/.legna/memory/`. First startup auto-migrates files from the legacy global path (non-destructive, never overwrites).
- **Compound engineering seamless fusion** — Knowledge compounding from compound-engineering-plugin, injected into 3 existing automation points with zero new commands:
  - `onPreCompress`: high-value exchange pairs auto-written to `docs/solutions/` (opt-in via `mkdir docs/solutions`)
  - `prefetch`: auto-searches `docs/solutions/` for past learnings when user asks related questions
  - `magicKeywords`: deep scope detection (refactor/migrate/architecture) appends a lightweight compound hint
- **Legacy path comments cleaned** — Updated stale `~/.claude/projects/` references in memdir, extractMemories, settings types

## [1.4.5] - 2026-04-13

### Features

- **OpenViking content tiering fusion** — Ported L0/L1/L2 three-tier content grading from OpenViking's context database:
  - **Content Tiering** — Each drawer auto-generates L0 (one-sentence summary, ~25 words) and L1 (core overview, ~200 words) at upsert time. L2 is the full verbatim content.
  - **Budget-aware wake-up** — `wakeUp()` now accepts a token budget (default 800) and greedily fills it with L1 content, degrading to L0 when budget is tight.
  - **Budget-capped recall** — New `recallWithBudget()` method: L2→L1→L0 degradation strategy ensures recall never exceeds character budget.
  - **CJK-aware token estimation** — `estimateTokens()` handles mixed CJK/Latin text.
  - **SQLite schema migration** — Existing DrawerStore databases auto-migrate with `ALTER TABLE ADD COLUMN`.
  - **Fixed recallByTopic()** — Now passes actual query for vector ranking instead of empty string.

## [1.4.4] - 2026-04-11

### Improvements

- **Status messages moved to spinner line** — autocompact / output truncated / interrupted status messages no longer insert system messages into the conversation; they now display temporarily on the spinner animation line, flashing briefly without polluting context
- **ToolUseContext adds setSpinnerMessage** — generic spinner text callback allowing the query loop to update spinner status at any time
- **LegnaCode vs Claude Code comparison doc** — added [COMPARISON.md](./COMPARISON.md) with 60+ item-by-item comparison across 9 categories

## [1.4.3] - 2026-04-11

### Features

- **mempalace memory architecture integration** — ported mempalace core memory system, pure TypeScript implementation, zero external dependencies:
  - **DrawerStore** — SQLite-persisted vector memory storage + WAL audit log, deterministic drawer ID (sha256 idempotent upsert)
  - **TF-IDF vectorizer** — pure TS implementation (Porter stemming + cosine similarity), <10K drawer search <5ms
  - **4-layer memory stack** — L0 identity (~100 tokens) + L1 top drawers (~500-800 tokens) loaded every turn, L2/L3 recalled on demand. Per-turn tokens reduced from ~8K to ~800 (~88% savings)
  - **Temporal knowledge graph** — SQLite entity-relation storage, supports triples with validity periods and point-in-time queries
  - **Room auto-classification** — 6 categories (facts/decisions/events/discoveries/preferences/advice) with keyword scoring
  - **Exchange pair extractor** — Q+A paired chunking + 5-category tag scoring (decisions/preferences/milestones/problems/emotional)
  - **Auto-migration** — automatically migrates existing .legna/memory/*.md files to DrawerStore on first startup
  - **PreCompact memory save** — automatically extracts high-value exchange pairs to DrawerStore before compaction, preventing memory loss

### Architecture

- Added `src/memdir/vectorStore/` — complete vector memory system (8 files)
  - `types.ts` — Drawer, SearchResult, MetadataFilter types
  - `tfidfVectorizer.ts` — TF-IDF + Porter stemming + cosine similarity
  - `drawerStore.ts` — SQLite persistence + WAL + vector search
  - `roomDetector.ts` — content auto-classification
  - `layeredStack.ts` — 4-layer memory stack
  - `knowledgeGraph.ts` — temporal knowledge graph
  - `exchangeExtractor.ts` — exchange pair extraction + tag scoring
  - `migration.ts` — .md → DrawerStore auto-migration
- Upgraded `src/memdir/providers/FileMemoryProvider.ts` — DrawerStore + LayeredStack backend
- Wired `src/services/compact/autoCompact.ts` — calls onPreCompress before compaction

## [1.4.2] - 2026-04-11

### Features

- **verbose enabled by default** — users now see full tool execution progress and status information by default
- **Token/Timer instant display** — removed 30-second delay, token count and elapsed time shown from second 1
- **Autocompact status visible** — displays "Compacting conversation context..." system message during conversation compaction
- **Interrupt reason visible** — shows abort reason on interruption (streaming and tool_execution phases)
- **Output truncated retry prompt** — displays retry progress during max output tokens recovery
- **Tool execution logging** — StreamingToolExecutor outputs current tool name and queue depth
- **Microcompact/Snip logging** — added debug logging for compaction operations
- **ForkedAgent startup logging** — outputs label and ID when child agent starts

### Bug Fixes

- **Apple Terminal notification logic fix** — bell is now sent only when bell is not disabled (logic was previously inverted)

## [1.4.0] - 2026-04-11

### Features

- **MiniMax deep native integration** — when using MiniMax models with `MINIMAX_API_KEY` configured, automatically registers 6 native multimodal tools:
  - `MiniMaxImageGenerate` — image generation (POST /v1/image_generation)
  - `MiniMaxVideoGenerate` — video generation + async polling (POST /v1/video_generation)
  - `MiniMaxSpeechSynthesize` — text-to-speech (POST /v1/t2a_v2)
  - `MiniMaxMusicGenerate` — music generation (POST /v1/music_generation)
  - `MiniMaxVisionDescribe` — image understanding VLM (POST /v1/coding_plan/vlm)
  - `MiniMaxWebSearch` — web search (POST /v1/web_search)
- **MiniMax auth command** — `/auth-minimax` command to configure API key, persisted to `~/.legna/minimax-credentials.json`
- **MiniMax tool schema export** — `schemaExport.ts` supports exporting Anthropic-compatible tool schemas
- **MiniMax multimodal skill pack** — 5 built-in skills (image/video/speech/music/pipeline) guiding AI to orchestrate multimodal workflows
- **Smart model routing** — heuristic routing to fast/default/strong model tiers based on prompt complexity
- **Autonomous skill detection** — detects repetitive tool call patterns and prompts users to save as reusable skills
- **Context compression enhancements**:
  - Tool output pre-pruning — large tool_result blocks auto-trimmed before compact (head + tail preserved)
  - Budget pressure injection — injects hints into tool results when context usage exceeds 80%, guiding the model to wrap up
- **RPC subprocess tool execution** — Unix Domain Socket RPC server + stub generator + code execution runner; AI-generated scripts can call back LegnaCode tools (Bash/Read/Write/Edit/Glob/Grep/WebFetch) via RPC, compressing multi-step operations into a single inference
- **Memory Provider plugin system** — abstract base class + registry + default FileMemoryProvider; supports one external provider running in parallel with built-in memory, full lifecycle (initialize/prefetch/syncTurn/shutdown) + optional hooks (onTurnStart/onSessionEnd/onPreCompress/onDelegation)
- **Cross-session memory search** — `/recall` command searches historical session JSONL files with keyword matching + relevance ranking
- **Worker thread pool** — large file operations / batch searches can be offloaded to worker threads, avoiding main thread blocking

### Architecture

- Added `src/tools/MiniMaxTools/` — complete MiniMax multimodal tool directory (client, endpoints, 6 buildTool tools, conditional registration, schema export)
- Added `src/services/rpc/` — RPC subprocess tool execution (rpcServer.ts, stubGenerator.ts, codeExecutionRunner.ts)
- Added `src/memdir/providers/` — Memory Provider plugin system (MemoryProvider.ts abstract base class, FileMemoryProvider.ts default implementation, registry.ts registry)
- Added `src/services/modelRouter.ts` — task complexity estimation + model tier routing
- Added `src/services/skillAutoCreate.ts` — tool call pattern detector, integrated into toolExecution.ts
- Added `src/services/compact/toolOutputPruner.ts` — tool output pre-pruning, integrated into autoCompact.ts
- Added `src/services/compact/budgetPressure.ts` — context budget pressure injection, integrated into query.ts
- Added `src/services/sessionSearch.ts` — cross-session search engine
- Added `src/commands/recall/` — `/recall` command
- Added `src/commands/auth/` — `/auth-minimax` command
- Added `src/skills/builtin-minimax/` — 5 MiniMax multimodal skill files
- Added `src/utils/workerPool.ts` — worker thread pool

## [1.3.7] - 2026-04-09

### Bug Fixes

- **Resume session detection** — `legna resume` failed to discover sessions written to `<project>/.legna/sessions/` since v1.3.0. `getStatOnlyLogsForWorktrees()` only scanned the global `~/.legna/projects/`; it now also scans the project-local sessions directory, consistent with `fetchLogs()` behavior
- **Interrupted diagnostics logging** — added abort reason + call stack logging at `onCancel()` and `query.ts` interrupt points; traceable under `--verbose` mode

### Enhancements

- **Priority-now interrupt visibility** — when a queued command interrupts the current task, the command summary is logged to debug log instead of silently aborting
- **Background task status visibility** — footer pill shows real-time activity summary for a single background agent (latest tool + token stats); task completion notification includes progress statistics

### Architecture

- `src/utils/sessionStorage.ts` — `getStatOnlyLogsForWorktrees()` Path A/B both include `.legna/sessions/` scanning
- `src/query.ts` — abort reason logging added at both `createUserInterruptionMessage` call sites
- `src/screens/REPL.tsx` — `onCancel()` call stack logging, priority-now useEffect logs command summary
- `src/tasks/pillLabel.ts` — single agent task displays `getActivitySummary()` real-time activity
- `src/tasks/LocalMainSessionTask.ts` — `completeMainSessionTask` captures progress, notification includes statistics

## [1.3.6] - 2026-04-09

### Bug Fixes

- **Windows Edit tool path separator false positive** — fixed [#7935](https://github.com/anthropics/claude-code/issues/7935): on Windows, after reading a file with forward slashes (`D:/path`), Edit/MultiEdit tools reported "File has been unexpectedly modified" error. Root cause: `path.normalize()` does not always convert `/` to `\` in certain runtimes (Bun compiled binary + Git Bash/MINGW environment), causing FileStateCache key mismatch
  - `FileStateCache` added `normalizeKey()` — explicitly replaces `/` with the native separator (Windows: `\`) after `path.normalize()`, ensuring `D:/foo` and `D:\foo` always hit the same cache entry
  - `expandPath()` added `ensureNativeSeparators()` — all returned paths force backslashes on Windows as a defensive fix

### Architecture

- `src/utils/fileStateCache.ts` — `normalizeKey()` replaces bare `normalize()`, imports `sep`
- `src/utils/path.ts` — `ensureNativeSeparators()` wraps all `normalize()`/`resolve()`/`join()` return values

## [1.3.5] - 2026-04-07

### Bug Fixes

- **SessionStart hook error** — OML's SessionStart hook used `type: 'prompt'`, but the SessionStart phase has no `toolUseContext` (LLM call context), causing a guaranteed crash. Removed SessionStart hook; skill guidance is now exposed through skill descriptions
- **Windows alt-screen rendering flicker** — in alt-screen mode, `fullResetSequence_CAUSES_FLICKER` was still triggered (viewport changes, scrollback detection, etc.), causing full-screen clear + redraw flicker. Added `altScreenFullRedraw()` method; in alt-screen mode, uses simple `CSI 2J + CSI H` (erase screen + cursor home) instead of `clearTerminal`'s Windows legacy path
- **Windows drainStdin** — previously skipped stdin draining entirely on Windows; residual mouse events caused input field corruption. Changed to flush buffered input events by toggling raw mode

### Architecture

- `src/ink/log-update.ts` — 5 `fullResetSequence_CAUSES_FLICKER` call sites now check `altScreen`, added `altScreenFullRedraw()` method
- `src/ink/ink.tsx` — Windows `drainStdin` alternative (toggle raw mode)
- `src/plugins/bundled/oml/definition.ts` — removed SessionStart hook, OML upgraded to 1.2.0

## [1.3.4] - 2026-04-07

### New Features

- **OML Superpowers engineering discipline** — integrated obra/superpowers core skills, enforcing strict software engineering workflows for AI
  - `/verify` — completion verification discipline: cannot claim completion without fresh evidence
  - `/tdd` — TDD enforcement: RED-GREEN-REFACTOR, write tests before code
  - `/debug` — 4-stage systematic debugging, question architecture after 3 failures
  - `/brainstorm` — Socratic design: hard gate, no implementation allowed until design is approved
  - `/write-plan` — break design into 2-5 minute tasks, zero placeholders
  - `/sdd` — sub-agent driven development: implement → spec review → quality review, 3 stages
  - `/exec-plan` — load plan file and execute tasks sequentially
  - `/dispatch` — parallel sub-agent dispatch
  - `/code-review` — dispatch reviewer sub-agent
  - `/worktree` — Git worktree isolated development
  - `/finish-branch` — branch wrap-up (merge/PR/keep/discard)
- **SessionStart skill guidance** — automatically injects OML skill guidance prompt at session start ("1% rule")
- OML plugin version upgraded to 1.1.0, 35 built-in skills total

### Architecture

- `src/plugins/bundled/oml/superpowers.ts` — 11 engineering discipline skills + SessionStart guidance
- `src/plugins/bundled/oml/definition.ts` — appended superpowers skills + SessionStart hook

## [1.3.3] - 2026-04-07

### New Features

- **OML (Oh-My-LegnaCode) smart orchestration layer** — built-in oh-my-claudecode core functionality, works out of the box
  - 5 orchestration skills: `/ultrawork` (parallel execution), `/ralph` (persistent loop), `/autopilot` (fully autonomous), `/ralplan` (plan then execute), `/plan-oml` (structured planning)
  - 19 specialized agent skills: `/oml:explore`, `/oml:planner`, `/oml:architect`, `/oml:executor`, `/oml:verifier`, etc.
  - Magic Keywords auto-detection: when prompt contains keywords like ultrawork/ralph/autopilot/ultrathink, orchestration directives are auto-injected (supports CJK and Vietnamese)
  - Can be enabled/disabled via `/plugin` UI (`oml@builtin`, enabled by default)
  - `OML_BUILTIN` feature flag controls compile-time DCE

### Bug Fixes

- **Windows Terminal Fullscreen** — automatically enables alt-screen mode in `WT_SESSION` environment, completely eliminating the cursor-up viewport yank bug (microsoft/terminal#14774). Covers WSL-in-Windows-Terminal. `CLAUDE_CODE_NO_FLICKER=0` to opt-out

### Architecture

- `src/plugins/bundled/oml/` — OML plugin module (definition, skills, agents, magicKeywords)
- `src/plugins/bundled/index.ts` — registered OML builtin plugin
- `src/utils/processUserInput/processUserInput.ts` — magic keyword detection integration point
- `src/utils/fullscreen.ts` — Windows Terminal fullscreen condition

## [1.3.2] - 2026-04-07

### Breaking Changes

- **Disabled HISTORY_SNIP** — `bunfig.toml` feature flag set to false, compile-time DCE removes all snip-related code (SnipTool, snipCompact, snipProjection, force-snip command, attachments nudge). Auto-compact is unaffected; context management reverts to the original mechanism

### Bug Fixes

- **Windows Terminal streaming text** — no longer disables streaming text display for all Windows; now only disabled under legacy conhost. Windows Terminal (detected via `WT_SESSION` environment variable) restores normal streaming rendering

## [1.3.1] - 2026-04-06

### Bug Fixes

- **Snip-aware context window** — 1M models are no longer prematurely snipped; `KEEP_RECENT` changed from hardcoded 10 to dynamic calculation (1M: 200, 500K: 100, 200K: 10)
- **Snip nudge frequency** — 1M model nudge threshold raised from 20 to 100 messages
- **branch command branding** — `/branch` resume prompt changed from `claude -r` to `legna -r`
- **admin version fallback** — displays correct version number when running from source

### Architecture

- `src/services/compact/snipCompact.ts` — added `getSnipThresholds(model)` dynamic threshold function; `snipCompactIfNeeded` and `shouldNudgeForSnips` gained model parameter
- `src/query.ts` / `src/QueryEngine.ts` / `src/commands/force-snip-impl.ts` — pass model parameter

## [1.3.0] - 2026-04-04

### New Features

- **Project-local storage** — sessions, skills, memory, rules, and settings all moved down to `<project>/.legna/` directory
  - New sessions written to `<project>/.legna/sessions/<uuid>.jsonl`, traveling with the project
  - Project-level skills/rules/settings/agent-memory/workflows unified under `.legna/`
  - `.legna/` automatically added to `.gitignore`
- **Global data migration** — automatically migrates from `~/.claude/` to `~/.legna/` on first startup (one-way)
  - Migrates settings.json, credentials, rules, skills, agents, plugins, keybindings, etc.
  - Does not overwrite existing files; writes `.migration-done` marker on completion
  - `LEGNA_NO_CONFIG_SYNC=1` to disable
- **`legna migrate` command** — manual data migration
  - `--global` migrates global data only
  - `--sessions` migrates current project sessions to local only
  - `--all` migrates everything (default)
  - `--dry-run` preview mode
- **Three-level fallback reads** — automatically searches `.legna/` → `.claude/` → `~/.legna/` → `~/.claude/` when reading, zero-breakage backward compatibility

### Architecture

- `src/utils/legnaPathResolver.ts` — unified path resolution (PROJECT_FOLDER/LEGACY_FOLDER/resolveProjectPath)
- `src/utils/ensureLegnaGitignored.ts` — auto-gitignore utility
- `src/utils/envUtils.ts` — refactored global migration logic, removed old syncClaudeConfigToLegna
- `src/utils/sessionStoragePortable.ts` — added getLocalSessionsDir/getLegacyProjectsDir, refactored resolveSessionFilePath
- `src/utils/sessionStorage.ts` — session write path switched to project-local
- `src/utils/listSessionsImpl.ts` — multi-source scan and merge (local + global + legacy)
- `src/commands/migrate/` — CLI migration command

## [1.2.1] - 2026-04-04

### New Features

- **Model Adapter Layer** — unified third-party model compatibility framework, auto-detects model/endpoint and applies corresponding transforms
- **MiMo (Xiaomi) adapter** — api.xiaomimimo.com/anthropic, supports mimo-v2-pro/omni/flash (1M ctx)
  - simplifyThinking + forceAutoToolChoice + normalizeTools + stripBetas + injectTopP(0.95) + stripCacheControl
  - Handles content_filter / repetition_truncation stop_reason
- **GLM (ZhipuAI) adapter** — open.bigmodel.cn/api/anthropic, supports glm-5.1/5/5-turbo/4.7/4.6/4.5, etc.
  - Full standard transform suite, server-side auto-caching (strip cache_control)
- **DeepSeek adapter** — api.deepseek.com/anthropic, supports deepseek-chat/coder/reasoner
  - stripReasoningContent to avoid 400 errors, reasoner models auto-strip temperature/top_p
- **Kimi (Moonshot) adapter** — api.moonshot.ai/anthropic, supports kimi-k2/k2.5/k2-turbo, etc.
  - Preserves cache_control (Kimi supports prompt caching discount), stripReasoningContent
- **MiniMax adapter** — api.minimaxi.com/anthropic (China) + api.minimax.io/anthropic (international)
  - Supports MiniMax-M2.7/M2.5/M2.1/M2 full series (204K ctx), case-insensitive matching
  - Deep compatibility: preserves metadata, tool_choice, cache_control, top_p (other adapters need strip/force)
  - Only needs simplifyThinking + normalizeTools + stripBetas + stripUnsupportedFieldsKeepMetadata

### Architecture

- `src/utils/model/adapters/index.ts` — adapter registry + match/transform dispatch
- `src/utils/model/adapters/shared.ts` — 12 shared transform functions (including new stripUnsupportedFieldsKeepMetadata)
- `src/utils/model/adapters/{mimo,glm,deepseek,kimi,minimax}.ts` — 5 provider adapters
- `src/services/api/claude.ts` — paramsFromContext() calls applyModelAdapter() at the end

## [1.2.0] - 2026-04-03

### New Features

- **Sessions grouped by project** — WebUI session history panel groups sessions by project path
- **resume command with cd** — copied resume command auto-includes `cd` to project directory (Windows uses `cd /d`)
- **Migration supports session history** — config migration panel adds "also migrate session history" option, copies `projects/` directory
- **Windows native compilation** — Windows binary now compiled natively on Windows

### Fixed

- Migration panel field names corrected to match actual settings.json fields

## [1.1.10] - 2026-04-03

### Fixed

- **Windows compile script fix** — `scripts/compile.ts` correctly handles `.exe` suffix on Windows, fixing the issue where compiled output file could not be found
- **Windows native binary recompiled and published** — recompiled native `legna.exe` using Windows-native Bun, replacing the previous cross-compiled version

## [1.1.9] - 2026-04-03

### Fixed

- **postinstall auto-installs platform package** — added `npm/postinstall.cjs`; during `npm install`, automatically detects and installs the corresponding platform binary package from the official registry, completely solving the issue where optionalDependencies fails on Windows/mirror registries
- **Force official registry** — postinstall uses `--registry https://registry.npmjs.org` to avoid 404 errors from unsynchronized mirrors (e.g., Taobao)
- **bin wrapper simplified** — removed runtime auto-install logic, now guaranteed by postinstall

## [1.1.8] - 2026-04-03

### Fixed

- **Windows npm global install missing platform package** — bin wrapper now auto-executes `npm install -g` for the corresponding platform package when it detects the package is not installed, no longer requiring manual user action
- **bin wrapper path lookup optimization** — fixed scope directory path joining under global node_modules flat layout

## [1.1.7] - 2026-04-03

### Fixed

- **Completely fixed Windows external module error** — cleared the compile external list; all stub modules (`@ant/*`, `@anthropic-ai/*`, native napi) are now bundled into the binary, no longer depending on runtime external modules

## [1.1.6] - 2026-04-03

### Fixed

- **Windows external module error** — removed `@anthropic-ai/sandbox-runtime`, `@anthropic-ai/mcpb`, `@anthropic-ai/claude-agent-sdk`, `audio-capture-napi`, `color-diff-napi`, `modifiers-napi` from the compile external list, letting stub code bundle directly into the binary; Windows no longer reports `Cannot find module`
- **bin wrapper multi-path lookup** — `npm/bin/legna.cjs` added global node_modules flat path and nested path fallback, improving cross-platform npm global install compatibility
- **Version number automation** — added `scripts/bump.ts` for one-click sync of version numbers across package.json, bunfig.toml, webui/package.json, and optionalDependencies
- **Release process automation** — rewrote `scripts/publish.ts` for one-click bump → build webui → compile all → publish npm

## [1.1.5] - 2026-04-03

### New Features

- **WebUI admin panel** — `legna admin` launches a browser-based admin panel (HTTP server + React SPA, default port 3456), visual management of both `~/.claude/` and `~/.legna/` config directories
- **Config editing** — edit API endpoint, API key, model mapping (Opus/Sonnet/Haiku), timeout, permission mode, language, and all other settings.json fields in the browser
- **Config file switching** — lists settings*.json files, shows baseUrl/model, one-click swap to activate
- **Session history browsing** — parses all session JSONL files under the projects directory, displays project path, slug, time, prompt count, and copy resume command
- **Config migration** — Claude ↔ LegnaCode bidirectional migration, supports full or selective field migration (env/model/permissions, etc.), preview diff before migration
- **npm cross-platform publishing** — bin wrapper (.cjs), compile-all cross-platform compilation (darwin/linux/win32), publish script
- **OAuth disabled** — `isAnthropicAuthEnabled()` returns false, removed OAuth login flow

### Fixed (1.1.1 ~ 1.1.5)

- bin wrapper changed to `.cjs` to fix ESM `require` error
- `optionalDependencies` platform package versions aligned
- Terminal restored on admin server exit with screen clear
- WebUI frontend inlined into binary, no longer depends on external `webui/dist/`
- All package versions unified to 1.1.5

### Architecture

- Backend: `src/server/admin.ts` — Bun.serve REST API, SPA inlined as string constant
- Frontend: `webui/` — React 18 + Vite + Tailwind SPA, tab-based scope switching
- Inlining: `scripts/inline-webui.ts` → `src/server/admin-ui-html.ts`
- CLI: `src/entrypoints/cli.tsx` — `admin` fast-path, zero extra module loading

## [1.0.9] - 2026-04-03

### New Features

- **i18n multilingual completion** — completed ~100 missing hardcoded English strings across 9 files, covering Spinner, teammate tree, pill labels, keyboard shortcut hints, Tips, and all other UI areas
- **Built-in styled status bar** — no external script configuration needed; displays directory, Git branch/sync status, model name (smart parsing to friendly name), colored context progress bar, and time by default; cross-platform compatible with Win/Mac/Linux
- **Config auto-migration** — automatically syncs `~/.claude/settings.json` to `~/.legna/settings.json` on startup; prints warning without overwriting when both sides differ; `LEGNA_NO_CONFIG_SYNC=1` to disable

### Changed

- `~/.legna/` is now the preferred config directory, `~/.claude/` serves as compatibility fallback
- Status bar model name auto-parsing: `Claude-Opus-4-6-Agentic[1m]` → `Opus 4.6`
- `KeyboardShortcutHint` component "to" connector word internationalized (Chinese displays "→")

### Files Changed

| File | Changes |
|------|---------|
| `src/utils/i18n/zh.ts` | +50 translation entries |
| `src/components/Spinner.tsx` | 7 i18n points |
| `src/components/PromptInput/PromptInputFooterLeftSide.tsx` | 4 i18n points |
| `src/components/design-system/KeyboardShortcutHint.tsx` | "to" internationalized |
| `src/components/Spinner/teammateSelectHint.ts` | i18n |
| `src/components/Spinner/TeammateSpinnerTree.tsx` | 6 i18n points |
| `src/components/Spinner/TeammateSpinnerLine.tsx` | 7 i18n points |
| `src/tasks/pillLabel.ts` | all pill labels i18n |
| `src/services/tips/tipRegistry.ts` | 25 tips i18n |
| `src/utils/builtinStatusLine.ts` | added: built-in status bar renderer |
| `src/components/StatusLine.tsx` | integrated built-in status bar |
| `src/utils/envUtils.ts` | config auto-migration logic |

## [1.0.8] - 2026-04-02

### New Features

- **MONITOR_TOOL** — MCP server health monitoring tool, supports start/stop/status operations, background periodic ping to detect connection status
- **WORKFLOW_SCRIPTS** — workflow automation system, reads `.claude/workflows/*.md` to execute multi-step workflows, `/workflows` command lists available workflows
- **HISTORY_SNIP** — session history trimming, model can proactively call SnipTool to remove old messages and free context, `/force-snip` for forced trimming, UI retains full history while model view is filtered

### Infrastructure

- Added `src/tools/MonitorTool/MonitorTool.ts` — MCP monitoring tool (buildTool construction)
- Added `src/tasks/MonitorMcpTask/MonitorMcpTask.ts` — monitoring background task lifecycle management
- Added `src/components/permissions/MonitorPermissionRequest/` — monitoring permission UI
- Added `src/components/tasks/MonitorMcpDetailDialog.tsx` — monitoring task detail dialog
- Added `src/tools/WorkflowTool/WorkflowTool.ts` — workflow execution tool
- Added `src/tools/WorkflowTool/createWorkflowCommand.ts` — workflow command scanning and registration
- Added `src/tools/WorkflowTool/bundled/index.ts` — built-in workflow registration entry
- Added `src/tools/WorkflowTool/WorkflowPermissionRequest.tsx` — workflow permission UI
- Added `src/commands/workflows/` — `/workflows` slash command
- Added `src/tasks/LocalWorkflowTask/LocalWorkflowTask.ts` — workflow background task (kill/skip/retry)
- Added `src/components/tasks/WorkflowDetailDialog.tsx` — workflow detail dialog
- Added `src/services/compact/snipCompact.ts` — trim trigger logic (rewrote stub)
- Added `src/services/compact/snipProjection.ts` — model view message filtering
- Added `src/tools/SnipTool/SnipTool.ts` — model-callable trimming tool
- Added `src/tools/SnipTool/prompt.ts` — SnipTool constants and prompt
- Added `src/commands/force-snip.ts` — `/force-snip` slash command
- Added `src/components/messages/SnipBoundaryMessage.tsx` — trim boundary UI component
- 3 feature flags flipped: MONITOR_TOOL, WORKFLOW_SCRIPTS, HISTORY_SNIP
- Cumulative 47/87 feature flags enabled

## [1.0.7] - 2026-04-02

### New Features

- **TERMINAL_PANEL** — `Alt+J` toggles built-in terminal panel (tmux persistent), TerminalCapture tool can read terminal content
- **WEB_BROWSER_TOOL** — built-in web browsing tool, fetches web page content and extracts text
- **TEMPLATES** — structured workflow template system, `legna new/list/reply` CLI commands, job status tracking
- **BG_SESSIONS** — background session management, `legna ps/logs/attach/kill/--bg`, tmux persistence + PID file discovery

### Infrastructure

- Added `src/tools/TerminalCaptureTool/` — tmux capture-pane tool (2 files)
- Added `src/tools/WebBrowserTool/WebBrowserTool.ts` — fetch + HTML text extraction
- Added `src/jobs/classifier.ts` — workflow turn classifier
- Added `src/cli/handlers/templateJobs.ts` — template CLI handler
- Added `src/cli/bg.ts` — background session CLI (5 handlers)
- Added `src/utils/taskSummary.ts` — periodic activity summary
- Added `src/utils/udsClient.ts` — active session enumeration
- Cumulative 44/87 feature flags enabled

## [1.0.6] - 2026-04-02

### New Features

- **CACHED_MICROCOMPACT** — cache-aware tool result compression, deletes old tool_result via API cache_edits directive without breaking prompt cache
- **AGENT_TRIGGERS** — `/loop` cron scheduling command + CronCreate/Delete/List tools, local scheduled task engine
- **TREE_SITTER_BASH** — pure TypeScript bash AST parser (~4300 lines), used for command safety analysis
- **TREE_SITTER_BASH_SHADOW** — tree-sitter vs legacy parser shadow comparison mode
- **MCP_SKILLS** — auto-discovers and registers skill commands from MCP server `skill://` resources
- **REACTIVE_COMPACT** — auto-triggers context compression on 413/overload errors
- **REVIEW_ARTIFACT** — `/review` code review skill + ReviewArtifact tool

### Infrastructure

- Rewrote `src/services/compact/cachedMicrocompact.ts` (from stub to 150+ line full implementation)
- Added `src/services/compact/cachedMCConfig.ts` — synchronous config module
- Added `CACHE_EDITING_BETA_HEADER` to `src/constants/betas.ts`
- Added `src/skills/mcpSkills.ts`, `src/services/compact/reactiveCompact.ts`
- Added `src/tools/ReviewArtifactTool/`, `src/skills/bundled/hunter.ts`
- Cumulative 40/87 feature flags enabled

## [1.0.5] - 2026-04-02

### New Features

- **AGENT_TRIGGERS** — `/loop` cron scheduling command, CronCreate/Delete/List tools, local scheduled task engine
- **TREE_SITTER_BASH** — pure TypeScript bash AST parser, used for command safety analysis
- **TREE_SITTER_BASH_SHADOW** — tree-sitter vs legacy parser shadow comparison mode
- **MCP_SKILLS** — auto-discovers and registers skill commands from MCP server `skill://` resources
- **REACTIVE_COMPACT** — auto-triggers context compression on 413/overload errors
- **REVIEW_ARTIFACT** — `/review` code review skill + ReviewArtifact tool + permission UI

### Infrastructure

- Added `src/skills/mcpSkills.ts` — MCP skill discovery module
- Added `src/services/compact/reactiveCompact.ts` — reactive compression strategy
- Added `src/tools/ReviewArtifactTool/` — code review tool
- Added `src/components/permissions/ReviewArtifactPermissionRequest/` — review permission UI
- Added `src/skills/bundled/hunter.ts` — /review skill registration
- Cumulative 39/87 feature flags enabled

## [1.0.4] - 2026-04-02

### New Features

- **ULTRAPLAN** — `/ultraplan` structured multi-step planning command
- **VERIFICATION_AGENT** — auto-spawns verification Agent after batch task completion
- **AUTO_THEME** — auto-switches dark/light theme by querying terminal background color via OSC 11
- **AGENT_MEMORY_SNAPSHOT** — Agent memory snapshots
- **FILE_PERSISTENCE** — file persistence tracking
- **POWERSHELL_AUTO_MODE** — PowerShell auto mode
- **HARD_FAIL** — strict error mode
- **SLOW_OPERATION_LOGGING** — slow operation logging
- **UNATTENDED_RETRY** — unattended retry
- **ALLOW_TEST_VERSIONS** — allow test versions

### Infrastructure

- Added `src/utils/systemThemeWatcher.ts` — OSC 11 terminal theme detection and real-time monitoring
- Cumulative 33/87 feature flags enabled

## [1.0.3] - 2026-04-02

### New Features

- **COMMIT_ATTRIBUTION** — tracks Claude's contribution ratio per commit, PR description auto-appends attribution trailer
- **AWAY_SUMMARY** — displays summary of what happened while user was away
- **COMPACTION_REMINDERS** — efficiency reminders during context compaction
- **HOOK_PROMPTS** — allows hooks to request user input
- **BASH_CLASSIFIER** — shell command safety classifier
- **EXTRACT_MEMORIES** — auto-extracts persistent memories from conversations
- **SHOT_STATS** — session statistics panel
- **PROMPT_CACHE_BREAK_DETECTION** — detects prompt cache invalidation
- **ULTRATHINK** — deep thinking mode
- **MCP_RICH_OUTPUT** — MCP tool rich text output
- **CONNECTOR_TEXT** — connector text enhancement
- **NATIVE_CLIPBOARD_IMAGE** — native clipboard image support
- **NEW_INIT** — improved project initialization flow
- **DUMP_SYSTEM_PROMPT** — debug system prompt export
- **BREAK_CACHE_COMMAND** — `/break-cache` command
- **BUILTIN_EXPLORE_PLAN_AGENTS** — built-in Explore/Plan Agents

### Infrastructure

- Added `src/utils/attributionHooks.ts`, `attributionTrailer.ts`, `postCommitAttribution.ts` — three attribution modules

## [1.0.2] - 2026-04-02

### New Features

- **QUICK_SEARCH** — `Ctrl+P` quick file open in fullscreen mode, `Ctrl+Shift+F` global symbol/content search
- **MESSAGE_ACTIONS** — copy, edit, retry and other actions on messages in fullscreen mode
- **FORK_SUBAGENT** — `/fork <directive>` session fork, child Agent inherits full conversation context and executes tasks in parallel
- **HISTORY_PICKER** — `Ctrl+R` opens history search dialog, replacing the previous inline search

### Infrastructure

- Added `src/commands/fork/` command module and `UserForkBoilerplateMessage` UI component

## [1.0.1] - 2026-04-02

### New Features

- **BUDDY virtual pet companion** — `/buddy hatch` hatches an exclusive coding pet, 18 species, 5 rarities, random attributes
  - `/buddy hatch` hatch · `/buddy pet` pet · `/buddy stats` stats · `/buddy release` release
  - Pet comments in cute language based on conversation context, supports multilingual auto-switching
  - Re-hatching after release gives a different pet (generation counter)
- **TOKEN_BUDGET** — use `+500k` or `use 2M tokens` in prompts to set token budget, auto-tracks usage
- **STREAMLINED_OUTPUT** — environment variable `CLAUDE_CODE_STREAMLINED_OUTPUT=true` enables streamlined output

### Fixes

- **Build system feature flags fix** — `scripts/build.ts` now correctly reads `bunfig.toml`'s `[bundle.features]` and passes them to the `Bun.build()` API; previously all `feature()` calls defaulted to `false`

### Infrastructure

- Added `scripts/compile.ts` replacing bare `bun build --compile`, ensuring compiled binary correctly applies feature flags
- Added `src/buddy/companionObserver.ts` context-aware pet reaction system
- Added `src/commands/buddy/` complete command module

## [1.0.0] - 2026-03-31

- Initial release: LegnaCode CLI v1.0.0
- Built on the Claude Code CLI open-source edition
- Brand adaptation and customization
