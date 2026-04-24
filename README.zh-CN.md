<div align="center">

# LegnaCode CLI

**AI 驱动的终端编程助手，全面增强。**

[![version](https://img.shields.io/badge/version-1.9.2-blue)](./CHANGELOG.zh-CN.md)
[![platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-brightgreen)](#平台支持)
[![license](https://img.shields.io/badge/license-MIT-yellow)](./LICENSE)
[![Claude Code](https://img.shields.io/badge/based%20on-Claude%20Code-blueviolet)](https://github.com/anthropics/claude-code)

🌐 [English](./README.md) · 📊 [对比 Claude Code](./COMPARISON.zh-CN.md) · 📋 [更新日志](./CHANGELOG.zh-CN.md)

<img width="855" height="319" alt="image" src="https://github.com/user-attachments/assets/6e94a216-e382-49df-aa2f-63fb96336614" />


</div>

---

LegnaCode 基于 [Claude Code CLI](https://github.com/anthropics/claude-code) 深度增强——完全兼容原版，同时新增多模态工具、更智能的记忆、更好的用户体验。

### 亮点

🧠 **记忆 token 减少 88%** — 4 层记忆栈 + 向量搜索，替代扁平 MEMORY.md 注入\
🎨 **6 个多模态工具** — 图像、视频、语音、音乐、视觉、网页搜索（MiniMax 模型）\
⚡ **即时反馈** — 第 1 秒起显示 token 计数，状态在 spinner 行显示，无静默操作\
🔌 **可插拔记忆** — DrawerStore（SQLite + TF-IDF）、时序知识图谱、WAL 审计\
🤖 **更智能的 Agent** — RPC 子进程执行、自主技能检测、智能模型路由

---

## 更新日志

| 版本 | 摘要 |
|------|------|
| **1.9.2** | Computer Use Python 桥接（macOS + Windows）；自动 Python 3.12+ venv 设置；Computer Use feature gate 全面解锁 |
| **1.9.0** | 可移植会话（相对路径 cwd）；WebUI 全面改版（项目浏览器、记忆编辑器、力导向关系图谱）；完整项目迁移（sessions + subagents + memory + skills + agents + rules + MCP 配置）；配置切换改为指针文件 |
| **1.8.5** | Token 优化：压缩工具提示词（BashTool/AgentTool/TodoWrite/EnterPlanMode）；修复 Kimi/MiniMax/MiMo 适配器 cache_control 被误删 |

<details>
<summary>1.8.x 补丁</summary>

| 版本 | 摘要 |
|------|------|
| 1.8.4 | 修复 `isVirtual in m` 崩溃 — 会话转录处理空值守卫 |
| 1.8.3 | GitHub Actions CI 自动发版工作流；OML agent 类型修复；全平台 Rust native addon 交叉编译 |
| 1.8.2 | 消息管线空值守卫修复运行时崩溃；Rust 原生 Addon（sandbox/file-search/apply-patch）darwin-arm64 编译 |

</details>

| **1.8.0** | Codex 全面融合：插件适配器 + 市场、Skills 发现、配置互通；TS/Python SDK；TTS + WebRTC 语音 |

<details>
<summary>更早版本</summary>

| 版本 | 摘要 |
|------|------|
| 1.5.7 | Git 风格 `/fork` 命令：从任意消息分叉（`@N`）、列出分支树、切换分支 |
| 1.5.6 | WebUI SSE 超时修复（255s 最大值）；controller 重复关闭崩溃修复 |
| 1.5.4 | 全平台二进制同步重发 |
| 1.5.3 | Hermes 自我进化闭环；Qwen 适配器；WebUI 聊天查看器与实时聊天；自动 Skill 创建 |
| 1.5.2 | 性能审计：CodeGraph async 化 + undoTracker 大文件保护 + 状态文案 i18n |
| 1.5.1 | Skill 主动调用（OML 1% 规则）；前端/设计指令自动注入；增强 designer agent |
| 1.5.0 | 修复 REPL 启动死锁；移除 /undo 静态导入；AtomCode 全部特性完整接线 |
| 1.4.9 | Baseline（无 AVX）构建，支持老款 x64 CPU（darwin-x64-baseline、linux-x64-baseline） |
| 1.4.8 | AtomCode 融合（Pangu CJK 间距、挫败检测、循环守卫、错误文件注入、首次全文读取） |
| 1.4.7 | claude-mem 融合（content-hash 去重、token 经济学、使用反馈、90 天衰减、隐私标签） |
| 1.4.6 | OML skill 崩溃修复；计划+记忆改为项目本地；compound engineering 融合 |
| 1.4.5 | OpenViking 内容分级融合（L0/L1/L2 降级 + 预算封顶注入） |
| 1.4.4 | 状态提示改为 spinner 行显示；新增功能对比文档 |
| 1.4.3 | mempalace 记忆融合（DrawerStore + TF-IDF + 4 层栈 + 知识图谱） |
| 1.4.2 | 进度反馈增强（8 个静默路径修复）；verbose 默认开启 |
| 1.3.6 | Windows 路径分隔符修复 |
| 1.3.5 | SessionStart hook 修复；Windows 渲染修复 |
| 1.3.4 | OML Superpowers（11 个 skill）；SessionStart 引导 |
| 1.3.3 | OML 智能编排（19 个 agent skill） |
| 1.3.2 | 禁用 History Snip；Windows 流式渲染修复 |
| 1.3.1 | 1M 模型 snip 阈值修复 |
| 1.3.0 | 项目本地化存储；`legna migrate` |
| 1.2.1 | 模型适配器层（MiMo、GLM、DeepSeek、Kimi、MiniMax） |
| 1.2.0 | 会话按项目分组；Windows 原生编译 |
| 1.1.5–1.1.9 | Windows 安装修复；WebUI 管理面板 |
| 1.0.0–1.0.9 | 初始发布；Feature Flags；i18n；BUDDY 宠物 |

</details>

完整记录 → [CHANGELOG.zh-CN.md](./CHANGELOG.zh-CN.md)

---

## 致谢

基于 [Claude Code CLI](https://github.com/anthropics/claude-code)（Anthropic）构建——开创性的终端 AI 编程工具。LegnaCode 在完全兼容上游的基础上，增加了多模态能力、更智能的记忆和增强的用户体验。感谢 Anthropic 团队的开源贡献。

---

## 特性

<table>
<tr><td>

**🎨 多模态**（MiniMax）
- 图像 / 视频 / 语音生成
- 音乐生成 / 视觉理解 / 网页搜索
- 自动编排工作流
- `/auth-minimax` 配置

</td><td>

**🧠 记忆**
- 4 层栈（~800 token/轮）
- TF-IDF 向量搜索（<5ms）
- 时序知识图谱
- 压缩前自动保存

</td></tr>
<tr><td>

**⚡ Agent**
- RPC 子进程工具执行
- 智能模型路由
- 自主技能检测
- 跨会话 `/recall` 搜索

</td><td>

**🛡️ 核心**
- 45+ 内置工具
- 多云 AI 后端
- MCP 协议支持
- 多 Agent 协作

</td></tr>
<tr><td>

**🖥️ 体验**
- verbose 默认开启
- 第 1 秒起显示 token 计数
- 状态在 spinner 行显示
- 中断原因可见

</td><td>

**🔧 运维**
- WebUI 管理面板
- `legna migrate` 迁移工具
- 纯 TS 语法高亮
- 跨平台预编译二进制

</td></tr>
</table>

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

如果使用镜像源（如 cnpm、淘宝源）安装失败或版本未同步，可指定官方源：

```bash
npm install -g @legna-lnc/legnacode --registry=https://registry.npmjs.org
```

安装后即可在任意目录使用 `legna` 命令。会自动下载当前平台的预编译二进制（支持 macOS arm64/x64、Linux x64/arm64、Windows x64）。

### 老款 CPU（无 AVX 指令集）

如果看到 `warn: CPU lacks AVX support, strange crashes may occur`，请安装 baseline 版本：

```bash
# macOS Intel（2011 年前或无 AVX 的黑苹果）
npm i -g @legna-lnc/legnacode-darwin-x64-baseline

# Linux x64（无 AVX 的老服务器/虚拟机）
npm i -g @legna-lnc/legnacode-linux-x64-baseline
```

baseline 二进制位于 `node_modules/@legna-lnc/legnacode-<platform>-baseline/bin/legna`，添加到 PATH 或创建别名即可使用。

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
├── stubs/                 # 原生模块 stub（编译时外部依赖占位）
├── scripts/               # 构建脚本
├── bunfig.toml            # Bun 构建配置（Feature Flags、宏定义）
└── package.json
```

---

## 构建

LegnaCode 使用 Bun bundler 构建，两种模式：

- `bun run build` — 构建到 `dist/`，适合开发调试
- `bun run compile` — 编译为独立二进制 `legna`，无需 Bun 运行时

### Admin WebUI

`legna admin` 启动浏览器管理面板，通过 Web 界面管理所有配置。

```bash
# 启动管理面板（默认端口 3456，自动打开浏览器）
legna admin

# 自定义端口
legna admin 8080
```

面板顶部通过 Tab 切换：**Claude** (`~/.claude/`) 和 **LegnaCode** (`~/.legna/`)，每个 scope 提供四个面板：

| 面板 | 功能 |
|------|------|
| 配置编辑 | 可视化编辑 settings.json：API 端点、模型映射、超时、权限等 |
| 配置文件 | 列出所有 settings*.json，一键切换激活配置 |
| 会话记录 | 浏览历史会话，一键复制 `legna --resume` 命令 |
| 配置迁移 | Claude ↔ LegnaCode 双向迁移，迁移前预览 diff |

> 从源码运行需先构建前端：`cd webui && npm install && npm run build`，然后 `bun run src/server/admin.ts`。npm 安装版已包含预构建 WebUI。

构建时通过 `bunfig.toml` 的 `[bundle.define]` 注入编译时常量，`[bundle.features]` 控制 Feature Flags 实现死代码消除。

---

## 配置

LegnaCode 使用 `~/.legna/` 作为全局配置目录，项目级数据在 `<project>/.legna/`：

- `~/.legna/settings.json` — 全局设置
- `~/.legna/.credentials.json` — 认证凭据
- `<project>/.legna/sessions/` — 会话记录（JSONL）
- `<project>/.legna/skills/` — 技能
- `<project>/.legna/rules/` — 规则
- `LEGNA.md` — 项目指令文件

> 首次启动自动从 `~/.claude/` 迁移到 `~/.legna/`。设置 `LEGNA_NO_CONFIG_SYNC=1` 可禁止。

### legna migrate

```bash
legna migrate              # 迁移全部
legna migrate --global     # 仅全局数据
legna migrate --sessions   # 仅项目会话
legna migrate --dry-run    # 预览模式
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 |
| `CLAUDE_CODE_USE_BEDROCK` | 使用 AWS Bedrock 后端 |
| `CLAUDE_CODE_USE_VERTEX` | 使用 GCP Vertex 后端 |
| `CLAUDE_CODE_SYNTAX_HIGHLIGHT` | 设为 `0` 禁用语法高亮 |
| `MINIMAX_API_KEY` | MiniMax API 密钥（启用多模态工具） |
| `MINIMAX_REGION` | MiniMax 区域：`global`（默认）或 `cn` |
| `MINIMAX_BASE_URL` | 自定义 MiniMax API 地址 |

---

## MiniMax 多模态集成

使用 MiniMax 模型且配置了 `MINIMAX_API_KEY` 时，自动注册 6 个多模态工具。

### 配置

```bash
# 方式一：环境变量
export MINIMAX_API_KEY="your-api-key"
export MINIMAX_REGION="global"  # 或 "cn"

# 方式二：交互式（持久化到 ~/.legna/minimax-credentials.json）
legna
> /auth-minimax your-api-key
```

API key 获取：[MiniMax 国际站](https://platform.minimax.io) 或 [MiniMax 国内站](https://platform.minimaxi.com)

### 工具

| 工具 | 功能 | 示例 |
|------|------|------|
| `MiniMaxImageGenerate` | 文字生成图像 | "生成一张赛博朋克风格的城市夜景" |
| `MiniMaxVideoGenerate` | 文字/图像生成视频 | "把这张图片做成 5 秒动画" |
| `MiniMaxSpeechSynthesize` | 文字转语音 | "把这段文字转成语音" |
| `MiniMaxMusicGenerate` | 文字生成音乐 | "生成一段轻快的钢琴背景音乐" |
| `MiniMaxVisionDescribe` | 图像理解 | "描述这张图片的内容" |
| `MiniMaxWebSearch` | 网页搜索 | "搜索最新的 TypeScript 5.x 特性" |

仅在使用 MiniMax 模型时自动启用，不影响其他模型。

### 工作流示例

```
用户：帮我做一个项目宣传视频

AI 自动编排：
1. 分析 README，提取核心卖点
2. MiniMaxImageGenerate → 生成关键帧
3. MiniMaxVideoGenerate → 生成视频
4. MiniMaxSpeechSynthesize → 生成旁白
5. 返回所有资源 URL
```

---

## 许可证

本项目遵循上游 Claude Code CLI 的开源许可协议。详见 [Claude Code CLI](https://github.com/anthropics/claude-code) 原始仓库。

---

<div align="center">

**[Claude Code CLI](https://github.com/anthropics/claude-code)** · **[Anthropic](https://www.anthropic.com)** · **[Model Context Protocol](https://modelcontextprotocol.io)**

</div>
