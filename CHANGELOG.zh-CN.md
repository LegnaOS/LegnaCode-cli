# Changelog

All notable changes to LegnaCode CLI will be documented in this file.

## [1.4.8] - 2026-04-17

### Features

- **AtomCode 智能融合（Layer A）** — 轻量 Agent 智能增强，零新依赖：
  - **Pangu CJK 间距** — Markdown 渲染时自动在中日韩字符与 ASCII 之间插入空格
  - **负面反馈检测** — 检测挫败信号（"still broken"/"错了"/"まだ壊れ"），注入策略转换提示（EN/ZH/JA）
  - **工具调用循环检测** — 同组合 3+ 次 → 阻断，每次用户消息重置
  - **错误文件预注入** — bash 失败时从 stderr 提取文件路径，自动读取前 30 行注入结果
  - **首次读取强制全文** — 第一次读某文件时忽略 offset/limit，强制全文读取

- **OpenAI 兼容桥接器（Layer B1）** — 完整 Anthropic ↔ OpenAI 格式翻译层：
  - 消息格式：`tool_use` ↔ `tool_calls`，`tool_result` ↔ `role: "tool"`
  - 工具 schema：`input_schema` ↔ `function.parameters`
  - 弱模型 JSON 修复（markdown 围栏、尾逗号、不平衡括号）
  - 支持：OpenAI、DeepSeek、Qwen、GLM、SiliconFlow、Ollama、vLLM、LM Studio
  - 激活：设置 `OPENAI_COMPAT_BASE_URL` + `OPENAI_COMPAT_API_KEY` 环境变量

- **代码图谱（Layer B2）** — 正则符号索引 + 文件依赖图：
  - 语言：TypeScript/TSX、JavaScript、Python、Go、Rust
  - 增量 mtime 更新，持久化到 `<cwd>/.legna/.palace/graph.json`
  - API：`getFileSummary()`、`traceCallers()`、`blastRadius()`

- **并行文件编辑（Layer B3）** — "每文件一个子代理"执行模式：
  - 目标文件全文 + 兄弟文件骨架 + 接口契约
  - 跨并行编辑冲突检测

- **工作流引擎（Layer B4）** — 结构化步骤执行：
  - Markdown `## Step N:` 格式，支持检查条件、失败处理、步骤依赖
  - 状态追踪、重试逻辑、进度摘要

## [1.4.7] - 2026-04-16

### Features

- **claude-mem 记忆智能融合** — 从 claude-mem 持久记忆系统移植 5 项轻量技术到 DrawerStore，零新依赖：
  - **Content-hash 去重** — `sha256(wing + room + content)` + 30 秒窗口，防止快速 compaction 时重复提取
  - **Token 经济学追踪** — 每个 drawer 记录 `discoveryTokens`（创建成本）和 `readTokens`（累计召回成本）
  - **使用反馈** — `relevanceCount` 每次搜索命中递增；频繁召回的记忆权重最多提升 100%
  - **90 天时间衰减** — `max(0.3, 1.0 - age_days / 90)` 应用于搜索相似度和重要性排序，旧记忆渐隐但不消失
  - **隐私标签过滤** — `<private>...</private>` 内容在记忆提取前替换为 `[REDACTED]`，零配置

## [1.4.6] - 2026-04-16

### Bug Fixes

- **OML skill 崩溃修复** — 全部 40 个 OML skill（16 superpowers + 5 orchestrator + 19 agent）的 `getPromptForCommand` 返回 `string` 而非 `ContentBlockParam[]`，导致 `/ultrawork`、`/ralph`、`/autopilot` 等命令报 `result.filter is not a function`。已全部包装为 `Promise<[{ type: 'text', text }]>`。
- **statusline 写入错误配置目录** — statuslineSetup agent 硬编码了 `~/.claude/settings.json`，已修正为 `~/.legna/`。

### Improvements

- **计划文件改为项目本地** — 默认 plan 目录从 `~/.legna/plans/` 改为 `<cwd>/.legna/plans/`，计划文件与项目同在。
- **自动记忆改为项目本地** — 默认 autoMemPath 从 `~/.legna/projects/<slug>/memory/` 改为 `<cwd>/.legna/memory/`。首次启动自动从旧全局路径迁移文件（非破坏性，不覆盖已有文件）。
- **Compound engineering 无感融合** — 从 compound-engineering-plugin 提取知识复利方法论，注入 3 个已有自动化节点，零新命令：
  - `onPreCompress`：高价值交换对自动写入 `docs/solutions/`（通过 `mkdir docs/solutions` 启用）
  - `prefetch`：自动搜索 `docs/solutions/` 中的历史经验
  - `magicKeywords`：deep scope 检测（重构/迁移/架构）追加轻量提示
- **旧路径注释清理** — 更新 memdir、extractMemories、settings types 中的 `~/.claude/projects/` 引用

## [1.4.5] - 2026-04-13

### Features

- **OpenViking 内容分级融合** — 移植 OpenViking 上下文数据库的 L0/L1/L2 三层内容分级：
  - **内容分级** — 每个 drawer 在 upsert 时自动生成 L0（一句话摘要，~25 词）和 L1（核心概览，~200 词），L2 为原文全文
  - **预算感知 wake-up** — `wakeUp()` 接受 token 预算（默认 800），贪心填充 L1 内容，预算不足时降级到 L0
  - **预算封顶召回** — 新增 `recallWithBudget()` 方法：L2→L1→L0 降级策略，确保召回不超字符预算
  - **CJK 感知 token 估算** — `estimateTokens()` 处理中日韩混合文本
  - **SQLite schema 自动迁移** — 旧 DrawerStore 数据库自动 `ALTER TABLE ADD COLUMN`
  - **修复 recallByTopic()** — 传入实际查询进行向量排序，不再传空字符串

## [1.4.4] - 2026-04-11

### Improvements

- **状态提示改为 spinner 行显示** — autocompact / output truncated / interrupted 等状态信息不再以系统消息插入对话，改为在 spinner 动画行临时显示，一闪而过不污染上下文
- **ToolUseContext 新增 setSpinnerMessage** — 通用的 spinner 文本回调，query loop 可随时更新 spinner 状态
- **LegnaCode vs Claude Code 对比文档** — 新增 [COMPARISON.md](./COMPARISON.md)，9 大类 60+ 项逐条对比

## [1.4.3] - 2026-04-11

### Features

- **mempalace 记忆架构融合** — 移植 mempalace 的核心记忆系统，纯 TypeScript 实现，零外部依赖：
  - **DrawerStore** — SQLite 持久化向量记忆存储 + WAL 审计日志，确定性 drawer ID（sha256 幂等 upsert）
  - **TF-IDF 向量化器** — 纯 TS 实现（Porter 词干 + 余弦相似度），<10K drawer 搜索 <5ms
  - **4 层记忆栈** — L0 identity (~100 token) + L1 top drawers (~500-800 token) 每轮加载，L2/L3 按需召回。每轮 token 从 ~8K 降到 ~800（节省 ~88%）
  - **时序知识图谱** — SQLite 实体-关系存储，支持带有效期的三元组和时间点查询
  - **Room 自动分类** — 6 类（facts/decisions/events/discoveries/preferences/advice）关键词评分
  - **交换对提取器** — Q+A 配对分块 + 5 类标记评分（decisions/preferences/milestones/problems/emotional）
  - **自动迁移** — 首次启动自动将现有 .legna/memory/*.md 文件迁移到 DrawerStore
  - **PreCompact 记忆保存** — 压缩前自动提取高价值交换对到 DrawerStore，防止记忆丢失

### Architecture

- 新增 `src/memdir/vectorStore/` — 完整的向量记忆系统（8 个文件）
  - `types.ts` — Drawer、SearchResult、MetadataFilter 类型
  - `tfidfVectorizer.ts` — TF-IDF + Porter 词干 + 余弦相似度
  - `drawerStore.ts` — SQLite 持久化 + WAL + 向量搜索
  - `roomDetector.ts` — 内容自动分类
  - `layeredStack.ts` — 4 层记忆栈
  - `knowledgeGraph.ts` — 时序知识图谱
  - `exchangeExtractor.ts` — 交换对提取 + 标记评分
  - `migration.ts` — .md → DrawerStore 自动迁移
- 升级 `src/memdir/providers/FileMemoryProvider.ts` — DrawerStore + LayeredStack 后端
- 接线 `src/services/compact/autoCompact.ts` — 压缩前调用 onPreCompress

## [1.4.2] - 2026-04-11

### Features

- **verbose 默认开启** — 用户默认看到完整的工具执行过程和进度信息
- **Token/Timer 即时显示** — 去掉 30 秒延迟，token 计数和耗时从第 1 秒就显示
- **Autocompact 状态可见** — 压缩对话时显示 "Compacting conversation context..." 系统消息
- **中断原因可见** — abort 时显示中断原因（streaming 和 tool_execution 两个阶段）
- **Output truncated 重试提示** — max output tokens recovery 时显示重试进度
- **工具执行日志** — StreamingToolExecutor 输出当前工具名和队列深度
- **Microcompact/Snip 日志** — 压缩操作添加 debug 日志
- **ForkedAgent 启动日志** — 子 agent 启动时输出标签和 ID

### Bug Fixes

- **Apple Terminal 通知逻辑修复** — bell 未禁用时才发 bell（之前逻辑反了）

## [1.4.0] - 2026-04-11

### Features

- **MiniMax 深度原生兼容** — 当使用 MiniMax 模型且 `MINIMAX_API_KEY` 配置时，自动注册 6 个多模态原生工具：
  - `MiniMaxImageGenerate` — 图像生成（POST /v1/image_generation）
  - `MiniMaxVideoGenerate` — 视频生成 + 异步轮询（POST /v1/video_generation）
  - `MiniMaxSpeechSynthesize` — 文字转语音（POST /v1/t2a_v2）
  - `MiniMaxMusicGenerate` — 音乐生成（POST /v1/music_generation）
  - `MiniMaxVisionDescribe` — 图像理解 VLM（POST /v1/coding_plan/vlm）
  - `MiniMaxWebSearch` — 网页搜索（POST /v1/web_search）
- **MiniMax 认证命令** — `/auth-minimax` 命令配置 API key，持久化到 `~/.legna/minimax-credentials.json`
- **MiniMax 工具 Schema 导出** — `schemaExport.ts` 支持导出 Anthropic 兼容格式的工具 schema
- **MiniMax 多模态 Skill 包** — 5 个内置 skill（image/video/speech/music/pipeline），指导 AI 编排多模态工作流
- **智能模型路由** — 基于 prompt 复杂度启发式路由到 fast/default/strong 模型层
- **自主技能检测** — 检测重复工具调用模式，提示用户保存为可复用技能
- **上下文压缩增强**：
  - 工具输出预剪枝 — 大型 tool_result 在 compact 前自动裁剪（head + tail 保留）
  - 预算压力注入 — context 使用超 80% 时在工具结果中注入提示，引导模型收尾
- **RPC 子进程工具执行** — Unix Domain Socket RPC 服务端 + stub 生成器 + 代码执行运行器，AI 生成的脚本可通过 RPC 回调 LegnaCode 工具（Bash/Read/Write/Edit/Glob/Grep/WebFetch），多步操作压缩为一次推理
- **Memory Provider 插件系统** — 抽象基类 + 注册表 + 默认 FileMemoryProvider，支持一个外部 provider 与内置 memory 并行运行，完整生命周期（initialize/prefetch/syncTurn/shutdown）+ 可选 hooks（onTurnStart/onSessionEnd/onPreCompress/onDelegation）
- **跨会话记忆搜索** — `/recall` 命令搜索历史会话 JSONL 文件，关键词匹配 + 相关性排序
- **Worker 线程池** — 大文件操作 / 批量搜索可 offload 到 worker 线程，避免主线程阻塞

### Architecture

- 新增 `src/tools/MiniMaxTools/` — 完整的 MiniMax 多模态工具目录（client、endpoints、6 个 buildTool 工具、条件注册、schema 导出）
- 新增 `src/services/rpc/` — RPC 子进程工具执行（rpcServer.ts、stubGenerator.ts、codeExecutionRunner.ts）
- 新增 `src/memdir/providers/` — Memory Provider 插件系统（MemoryProvider.ts 抽象基类、FileMemoryProvider.ts 默认实现、registry.ts 注册表）
- 新增 `src/services/modelRouter.ts` — 任务复杂度估算 + 模型层路由
- 新增 `src/services/skillAutoCreate.ts` — 工具调用模式检测器，接入 toolExecution.ts
- 新增 `src/services/compact/toolOutputPruner.ts` — 工具输出预剪枝，接入 autoCompact.ts
- 新增 `src/services/compact/budgetPressure.ts` — 上下文预算压力注入，接入 query.ts
- 新增 `src/services/sessionSearch.ts` — 跨会话搜索引擎
- 新增 `src/commands/recall/` — `/recall` 命令
- 新增 `src/commands/auth/` — `/auth-minimax` 命令
- 新增 `src/skills/builtin-minimax/` — 5 个 MiniMax 多模态 skill 文件
- 新增 `src/utils/workerPool.ts` — Worker 线程池

## [1.3.7] - 2026-04-09

### Bug Fixes

- **Resume 会话检测** — `legna resume` 无法发现 v1.3.0+ 写入 `<project>/.legna/sessions/` 的会话。`getStatOnlyLogsForWorktrees()` 只扫描全局 `~/.legna/projects/`，现在同时扫描项目本地 sessions 目录，与 `fetchLogs()` 行为一致
- **Interrupted 诊断日志** — `onCancel()` 和 `query.ts` 中断点新增 abort reason + 调用栈日志，`--verbose` 模式下可追踪中断来源

### Enhancements

- **Priority-now 中断可见性** — 排队命令中断当前任务时记录命令摘要到 debug 日志，不再静默 abort
- **后台任务状态可见性** — footer pill 单个后台 agent 显示实时活动摘要（最近工具 + token 统计），任务完成通知包含 progress 统计

### Architecture

- `src/utils/sessionStorage.ts` — `getStatOnlyLogsForWorktrees()` Path A/B 均加入 `.legna/sessions/` 扫描
- `src/query.ts` — 两个 `createUserInterruptionMessage` 调用点加 abort reason 日志
- `src/screens/REPL.tsx` — `onCancel()` 调用栈日志，priority-now useEffect 记录命令摘要
- `src/tasks/pillLabel.ts` — 单 agent 任务显示 `getActivitySummary()` 实时活动
- `src/tasks/LocalMainSessionTask.ts` — `completeMainSessionTask` 捕获 progress，通知包含统计

## [1.3.6] - 2026-04-09

### Bug Fixes

- **Windows Edit 工具路径分隔符误报** — 修复 [#7935](https://github.com/anthropics/claude-code/issues/7935)：在 Windows 上使用正斜杠（`D:/path`）读取文件后，Edit/MultiEdit 工具报 "File has been unexpectedly modified" 错误。根因是 `path.normalize()` 在某些运行时（Bun 编译二进制 + Git Bash/MINGW 环境）不一定将 `/` 转换为 `\`，导致 FileStateCache 缓存键不匹配
  - `FileStateCache` 新增 `normalizeKey()` — 在 `path.normalize()` 之后显式将 `/` 替换为原生分隔符（Windows 上为 `\`），确保 `D:/foo` 和 `D:\foo` 始终命中同一缓存条目
  - `expandPath()` 新增 `ensureNativeSeparators()` — 所有返回路径在 Windows 上强制使用反斜杠，防御性修复

### Architecture

- `src/utils/fileStateCache.ts` — `normalizeKey()` 替代裸 `normalize()`，导入 `sep`
- `src/utils/path.ts` — `ensureNativeSeparators()` 包裹所有 `normalize()`/`resolve()`/`join()` 返回值

## [1.3.5] - 2026-04-07

### Bug Fixes

- **SessionStart hook error** — OML 的 SessionStart hook 使用了 `type: 'prompt'`，但 SessionStart 阶段没有 `toolUseContext`（LLM 调用上下文），导致必崩。移除 SessionStart hook，skill guidance 通过 skill description 暴露
- **Windows alt-screen 渲染闪烁** — alt-screen 模式下 `fullResetSequence_CAUSES_FLICKER` 仍会触发（viewport 变化、scrollback 检测等），导致整屏清除+重绘闪烁。新增 `altScreenFullRedraw()` 方法，alt-screen 下用简单的 `CSI 2J + CSI H`（erase screen + cursor home）替代 `clearTerminal` 的 Windows legacy 路径
- **Windows drainStdin** — 之前在 Windows 上完全跳过 stdin 排空，鼠标事件残留导致输入框错乱。改为通过 toggle raw mode 刷新缓冲的输入事件

### Architecture

- `src/ink/log-update.ts` — 5 个 `fullResetSequence_CAUSES_FLICKER` 调用点加 `altScreen` 检查，新增 `altScreenFullRedraw()` 方法
- `src/ink/ink.tsx` — Windows `drainStdin` 替代方案（toggle raw mode）
- `src/plugins/bundled/oml/definition.ts` — 移除 SessionStart hook，OML 升级到 1.2.0

## [1.3.4] - 2026-04-07

### New Features

- **OML Superpowers 工程纪律** — 集成 obra/superpowers 核心技能，强制 AI 遵循严格的软件工程流程
  - `/verify` — 完成前验证纪律：没有新鲜证据不能声称完成
  - `/tdd` — TDD 强制执行：RED-GREEN-REFACTOR，先写测试再写代码
  - `/debug` — 4 阶段系统化调试，3 次失败质疑架构
  - `/brainstorm` — 苏格拉底式设计：硬门控，设计未批准前禁止实现
  - `/write-plan` — 将设计拆成 2-5 分钟的小任务，零占位符
  - `/sdd` — 子代理驱动开发：实现→spec 审查→质量审查三阶段
  - `/exec-plan` — 加载计划文件逐任务执行
  - `/dispatch` — 并行子代理派发
  - `/code-review` — 派发 reviewer 子代理
  - `/worktree` — Git worktree 隔离开发
  - `/finish-branch` — 分支收尾（合并/PR/保留/丢弃）
- **SessionStart 技能引导** — 会话启动时自动注入 OML 技能引导 prompt（"1% 规则"）
- OML plugin 版本升级到 1.1.0，总计 35 个内置 skill

### Architecture

- `src/plugins/bundled/oml/superpowers.ts` — 11 个工程纪律 skill + SessionStart guidance
- `src/plugins/bundled/oml/definition.ts` — 追加 superpowers skills + SessionStart hook

## [1.3.3] - 2026-04-07

### New Features

- **OML (Oh-My-LegnaCode) 智能编排层** — 内置 oh-my-claudecode 核心功能，开箱即用
  - 5 个编排 skill：`/ultrawork`（并行执行）、`/ralph`（持久循环）、`/autopilot`（全自主）、`/ralplan`（先规划再执行）、`/plan-oml`（结构化规划）
  - 19 个专业化 agent skill：`/oml:explore`、`/oml:planner`、`/oml:architect`、`/oml:executor`、`/oml:verifier` 等
  - Magic Keywords 自动检测：prompt 中包含 ultrawork/ralph/autopilot/ultrathink 等关键词时自动注入编排指令（支持中日韩越多语言）
  - 通过 `/plugin` UI 可启用/禁用（`oml@builtin`，默认启用）
  - `OML_BUILTIN` feature flag 控制编译时 DCE

### Bug Fixes

- **Windows Terminal Fullscreen** — `WT_SESSION` 环境下自动启用 alt-screen 模式，彻底消除 cursor-up viewport yank bug（microsoft/terminal#14774）。覆盖 WSL-in-Windows-Terminal。`CLAUDE_CODE_NO_FLICKER=0` 可 opt-out

### Architecture

- `src/plugins/bundled/oml/` — OML plugin 模块（definition、skills、agents、magicKeywords）
- `src/plugins/bundled/index.ts` — 注册 OML builtin plugin
- `src/utils/processUserInput/processUserInput.ts` — magic keyword 检测集成点
- `src/utils/fullscreen.ts` — Windows Terminal fullscreen 条件

## [1.3.2] - 2026-04-07

### Breaking Changes

- **禁用 HISTORY_SNIP** — `bunfig.toml` feature flag 设为 false，编译时 DCE 移除所有 snip 相关代码（SnipTool、snipCompact、snipProjection、force-snip 命令、attachments nudge）。auto-compact 不受影响，上下文管理回归原有机制

### Bug Fixes

- **Windows Terminal 流式文本** — 不再对所有 Windows 禁用流式文本显示，改为仅在 legacy conhost 下禁用；Windows Terminal（检测 `WT_SESSION` 环境变量）恢复正常流式渲染

## [1.3.1] - 2026-04-06

### Bug Fixes

- **Snip 感知 context window** — 1M 模型不再被过早 snip，`KEEP_RECENT` 从硬编码 10 改为动态计算（1M: 200, 500K: 100, 200K: 10）
- **Snip nudge 频率** — 1M 模型 nudge 阈值从 20 条提升到 100 条
- **branch 命令品牌名** — `/branch` 后的 resume 提示从 `claude -r` 改为 `legna -r`
- **admin 版本号 fallback** — 从源码运行时显示正确版本号

### Architecture

- `src/services/compact/snipCompact.ts` — 新增 `getSnipThresholds(model)` 动态阈值函数，`snipCompactIfNeeded` 和 `shouldNudgeForSnips` 增加 model 参数
- `src/query.ts` / `src/QueryEngine.ts` / `src/commands/force-snip-impl.ts` — 传入 model 参数

## [1.3.0] - 2026-04-04

### New Features

- **项目本地化存储** — 会话、skills、memory、rules、settings 全部下沉到 `<project>/.legna/` 目录
  - 新会话写入 `<project>/.legna/sessions/<uuid>.jsonl`，跟着项目走
  - 项目级 skills/rules/settings/agent-memory/workflows 统一到 `.legna/` 下
  - `.legna/` 自动加入 `.gitignore`
- **全局数据迁移** — 首次启动自动从 `~/.claude/` 单向迁移到 `~/.legna/`
  - 迁移 settings.json、credentials、rules、skills、agents、plugins、keybindings 等
  - 不覆盖已有文件，迁移完成写入 `.migration-done` 标记
  - `LEGNA_NO_CONFIG_SYNC=1` 可禁止
- **`legna migrate` 命令** — 手动迁移数据
  - `--global` 仅迁移全局数据
  - `--sessions` 仅迁移当前项目会话到本地
  - `--all` 全部迁移（默认）
  - `--dry-run` 预览模式
- **三级 fallback 读取** — 读取时自动搜索 `.legna/` → `.claude/` → `~/.legna/` → `~/.claude/`，零破坏向后兼容

### Architecture

- `src/utils/legnaPathResolver.ts` — 统一路径解析（PROJECT_FOLDER/LEGACY_FOLDER/resolveProjectPath）
- `src/utils/ensureLegnaGitignored.ts` — 自动 gitignore 工具
- `src/utils/envUtils.ts` — 重构全局迁移逻辑，删除旧的 syncClaudeConfigToLegna
- `src/utils/sessionStoragePortable.ts` — 新增 getLocalSessionsDir/getLegacyProjectsDir，重构 resolveSessionFilePath
- `src/utils/sessionStorage.ts` — 会话写入路径切换到项目本地
- `src/utils/listSessionsImpl.ts` — 多源扫描合并（本地 + 全局 + legacy）
- `src/commands/migrate/` — CLI 迁移命令

## [1.2.1] - 2026-04-04

### New Features

- **模型适配器层 (Model Adapter Layer)** — 统一的第三方模型兼容框架，自动检测模型/端点并应用对应变换
- **MiMo (Xiaomi) 适配器** — api.xiaomimimo.com/anthropic，支持 mimo-v2-pro/omni/flash (1M ctx)
  - simplifyThinking + forceAutoToolChoice + normalizeTools + stripBetas + injectTopP(0.95) + stripCacheControl
  - 处理 content_filter / repetition_truncation stop_reason
- **GLM (ZhipuAI) 适配器** — open.bigmodel.cn/api/anthropic，支持 glm-5.1/5/5-turbo/4.7/4.6/4.5 等
  - 标准变换全套，服务端自动缓存（strip cache_control）
- **DeepSeek 适配器** — api.deepseek.com/anthropic，支持 deepseek-chat/coder/reasoner
  - stripReasoningContent 避免 400 错误，reasoner 模型自动 strip temperature/top_p
- **Kimi (Moonshot) 适配器** — api.moonshot.ai/anthropic，支持 kimi-k2/k2.5/k2-turbo 等
  - 保留 cache_control（Kimi 支持 prompt caching 折扣），stripReasoningContent
- **MiniMax 适配器** — api.minimaxi.com/anthropic (中国区) + api.minimax.io/anthropic (国际区)
  - 支持 MiniMax-M2.7/M2.5/M2.1/M2 全系列 (204K ctx)，大小写不敏感匹配
  - 深度兼容：保留 metadata、tool_choice、cache_control、top_p（其他适配器均需 strip/force）
  - 仅需 simplifyThinking + normalizeTools + stripBetas + stripUnsupportedFieldsKeepMetadata

### Architecture

- `src/utils/model/adapters/index.ts` — 适配器注册表 + match/transform 调度
- `src/utils/model/adapters/shared.ts` — 12 个共享变换函数（含新增 stripUnsupportedFieldsKeepMetadata）
- `src/utils/model/adapters/{mimo,glm,deepseek,kimi,minimax}.ts` — 5 个提供商适配器
- `src/services/api/claude.ts` — paramsFromContext() 末尾调用 applyModelAdapter()

## [1.2.0] - 2026-04-03

### New Features

- **会话按项目分组** — WebUI 会话记录面板按项目路径分组显示
- **resume 命令带 cd** — 复制的 resume 命令自动包含 `cd` 到项目目录（Windows 用 `cd /d`）
- **迁移支持会话记录** — 配置迁移面板新增"同时迁移会话记录"选项，复制 `projects/` 目录
- **Windows 原生编译** — Windows 二进制改为在 Windows 上原生编译

### Fixed

- 迁移面板字段名修正为实际 settings.json 字段

## [1.1.10] - 2026-04-03

### Fixed

- **Windows 编译脚本修复** — `scripts/compile.ts` 在 Windows 上正确处理 `.exe` 后缀，修复编译后找不到输出文件的问题
- **Windows 原生二进制重新编译发布** — 使用 Windows 本机 Bun 编译原生 `legna.exe`，替代之前交叉编译的版本

## [1.1.9] - 2026-04-03

### Fixed

- **postinstall 自动安装平台包** — 新增 `npm/postinstall.cjs`，`npm install` 阶段自动检测并从官方 registry 安装对应平台二进制包，彻底解决 Windows/镜像源下 optionalDependencies 不生效的问题
- **强制官方 registry** — postinstall 使用 `--registry https://registry.npmjs.org` 避免淘宝镜像等未同步导致 404
- **bin wrapper 精简** — 移除运行时 auto-install 逻辑，改由 postinstall 保证

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
