# LegnaCode CLI
<img width="1256" height="416" alt="image" src="https://github.com/user-attachments/assets/5e4717e6-3404-4901-9f5c-1c6462fb1c1a" />
<img width="1072" height="874" alt="image" src="https://github.com/user-attachments/assets/819c39e8-9db6-4d8d-b911-13600c525422" />

LegnaCode 是一个基于 Anthropic Claude 的智能终端编程助手，让你直接在命令行中与 AI 协作完成软件工程任务——编辑文件、执行命令、搜索代码、管理 Git 工作流等。

---

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

| 版本 | 日期 | 摘要 |
|------|------|------|
| [1.3.6](./CHANGELOG.md#136---2026-04-09) | 2026-04-09 | 修复 Windows 路径分隔符导致 Edit 工具 "File has been unexpectedly modified" 误报 |
| [1.3.5](./CHANGELOG.md#135---2026-04-07) | 2026-04-07 | 修复 SessionStart hook 报错，Windows alt-screen 渲染深度修复（消除 fullReset 闪烁） |
| [1.3.4](./CHANGELOG.md#134---2026-04-07) | 2026-04-07 | OML Superpowers 工程纪律（/verify /tdd /debug /brainstorm 等 11 个 skill），SessionStart 技能引导 |
| [1.3.3](./CHANGELOG.md#133---2026-04-07) | 2026-04-07 | OML 智能编排层内置（magic keywords + 19 agent skills），Windows Terminal fullscreen 修复 |
| [1.3.2](./CHANGELOG.md#132---2026-04-07) | 2026-04-07 | 禁用 History Snip，修复 Windows Terminal 流式文本渲染 |
| [1.3.1](./CHANGELOG.md#131---2026-04-06) | 2026-04-06 | 修复 1M 模型被过早 snip 的问题，snip 阈值感知 context window 大小 |
| [1.3.0](./CHANGELOG.md#130---2026-04-04) | 2026-04-04 | 项目本地化存储：会话/skills/memory/rules 下沉到 `<project>/.legna/`，全局迁移 `~/.claude/` → `~/.legna/`，`legna migrate` 命令 |
| [1.2.1](./CHANGELOG.md#121---2026-04-04) | 2026-04-04 | 模型适配器层：MiMo、GLM、DeepSeek、Kimi、MiniMax 五大提供商深度兼容 |
| [1.2.0](./CHANGELOG.md#120---2026-04-03) | 2026-04-03 | 会话按项目分组、resume 带 cd、迁移支持会话记录、Windows 原生编译 |
| [1.1.9](./CHANGELOG.md#119---2026-04-03) | 2026-04-03 | postinstall 自动安装平台包，修复 Windows/镜像源 optionalDependencies 失效 |
| [1.1.8](./CHANGELOG.md#118---2026-04-03) | 2026-04-03 | bin wrapper 自动安装缺失平台包，修复 Windows npm 全局安装问题 |
| [1.1.7](./CHANGELOG.md#117---2026-04-03) | 2026-04-03 | 彻底修复 Windows external module 报错，清空 external 列表 |
| [1.1.6](./CHANGELOG.md#116---2026-04-03) | 2026-04-03 | 修复 Windows external module 报错、全平台发版流程自动化、版本号统一 |
| [1.1.5](./CHANGELOG.md#115---2026-04-03) | 2026-04-03 | WebUI 管理面板 (`legna admin`)、双目录管理、配置迁移、npm 全平台发布 |
| [1.0.9](./CHANGELOG.md#109---2026-04-03) | 2026-04-03 | i18n 多语言补全、内置精美状态栏、配置自动迁移 |
| [1.0.8](./CHANGELOG.md#108---2026-04-02) | 2026-04-02 | MONITOR_TOOL、WORKFLOW_SCRIPTS、HISTORY_SNIP，3 个重量级子系统，累计 47 flags |
| [1.0.7](./CHANGELOG.md#107---2026-04-02) | 2026-04-02 | TERMINAL_PANEL、WEB_BROWSER_TOOL、TEMPLATES、BG_SESSIONS，累计 44 flags |
| [1.0.6](./CHANGELOG.md#106---2026-04-02) | 2026-04-02 | CACHED_MICROCOMPACT、AGENT_TRIGGERS、TREE_SITTER_BASH 等 7 个功能，累计 40 flags |
| [1.0.5](./CHANGELOG.md#105---2026-04-02) | 2026-04-02 | AGENT_TRIGGERS、MCP_SKILLS、REACTIVE_COMPACT、REVIEW_ARTIFACT 等 6 个功能，累计 39 flags |
| [1.0.4](./CHANGELOG.md#104---2026-04-02) | 2026-04-02 | ULTRAPLAN、VERIFICATION_AGENT、AUTO_THEME 等 10 个功能，累计 33 flags |
| [1.0.3](./CHANGELOG.md#103---2026-04-02) | 2026-04-02 | COMMIT_ATTRIBUTION、BASH_CLASSIFIER、EXTRACT_MEMORIES 等 16 个功能 |
| [1.0.2](./CHANGELOG.md#102---2026-04-02) | 2026-04-02 | QUICK_SEARCH、MESSAGE_ACTIONS、FORK_SUBAGENT、HISTORY_PICKER |
| [1.0.1](./CHANGELOG.md#101---2026-04-02) | 2026-04-02 | BUDDY 虚拟宠物、TOKEN_BUDGET、构建系统修复 |
| [1.0.0](./CHANGELOG.md#100---2026-03-31) | 2026-03-31 | 初始发布 |

---

## 致谢

本项目基于 [Claude Code CLI](https://github.com/anthropics/claude-code) 的公开源码构建。

Claude Code 是 Anthropic 团队打造的一款出色的终端 AI 编程工具，它开创性地将大语言模型与命令行开发工作流深度融合，提供了文件编辑、代码搜索、Shell 执行、MCP 协议等丰富能力。LegnaCode 站在这个优秀项目的肩膀上，进行了定制化改造和品牌适配。

感谢 Anthropic 团队将 Claude Code CLI 开源，让社区能够在此基础上探索更多可能性。

---

## 特性

- **终端原生体验** — 基于 React + Ink 构建的现代终端 UI，支持语法高亮、结构化 Diff 展示
- **45+ 内置工具** — 文件读写、代码搜索（Glob/Grep）、Shell 执行、Web 抓取、Jupyter Notebook 编辑等
- **多层安全防护** — Bash/Zsh/PowerShell 命令安全检测、沙箱机制、权限分级控制
- **多云 AI 后端** — 支持 Anthropic API、AWS Bedrock、GCP Vertex、Azure
- **MCP 协议支持** — 通过 Model Context Protocol 连接外部工具和数据源
- **多 Agent 协作** — 支持子 Agent 派生、团队协作、任务编排
- **插件与技能系统** — 可扩展的插件架构和可复用的技能工作流
- **持久化记忆** — 跨会话的上下文记忆系统
- **纯 TS 语法高亮** — 内置基于 highlight.js 的纯 TypeScript 语法高亮实现，无需原生模块依赖
- **WebUI 管理面板** — `legna admin` 启动浏览器管理面板，可视化编辑配置、切换配置文件、浏览会话记录、迁移数据
- **`legna migrate` 命令** — 手动迁移 `~/.claude/` 数据到项目本地 `.legna/`，支持 `--global`/`--sessions`/`--dry-run`

---

## 环境要求

| 依赖 | 版本 |
|------|------|
| [Bun](https://bun.sh) | >= 1.2.0 |
| Node.js | >= 18（可选） |
| Git | >= 2.0 |
| 操作系统 | macOS / Linux |

---

## 安装

### 方式一：npm 全局安装（推荐）

```bash
npm install -g @legna-lnc/legnacode
```

安装后即可在任意目录使用 `legna` 命令。会自动下载当前平台的预编译二进制（支持 macOS arm64/x64、Linux x64/arm64、Windows x64）。

```bash
# 验证安装
legna --version

# 更新到最新版
npm update -g @legna-lnc/legnacode
```

### 方式二：从源码编译

```bash
git clone https://github.com/LegnaOS/LegnaCode-cli.git
cd LegnaCode-cli
bun install
bun run compile
# 编译产物为 ./legna，可移动到 PATH 中
```

---

## 快速开始

```bash
# 交互模式
legna

# 非交互模式（直接提问）
legna -p "解释这段代码的作用"

# 继续上次会话
legna --continue

# 查看版本
legna --version
```

---

## 项目结构

```
├── src/
│   ├── entrypoints/       # 入口文件（cli.tsx）
│   ├── server/            # HTTP 服务器（admin WebUI）
│   ├── components/        # React/Ink 终端 UI 组件
│   ├── tools/             # 内置工具（Bash、文件操作、搜索等）
│   ├── services/          # API 调用、MCP 客户端、分析等
│   ├── native-ts/         # 纯 TS 实现的原生模块替代（语法高亮等）
│   ├── utils/             # 工具函数
│   └── hooks/             # React hooks
├── webui/                 # Admin WebUI 前端（React + Vite + Tailwind）
├── stubs/                 # 原生模块的 stub（编译时外部依赖占位）
├── scripts/               # 构建脚本
├── bunfig.toml            # Bun 构建配置（Feature Flags、宏定义）
└── package.json
```

---

## 构建说明

LegnaCode 使用 Bun 的 bundler 进行构建，支持两种模式：

- `bun run build` — 构建到 `dist/` 目录，适合开发调试
- `bun run compile` — 编译为独立二进制 `legna`，无需 Bun 运行时

### Admin WebUI

`legna admin` 启动一个浏览器管理面板，让你通过 Web 界面管理所有配置，无需手动编辑 JSON 文件。

```bash
# 启动管理面板（默认端口 3456，自动打开浏览器）
legna admin

# 自定义端口
legna admin 8080
```

面板顶部通过 Tab 切换管理对象：**Claude** (`~/.claude/`) 和 **LegnaCode** (`~/.legna/`)，每个 scope 下提供四个功能面板：

| 面板 | 功能 |
|------|------|
| 配置编辑 | 可视化编辑 settings.json：API 端点、API Key、模型映射（Opus/Sonnet/Haiku）、超时、权限模式、语言等 |
| 配置文件 | 列出所有 settings*.json，显示 baseUrl/model，一键切换激活配置 |
| 会话记录 | 浏览历史会话，显示项目路径、slug、时间、prompt 数量，一键复制 `legna --resume` 命令 |
| 配置迁移 | Claude ↔ LegnaCode 双向迁移，支持全量或选择性字段迁移，迁移前预览 diff |

> 从源码运行时需要先构建前端：`cd webui && npm install && npm run build`，然后 `bun run src/server/admin.ts`。npm 全局安装的版本已包含预构建的 WebUI。

构建时通过 `bunfig.toml` 中的 `[bundle.define]` 注入版本号等编译时常量，通过 `[bundle.features]` 控制 Feature Flags 实现死代码消除。

原生模块（`color-diff-napi`、`modifiers-napi` 等）标记为 `external`，运行时从 `stubs/` 加载占位实现。语法高亮已切换为 `src/native-ts/color-diff/` 下的纯 TypeScript 实现，无需任何原生编译依赖。

---

## 配置

LegnaCode 使用 `~/.legna/` 作为全局配置目录，项目级数据存储在 `<project>/.legna/`：

- `~/.legna/settings.json` — 全局用户设置
- `~/.legna/.credentials.json` — 认证凭据
- `<project>/.legna/sessions/` — 项目会话记录（JSONL）
- `<project>/.legna/skills/` — 项目技能
- `<project>/.legna/rules/` — 项目规则
- `<project>/.legna/settings.json` — 项目级设置
- `LEGNA.md` — 项目指令文件，AI 会自动读取并遵循

> 首次启动时自动从 `~/.claude/` 单向迁移全局数据到 `~/.legna/`（不覆盖已有文件）。旧的 `~/.claude/projects/` 会话通过 fallback 链自动读取，无需手动迁移。设置 `LEGNA_NO_CONFIG_SYNC=1` 可禁止自动迁移。

### legna migrate

手动迁移数据：

```bash
# 迁移全部（全局 + 当前项目会话）
legna migrate

# 仅迁移全局数据 ~/.claude/ → ~/.legna/
legna migrate --global

# 仅迁移当前项目会话到本地 .legna/sessions/
legna migrate --sessions

# 预览模式（不实际移动文件）
legna migrate --dry-run
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 |
| `CLAUDE_CODE_USE_BEDROCK` | 使用 AWS Bedrock 后端 |
| `CLAUDE_CODE_USE_VERTEX` | 使用 GCP Vertex 后端 |
| `CLAUDE_CODE_SYNTAX_HIGHLIGHT` | 设为 `0` 禁用语法高亮 |

---

## 许可证

本项目遵循上游 Claude Code CLI 的开源许可协议。详见 [Claude Code CLI](https://github.com/anthropics/claude-code) 原始仓库。

---

## 相关链接

- [Claude Code CLI（上游项目）](https://github.com/anthropics/claude-code)
- [Anthropic](https://www.anthropic.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
