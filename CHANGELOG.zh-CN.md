# Changelog

All notable changes to LegnaCode CLI will be documented in this file.

## [1.9.2] - 2026-04-25

### 新功能

- **Computer Use Python 桥接** — 用纯 Python 子进程桥接（`runtime/mac_helper.py` + `runtime/win_helper.py`）替代原生 Swift/Rust 模块（`@ant/computer-use-swift` + `@ant/computer-use-input`）。零 NAPI 依赖。支持 28 个命令：截图、鼠标、键盘、应用管理、剪贴板、权限检测。跨平台：macOS 和 Windows。
- **Python 环境自动设置** — 首次使用 Computer Use 时自动检测系统 Python 3.12+，在 `~/.legna/computer-use-venv/` 创建虚拟环境并安装平台对应依赖。搜索顺序：`LEGNA_PYTHON_BIN` 环境变量 → `python3.14`..`python3.12` → `python3`/`python` → Windows `py` 启动器。依赖变更时自动重装。
- **平台分离依赖** — 将 `requirements.txt` 拆分为 `requirements-macos.txt`（pyobjc）、`requirements-windows.txt`（pywin32/psutil/screeninfo/pyperclip）、`requirements-common.txt`（mss/Pillow/pyautogui）。

### 改进

- **Feature Gate 全面解锁** — 移除所有 GrowthBook 远程 feature flag 和 Max/Pro 订阅检查。Computer Use 改由本地 `settings.json` 控制（`computerUse.enabled`，默认 `true`），所有用户可用。
- **Executor 大幅简化** — `executor.ts` 从约 800 行重写为约 200 行。无 CFRunLoop drain、无 NAPI、无鼠标动画——纯子进程 I/O。

## [1.9.0] - 2026-04-24

### 新功能

- **可移植会话** — 迁移后的会话 JSONL 使用 `"cwd":"."` 相对路径。项目可随意移动、拷贝或通过 git 同步——在任何位置都能 resume。运行时在 `sessionStorage.ts`、`crossProjectResume.ts`、`listSessionsImpl.ts` 共 5 处自动将 `"."` 解析为当前工作目录。
- **WebUI 项目浏览器** — 新增"项目总览"标签页，卡片式布局展示 `~/.claude/` 和 `~/.legna/` 下所有项目。显示会话数、最后活跃时间、迁移状态、来源（Claude/Legna/Both）。路径不存在的项目标红警告。
- **WebUI 记忆编辑器** — 三栏布局：项目列表 → 文件树（支持子文件夹展开/折叠）→ Markdown 编辑器。顶部横幅："记忆是 AI 的建议性笔记，随项目演进自动更新，内容仅供参考"。
- **WebUI 力导向关系图谱** — 交互式项目关系可视化，物理模拟（斥力 + 引力 + 中心重力 + 阻尼）。节点可拖拽。节点大小 = 会话数，颜色 = 活跃度，连线 = 同日活跃，显示权重标签。
- **完整项目迁移** — 迁移内容包括：sessions（JSONL + subagents/ + tool-results/）、memory、skills/、agents/、rules/、CLAUDE.md → LEGNA.md、settings.json、.mcp.json。路径重写支持 Windows 反斜杠、空格、特殊字符、JSON 转义路径。
- **多来源迁移** — 扫描 `~/.claude/projects/` 和 `~/.legna/projects/`，从 JSONL 的 `cwd` 字段读取真实路径（不再用 `-` 替换 `/`，修复 `claude-code-main` 被错误解析为 `claude/code/main` 的问题）。
- **配置指针切换** — 配置文件切换改用 `.active-profile` 指针文件，不再物理重命名文件，原始文件名永久保留。

### 改进

- **迁移面板重设计** — 双标签布局："项目迁移"（项目级勾选、来源标签、状态标签）和"配置同步"（字段级选择、图标、可折叠 JSON 预览）。
- **MCP 配置迁移** — 全局 `~/.claude/.mcp.json` 和项目级 `.claude/.mcp.json` 纳入迁移范围。
- **Co-Authored-By 归属** — 从 `noreply@anthropic.com` 改为 `@LegnaOS` 贡献者身份。

## [1.8.5] - 2026-04-23

### 优化

- **工具提示词压缩** — 压缩 BashTool（~21K→~12K 字符）、AgentTool（~16K→~13K 字符）、TodoWriteTool（~9.5K→~2K 字符）、EnterPlanModeTool（~7.7K→~2K 字符）的工具描述。首次请求 token 消耗减少约 8,000-10,000 tokens。

### 修复

- **模型适配器 cache_control 修复** — 在 `src/utils/model/adapters/shared.ts` 新增 `normalizeToolsKeepCache()` 变体，保留工具定义上的 `cache_control`。Kimi、MiniMax、MiMo 适配器改用此函数，修复 `normalizeTools()` 静默删除工具级提示缓存的问题。MiMo 适配器同时移除不必要的 `stripCacheControl()`，因其 API 支持服务端自动缓存。

## [1.8.4] - 2026-04-22

### 修复

- **会话转录空值守卫** — 为 `src/utils/sessionStorage.ts` 中 `isLoggableMessage`、`collectReplIds`、`transformMessagesForExternalTranscript` 添加防御性空值/类型检查。修复消息数组包含 undefined/null 元素时 `useLogMessages` React effect 中 `m4 is not an Object (evaluating '"isVirtual" in m4')` 崩溃。

## [1.8.3] - 2026-04-22

### 新功能

- **GitHub Actions 自动发版工作流** — 4 阶段 CI 流水线：prepare（bump + webui）→ native（4 平台 Rust addon 编译）→ compile（7 个 Bun 交叉编译目标）→ publish（npm 发布）。通过 `v*` tag 推送或手动 `workflow_dispatch` 触发。
- **全平台 Rust Native Addon** — CI 在原生 runner 上编译 `sandbox`、`file-search`、`apply-patch` NAPI 插件，覆盖 darwin-arm64、darwin-x64、linux-x64、linux-arm64。
- **compile.ts --target 参数** — 支持交叉编译目标覆盖，供 CI 使用。

### 修复

- **OML Agent 类型不匹配** — 修复 OML 技能定义中 `agent` 字段传递对象 `{ type, model }` 而非字符串的问题。导致 19 个 OML agent 技能在 fork 模式下静默回退到 `general-purpose`。

## [1.8.2] - 2026-04-22

### 修复

- **消息管线空值守卫** — 为 `src/utils/messages.ts` 中 11 个函数添加防御性空值检查（`normalizeMessages`、`isNotEmptyMessage`、`isSyntheticMessage`、`isToolUseRequestMessage`、`isToolUseResultMessage`、`isHookAttachmentMessage`、`isSystemLocalCommandMessage`、`isThinkingMessage`、`getAssistantMessageText`、`getUserMessageText`、`reorderMessagesInUI`）。修复消息数组包含 undefined 元素时的 `undefined is not an object (evaluating 'message.type')` 运行时崩溃。
- **禁用 Mode 命令** — 移除 `/mode` 斜杠命令注册，修复 Bun 编译后二进制启动卡死（JIT 编译停滞）。

### 构建

- **Rust 原生 Addon（darwin-arm64）** — 编译并打包 `sandbox`、`file-search`、`apply-patch` NAPI 插件。修复 file-search 缺少 `regex-lite` 依赖、apply-patch `Result` 类型不匹配的编译错误。

## [1.8.0] - 2026-04-21

> Codex 全面融合版 — 5 阶段将 OpenAI Codex CLI 能力集成到 LegnaCode。

### 安全（Phase 1 + Phase 2）

- **进程硬化** — 禁用 core dump、检测 ptrace 附加、清理危险环境变量（`LD_PRELOAD`、`DYLD_INSERT_LIBRARIES`、`NODE_OPTIONS` 注入）。
- **静态执行策略引擎** — TOML 格式命令执行规则（`prefix`/`glob`/`regex` 匹配）。内置默认规则阻断破坏性命令（`rm -rf /`、`mkfs`），提示包安装，放行只读操作。在 LLM 分类器之前评估——`forbidden` → 直接拒绝，`allow` → 直接放行，`prompt` → 走现有审批流。
- **密钥检测器** — 正则模式库覆盖 AWS 密钥、GitHub Token、JWT、Slack Token、私钥、通用 API Key。记忆管线自动脱敏（`[REDACTED:type]`）。
- **Rollback** — 完整实现，含时间线扫描、`--dry-run` 预览、`--safe` 备份分支创建。
- **Guardian 子代理** — 专用工具调用风险评估，6 类分类体系。基于规则的快速预分类（30+ 模式），紧凑转录构建器（<2000 tokens），fail-closed 设计。
- **Shell 升级协议** — 三级执行决策：`sandbox`/`escalate`/`deny`。平台感知包装：macOS Seatbelt、Linux bubblewrap、降级 `unshare --net`。
- **网络策略代理** — 域名级访问控制，`full`/`limited`/`blocked` 三种模式，通配符模式，黑名单优先，JSONL 审计日志。

### 性能（Phase 4）

- **Rust 原生 NAPI Addon** — `cosine_similarity`（SIMD f32）、`tfidf_vectorize`（Rayon 并行）、`content_hash`（SHA-256 流式）、`estimate_tokens`（无分支 CJK 感知）。约 10-50 倍加速，自动 TS 降级。
- **内核级沙箱** — macOS 通过 `sandbox_init()` 编译 Seatbelt，Linux 通过 `prctl` seccomp-bpf。无外部依赖。
- **两阶段唤醒填充** — 贪心 L1 填充 + L0 回填，在相同 token 预算内最大化深度和覆盖面。
- **关键词密度 L1** — 句子按 `(关键词比率 × √关键词数)` 排序，替代朴素的"取前3句"。
- **Token ROI 排序** — 按召回次数与成本比排序；频繁召回的紧凑记忆优于仅召回一次的冗长记忆。

### 新功能（Phase 3 + Phase 5）

- **协作模式系统** — 基于 YAML frontmatter 的 `.md` 模板化模式。内置：`default`、`plan`、`execute`、`pair`。三级加载（内置→用户→项目）。通过编程 API 运行时切换（注：`/mode` 斜杠命令因 Bun JIT 限制在编译后二进制中禁用）。
- **JS REPL Bridge** — REPL 全局作用域注入 `legnacode` 对象：`tool()`、`readFile()`、`exec()`、`glob()`、`grep()`、`emitImage()`。
- **App-Server JSON-RPC** — 完整 JSON-RPC 2.0，7 组方法（`thread/*`、`turn/*`、`fs/*`、`config/*`、`mcpServer/*`、`model/*`、`skills/*`）。流式通知。stdio + WebSocket 传输。
- **外部代理配置迁移** — `/migrate` 检测 Codex、Cursor、Copilot、Windsurf、Aider、Continue。导入配置、MCP 服务器、规则。
- **Codex 插件兼容层** — `codex-plugin.json` 清单适配器。市场注册表抓取器带缓存。安装 + 认证策略引擎。集成到插件加载管线（CWD 自动扫描）和市场浏览器。
- **Codex Skills 兼容** — 自动发现 `~/.codex/skills/`。Frontmatter 规范化器（`triggers` → `when_to_use`、`tools` → `allowed-tools`、`invoke` → `argument-hint`）。
- **Codex 配置互通** — 双向 `~/.codex/config.toml` 映射。作为最低优先级 settings 基底自动导入。
- **TypeScript SDK**（`@legna/legnacode-sdk`）— `LegnaCode` 客户端、`Thread` 类、stdio/WebSocket 传输、结构化输出。`Codex` 别名。
- **Python SDK**（`legnacode-sdk`）— 异步客户端、Thread、JSON-RPC 传输、dataclass 类型。`Codex` 别名。
- **TTS 语音输出** — 原生后端（macOS `say`、Linux `espeak`）。流式队列。优雅降级。
- **WebRTC 语音传输** — 基于 WebRTC 的双向音频。信令、ICE 交换、对等连接。Stub 降级。

## [1.6.1] - 2026-04-24

### 性能

- **Rust 原生 NAPI Addon** — 核心热路径操作用 Rust 重写，通过 `napi-rs` 集成。`cosine_similarity`（SIMD 加速 f32 点积）、`tfidf_vectorize`（Rayon 并行 TF-IDF）、`content_hash`（SHA-256 流式哈希）、`estimate_tokens`（无分支 CJK 感知计数）。TypeScript 绑定层在原生模块不可用时自动降级到纯 TS 实现。向量运算约 10-50 倍加速。

### 安全

- **内核级沙箱集成** — Rust 原生沙箱配置替代 shell-exec 包装器。macOS：通过 `sandbox_init()` 进程内编译 Seatbelt 配置（无需 `sandbox-exec` 子进程）。Linux：直接 `prctl` seccomp-bpf 系统调用过滤（无需 `bwrap`/`unshare` 依赖）。平台能力检测与优雅降级。`SandboxNative` 类提供 `applySeatbelt()` / `applySeccomp()` / `detect()` API。

### 改进

- **两阶段唤醒填充** — `LayeredStack.wakeUp()` 现采用两阶段策略：第一阶段贪心填充 L1 摘要（更丰富的上下文），第二阶段用跳过的抽屉的 L0 摘要回填剩余预算。在相同 token 预算内同时最大化深度和覆盖面。
- **关键词密度 L1 生成** — `generateL1()` 将朴素的"取前3句"替换为关键词密度评分。句子按 `(关键词比率 × √关键词数)` 排序，首句始终锚定上下文，高密度句子贪心填充至 400 字符，按原始位置重排以保持连贯阅读。
- **Token ROI 排序** — `topByImportance()` 和 `search()` 现在纳入 token ROI 因子：召回次数与成本比高的记忆获得提升。频繁召回的紧凑记忆优于仅召回一次的冗长记忆。新增 content_hash 索引加速去重查询。

## [1.6.0] - 2026-04-23

### 新功能

- **协作模式系统** — 基于 YAML frontmatter 的 `.md` 模板化协作模式。三级加载：内置（`src/services/collaborationModes/templates/`）、用户级（`~/.legnacode/modes/`）、项目级（`.legnacode/modes/`）。后级按模式 ID 覆盖前级。模式控制系统提示注入、工具限制（允许/拒绝列表）和行为标志（`readOnly`、`autoExecute`、`stepByStep`、`requirePlan`）。内置四种模式：`default`、`plan`、`execute`、`pair`。新增 `/mode` 斜杠命令，运行时列出和切换模式。
- **JS REPL Bridge** — 在 JavaScript REPL 全局作用域注入公开的 `legnacode` 对象。提供 `tool()` 调用任意 LegnaCode 工具、`readFile()`、`exec()`、`glob()`、`grep()` 快捷方法，以及 `emitImage()` 渲染 base64/Buffer/文件路径图片。支持在 REPL 会话中脚本化 LegnaCode 能力。
- **App-Server JSON-RPC 层** — 完整的 JSON-RPC 2.0 基础设施，面向 IDE 集成。路由器支持方法注册和分发。七组方法：`thread/*`（会话生命周期、分叉、回滚、压缩）、`turn/*`（消息发送、引导、中断）、`fs/*`（读写/元数据）、`config/*`（读写/批量）、`mcpServer/*`（状态、资源、工具调用）、`model/list`、`skills/list` + `collaborationMode/list`。流式通知推送 `item/*`、`turn/*`、`agentMessage/delta`。两种传输：stdio（JSONL）和 WebSocket（带心跳保活）。独立入口 `legnacode app-server --transport stdio|websocket`。
- **外部代理配置迁移** — 检测并导入其他 AI 编码工具的配置。检测器覆盖 Codex、Cursor、GitHub Copilot、Windsurf、Aider、Continue。导入器支持 Codex（TOML/JSON → 模型 + MCP 服务器）、Cursor（settings.json → MCP 服务器 + `.cursorrules` → `LEGNACODE.md`）、Copilot（`copilot-instructions.md` → `LEGNACODE.md`）。集成到 `/migrate --agents` 标志，也可独立使用。支持 `--dry-run` 预览和 `--force` 覆盖。

## [1.5.9] - 2026-04-22

### 安全

- **Guardian 子代理** — 专用工具调用风险评估审批代理。六类风险分类体系（data_exfiltration、credential_probing、security_weakening、destructive_action、privilege_escalation、supply_chain）。基于规则的快速预分类，30+ 信号模式。紧凑转录构建器将会话历史压缩至 <2000 tokens。Fail-closed 设计：超时/错误/格式错误 → 拒绝。结构化 JSON 评估输出。可通过 `guardian` 设置字段配置。
- **Shell 升级协议** — 三级命令执行决策：`sandbox`（受限环境）、`escalate`（需用户确认）、`deny`（拒绝执行）。平台感知沙箱包装：macOS Seatbelt（`sandbox-exec`）、Linux bubblewrap（`bwrap`）、Linux 降级方案（`unshare --net`）。集成 execPolicy + Guardian 预分类进行决策。检测需要外部写入或网络访问的命令。
- **网络策略代理** — 域名级网络访问控制，覆盖所有出站请求。三种模式：`full`（无限制）、`limited`（仅 GET/HEAD/OPTIONS）、`blocked`（全部拒绝）。支持通配符域名模式（`*.example.com`）。黑名单优先于白名单。JSONL 审计日志写入 `~/.legnacode/logs/network-audit.jsonl`。可通过 `~/.legnacode/network-policy.toml` 配置。

## [1.5.8] - 2026-04-22

### 安全

- **进程硬化** — 启动时运行的安全模块，灵感来自 Codex 的 `process-hardening`。清除危险环境变量（`LD_PRELOAD`、`DYLD_INSERT_LIBRARIES`、`ELECTRON_RUN_AS_NODE`），净化 `NODE_OPTIONS`（移除 `--require`/`--loader` 注入标志），Linux 下禁用 core dump，检测 ptrace 附加。
- **静态执行策略引擎** — 基于规则的命令评估，在 shell 执行前拦截。支持前缀、glob、正则、宿主可执行文件四种匹配器。内置默认规则（禁止 `rm -rf /`、管道到 shell、fork 炸弹；提示包安装和 `sudo`；允许只读 git/文件操作）。用户可通过 `.legnacode/exec-policy.toml`（项目级）或 `~/.legnacode/exec-policy.toml`（全局）自定义。兼容 Codex 函数调用语法。
- **密钥检测与脱敏** — 基于模式匹配的检测器，覆盖 25+ 种密钥类型（AWS 密钥、GitHub PAT、Stripe 密钥、OpenAI/Anthropic API 密钥、JWT、私钥、数据库 URL 等）。集成到自动记忆写入管道 — 密钥在持久化到 `.legna/memory/` 前被替换为 `[REDACTED:type]`。

### 新功能

- **Rollback CLI** — 完整实现回滚命令。列出检查点历史，支持按索引或消息 ID 前缀定位目标，支持 `--dry-run`（预览变更）、`--safe`（回滚前创建 git 备份分支）、`--list`（显示所有回滚点）。基于现有 fileHistory 快照基础设施构建。

## [1.5.7] - 2026-04-21

### Features

- **Git 风格 `/fork` 命令** — 统一的会话分叉功能，支持子命令：
  - `/fork` — 从当前位置分叉（替代 `/branch`）
  - `/fork @N` — 从第 N 条用户消息处分叉，截断后续历史
  - `/fork list` — 以 ASCII 树形展示分支结构，标记当前分支
  - `/fork switch <id|名称>` — 在会话分支间切换
  - `/fork <名称>` — 带自定义名称分叉
  - `/branch` 现为 `/fork` 的别名

## [1.5.6] - 2026-04-21

### Bug Fixes

- **WebUI SSE 超时** — Bun.serve `idleTimeout` 提升至 255 秒（最大值），SSE 流式传输不再 10 秒断开。
- **WebUI controller 重复关闭崩溃** — `sendEvent` 和 `controller.close()` 加入防重复调用保护。

## [1.5.4] - 2026-04-21

全平台二进制同步重发。

## [1.5.3] - 2026-04-21

### 新功能

- **Hermes 自我进化闭环** — 自动学习闭环：重复工具模式（3 次）自动通过 LLM 生成 SKILL.md；行为纠正自动写入 `.legna/memory/`；无需用户确认。后台 Review Agent 在每次会话结束后自动提取经验洞察。
- **Qwen 模型适配器** — Qwen 全系列专用适配器（qwen-plus、qwen-max、qwen-turbo、qwen-coder-plus、qwq-plus、qwen3-235b）。支持 `thinking_budget` 映射、DashScope 服务端搜索（`enable_search`）、`reasoning_content` 流式推理、`content_filter` 安全过滤。
- **WebUI 聊天查看器** — 管理面板新增"聊天记录"页面。支持浏览会话历史、完整消息渲染、思维链折叠展开、工具调用可视化（输入/输出/错误）、自动滚动。后端新增 `/api/:scope/sessions/:id/messages` 端点读取 JSONL 会话文件。
- **WebUI 实时聊天** — `legna admin` 管理面板新增实时聊天功能，通过 SSE 流式传输。支持发送消息、查看流式响应（含思维链/工具调用可视化）。注意：每条消息都是独立会话（不支持连续对话），仅用于快速测试 API 连通性，不作为完整聊天客户端使用。
- **Skill 自动创建** — `SkillPatternDetector.record()` 此前已接入但结果从未展示。现在检测到重复模式后自动创建 skill 并事后通知用户。
- **Skill 改进路径 B** — `skillImprovement` 不再限制于 skill 执行期间。通用对话学习每 10 条用户消息检测工作流偏好、行为纠正和编码风格偏好。
- **Nudge 系统** — 计数器驱动的会话学习摘要。汇报已自动学到的内容（创建的 skill、捕获的纠正、记录的洞察），而非建议用户去学习。

### 改进

- **onPreCompress 增强** — 在现有 exchange pair 提取基础上新增工作状态提取。压缩前捕获当前任务、关键决策、文件路径和错误模式，高优先级写入 DrawerStore。
- **Skill 版本备份** — `applySkillImprovement` 覆写前自动备份当前 SKILL.md 到 `.versions/` 目录，自动维护最近 20 个版本的 changelog。
- **`/skillify` 解锁** — 移除 `USER_TYPE === 'ant'` 门控，所有用户均可将会话工作流捕获为可复用 skill。

### Bug Fixes

- **WebUI 内联脚本崩溃** — 修复内联 JavaScript 中未转义的 `</` 序列导致的 `Unexpected token '<'` 错误。JS 和 CSS 现在作为独立文件（`/__admin__/app.js`、`/__admin__/app.css`）提供，不再内联到 `<script>` 标签中。

## [1.5.2] - 2026-04-20

### Performance

- **CodeGraph async 化** — `build()` 和 `walkDir()` 从同步改为异步，每 50 个文件 yield 事件循环，不再阻塞 UI 渲染。添加 `maxDepth=10` 深度限制和 `visitedInodes` 符号链接循环保护。`save()` 改为异步写入。
- **undoTracker 大文件保护** — 添加 1MB 大小限制，超过的文件跳过 undo 快照记录（避免 OOM）。`readFileSync` 改为 `readFile` 异步。
- **错误文件预注入 async 化** — `extractErrorFiles` 从 `existsSync`+`readFileSync` 改为 `access`+`readFile` 异步。
- **stripCode 去重** — `magicKeywords.ts` 中 `stripCode()` 从 3-4 次调用减少到 1 次，结果传递给所有下游函数。
- **FileMemoryProvider TTL 缓存** — `searchSolutions` 和 fallback 文件搜索添加 60 秒 TTL 缓存，避免每次 prefetch 重复读取磁盘。
- **OML_SESSION_GUIDANCE 缓存** — `attachments.ts` 中 `await import()` 改为模块级缓存，首次加载后复用。
- **frustrationHint patterns 提升** — 正则数组从函数内部提升到模块级常量。

### i18n

- **Compacting 状态文案中文化** — "Compacting context…" → "凝练上下文…"，"Compacting conversation" → "精炼对话中"。
- **完成动词中文化** — 新增 `getTurnCompletionVerbs()` 函数，中文用户看到"烹制了 5s"而非"Baked for 5s"。

### Cleanup

- 删除死代码 `src/commands/undo.ts`（从未注册到命令列表）。
- 修复 `extractImports` 死条件逻辑。

## [1.5.1] - 2026-04-19

### Features

- **Skill 主动调用** — 将 `OML_SESSION_GUIDANCE`（"1% 规则"）接入 `skill_listing` 附件。AI 现在每次响应前都会主动检查是否有适用的 skill，而不是只在用户手动输入 `/slash` 命令时才触发。
- **前端/设计指令自动注入** — 新增 `designPrompt.ts`，检测用户输入中的前端意图（UI、原型、设计探索），透明注入分层设计指导（oklch 配色、响应式布局、动画最佳实践、设计探索方法论）。用户无需任何操作。
- **增强 designer agent** — `/oml:designer` 现在携带完整的设计方法论提示词，而非一句话描述。

### Bug Fixes

- **Skills 从未被主动使用** — `OML_SESSION_GUIDANCE` 在 `superpowers.ts` 中定义但从未被导入或注入。现已接入 skill listing 附件。

## [1.5.0] - 2026-04-19

### Bug Fixes

- **修复 REPL 启动死锁** — `/undo` 命令通过静态 `import` 注册到 `commands.ts`，产生循环依赖（`commands.ts` → `undo.ts` → `commands.ts`），导致 Bun 模块加载器死锁，启动后无任何输出。已移除静态导入。`/undo` 功能仍通过 `undoTracker.ts` 接入 Edit/Write 工具，但不再注册为斜杠命令。

### Features（承自 1.4.8/1.4.9）

- **AtomCode 智能融合** — Pangu CJK 间距、负面反馈检测、工具调用循环检测、错误文件预注入、首次全文读取
- **OpenAI 兼容桥接器** — Anthropic ↔ OpenAI 格式翻译，支持 DeepSeek/Qwen/GLM/Ollama/vLLM/LM Studio
- **代码图谱** — 正则符号索引 + 文件依赖图（TS/JS/Python/Go/Rust）
- **并行文件编辑** — 每文件一个子代理 + 兄弟文件骨架
- **工作流引擎** — 结构化 markdown 步骤执行，支持检查条件和依赖
- **跨会话知识持久化** — 会话结束自动写 `.legna/knowledge.md`
- **Baseline 构建** — 无 AVX 二进制，支持老款 x64 CPU

## [1.4.9] - 2026-04-17

### Features

- **Baseline（无 AVX）构建** — 为不支持 AVX 指令集的老款 x64 CPU 新增平台包：
  - `@legna-lnc/legnacode-darwin-x64-baseline` — macOS Intel（2011 年前或无 AVX 的黑苹果）
  - `@legna-lnc/legnacode-linux-x64-baseline` — 无 AVX 的 Linux x64 服务器/虚拟机
  - 修复 `warn: CPU lacks AVX support, strange crashes may occur` 错误
  - 安装：`npm i -g @legna-lnc/legnacode-darwin-x64-baseline`（直接使用，不通过主包）

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
