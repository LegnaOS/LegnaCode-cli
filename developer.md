# LegnaCode 开发者文档

🌐 [English Version](./developer.en.md)

本文档面向希望参与 LegnaCode 开发、构建插件/技能、或对接 Admin API 的开发者。

---

## 目录

- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [环境准备](#环境准备)
- [开发工作流](#开发工作流)
- [构建系统](#构建系统)
- [Feature Flags 机制](#feature-flags-机制)
- [核心架构](#核心架构)
- [工具系统](#工具系统)
- [命令与技能系统](#命令与技能系统)
- [权限系统](#权限系统)
- [Hook 系统](#hook-系统)
- [插件系统](#插件系统)
- [MCP 集成](#mcp-集成)
- [Agent / 子代理系统](#agent--子代理系统)
- [会话管理](#会话管理)
- [Admin WebUI](#admin-webui)
- [Admin REST API](#admin-rest-api)
- [npm 分发机制](#npm-分发机制)
- [发版流程](#发版流程)
- [安全加固](#安全加固)
- [关键设计模式](#关键设计模式)

---

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | [Bun](https://bun.sh) >= 1.2.0 |
| 语言 | TypeScript (ES2022, strict) |
| 终端 UI | React + [Ink](https://github.com/vadimdemedes/ink) (JSX → 终端渲染) |
| CLI 框架 | [Commander.js](https://github.com/tj/commander.js) |
| WebUI 前端 | React 18 + Vite 6 + Tailwind CSS 3 |
| 构建 | Bun bundler (ESM, code splitting, standalone compile) |
| 校验 | [Zod](https://zod.dev) (所有外部数据) |
| 编译产物 | 平台原生二进制 (无需 Bun/Node 运行时) |

---

## 项目结构

```
├── src/
│   ├── entrypoints/          # 启动入口
│   │   ├── cli.tsx           # 主入口 — fast-path 级联，动态 import
│   │   └── init.ts           # 初始化 (memoized) — 配置、安全、遥测
│   ├── main.tsx              # 完整 CLI 主函数 (Commander + REPL 启动)
│   ├── bootstrap/
│   │   └── state.ts          # 全局单例 STATE — 会话、计费、hooks 注册
│   ├── state/
│   │   └── store.ts          # 响应式 UI 状态 (createStore 自研方案)
│   ├── server/
│   │   ├── admin.ts          # Bun.serve REST API (端口 3456)
│   │   └── admin-ui-html.ts  # 自动生成 — WebUI 内联字符串 (勿手动编辑)
│   ├── commands/             # 斜杠命令 (/help, /compact, /model …)
│   ├── tools/                # 内置工具 (Bash, Read, Edit, Grep …)
│   ├── services/             # API 调用、MCP 客户端、分析
│   │   └── mcp/             # MCP 协议集成
│   ├── hooks/                # React hooks (useCanUseTool 等)
│   ├── permissions/          # 权限判定逻辑
│   ├── security/             # 进程加固 (processHardening.ts)
│   ├── plugins/              # 插件系统
│   ├── skills/               # 技能系统 (bundled + 动态发现)
│   ├── components/           # React/Ink 终端 UI 组件
│   ├── native-ts/            # 纯 TS 替代原生模块 (语法高亮等)
│   ├── bridge/               # 远程控制 / Bridge 模式
│   ├── daemon/               # 长驻守护进程
│   ├── migrations/           # 数据迁移 (模型重命名、设置迁移)
│   ├── context.ts            # 系统提示词上下文 (git status, LEGNA.md)
│   ├── Tool.ts               # Tool 类型定义 + buildTool()
│   ├── tools.ts              # getAllBaseTools() — 工具注册中心
│   ├── commands.ts           # getCommands() — 命令注册中心
│   ├── types/                # TypeScript 类型声明
│   │   └── bun-bundle.d.ts   # feature() + MACRO 类型
│   └── utils/
│       ├── legnaPathResolver.ts  # 路径解析 (PROJECT_FOLDER 等)
│       └── envUtils.ts           # 配置目录、环境变量、迁移
├── webui/                    # Admin WebUI 前端
│   ├── src/
│   │   ├── App.tsx           # SPA 主组件 (scope 切换 + 面板导航)
│   │   ├── api/client.ts     # 类型化 API 客户端
│   │   └── components/       # 面板组件 (settings, sessions, chat …)
│   ├── vite.config.ts        # Vite 配置 (dev proxy → :3456)
│   └── package.json
├── scripts/
│   ├── build.ts              # 开发构建 → dist/
│   ├── compile.ts            # 单平台编译 → ./legna 二进制
│   ├── compile-all.ts        # 7 平台交叉编译
│   ├── publish.ts            # 完整发布流水线
│   ├── bump.ts               # 版本号同步
│   ├── build-webui.ts        # WebUI 构建 + 内联
│   ├── inline-webui.ts       # Vite 产物 → TS 字符串常量
│   └── postbuild-fix.py      # Bun bundler bug 修补
├── npm/
│   ├── bin/legna.cjs         # npm bin shim (定位平台二进制)
│   └── postinstall.cjs       # 安装后自动拉取平台包
├── stubs/                    # 原生模块占位符
├── bunfig.toml               # 编译宏 + Feature Flags
├── tsconfig.json             # TypeScript 配置
└── package.json              # 项目元数据 + 8 个平台可选依赖
```

---

## 环境准备

```bash
# 1. 安装 Bun (>= 1.2.0)
curl -fsSL https://bun.sh/install | bash

# 2. 克隆仓库
git clone https://github.com/LegnaOS/LegnaCode-cli.git
cd LegnaCode-cli

# 3. 安装依赖
bun install

# 4. 类型检查
bun run typecheck

# 5. 代码检查
bun run lint
```

---

## 开发工作流

### CLI 开发

```bash
# 带热重载的开发模式
bun --watch src/main.tsx

# 构建到 dist/ (ESM bundle，带 sourcemap)
bun run build

# 编译当前平台的独立二进制
bun run compile    # 输出 ./legna

# 清理构建产物
bun run clean
```

### WebUI 开发

```bash
cd webui
npm install
npm run dev        # Vite dev server，/api 代理到 localhost:3456
```

WebUI 开发时需要同时运行 Admin 后端：

```bash
# 另一个终端
bun run src/server/admin.ts
```

### WebUI 构建 + 内联

修改前端后，必须重新内联才能在编译产物中生效：

```bash
bun run scripts/build-webui.ts
# 等价于: cd webui && npm install && npm run build && bun run scripts/inline-webui.ts
```

该脚本会：
1. 在 `webui/` 下执行 `npm install` + `npm run build` (tsc + Vite)
2. 读取 `webui/dist/` 产物，将 HTML/JS/CSS 内联为字符串常量
3. 生成 `src/server/admin-ui-html.ts`（导出 `ADMIN_HTML`、`ADMIN_JS`、`ADMIN_CSS`）

编译后的二进制包含完整 SPA，运行时零外部文件依赖。

---

## 构建系统

### 三种构建模式

| 命令 | 产物 | 用途 |
|------|------|------|
| `bun run build` | `dist/` (ESM chunks + sourcemap) | 开发调试 |
| `bun run compile` | `./legna` 二进制 | 本地测试 |
| `bun run compile:all` | 7 平台二进制 → `.npm-packages/` | 发布 |

### 构建流程详解

**`build.ts`** — 开发构建：
1. 解析 `bunfig.toml` 提取 `MACRO.*` 宏定义和 Feature Flags
2. 调用 `Bun.build()`: 入口 `src/entrypoints/cli.tsx`，ESM 格式，code splitting
3. 外部化: `@ant/*`、`@anthropic-ai/*`、原生 NAPI 模块
4. 运行 `postbuild-fix.py` 修补 Bun bundler 已知 bug

**`compile.ts`** — 单平台编译：
1. 同样解析 `bunfig.toml`，覆写 `MACRO.BUILD_TIME` 为当前时间
2. `Bun.build({ compile: true })` — 生成独立二进制，无外部依赖
3. 输出到 `.compile-tmp/`，移动到项目根目录

**`compile-all.ts`** — 交叉编译：

| 目标 | 平台 | npm 包名 |
|------|------|----------|
| `bun-darwin-arm64` | macOS ARM | `@legna-lnc/legnacode-darwin-arm64` |
| `bun-darwin-x64` | macOS Intel | `@legna-lnc/legnacode-darwin-x64` |
| `bun-darwin-x64-baseline` | macOS Intel (无 AVX) | `@legna-lnc/legnacode-darwin-x64-baseline` |
| `bun-linux-x64` | Linux x64 | `@legna-lnc/legnacode-linux-x64` |
| `bun-linux-x64-baseline` | Linux x64 (无 AVX) | `@legna-lnc/legnacode-linux-x64-baseline` |
| `bun-linux-arm64` | Linux ARM | `@legna-lnc/legnacode-linux-arm64` |
| `bun-windows-x64` | Windows x64 | `@legna-lnc/legnacode-win32-x64` |

支持 `--skip=os-cpu` 跳过特定平台 (如 `--skip=win32-x64,linux-arm64`)。

### 编译宏 (bunfig.toml)

`[bundle.define]` 中的宏在编译时替换为字符串字面量：

```toml
[bundle.define]
MACRO.VERSION = '"1.8.0"'
MACRO.BUILD_TIME = '"2024-01-01T00:00:00.000Z"'
MACRO.PACKAGE_URL = '"https://www.npmjs.com/package/@legna-lnc/legnacode"'
# ...
```

在代码中直接使用 `MACRO.VERSION` 即可，类型声明在 `src/types/bun-bundle.d.ts`。

---

## Feature Flags 机制

`bunfig.toml` 的 `[bundle.features]` 定义了 87+ 个布尔 Feature Flag，通过 Bun 的 `import { feature } from 'bun:bundle'` 在编译时求值，实现死代码消除。

```typescript
// 代码中的使用方式
import { feature } from 'bun:bundle'

if (feature('VOICE_MODE')) {
  // 仅当 VOICE_MODE = true 时编译进产物
  const voiceModule = await import('./voice.js')
}
```

**关键 Flag 示例：**

| Flag | 说明 |
|------|------|
| `BUDDY` | 伴侣宠物 UI |
| `KAIROS` | Kairos 助手模式 |
| `MCP_SKILLS` | MCP 提供的技能作为命令 |
| `BG_SESSIONS` | 后台会话 (ps/logs/attach/kill) |
| `BRIDGE_MODE` | 远程控制模式 |
| `DAEMON` | 守护进程模式 |
| `WEB_BROWSER_TOOL` | 浏览器工具 |
| `MONITOR_TOOL` | 监控工具 |
| `TOKEN_BUDGET` | Token 预算管理 |
| `ULTRAPLAN` / `ULTRATHINK` | 高级规划/思考模式 |
| `TEMPLATES` | 模板系统 (new/list/reply) |

构建时可通过 CLI 覆盖：`bun run scripts/build.ts --features FLAG1,FLAG2`

---

## 核心架构

### 启动流程

```
legna [args]
  │
  ├─ cli.tsx: fast-path 级联 (零 import 快速路径)
  │   ├─ --version → 直接打印 MACRO.VERSION，退出
  │   ├─ admin → import server/admin.ts，启动 WebUI
  │   ├─ migrate → import commands/migrate/
  │   ├─ 进程加固 → security/processHardening.ts
  │   ├─ [各种 feature-gated 子命令]
  │   └─ 默认 → import main.tsx → cliMain()
  │
  └─ main.tsx: cliMain()
      ├─ Commander.js 解析参数
      ├─ init() — 配置、安全、遥测 (memoized，仅执行一次)
      ├─ 认证 + 信任对话框
      ├─ 会话恢复 / 创建
      └─ REPL 启动 (React/Ink 渲染)
```

设计原则：**所有 import 都是动态的**，每条路径只加载所需模块，`--version` 路径零 import。

### 全局状态

**`src/bootstrap/state.ts`** — 单例 `STATE` 对象：
- 会话 ID、CWD、计费统计、模型使用量
- 已注册 hooks、agent 颜色映射
- 通过 getter/setter 函数导出
- 刻意作为 import DAG 的叶节点，几乎不 import `src/` 内其他模块，避免循环依赖

**`src/state/store.ts`** — 响应式 UI 状态：
- 自研 `createStore<T>()` (非 Redux/Zustand)
- 返回 `{ getState, setState, subscribe }`
- `AppState` 类型包含：设置、权限上下文、MCP 连接、插件、任务、agent 定义等

### 上下文系统 (`src/context.ts`)

两个 memoized 函数构建系统提示词：
- `getSystemContext()` — git 状态快照 (分支、最近提交、status)
- `getUserContext()` — LEGNA.md 内容 (从 `~/.legna/LEGNA.md` 和项目目录向上遍历)

---

## 工具系统

工具是 LLM 可调用的能力单元，定义在 `src/Tool.ts`，注册在 `src/tools.ts`。

### Tool 类型定义

```typescript
// 核心字段 (简化)
interface Tool {
  name: string
  inputSchema: ZodSchema          // Zod 校验
  call(input, context): Promise<ToolResult>
  checkPermissions(input): PermissionDecision
  prompt(): string                // 生成系统提示词片段
  isEnabled(state): boolean       // 是否在当前上下文启用
  isReadOnly(): boolean           // 只读工具无需权限确认
  isConcurrencySafe(): boolean    // 是否可并发执行
  isDestructive(): boolean        // 破坏性操作标记
  renderToolUseMessage(): ReactNode    // Ink 终端渲染
  renderToolResultMessage(): ReactNode
}
```

通过 `buildTool(def)` 构造，默认 fail-closed（`isConcurrencySafe` 和 `isReadOnly` 默认 `false`）。

### 内置工具列表

`getAllBaseTools()` 返回所有内置工具，包括：

| 类别 | 工具 |
|------|------|
| 文件操作 | `FileReadTool`, `FileEditTool`, `FileWriteTool`, `NotebookEditTool` |
| 搜索 | `GlobTool`, `GrepTool`, `WebSearchTool`, `WebFetchTool` |
| 执行 | `BashTool`, `PowerShellTool` |
| Agent | `AgentTool`, `SendMessageTool`, `TeamCreateTool`, `TeamDeleteTool` |
| 任务 | `TaskCreateTool`, `TaskGetTool`, `TaskUpdateTool`, `TaskListTool` |
| 规划 | `EnterPlanModeTool`, `ExitPlanModeV2Tool` |
| 工作区 | `EnterWorktreeTool`, `ExitWorktreeTool` |
| MCP | `ListMcpResourcesTool`, `ReadMcpResourceTool` |
| 其他 | `SkillTool`, `TodoWriteTool`, `AskUserQuestionTool`, `MonitorTool`, `WorkflowTool`, `CronTools` 等 |

许多工具通过 `feature()` 条件编译，禁用的 flag 对应的工具代码不会出现在产物中。

### 工具池组装

```
getAllBaseTools()          → 内置工具数组
  ↓ isEnabled() 过滤
  ↓ 权限 deny 规则过滤
getTools()                → 可用内置工具
  ↓ + MCP 工具 (同名时内置优先)
assembleToolPool()        → 最终工具池
```

### 添加新工具

1. 在 `src/tools/` 下创建工具文件，使用 `buildTool()` 构造
2. 在 `src/tools.ts` 的 `getAllBaseTools()` 中注册
3. 如需 feature gate，用 `feature('FLAG_NAME')` 包裹

---

## 命令与技能系统

### 命令 (Commands)

命令是用户通过 `/` 前缀触发的交互，定义在 `src/commands.ts`。三种类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| `PromptCommand` | 展开为文本发送给模型 | 技能类命令 |
| `LocalCommand` | 本地执行，返回文本 | `/help`, `/clear` |
| `LocalJSXCommand` | 渲染 Ink UI (懒加载) | `/model`, `/config` |

`getCommands(cwd)` 按 CWD memoized，从以下来源汇聚：
- 内置命令 (~80+)
- 内置技能 (bundled skills)
- 用户/项目技能目录
- 插件技能
- 工作流命令
- MCP 提供的 prompts (当 `MCP_SKILLS` 启用时)

### 技能 (Skills)

技能是基于 Markdown 的提示词命令，从多个位置加载：

```
~/.legna/skills/          # 用户全局
<project>/.legna/skills/  # 项目级 (向上遍历到 home)
~/.codex/skills/          # Codex 兼容
```

每个技能是一个目录，包含 `SKILL.md`，使用 YAML frontmatter：

```markdown
---
description: "技能描述"
when_to_use: "何时自动触发"
allowed-tools: ["BashTool", "FileReadTool"]
user-invocable: true
model: "opus"
hooks:
  - event: PreToolUse
    command: "echo checking..."
paths:
  - "src/components/**"    # 仅在匹配路径时激活
---

技能提示词内容...

参数替换: $ARGUMENTS
变量: ${CLAUDE_SKILL_DIR}, ${CLAUDE_SESSION_ID}
内联 shell: `! ls -la`
```

**内置技能** (`src/skills/bundledSkills.ts`) 编译进二进制，通过 `registerBundledSkill()` 注册。

**动态发现**：文件操作时自动向上遍历查找 `.legna/skills/` 目录，运行时合并新发现的技能。

---

## 权限系统

权限控制工具执行的安全边界，定义在 `src/types/permissions.ts`，判定逻辑在 `src/hooks/useCanUseTool.tsx`。

### 权限模式

| 模式 | 说明 |
|------|------|
| `default` | 默认模式，危险操作需确认 |
| `acceptEdits` | 自动接受文件编辑 |
| `bypassPermissions` | 跳过所有权限检查 |
| `dontAsk` | 不询问，拒绝未授权操作 |
| `plan` | 规划模式，禁止写操作 |
| `auto` | 自动模式，AI 分类器判定 |
| `bubble` | 冒泡模式 (子代理向上级请求) |

### 权限判定流程

```
工具调用请求
  ↓
hasPermissionsToUseTool()
  ↓ 检查规则 (alwaysAllow / alwaysDeny / alwaysAsk)
  ↓ 规则来源优先级: policySettings > userSettings > projectSettings > ...
  │
  ├─ allow → 直接执行
  ├─ deny  → 拒绝
  └─ ask   → 进入处理链:
      ├─ 1. Coordinator handler (后台 worker)
      ├─ 2. Swarm worker handler (转发给 team leader)
      ├─ 3. Speculative bash classifier (2 秒竞速)
      └─ 4. Interactive handler (弹出权限对话框)
```

`ToolPermissionContext` 携带当前模式、工作目录列表、以及按来源分组的规则集。

---

## Hook 系统

Hooks 是用户可配置的脚本，在特定生命周期事件触发。配置在 `settings.json` 的 `hooks` 字段。

### 支持的事件

| 事件 | 触发时机 | 可做什么 |
|------|----------|----------|
| `PreToolUse` | 工具执行前 | 审批/拒绝、修改输入 |
| `PostToolUse` | 工具执行后 | 审计、后处理 |
| `UserPromptSubmit` | 用户提交提示词 | 注入上下文、拦截 |
| `SessionStart` | 会话开始 | 注入初始上下文、注册文件监听 |
| `Setup` | 首次设置 | 环境初始化 |
| `SubagentStart` | 子代理启动 | 配置子代理 |
| `PermissionDenied` | 权限被拒 | 日志记录 |
| `CwdChanged` | 工作目录变更 | 重新加载配置 |
| `FileChanged` | 文件变更 | 触发重建等 |

### Hook 输出格式

同步 hook 返回 JSON：

```json
{
  "continue": true,
  "decision": "approve",   // "approve" | "block"
  "reason": "自动审批",
  "systemMessage": "注入到对话的系统消息"
}
```

异步 hook 返回 `{ "async": true }` 并可设置超时。

Hook 来源：`settings.json`、技能 frontmatter `hooks` 字段、插件 `hooksConfig`、SDK 回调。

---

## 插件系统

插件是基于 Git 仓库的扩展，定义在 `src/plugins/`。

### 插件结构

```typescript
interface LoadedPlugin {
  manifest: PluginManifest
  path: string
  source: string
  repository: string
  // 可选扩展点:
  commands?: string      // 命令目录
  agents?: string        // Agent 定义
  skills?: string        // 技能目录
  outputStyles?: string  // 输出样式
  hooksConfig?: object   // Hook 配置
  mcpServers?: object    // MCP 服务器
  lspServers?: object    // LSP 服务器
}
```

内置插件使用 `{name}@builtin` 标识符，可通过 `/plugin` UI 启用/禁用。

---

## 模型适配器与 OpenAI 路由

### 架构

```
paramsFromContext() → applyModelAdapter() → [分叉点]
  ├─ __openaiCompat: false → anthropic.beta.messages.create() (Anthropic SDK)
  └─ __openaiCompat: true  → openAIStreamingRequest() (fetch 桥接)
                                ├─ anthropicToOpenAI(params) → 构建请求
                                └─ OpenAI SSE → 转换为 Anthropic 事件
```

内部消息格式始终为 Anthropic。会话存储、工具执行、skills、memory 全部不变。格式转换仅在 API 边界发生。

### 适配器接口

`src/utils/model/adapters/` 下每个适配器实现：

```typescript
interface ModelAdapter {
  name: string
  apiFormat?: 'anthropic' | 'openai' | 'auto'  // 默认: 'anthropic'
  match(model: string, baseUrl?: string): boolean
  transformParams(params: Record<string, any>): Record<string, any>
  transformResponse?(content: any[]): any[] | null
  getStopReasonMessage?(stopReason: string): string | undefined
}
```

`apiFormat: 'auto'` 根据 `ANTHROPIC_BASE_URL` 自动推断：`/anthropic` 后缀走 Anthropic SDK，否则走 OpenAI fetch 桥接。

### 已注册适配器（优先级顺序）

| 适配器 | 厂商 | apiFormat | 关键特性 |
|--------|------|-----------|---------|
| OpenAICompatAdapter | 任意 OpenAI 端点 | openai | 通过 `OPENAI_COMPAT_BASE_URL` 环境变量激活 |
| MiMoAdapter | 小米 | auto | mimo-v2.5-pro/v2.5，Token Plan 主机 |
| GLMAdapter | 智谱 | auto | glm-5.1 到 glm-4.5，Coding Plan，cached_tokens |
| DeepSeekAdapter | DeepSeek | auto | v4-flash/v4-pro，reasoning_content 回传 |
| KimiAdapter | 月之暗面 | auto | kimi-k2.6 thinking，Preserved Thinking |
| MiniMaxAdapter | MiniMax | auto | reasoning_details 数组，中国/全球主机 |
| QwenAdapter | 阿里云 | auto | 百炼北京/新加坡/Coding Plan |

### OpenAI 流式桥接

`src/services/api/openaiStreamBridge.ts` 将 OpenAI SSE 转换为 Anthropic 事件：

- `delta.content` → `content_block_delta` (text_delta)
- `delta.tool_calls` → `content_block_start` (tool_use) + `content_block_delta` (input_json_delta)
- `delta.reasoning_content` → `content_block_delta` (thinking_delta) — DeepSeek/Kimi/MiMo
- `delta.reasoning_details` → `content_block_delta` (thinking_delta) — MiniMax
- `finish_reason` 映射：stop→end_turn, tool_calls→tool_use, length→max_tokens, sensitive→content_filter

### 共享工具 (`src/utils/model/adapters/shared.ts`)

- `simplifyThinking` — 仅 `{type: "enabled"}`，无 budget_tokens
- `forceAutoToolChoice` — 删除 `disable_parallel_tool_use`
- `normalizeTools` / `normalizeToolsKeepCache` — 设置 `type: "custom"`
- `stripUnsupportedContentBlocks` — 过滤 image/document/redacted_thinking
- `stripUnsupportedFields` — 保留 `output_config.effort`
- `stripReasoningContent` — 从 assistant 消息中移除 reasoning（Anthropic 路径）
- `reorderThinkingBlocks` — 响应中 thinking 排在 text 前面

### 配置

settings.json `apiFormat` 字段：
- `"anthropic"` — 强制走 Anthropic SDK
- `"openai"` — 强制走 OpenAI fetch 桥接
- 省略 — 使用适配器的 `apiFormat` 声明（默认：根据 URL 自动检测）

Admin WebUI：设置面板 → "API 路由模式"下拉框。

---

## MCP 集成

MCP (Model Context Protocol) 深度集成在 `src/services/mcp/`。

### 支持的传输方式

| 传输 | 说明 |
|------|------|
| `stdio` | 标准输入输出 |
| `sse` | Server-Sent Events |
| `http` | HTTP 请求 |
| `ws` | WebSocket |
| `sdk` | SDK 直连 |
| `claudeai-proxy` | Claude.ai 代理 |

### 配置作用域

`local` → `user` → `project` → `dynamic` → `enterprise` → `managed`

MCP 服务器提供的工具被包装为 `MCPTool` 实例，通过 `assembleToolPool()` 与内置工具合并（同名时内置优先）。MCP prompts 可作为技能暴露（需 `MCP_SKILLS` flag）。

---

## Agent / 子代理系统

`AgentTool` 可生成独立对话线程的子代理，支持多种协作模式。

### Agent 定义

Agent 定义从 `~/.legna/agents/` 和 `<project>/.legna/agents/` 加载。`AppState.agentNameRegistry` 维护名称到 ID 的映射。

### 协作模式

| 模式 | 说明 |
|------|------|
| 子代理 (fork) | 独立对话线程，继承父上下文 |
| Agent Swarm | 团队创建/删除，成员间消息传递 |
| Coordinator | 协调者分派任务给 worker |
| In-process teammate | 同进程内，共享 transcript |
| Tmux teammate | 独立进程，tmux 面板 |

`AppState.teamContext` 跟踪团队成员关系。

---

## 会话管理

会话以 UUID 标识 (`SessionId`)，持久化为 `.jsonl` 文件。

### 存储位置 (三级 fallback)

```
1. <project>/.legna/sessions/<uuid>.jsonl   ← 新会话 (v1.3.0+)
2. ~/.legna/projects/<sanitized-cwd>/       ← 旧 legna 格式
3. ~/.claude/projects/<sanitized-cwd>/      ← legacy claude 格式
```

### JSONL 行格式

```json
{"type": "user", "sessionId": "uuid", "cwd": "/path", "slug": "会话标题", "timestamp": 1234567890}
```

### 关键操作

- `switchSession()` — 原子更新 sessionId + sessionProjectDir
- `regenerateSessionId()` — 创建新会话 (`/clear` 使用)
- `--resume` / `--continue` — 从文件恢复对话状态
- Fork — 从当前会话分支创建新会话

---

## Admin WebUI

### 架构

```
浏览器 ←→ Bun.serve (端口 3456)
              │
              ├─ 静态资源: 内联的 SPA (ADMIN_HTML/JS/CSS)
              │   路由: /__admin__/app.js, /__admin__/app.css
              │
              └─ REST API: /api/*
                  ├─ 数据端点按 scope 隔离 (claude | legna)
                  └─ 实时聊天通过 SSE 流式传输
```

### 前端面板

| 面板 | 功能 |
|------|------|
| 聊天 (Chat) | SSE 流式聊天，支持 thinking blocks、tool use 展示、中断 |
| 配置 (Settings) | 可视化编辑 settings.json (API 端点、密钥、模型映射、超时等) |
| 配置文件 (Profiles) | 列出所有 `settings*.json`，一键切换 |
| 会话 (Sessions) | 按项目分组浏览历史会话，一键复制 `legna --resume` 命令 |
| 迁移 (Migration) | 双向 Claude ↔ LegnaCode 迁移，字段选择 + diff 预览 |

### Scope 机制

所有数据端点通过 `scope` 参数隔离：
- `claude` → `~/.claude/`
- `legna` → `~/.legna/`

---

## Admin REST API

以下是 Admin 后端 (`src/server/admin.ts`) 暴露的 REST API，可用于外部工具对接。

### 通用端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/version` | 返回构建版本号 |
| `POST` | `/api/migrate` | 双向配置迁移 (支持字段选择、会话包含) |
| `POST` | `/api/chat` | 实时聊天 (SSE 流式响应) |
| `POST` | `/api/chat/abort` | 终止当前聊天进程 |

### Scope 端点 (`:scope` = `claude` | `legna`)

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/:scope/settings` | 读取 settings.json |
| `PUT` | `/api/:scope/settings` | 写入 settings.json |
| `GET` | `/api/:scope/profiles` | 列出所有 `settings*.json` 及元数据 |
| `POST` | `/api/:scope/profiles/switch` | 原子切换活跃配置文件 |
| `GET` | `/api/:scope/sessions` | 列出会话历史 (按项目分组) |
| `GET` | `/api/:scope/sessions/:id/messages` | 读取完整 JSONL 会话内容 |

### 实时聊天 SSE 协议

`POST /api/chat` 返回 SSE 流，事件类型：

| 事件 | 说明 |
|------|------|
| `partial` | 助手文本增量 |
| `thinking_partial` | 思考过程增量 |
| `text` | 完整文本块 |
| `thinking` | 完整思考块 |
| `tool_use` | 工具调用 |
| `tool_result` | 工具结果 |
| `result` | 最终结果 |
| `error` | 错误 |
| `done` | 流结束 |

内部实现：生成子进程 `legna -p --output-format stream-json --include-partial-messages`，通过 stdin 传入用户消息，stdout 转为 SSE 事件。

---

## npm 分发机制

### 架构

```
@legna-lnc/legnacode (主包)
  ├── npm/bin/legna.cjs      ← "legna" 命令入口 (纯 Node.js 启动器)
  ├── npm/postinstall.cjs    ← 安装后自动拉取平台二进制
  └── optionalDependencies:
      ├── @legna-lnc/legnacode-darwin-arm64
      ├── @legna-lnc/legnacode-darwin-x64
      ├── @legna-lnc/legnacode-darwin-x64-baseline
      ├── @legna-lnc/legnacode-linux-x64
      ├── @legna-lnc/legnacode-linux-x64-baseline
      ├── @legna-lnc/legnacode-linux-arm64
      ├── @legna-lnc/legnacode-win32-x64
      └── @legna-lnc/legnacode-win32-ia32
```

### 二进制定位策略 (`npm/bin/legna.cjs`)

按优先级依次尝试：
1. `require.resolve()` 查找平台包
2. 同级 scope 目录 (flat `node_modules/@legna-lnc/` 布局)
3. 嵌套 `node_modules` (postinstall `--no-save` 安装)
4. 全局 npm prefix 路径
5. 兜底：自动从官方 npm registry 安装平台包

设置 `LEGNA_DEBUG=1` 可打印所有搜索路径。遇到 `EACCES` 错误自动 `chmod 755` 修复。

### postinstall 行为

`npm/postinstall.cjs` 在 `npm install` 后运行：
- 检查平台二进制是否已存在
- 若不存在，从 `https://registry.npmjs.org` 安装 (绕过镜像同步延迟)
- 本地安装失败时 fallback 到全局安装

---

## 发版流程

### 完整发布命令

```bash
# 完整发布 (bump → webui build → compile all → npm publish)
bun run scripts/publish.ts

# 干跑模式 (不实际发布)
bun run scripts/publish.ts --dry-run
```

### 发布流水线 (`scripts/publish.ts`)

```
1. bump.ts — 同步所有版本号
   ├─ package.json: version + 8 个 optionalDependencies
   ├─ bunfig.toml: MACRO.VERSION
   └─ webui/package.json: version
       ↓
2. build-webui.ts — 构建 WebUI
   ├─ npm install (webui/)
   ├─ npm run build (tsc + vite)
   └─ inline-webui.ts → src/server/admin-ui-html.ts
       ↓
3. compile-all.ts — 7 平台交叉编译
   └─ 每个平台 → .npm-packages/<pkg>/bin/legna
       ↓
4. npm publish
   ├─ 7 个平台包 (--access public)
   └─ 1 个主包 @legna-lnc/legnacode
```

### 版本号同步清单

发版时必须同步更新以下所有位置：

1. `package.json` — `"version"` 字段
2. `bunfig.toml` — `MACRO.VERSION`
3. `webui/package.json` — `"version"` 字段
4. `package.json` — `optionalDependencies` 中所有平台包版本
5. `README.md` — 更新日志表格新增一行
6. `CHANGELOG.md` — 新增版本条目

`scripts/bump.ts` 自动处理 1-4，5-6 需手动更新。

```bash
# 版本号递增
bun run scripts/bump.ts patch   # 1.8.0 → 1.8.1
bun run scripts/bump.ts minor   # 1.8.0 → 1.9.0
bun run scripts/bump.ts major   # 1.8.0 → 2.0.0
bun run scripts/bump.ts 1.9.0   # 指定精确版本
```

---

## 安全加固

`src/security/processHardening.ts` 在启动时、任何业务逻辑之前执行。

### 加固措施

| 措施 | 平台 | 说明 |
|------|------|------|
| 禁用 core dump | Linux: `/proc/self/coredump_filter`; macOS: `kern.coredump` sysctl | 防止内存转储泄露敏感数据 |
| 清除危险环境变量 | 全平台 | `LD_PRELOAD`, `DYLD_INSERT_LIBRARIES`, `ELECTRON_RUN_AS_NODE` 等 |
| 净化 NODE_OPTIONS | 全平台 | 移除 `--require`, `--loader`, `--import`, `-r` 等注入向量 |
| ptrace 检测 | Linux | 通过 `/proc/self/status` TracerPid 检测调试器附加 |

所有失败均为非致命 (报告为警告)，不会阻止启动。

---

## 关键设计模式

### 1. 编译时死代码消除

`feature()` 从 `bun:bundle` 在编译时求值，禁用的 flag 对应的整个代码分支被剥离。这是管理庞大功能面的核心机制。

### 2. 动态 import 实现快速启动

CLI 入口全部使用动态 `import()`，每条执行路径只加载所需模块。`--version` 路径零 import，毫秒级响应。

### 3. Memoization

广泛使用 `lodash-es/memoize` 缓存昂贵操作：设置加载、命令组装、git 操作等。`init()` 本身也是 memoized 的。

### 4. Zod 校验边界

所有外部数据 (hook 输出、MCP 配置、settings) 使用 Zod schema 校验，常配合 `lazySchema()` 延迟求值。

### 5. Signal 模式

`createSignal()` 提供轻量级 pub/sub，用于跨模块通信而不引入 import 循环 (会话切换、动态技能加载、设置变更)。

### 6. 循环依赖打破

- 类型提取到 `src/types/` (无运行时依赖)
- `bootstrap/state.ts` 作为 import DAG 叶节点
- 使用 lazy `require()` 打破循环

### 7. React/Ink 终端 UI

终端 UI 使用 React + Ink 渲染。工具结果、权限对话框、进度指示器都是 React 组件。WebUI 使用标准 React DOM。

### 8. `--bare` 精简模式

设置 `CLAUDE_CODE_SIMPLE` 环境变量，跳过 hooks、LSP、插件同步、技能发现、归因、后台预取、keychain 读取。约 30 处代码检查此标志。

---

## 配置路径速查

### 项目级 (`<project>/.legna/`，自动 gitignore)

```
sessions/       # 会话记录 (JSONL)
skills/         # 项目技能
rules/          # 项目规则
agents/         # 项目 Agent 定义
settings.json   # 项目设置
LEGNA.md        # 项目指令文件
memory/         # 项目记忆
workflows/      # 工作流定义
```

### 用户级 (`~/.legna/`)

```
settings.json       # 全局设置
.credentials.json   # 认证凭据
plugins/            # 已安装插件
skills/             # 用户技能
rules/              # 用户规则
agents/             # 用户 Agent 定义
```

### 核心路径解析模块

- `src/utils/legnaPathResolver.ts` — `PROJECT_FOLDER` / `LEGACY_FOLDER` / `resolveProjectPath()`
- `src/utils/envUtils.ts` — `getClaudeConfigHomeDir()` → `~/.legna`，`runGlobalMigration()` 单次迁移
- `src/utils/ensureLegnaGitignored.ts` — 自动将 `.legna/` 加入 `.gitignore`
