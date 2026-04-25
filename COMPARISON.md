# LegnaCode vs Claude Code Feature Comparison

🌐 [中文文档](./COMPARISON.zh-CN.md)

> LegnaCode is built on top of the Claude Code upstream project, deeply enhanced while maintaining full compatibility. Below is a detailed side-by-side comparison.

## Core Capabilities

| Feature | Claude Code | LegnaCode |
|---------|:-----------:|:---------:|
| Terminal AI coding assistant | ✅ | ✅ |
| 45+ built-in tools | ✅ | ✅ |
| MCP protocol support | ✅ | ✅ |
| Multi-agent collaboration | ✅ | ✅ |
| Plugin & skill system | ✅ | ✅ |
| Git workflow management | ✅ | ✅ |

## Models & Backends

| Feature | Claude Code | LegnaCode |
|---------|:-----------:|:---------:|
| Anthropic API | ✅ | ✅ |
| AWS Bedrock | ✅ | ✅ |
| GCP Vertex | ✅ | ✅ |
| Azure OpenAI | ❌ | ✅ |
| MiniMax deep native integration | ❌ | ✅ 6 multimodal tools auto-registered |
| OpenAI-compatible bridge | ❌ | ✅ Full streaming bridge with SSE→Anthropic event translation |
| Auto API format detection | ❌ | ✅ URL-based: `/anthropic` suffix → Anthropic SDK, else → OpenAI fetch |
| `apiFormat` setting | ❌ | ✅ Force Anthropic or OpenAI per profile, or auto-detect |
| DeepSeek / Qwen / GLM / Kimi / MiMo | ❌ | ✅ 7 dedicated adapters, dual-endpoint (Anthropic + OpenAI) |
| reasoning_content passback | ❌ | ✅ Auto-extracts thinking blocks for DeepSeek/Kimi/MiMo multi-turn |
| MiniMax reasoning_details | ❌ | ✅ Array format thinking content in OpenAI streaming |
| Provider-specific finish_reason | ❌ | ✅ sensitive (GLM), repetition_truncation (MiMo), content_filter |
| Intelligent model routing | ❌ | ✅ Auto-selects model tier by prompt complexity |
| Model Adapter architecture | Partial | ✅ 7 adapters + OpenAI-compat bridge, per-adapter apiFormat |
| JSON repair for weak models | ❌ | ✅ Fixes markdown fences, trailing commas, unbalanced brackets |

## Multimodal (MiniMax-exclusive)

| Feature | Claude Code | LegnaCode |
|---------|:-----------:|:---------:|
| AI image generation | ❌ | ✅ MiniMaxImageGenerate |
| AI video generation | ❌ | ✅ MiniMaxVideoGenerate |
| AI speech synthesis | ❌ | ✅ MiniMaxSpeechSynthesize |
| AI music generation | ❌ | ✅ MiniMaxMusicGenerate |
| AI image understanding | ❌ | ✅ MiniMaxVisionDescribe |
| AI web search | ❌ | ✅ MiniMaxWebSearch |
| Multimodal workflow orchestration | ❌ | ✅ Auto-chains multiple tools for complex tasks |
| Multimodal skill packs | ❌ | ✅ 5 built-in skills to guide AI orchestration |

## Memory System

| Feature | Claude Code | LegnaCode |
|---------|:-----------:|:---------:|
| MEMORY.md persistent memory | ✅ ~8K tokens/turn | ✅ Compatible & preserved |
| 4-layer memory stack | ❌ | ✅ L0+L1 only ~800 tokens/turn (88% savings) |
| Vector semantic search | ❌ | ✅ TF-IDF + cosine similarity, <5ms |
| DrawerStore persistence | ❌ | ✅ SQLite + WAL audit log |
| Temporal knowledge graph | ❌ | ✅ Entity-relation + time-validity queries |
| Room auto-classification | ❌ | ✅ 6 categories (facts/decisions/events/...) |
| PreCompact memory saving | ❌ | ✅ Auto-extracts high-value exchanges before compaction |
| Exchange-pair chunking | ❌ | ✅ Q+A pairing + 5-category scored tagging |
| Cross-session search | ❌ | ✅ `/recall` command |
| Memory Provider plugins | ❌ | ✅ Pluggable memory backends |
| Content-hash deduplication | ❌ | ✅ sha256 + 30s window prevents duplicate observations |
| Token economics tracking | ❌ | ✅ discoveryTokens + readTokens per drawer |
| Relevance feedback | ❌ | ✅ Frequently recalled memories get up to +100% boost |
| 90-day time decay | ❌ | ✅ Old memories fade but never fully disappear |
| Privacy tag filtering | ❌ | ✅ `<private>` content auto-redacted before extraction |
| L0/L1/L2 content tiering | ❌ | ✅ Budget-driven degradation (full → summary → one-liner) |
| Cross-session knowledge | ❌ | ✅ Auto-writes `.legna/knowledge.md` on session end |
| Project-local memory | ❌ Global `~/.claude/` | ✅ `<cwd>/.legna/memory/` with auto-migration |

## Context Management

| Feature | Claude Code | LegnaCode |
|---------|:-----------:|:---------:|
| Auto Compact | ✅ | ✅ |
| Micro Compact | ✅ | ✅ |
| History Snip | ✅ | ✅ |
| Tool output pre-pruning | ❌ | ✅ Auto-trims large tool_result payloads |
| Budget pressure injection | ❌ | ✅ Nudges model to wrap up when context >80% |
| Worker thread pool | ❌ | ✅ Offloads large file operations |

## Agent Enhancements

| Feature | Claude Code | LegnaCode |
|---------|:-----------:|:---------:|
| Sub-agent spawning | ✅ | ✅ |
| Team collaboration | ✅ | ✅ |
| RPC subprocess tool execution | ❌ | ✅ UDS RPC, compresses multi-step ops into one inference |
| Autonomous skill detection | ❌ | ✅ Detects repeated patterns, auto-creates SKILL.md |
| Self-evolution loop (Hermes) | ❌ | ✅ Auto-learns corrections, preferences, patterns to memory |
| Background Review Agent | ❌ | ✅ Post-session experience extraction to `.legna/memory/` |
| Nudge system | ❌ | ✅ Counter-driven session learning summary |
| Tool schema export | ❌ | ✅ Anthropic-compatible format |
| Parallel file edit mode | ❌ | ✅ One sub-agent per file + sibling skeletons |
| Code Graph (symbol index) | ❌ | ✅ Regex-based, TS/JS/Python/Go/Rust, incremental mtime |
| Blast radius analysis | ❌ | ✅ `blastRadius()` — files affected if a file changes |
| Caller tracing | ❌ | ✅ `traceCallers()` — who calls this symbol |
| Tool call loop detection | ❌ | ✅ Same (tool, args) 3+ times → blocks |
| Negative feedback detection | ❌ | ✅ Detects frustration, injects strategy-shift hint (EN/ZH/JA) |
| Error file pre-injection | ❌ | ✅ Bash fail → auto-reads files from stderr/compiler output |
| First-read full file | ❌ | ✅ Forces full read on first encounter, prevents fragmented reads |
| Compound engineering | ❌ | ✅ Auto-writes `docs/solutions/`, prefetch searches past learnings |

## User Experience

| Feature | Claude Code | LegnaCode |
|---------|:-----------:|:---------:|
| Verbose mode | Off by default | ✅ On by default |
| Token/Timer display | Shows after 30s | ✅ Shows from second 1 |
| Compact status indicator | ❌ Silent execution | ✅ Displays "Compacting..." |
| Interruption reason display | ❌ Only shows it stopped | ✅ Shows specific interruption reason |
| Output retry indicator | ❌ Silent retry | ✅ Shows retry progress |
| Tool execution log | ❌ | ✅ Tool name + queue depth |
| Apple Terminal notifications | ❌ Inverted logic bug | ✅ Fixed |
| Pangu CJK spacing | ❌ | ✅ Auto-inserts spaces between CJK and ASCII in markdown |
| `/undo` command | ❌ | ✅ Reverts last file edit (Edit/Write), max 20 entries |
| Workflow engine | ❌ Raw markdown only | ✅ Structured steps with checks, retry, dependencies |
| Project-local plans | ❌ Global `~/.claude/plans/` | ✅ `<cwd>/.legna/plans/` |

## Configuration & Deployment

| Feature | Claude Code | LegnaCode |
|---------|:-----------:|:---------:|
| Global config directory | `~/.claude/` | `~/.legna/` (auto-migrated) |
| WebUI admin panel | ❌ | ✅ `legna admin` |
| WebUI chat viewer | ❌ | ✅ Session replay with thinking/tool call visualization |
| WebUI live chat | ❌ | ✅ SSE streaming chat for API connectivity testing (single-turn only) |
| Config migration tool | ❌ | ✅ `legna migrate` |
| MiniMax authentication | ❌ | ✅ `/auth-minimax` |
| Pure TS syntax highlighting | ❌ Requires native modules | ✅ Zero native dependencies |
| Official registry install | — | ✅ `--registry=https://registry.npmjs.org` |

## Platform Support

| Platform | Claude Code | LegnaCode |
|----------|:-----------:|:---------:|
| macOS arm64 | ✅ | ✅ |
| macOS x64 | ✅ | ✅ |
| Linux x64 | ✅ | ✅ |
| Linux arm64 | ✅ | ✅ |
| Windows x64 | ✅ | ✅ |

---

> LegnaCode maintains full compatibility with the Claude Code upstream. All original features work as expected. Enhancements are non-invasive by design and do not affect existing workflows.
