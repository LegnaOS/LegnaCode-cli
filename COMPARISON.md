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
| 智能模型路由 | ❌ | ✅ 按 prompt 复杂度自动选模型层 |
| Model Adapter 架构 | 部分 | ✅ 完整适配器（MiniMax/Azure/自定义） |

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
| 自主技能检测 | ❌ | ✅ 检测重复模式，提示保存为技能 |
| 工具 Schema 导出 | ❌ | ✅ Anthropic 兼容格式 |

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

## 配置与部署

| 能力 | Claude Code | LegnaCode |
|------|:-----------:|:---------:|
| 全局配置目录 | `~/.claude/` | `~/.legna/`（自动迁移） |
| WebUI 管理面板 | ❌ | ✅ `legna admin` |
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
