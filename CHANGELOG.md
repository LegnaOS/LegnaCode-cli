# Changelog

All notable changes to LegnaCode CLI will be documented in this file.

## [1.1.8] - 2026-04-03

### Fixed

- **Windows npm 全局安装平台包缺失** — bin wrapper 检测到平台包未安装时自动执行 `npm install -g` 安装对应平台包，不再需要用户手动操作
- **bin wrapper 路径查找优化** — 修正全局 node_modules 扁平布局下 scope 目录的路径拼接

## [1.1.7] - 2026-04-03

### Fixed

- **彻底修复 Windows external module 报错** — 清空编译 external 列表，所有 stubs 模块（`@ant/*`、`@anthropic-ai/*`、native napi）全部打包进二进制，不再依赖运行时外部模块

## [1.1.6] - 2026-04-03

### Fixed

- **Windows external module 报错** — 从编译 external 列表移除 `@anthropic-ai/sandbox-runtime`、`@anthropic-ai/mcpb`、`@anthropic-ai/claude-agent-sdk`、`audio-capture-napi`、`color-diff-napi`、`modifiers-napi`，让 stubs 代码直接打包进二进制，Windows 不再报 `Cannot find module`
- **bin wrapper 多路径查找** — `npm/bin/legna.cjs` 增加全局 node_modules 扁平路径和嵌套路径 fallback，提升跨平台 npm 全局安装兼容性
- **版本号自动化** — 新增 `scripts/bump.ts` 一键同步 package.json、bunfig.toml、webui/package.json、optionalDependencies 版本号
- **发版流程自动化** — 重写 `scripts/publish.ts`，一键完成 bump → build webui → compile all → publish npm

## [1.1.5] - 2026-04-03

### New Features

- **WebUI 管理面板** — `legna admin` 启动浏览器管理面板（HTTP server + React SPA，默认端口 3456），可视化管理 `~/.claude/` 和 `~/.legna/` 两个配置目录
- **配置编辑** — 在浏览器中编辑 API 端点、API Key、模型映射（Opus/Sonnet/Haiku）、超时、权限模式、语言等所有 settings.json 字段
- **配置文件切换** — 列出 settings*.json，显示 baseUrl/model，一键交换激活
- **会话记录浏览** — 解析 projects 目录下所有 session jsonl 文件，显示项目路径、slug、时间、prompt 数量，复制 resume 命令
- **配置迁移** — Claude ↔ LegnaCode 双向迁移，支持全量或选择性字段迁移（env/model/permissions 等），迁移前预览 diff
- **npm 全平台发布** — bin wrapper (.cjs)、compile-all 跨平台编译（darwin/linux/win32）、publish 脚本
- **OAuth 禁用** — `isAnthropicAuthEnabled()` 返回 false，移除 OAuth 登录流程

### Fixed (1.1.1 ~ 1.1.5)

- bin wrapper 改为 `.cjs` 修复 ESM `require` 报错
- `optionalDependencies` 平台包版本对齐
- 退出 admin server 时清屏恢复终端
- WebUI 前端内联到二进制，不再依赖外部 `webui/dist/`
- 所有包版本统一为 1.1.5

### Architecture

- 后端：`src/server/admin.ts` — Bun.serve REST API，SPA 内联为字符串常量
- 前端：`webui/` — React 18 + Vite + Tailwind SPA，Tab 切换 scope
- 内联：`scripts/inline-webui.ts` → `src/server/admin-ui-html.ts`
- CLI：`src/entrypoints/cli.tsx` — `admin` fast-path，零额外模块加载

## [1.0.9] - 2026-04-03

### New Features

- **i18n 多语言补全** — 补全 9 个文件约 100 处遗漏的硬编码英文字符串，覆盖 Spinner、队友树、pill 标签、快捷键提示、Tips 等全部 UI 区域
- **内置精美状态栏** — 无需配置外部脚本，默认显示目录、Git 分支/同步状态、模型名（智能解析为友好名）、彩色上下文进度条、时间；跨平台兼容 Win/Mac/Linux
- **配置自动迁移** — 启动时自动将 `~/.claude/settings.json` 同步到 `~/.legna/settings.json`；两边不一致时打印警告不覆盖；`LEGNA_NO_CONFIG_SYNC=1` 禁止迁移

### Changed

- `~/.legna/` 为首选配置目录，`~/.claude/` 作为兼容回退
- 状态栏模型名自动解析：`Claude-Opus-4-6-Agentic[1m]` → `Opus 4.6`
- `KeyboardShortcutHint` 组件中 "to" 连接词已国际化（中文显示为 "→"）

### Files Changed

| 文件 | 改动 |
|------|------|
| `src/utils/i18n/zh.ts` | +50 条翻译条目 |
| `src/components/Spinner.tsx` | 7 处 i18n |
| `src/components/PromptInput/PromptInputFooterLeftSide.tsx` | 4 处 i18n |
| `src/components/design-system/KeyboardShortcutHint.tsx` | "to" 国际化 |
| `src/components/Spinner/teammateSelectHint.ts` | i18n |
| `src/components/Spinner/TeammateSpinnerTree.tsx` | 6 处 i18n |
| `src/components/Spinner/TeammateSpinnerLine.tsx` | 7 处 i18n |
| `src/tasks/pillLabel.ts` | 全部 pill 标签 i18n |
| `src/services/tips/tipRegistry.ts` | 25 条 tips i18n |
| `src/utils/builtinStatusLine.ts` | 新增：内置状态栏渲染器 |
| `src/components/StatusLine.tsx` | 集成内置状态栏 |
| `src/utils/envUtils.ts` | 配置自动迁移逻辑 |

## [1.0.8] - 2026-04-02

### New Features

- **MONITOR_TOOL** — MCP 服务器健康监控工具，支持 start/stop/status 操作，后台定期 ping 检测连接状态
- **WORKFLOW_SCRIPTS** — 工作流自动化系统，读取 `.claude/workflows/*.md` 执行多步骤工作流，`/workflows` 命令列出可用工作流
- **HISTORY_SNIP** — 会话历史裁剪，模型可主动调用 SnipTool 移除旧消息释放上下文，`/force-snip` 强制裁剪，UI 保留完整历史而模型视图过滤

### Infrastructure

- 新增 `src/tools/MonitorTool/MonitorTool.ts` — MCP 监控工具（buildTool 构建）
- 新增 `src/tasks/MonitorMcpTask/MonitorMcpTask.ts` — 监控后台任务生命周期管理
- 新增 `src/components/permissions/MonitorPermissionRequest/` — 监控权限 UI
- 新增 `src/components/tasks/MonitorMcpDetailDialog.tsx` — 监控任务详情对话框
- 新增 `src/tools/WorkflowTool/WorkflowTool.ts` — 工作流执行工具
- 新增 `src/tools/WorkflowTool/createWorkflowCommand.ts` — 工作流命令扫描与注册
- 新增 `src/tools/WorkflowTool/bundled/index.ts` — 内置工作流注册入口
- 新增 `src/tools/WorkflowTool/WorkflowPermissionRequest.tsx` — 工作流权限 UI
- 新增 `src/commands/workflows/` — `/workflows` 斜杠命令
- 新增 `src/tasks/LocalWorkflowTask/LocalWorkflowTask.ts` — 工作流后台任务（kill/skip/retry）
- 新增 `src/components/tasks/WorkflowDetailDialog.tsx` — 工作流详情对话框
- 新增 `src/services/compact/snipCompact.ts` — 裁剪触发逻辑（重写 stub）
- 新增 `src/services/compact/snipProjection.ts` — 模型视图消息过滤
- 新增 `src/tools/SnipTool/SnipTool.ts` — 模型调用的裁剪工具
- 新增 `src/tools/SnipTool/prompt.ts` — SnipTool 常量与 prompt
- 新增 `src/commands/force-snip.ts` — `/force-snip` 斜杠命令
- 新增 `src/components/messages/SnipBoundaryMessage.tsx` — 裁剪边界 UI 组件
- 3 个 feature flags 翻转：MONITOR_TOOL、WORKFLOW_SCRIPTS、HISTORY_SNIP
- 累计已开启 47/87 个 feature flags

## [1.0.7] - 2026-04-02

### New Features

- **TERMINAL_PANEL** — `Alt+J` 切换内置终端面板（tmux 持久化），TerminalCapture 工具可读取终端内容
- **WEB_BROWSER_TOOL** — 内置 Web 浏览工具，fetch 抓取网页内容并提取文本
- **TEMPLATES** — 结构化工作流模板系统，`legna new/list/reply` CLI 命令，job 状态追踪
- **BG_SESSIONS** — 后台会话管理，`legna ps/logs/attach/kill/--bg`，tmux 持久化 + PID 文件发现

### Infrastructure

- 新增 `src/tools/TerminalCaptureTool/` — tmux capture-pane 工具（2 文件）
- 新增 `src/tools/WebBrowserTool/WebBrowserTool.ts` — fetch + HTML 文本提取
- 新增 `src/jobs/classifier.ts` — 工作流 turn 分类器
- 新增 `src/cli/handlers/templateJobs.ts` — 模板 CLI 处理器
- 新增 `src/cli/bg.ts` — 后台会话 CLI（5 个 handler）
- 新增 `src/utils/taskSummary.ts` — 周期性活动摘要
- 新增 `src/utils/udsClient.ts` — 活跃会话枚举
- 累计已开启 44/87 个 feature flags

## [1.0.6] - 2026-04-02

### New Features

- **CACHED_MICROCOMPACT** — 缓存感知的工具结果压缩，通过 API cache_edits 指令删除旧 tool_result 而不破坏 prompt cache
- **AGENT_TRIGGERS** — `/loop` cron 调度命令 + CronCreate/Delete/List 工具，本地定时任务引擎
- **TREE_SITTER_BASH** — 纯 TypeScript bash AST 解析器（~4300 行），用于命令安全分析
- **TREE_SITTER_BASH_SHADOW** — tree-sitter 与 legacy 解析器的 shadow 对比模式
- **MCP_SKILLS** — 从 MCP 服务器 `skill://` 资源自动发现并注册技能命令
- **REACTIVE_COMPACT** — 413/过载错误时自动触发上下文压缩
- **REVIEW_ARTIFACT** — `/review` 代码审查技能 + ReviewArtifact 工具

### Infrastructure

- 重写 `src/services/compact/cachedMicrocompact.ts`（从 stub 到 150+ 行完整实现）
- 新增 `src/services/compact/cachedMCConfig.ts` — 同步配置模块
- 新增 `CACHE_EDITING_BETA_HEADER` 到 `src/constants/betas.ts`
- 新增 `src/skills/mcpSkills.ts`、`src/services/compact/reactiveCompact.ts`
- 新增 `src/tools/ReviewArtifactTool/`、`src/skills/bundled/hunter.ts`
- 累计已开启 40/87 个 feature flags

## [1.0.5] - 2026-04-02

### New Features

- **AGENT_TRIGGERS** — `/loop` cron 调度命令，CronCreate/Delete/List 工具，本地定时任务引擎
- **TREE_SITTER_BASH** — 纯 TypeScript bash AST 解析器，用于命令安全分析
- **TREE_SITTER_BASH_SHADOW** — tree-sitter 与 legacy 解析器的 shadow 对比模式
- **MCP_SKILLS** — 从 MCP 服务器的 `skill://` 资源自动发现并注册技能命令
- **REACTIVE_COMPACT** — 413/过载错误时自动触发上下文压缩
- **REVIEW_ARTIFACT** — `/review` 代码审查技能 + ReviewArtifact 工具 + 权限 UI

### Infrastructure

- 新增 `src/skills/mcpSkills.ts` — MCP 技能发现模块
- 新增 `src/services/compact/reactiveCompact.ts` — 响应式压缩策略
- 新增 `src/tools/ReviewArtifactTool/` — 代码审查工具
- 新增 `src/components/permissions/ReviewArtifactPermissionRequest/` — 审查权限 UI
- 新增 `src/skills/bundled/hunter.ts` — /review 技能注册
- 累计已开启 39/87 个 feature flags

## [1.0.4] - 2026-04-02

### New Features

- **ULTRAPLAN** — `/ultraplan` 结构化多步骤规划命令
- **VERIFICATION_AGENT** — 批量任务完成后自动派生验证 Agent
- **AUTO_THEME** — 通过 OSC 11 查询终端背景色自动切换深色/浅色主题
- **AGENT_MEMORY_SNAPSHOT** — Agent 记忆快照
- **FILE_PERSISTENCE** — 文件持久化追踪
- **POWERSHELL_AUTO_MODE** — PowerShell 自动模式
- **HARD_FAIL** — 严格错误模式
- **SLOW_OPERATION_LOGGING** — 慢操作日志
- **UNATTENDED_RETRY** — 无人值守重试
- **ALLOW_TEST_VERSIONS** — 允许测试版本

### Infrastructure

- 新增 `src/utils/systemThemeWatcher.ts` — OSC 11 终端主题检测与实时监听
- 累计已开启 33/87 个 feature flags

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
