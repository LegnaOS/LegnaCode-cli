# LegnaCode vs OpenAI Codex CLI

🌐 [中文文档](./COMPARISON-CODEX.zh-CN.md)

> LegnaCode v1.8.0 fully integrates Codex CLI capabilities while maintaining its own advantages. Features marked with `[Codex]` originated from the Codex fusion roadmap.

## Security

| Feature | Codex CLI | LegnaCode |
|---------|:---------:|:---------:|
| Kernel-level sandbox | ✅ Seatbelt + bwrap + seccomp + Landlock | ✅ `[Codex]` Seatbelt + seccomp + container fallback |
| Static exec policy | ✅ Starlark-like DSL | ✅ `[Codex]` TOML rules (prefix/glob/regex) |
| Auto-approval agent | ✅ codex-auto-review model | ✅ `[Codex]` Guardian sub-agent (6-category risk taxonomy) |
| Process hardening | ✅ core dump + ptrace + env sanitize | ✅ `[Codex]` Equivalent |
| Shell escalation protocol | ✅ sandbox/escalate/deny | ✅ `[Codex]` sandbox/escalate/deny 3-tier |
| Network policy | ✅ HTTP+SOCKS5 proxy, MITM HTTPS | ✅ `[Codex]` Domain allowlist/denylist, 3 modes, audit log |
| Secret detection | ✅ Phase-based with dedup | ✅ `[Codex]` Regex patterns + auto-redact in memory pipeline |

## Memory & Context

| Feature | Codex CLI | LegnaCode |
|---------|:---------:|:---------:|
| Memory system | ✅ 2-phase rollout + SQLite + watermark | ✅ 4-layer stack + vector search + SQLite + knowledge graph |
| Cross-session search | ❌ | ✅ `/recall` command |
| Temporal knowledge graph | ❌ | ✅ Entity-relation + time-validity queries |
| Content tiering | ❌ | ✅ L0/L1/L2 budget-driven degradation |
| Token ROI ranking | ❌ | ✅ `[Codex]` Recall-to-cost ratio ranking |
| Two-pass wake-up | ❌ | ✅ `[Codex]` Greedy L1 + L0 backfill |

## Collaboration & Interaction

| Feature | Codex CLI | LegnaCode |
|---------|:---------:|:---------:|
| Collaboration modes | ✅ default/plan/execute/pair | ✅ `[Codex]` 4 built-in + custom `.md` templates |
| JS REPL | ✅ Persistent Node kernel + `codex.tool()` | ✅ `[Codex]` Public with `legnacode` bridge object |
| IDE protocol | ✅ JSON-RPC 2.0 (stdio + WebSocket) | ✅ `[Codex]` JSON-RPC 2.0 (stdio + WebSocket) |
| Multi-agent | ✅ spawn/send/wait/close + AgentRegistry | ✅ Coordinator + TeamCreate + tmux integration |
| Voice input | ✅ WebRTC + WebSocket realtime | ✅ STT (voice_stream) |
| Voice output (TTS) | ❌ | ✅ `[Codex]` Native backend (macOS `say`, Linux `espeak`) |
| WebRTC transport | ✅ | ✅ `[Codex]` Bidirectional audio transport |

## Models & Backends

| Feature | Codex CLI | LegnaCode |
|---------|:---------:|:---------:|
| OpenAI API | ✅ | ✅ Via OpenAI-compat bridge |
| Anthropic API | ❌ | ✅ Native |
| AWS Bedrock | ✅ | ✅ |
| Ollama / LM Studio | ✅ | ✅ Via OpenAI-compat bridge |
| MiniMax multimodal | ❌ | ✅ 6 native tools (image/video/speech/music/vision/search) |
| Model adapter architecture | ❌ | ✅ 8 adapters (DeepSeek/GLM/Kimi/MiMo/MiniMax/Qwen/etc) |
| Intelligent model routing | ❌ | ✅ Auto-selects model tier by prompt complexity |

## Plugin & Skills

| Feature | Codex CLI | LegnaCode |
|---------|:---------:|:---------:|
| Plugin system | ✅ `.codex-plugin/plugin.json` | ✅ Marketplace + `[Codex]` Codex plugin adapter |
| Skills | ✅ SKILL.md (YAML frontmatter) | ✅ SKILL.md + `[Codex]` Codex format auto-discovery |
| MCP | ✅ Client + Server | ✅ Client + Server |
| Hooks | ✅ 6 lifecycle events | ✅ 6 lifecycle events |
| Config migration | ❌ | ✅ `[Codex]` `/migrate` imports from Codex/Cursor/Copilot |

## SDK

| Feature | Codex CLI | LegnaCode |
|---------|:---------:|:---------:|
| TypeScript SDK | ✅ | ✅ `[Codex]` `@legna/legnacode-sdk` with `Codex` alias |
| Python SDK | ✅ | ✅ `[Codex]` `legnacode-sdk` with `Codex` alias |
| Structured output | ✅ | ✅ `[Codex]` JSON Schema + Zod support |

## Performance & Platform

| Feature | Codex CLI | LegnaCode |
|---------|:---------:|:---------:|
| Core language | Rust (70+ crates) | TypeScript + `[Codex]` Rust NAPI addon (optional) |
| Native acceleration | ✅ Full Rust | ✅ `[Codex]` cosine/tfidf/hash/tokens (~10-50x with fallback) |
| macOS arm64 / x64 | ✅ | ✅ |
| Linux x64 / arm64 | ✅ | ✅ |
| Windows x64 | ✅ | ✅ |
| Rollback | ✅ Built-in | ✅ `[Codex]` Timeline + dry-run + safe mode |

## Config Compatibility

| Feature | Codex CLI | LegnaCode |
|---------|:---------:|:---------:|
| `~/.codex/config.toml` | ✅ Native | ✅ `[Codex]` Auto-import as fallback settings |
| `~/.codex/skills/` | ✅ Native | ✅ `[Codex]` Auto-discovery |
| Codex plugin format | ✅ Native | ✅ `[Codex]` Auto-convert to LegnaCode format |
| Bidirectional export | ❌ | ✅ `[Codex]` Export LegnaCode config to Codex TOML |

---

## Migration from Codex

```bash
# Auto-import Codex config, MCP servers, skills
legna migrate --agents

# Or just start — ~/.codex/config.toml is auto-detected
legna
```

> LegnaCode automatically reads `~/.codex/config.toml`, discovers `~/.codex/skills/`, detects `codex-plugin.json` in project directories, and provides `Codex` alias in SDK for drop-in replacement.
