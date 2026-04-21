# LegnaCode vs OpenAI Codex CLI 功能对比

🌐 [English](./COMPARISON-CODEX.md)

> LegnaCode v1.8.0 全面融合了 Codex CLI 的能力，同时保持自身优势。标记 `[Codex]` 的功能源自 Codex 融合路线图。

## 安全

| 功能 | Codex CLI | LegnaCode |
|------|:---------:|:---------:|
| 内核级沙箱 | ✅ Seatbelt + bwrap + seccomp + Landlock | ✅ `[Codex]` Seatbelt + seccomp + 容器降级 |
| 静态执行策略 | ✅ Starlark-like DSL | ✅ `[Codex]` TOML 规则（prefix/glob/regex） |
| 自动审批代理 | ✅ codex-auto-review 模型 | ✅ `[Codex]` Guardian 子代理（6 类风险分类） |
| 进程硬化 | ✅ core dump + ptrace + env 清理 | ✅ `[Codex]` 等价实现 |
| Shell 升级协议 | ✅ sandbox/escalate/deny | ✅ `[Codex]` sandbox/escalate/deny 三级 |
| 网络策略 | ✅ HTTP+SOCKS5 代理，MITM HTTPS | ✅ `[Codex]` 域名白名单/黑名单，3 种模式，审计日志 |
| 密钥检测 | ✅ 分阶段去重 | ✅ `[Codex]` 正则模式 + 记忆管线自动脱敏 |

## 记忆与上下文

| 功能 | Codex CLI | LegnaCode |
|------|:---------:|:---------:|
| 记忆系统 | ✅ 两阶段 rollout + SQLite + 水印 | ✅ 4 层栈 + 向量搜索 + SQLite + 知识图谱 |
| 跨会话搜索 | ❌ | ✅ `/recall` 命令 |
| 时序知识图谱 | ❌ | ✅ 实体-关系 + 时间有效性查询 |
| 内容分层 | ❌ | ✅ L0/L1/L2 预算驱动降级 |
| Token ROI 排序 | ❌ | ✅ `[Codex]` 召回次数与成本比排序 |
| 两阶段唤醒填充 | ❌ | ✅ `[Codex]` 贪心 L1 + L0 回填 |

## 协作与交互

| 功能 | Codex CLI | LegnaCode |
|------|:---------:|:---------:|
| 协作模式 | ✅ default/plan/execute/pair | ✅ `[Codex]` 4 种内置 + 自定义 `.md` 模板 |
| JS REPL | ✅ 持久 Node 内核 + `codex.tool()` | ✅ `[Codex]` 公开 + `legnacode` 桥接对象 |
| IDE 协议 | ✅ JSON-RPC 2.0（stdio + WebSocket） | ✅ `[Codex]` JSON-RPC 2.0（stdio + WebSocket） |
| 多代理 | ✅ spawn/send/wait/close + AgentRegistry | ✅ Coordinator + TeamCreate + tmux 集成 |
| 语音输入 | ✅ WebRTC + WebSocket 实时 | ✅ STT（voice_stream） |
| 语音输出（TTS） | ❌ | ✅ `[Codex]` 原生后端（macOS `say`、Linux `espeak`） |
| WebRTC 传输 | ✅ | ✅ `[Codex]` 双向音频传输 |

## 模型与后端

| 功能 | Codex CLI | LegnaCode |
|------|:---------:|:---------:|
| OpenAI API | ✅ | ✅ 通过 OpenAI 兼容桥接 |
| Anthropic API | ❌ | ✅ 原生支持 |
| AWS Bedrock | ✅ | ✅ |
| Ollama / LM Studio | ✅ | ✅ 通过 OpenAI 兼容桥接 |
| MiniMax 多模态 | ❌ | ✅ 6 个原生工具（图像/视频/语音/音乐/视觉/搜索） |
| 模型适配器架构 | ❌ | ✅ 8 个适配器（DeepSeek/GLM/Kimi/MiMo/MiniMax/Qwen 等） |
| 智能模型路由 | ❌ | ✅ 按提示复杂度自动选择模型层级 |

## 插件与 Skills

| 功能 | Codex CLI | LegnaCode |
|------|:---------:|:---------:|
| 插件系统 | ✅ `.codex-plugin/plugin.json` | ✅ 市场 + `[Codex]` Codex 插件适配器 |
| Skills | ✅ SKILL.md（YAML frontmatter） | ✅ SKILL.md + `[Codex]` Codex 格式自动发现 |
| MCP | ✅ 客户端 + 服务端 | ✅ 客户端 + 服务端 |
| Hooks | ✅ 6 个生命周期事件 | ✅ 6 个生命周期事件 |
| 配置迁移 | ❌ | ✅ `[Codex]` `/migrate` 从 Codex/Cursor/Copilot 导入 |

## SDK

| 功能 | Codex CLI | LegnaCode |
|------|:---------:|:---------:|
| TypeScript SDK | ✅ | ✅ `[Codex]` `@legna/legnacode-sdk`，含 `Codex` 别名 |
| Python SDK | ✅ | ✅ `[Codex]` `legnacode-sdk`，含 `Codex` 别名 |
| 结构化输出 | ✅ | ✅ `[Codex]` JSON Schema + Zod 支持 |

## 性能与平台

| 功能 | Codex CLI | LegnaCode |
|------|:---------:|:---------:|
| 核心语言 | Rust（70+ crate） | TypeScript + `[Codex]` Rust NAPI addon（可选） |
| 原生加速 | ✅ 全 Rust | ✅ `[Codex]` cosine/tfidf/hash/tokens（约 10-50 倍，含降级） |
| macOS arm64 / x64 | ✅ | ✅ |
| Linux x64 / arm64 | ✅ | ✅ |
| Windows x64 | ✅ | ✅ |
| Rollback | ✅ 内置 | ✅ `[Codex]` 时间线 + dry-run + 安全模式 |

## 配置兼容

| 功能 | Codex CLI | LegnaCode |
|------|:---------:|:---------:|
| `~/.codex/config.toml` | ✅ 原生 | ✅ `[Codex]` 作为降级设置自动导入 |
| `~/.codex/skills/` | ✅ 原生 | ✅ `[Codex]` 自动发现 |
| Codex 插件格式 | ✅ 原生 | ✅ `[Codex]` 自动转换为 LegnaCode 格式 |
| 双向导出 | ❌ | ✅ `[Codex]` 导出 LegnaCode 配置为 Codex TOML |

---

## 从 Codex 迁移

```bash
# 自动导入 Codex 配置、MCP 服务器、skills
legna migrate --agents

# 或者直接启动 — ~/.codex/config.toml 会被自动检测
legna
```

> LegnaCode 自动读取 `~/.codex/config.toml`、发现 `~/.codex/skills/`、检测项目目录中的 `codex-plugin.json`，并在 SDK 中提供 `Codex` 别名实现无缝替换。
