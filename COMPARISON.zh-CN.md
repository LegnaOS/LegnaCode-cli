# LegnaCode vs Claude Code 功能对比

> LegnaCode 基于 Claude Code 上游项目，在保持完全兼容的基础上进行了深度增强。以下是两者的详细对比。

## 核心能力

| 能力 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| 终端 AI 编程助手 | ✅ | ✅ |
| 45+ 内置工具 | ✅ | ✅ |
| MCP 协议支持 | ✅ | ✅ |
| 多 Agent 协作 | ✅ | ✅ |
| 插件与技能系统 | ✅ | ✅ |
| Git 工作流管理 | ✅ | ✅ |

## 模型与后端

| 能力 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| Anthropic API | ✅ | ✅ |
| AWS Bedrock | ✅ | ✅ |
| GCP Vertex | ✅ | ✅ |
| Azure OpenAI | ❌ | ✅ |
| MiniMax 深度原生兼容 | ❌ | ✅ 6 个多模态工具自动注册 |
| OpenAI 兼容流式桥接 | ❌ | ✅ 完整 SSE→Anthropic 事件转换，支持 tool_calls/reasoning_content |
| API 格式自动检测 | ❌ | ✅ URL 推断：`/anthropic` 后缀走 Anthropic SDK，否则走 OpenAI fetch |
| `apiFormat` 设置 | ❌ | ✅ 每个 profile 可强制 Anthropic 或 OpenAI，或自动检测 |
| DeepSeek / Qwen / GLM / Kimi / MiMo | ❌ | ✅ 7 个专用适配器，双端点（Anthropic + OpenAI） |
| reasoning_content 回传 | ❌ | ✅ 自动提取 thinking blocks 用于 DeepSeek/Kimi/MiMo 多轮对话 |
| MiniMax reasoning_details | ❌ | ✅ 数组格式 thinking 内容（OpenAI 流式） |
| Provider 特有终止原因 | ❌ | ✅ sensitive（GLM）、repetition_truncation（MiMo）、content_filter |
| 智能模型路由 | ❌ | ✅ 按 prompt 复杂度自动选模型层 |
| Model Adapter 架构 | 部分 | ✅ 7 个适配器 + OpenAI 兼容桥接，per-adapter apiFormat |
| 弱模型 JSON 修复 | ❌ | ✅ 修复 markdown 围栏、尾逗号、不平衡括号 |

## 多模态能力（MiniMax 模型专属）

| 能力 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| AI 图像生成 | ❌ | ✅ MiniMaxImageGenerate |
| AI 视频生成 | ❌ | ✅ MiniMaxVideoGenerate |
| AI 语音合成 | ❌ | ✅ MiniMaxSpeechSynthesize |
| AI 音乐生成 | ❌ | ✅ MiniMaxMusicGenerate |
| AI 图像理解 | ❌ | ✅ MiniMaxVisionDescribe |
| AI 网页搜索 | ❌ | ✅ MiniMaxWebSearch |
| 多模态工作流编排 | ❌ | ✅ 自动串联多个工具完成复杂任务 |
| 多模态 Skill 包 | ❌ | ✅ 5 个内置 skill 指导 AI 编排 |

## 记忆系统

| 能力 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| MEMORY.md 持久记忆 | ✅ ~8K token/轮 | ✅ 兼容保留 |
| 4 层记忆栈 | ❌ | ✅ L0+L1 仅 ~800 token/轮（节省 88%） |
| 向量语义搜索 | ❌ | ✅ TF-IDF + 余弦相似度，<5ms |
| DrawerStore 持久化 | ❌ | ✅ SQLite + WAL 审计日志 |
| 时序知识图谱 | ❌ | ✅ 实体-关系 + 时间有效期查询 |
| Room 自动分类 | ❌ | ✅ 6 类（facts/decisions/events/...） |
| PreCompact 记忆保存 | ❌ | ✅ 压缩前自动提取高价值交换对 |
| 交换对分块 | ❌ | ✅ Q+A 配对 + 5 类标记评分 |
| 跨会话搜索 | ❌ | ✅ `/recall` 命令 |
| Memory Provider 插件 | ❌ | ✅ 可插拔记忆后端 |
| Content-hash 去重 | ❌ | ✅ sha256 + 30 秒窗口防止重复观察 |
| Token 经济学追踪 | ❌ | ✅ 每个 drawer 记录发现成本 + 召回成本 |
| 使用反馈 | ❌ | ✅ 频繁召回的记忆权重最多提升 100% |
| 90 天时间衰减 | ❌ | ✅ 旧记忆渐隐但不消失 |
| 隐私标签过滤 | ❌ | ✅ `<private>` 内容自动脱敏 |
| L0/L1/L2 内容分级 | ❌ | ✅ 预算驱动降级（全文→摘要→一句话） |
| 跨会话知识持久化 | ❌ | ✅ 会话结束自动写 `.legna/knowledge.md` |
| 项目本地记忆 | ❌ 全局 `~/.claude/` | ✅ `<cwd>/.legna/memory/` 自动迁移 |

## 上下文管理

| 能力 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| Auto Compact | ✅ | ✅ |
| Micro Compact | ✅ | ✅ |
| History Snip | ✅ | ✅ |
| 工具输出预剪枝 | ❌ | ✅ 大型 tool_result 自动裁剪 |
| 预算压力注入 | ❌ | ✅ context >80% 时引导模型收尾 |
| Worker 线程池 | ❌ | ✅ 大文件操作 offload |

## Agent 增强

| 能力 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| 子 Agent 派生 | ✅ | ✅ |
| 团队协作 | ✅ | ✅ |
| RPC 子进程工具执行 | ❌ | ✅ UDS RPC，多步操作压缩为一次推理 |
| 自主技能检测 | ❌ | ✅ 检测重复模式，自动创建 SKILL.md |
| 自我进化闭环（Hermes） | ❌ | ✅ 自动学习纠正、偏好、模式并写入记忆 |
| 后台审查 Agent | ❌ | ✅ 会话结束后自动提取经验到 `.legna/memory/` |
| Nudge 系统 | ❌ | ✅ 计数器驱动的会话学习摘要 |
| 工具 Schema 导出 | ❌ | ✅ Anthropic 兼容格式 |
| 并行文件编辑模式 | ❌ | ✅ 每文件一个子代理 + 兄弟文件骨架 |
| 代码图谱（符号索引） | ❌ | ✅ 正则提取，TS/JS/Python/Go/Rust，增量 mtime |
| 爆炸半径分析 | ❌ | ✅ `blastRadius()` — 文件变更影响范围 |
| 调用者追踪 | ❌ | ✅ `traceCallers()` — 谁调用了这个符号 |
| 工具调用循环检测 | ❌ | ✅ 同 (tool, args) 3+ 次 → 阻断 |
| 负面反馈检测 | ❌ | ✅ 检测挫败感，注入策略转换提示（EN/ZH/JA） |
| 错误文件预注入 | ❌ | ✅ bash 失败 → 自动读取 stderr/编译器输出中的文件 |
| 首次读取强制全文 | ❌ | ✅ 首次读文件忽略 offset/limit，防止分段读取 |
| Compound engineering | ❌ | ✅ 自动写 `docs/solutions/`，prefetch 搜索历史经验 |

## 用户体验

| 能力 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| verbose 模式 | 默认关闭 | ✅ 默认开启 |
| Token/Timer 显示 | 30 秒后才显示 | ✅ 第 1 秒即显示 |
| Compact 状态提示 | ❌ 静默执行 | ✅ 显示 "Compacting..." |
| 中断原因显示 | ❌ 只显示停了 | ✅ 显示具体中断原因 |
| Output 重试提示 | ❌ 静默重试 | ✅ 显示重试进度 |
| 工具执行日志 | ❌ | ✅ 工具名 + 队列深度 |
| Apple Terminal 通知 | ❌ 逻辑反转 bug | ✅ 已修复 |
| Pangu CJK 间距 | ❌ | ✅ Markdown 渲染时自动在中日韩与 ASCII 之间插空格 |
| `/undo` 命令 | ❌ | ✅ 撤销上一次文件编辑（Edit/Write），最多 20 条 |
| 工作流引擎 | ❌ 原始 markdown | ✅ 结构化步骤 + 检查条件 + 重试 + 依赖 |
| 项目本地计划 | ❌ 全局 `~/.claude/plans/` | ✅ `<cwd>/.legna/plans/` |

## 配置与部署

| 能力 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| 全局配置目录 | `~/.claude/` | `~/.legna/`（自动迁移） |
| WebUI 管理面板 | ❌ | ✅ `legna admin` |
| WebUI 配置文件内联编辑 | ❌ | ✅ 每个 profile 卡片直接编辑，per-file 读写 API |
| WebUI 预设模板 | ❌ | ✅ 7 家 Provider 预设（DeepSeek/Kimi/GLM/Qwen/MiniMax/MiMo/Anthropic） |
| WebUI 聊天查看器 | ❌ | ✅ 会话回放，支持思维链/工具调用可视化 |
| WebUI 实时聊天 | ❌ | ✅ SSE 流式聊天，用于 API 连通性测试（仅单轮对话） |
| Kiro Gateway 优化 | ❌ | ✅ 客户端历史压缩（thinking/tool_result/schema） |
| 配置迁移工具 | ❌ | ✅ `legna migrate` |
| MiniMax 认证 | ❌ | ✅ `/auth-minimax` |
| 纯 TS 语法高亮 | ❌ 依赖原生模块 | ✅ 零原生依赖 |
| 官方源安装 | — | ✅ `--registry=https://registry.npmjs.org` |

## 平台支持

| 平台 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| macOS arm64 | ✅ | ✅ |
| macOS x64 | ✅ | ✅ |
| Linux x64 | ✅ | ✅ |
| Linux arm64 | ✅ | ✅ |
| Windows x64 | ✅ | ✅ |

---

> LegnaCode 保持与 Claude Code 上游的完全兼容，所有原版功能均可正常使用。增强功能为非侵入式设计，不影响现有工作流。
