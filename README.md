# LegnaCode CLI
<img width="1473" height="566" alt="image" src="https://github.com/user-attachments/assets/71830a59-86f6-47c6-a368-926a36c09f30" />
LegnaCode 是一个基于 Anthropic Claude 的智能终端编程助手，让你直接在命令行中与 AI 协作完成软件工程任务——编辑文件、执行命令、搜索代码、管理 Git 工作流等。

---

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

| 版本 | 日期 | 摘要 |
|------|------|------|
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

---

## 环境要求

| 依赖 | 版本 |
|------|------|
| [Bun](https://bun.sh) | >= 1.2.0 |
| Node.js | >= 18（可选） |
| Git | >= 2.0 |
| 操作系统 | macOS / Linux |

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/LegnaOS/LegnaCode-cli.git
cd LegnaCode-cli
```

### 2. 安装依赖

```bash
bun install
```

### 3. 编译为独立二进制

```bash
bun run compile
```

### 4. 运行

```bash
# 交互模式
./legna

# 非交互模式（直接提问）
./legna -p "解释这段代码的作用"

# 继续上次会话
./legna --continue

# 查看版本
./legna --version
```

---

## 项目结构

```
├── src/
│   ├── entrypoints/       # 入口文件（cli.tsx）
│   ├── components/        # React/Ink 终端 UI 组件
│   ├── tools/             # 内置工具（Bash、文件操作、搜索等）
│   ├── services/          # API 调用、MCP 客户端、分析等
│   ├── native-ts/         # 纯 TS 实现的原生模块替代（语法高亮等）
│   ├── utils/             # 工具函数
│   └── hooks/             # React hooks
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

构建时通过 `bunfig.toml` 中的 `[bundle.define]` 注入版本号等编译时常量，通过 `[bundle.features]` 控制 Feature Flags 实现死代码消除。

原生模块（`color-diff-napi`、`modifiers-napi` 等）标记为 `external`，运行时从 `stubs/` 加载占位实现。语法高亮已切换为 `src/native-ts/color-diff/` 下的纯 TypeScript 实现，无需任何原生编译依赖。

---

## 配置

LegnaCode 使用与 Claude Code 兼容的配置体系：

- `~/.claude/settings.json` — 全局用户设置
- `项目根目录/.claude/settings.json` — 项目级设置
- `CLAUDE.md` — 项目指令文件，AI 会自动读取并遵循

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
