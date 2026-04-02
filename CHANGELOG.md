# Changelog

All notable changes to LegnaCode CLI will be documented in this file.

## [1.0.3] - 2026-04-02

### New Features

- **COMMIT_ATTRIBUTION** — 追踪每次 commit 中 Claude 的贡献比例，PR 描述自动附加归因 trailer
- **AWAY_SUMMARY** — 用户离开后返回时显示期间发生的摘要
- **COMPACTION_REMINDERS** — 上下文压缩时的效率提醒
- **HOOK_PROMPTS** — 允许 hooks 向用户请求输入
- **BASH_CLASSIFIER** — Shell 命令安全分类器
- **EXTRACT_MEMORIES** — 自动从对话中提取持久化记忆
- **SHOT_STATS** — 会话统计面板
- **PROMPT_CACHE_BREAK_DETECTION** — 检测 prompt cache 失效
- **ULTRATHINK** — 深度思考模式
- **MCP_RICH_OUTPUT** — MCP 工具富文本输出
- **CONNECTOR_TEXT** — 连接器文本增强
- **NATIVE_CLIPBOARD_IMAGE** — 原生剪贴板图片支持
- **NEW_INIT** — 改进的项目初始化流程
- **DUMP_SYSTEM_PROMPT** — 调试用 system prompt 导出
- **BREAK_CACHE_COMMAND** — `/break-cache` 命令
- **BUILTIN_EXPLORE_PLAN_AGENTS** — 内置 Explore/Plan Agent

### Infrastructure

- 新增 `src/utils/attributionHooks.ts`、`attributionTrailer.ts`、`postCommitAttribution.ts` 三个归因模块

## [1.0.2] - 2026-04-02

### New Features

- **QUICK_SEARCH** — 全屏模式下 `Ctrl+P` 快速打开文件，`Ctrl+Shift+F` 全局符号/内容搜索
- **MESSAGE_ACTIONS** — 全屏模式下对消息进行复制、编辑、重试等操作
- **FORK_SUBAGENT** — `/fork <directive>` 会话分叉，子 Agent 继承完整对话上下文并行执行任务
- **HISTORY_PICKER** — `Ctrl+R` 弹出历史搜索对话框，替代原有的内联搜索

### Infrastructure

- 新增 `src/commands/fork/` 命令模块和 `UserForkBoilerplateMessage` UI 组件

## [1.0.1] - 2026-04-02

### New Features

- **BUDDY 虚拟宠物伴侣** — `/buddy hatch` 孵化专属编程宠物，18 种物种、5 种稀有度、随机属性
  - `/buddy hatch` 孵化 · `/buddy pet` 摸摸 · `/buddy stats` 属性 · `/buddy release` 放生
  - 宠物根据对话上下文用可爱中文冒泡评论，支持多语言自动切换
  - 放生后重新孵化会得到不同的宠物（generation 计数器）
- **TOKEN_BUDGET** — 提示中使用 `+500k` 或 `use 2M tokens` 设定 token 预算，自动追踪用量
- **STREAMLINED_OUTPUT** — 环境变量 `CLAUDE_CODE_STREAMLINED_OUTPUT=true` 启用精简输出

### Fixes

- **构建系统 Feature Flags 修复** — `scripts/build.ts` 现在正确读取 `bunfig.toml` 的 `[bundle.features]` 并传递给 `Bun.build()` API，此前所有 `feature()` 调用默认为 `false`

### Infrastructure

- 新增 `scripts/compile.ts` 替代裸 `bun build --compile`，确保编译二进制正确应用 feature flags
- 新增 `src/buddy/companionObserver.ts` 上下文感知的宠物反应系统
- 新增 `src/commands/buddy/` 完整命令模块

## [1.0.0] - 2026-03-31

- Initial release: LegnaCode CLI v1.0.0
- 基于 Claude Code CLI 开源版本构建
- 品牌适配与定制化改造
