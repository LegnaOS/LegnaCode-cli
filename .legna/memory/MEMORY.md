# LegnaCode 项目记忆

## 发版流程（CI 自动化）

用户说"打包"或"发版"时，执行以下步骤：

```bash
bun run scripts/bump.ts <版本号>
git add -A && git commit -m "v<版本号>"
git tag v<版本号>
git push origin main --tags
```

GitHub Actions 自动完成：
- 4 个平台 runner 并行编译 Rust native addon（darwin-arm64/x64, linux-x64/arm64）
- 7 个 Bun 交叉编译（darwin/linux/win32 × arm64/x64 + baseline）
- 全部打包发布到 npm

不再需要手动跑 `compile-all.ts`、`npm publish` 或换机器编译。

同时记得更新：
- `README.md` / `README.zh-CN.md` — 版本徽章 + 更新日志表
- `CHANGELOG.md` / `CHANGELOG.zh-CN.md` — 新版本条目

## 发版铁律

每次发版必须同步更新以下所有位置的版本号，缺一不可：

1. `package.json` — `"version"`
2. `bunfig.toml` — `MACRO.VERSION`
3. `webui/package.json` — `"version"`
4. `package.json` — `optionalDependencies` 里 5 个平台包版本
5. `README.md` — 更新日志表格新增一行
6. `CHANGELOG.md` — 新增版本条目
7. npm 发布：5 个平台包 + 1 个主包，版本号全部一致
8. git commit + push

漏掉任何一个都会导致版本混乱。先改完所有文件，再统一编译发布。

## 项目结构关键路径

- 入口: `src/entrypoints/cli.tsx` — fast-path 级联
- Admin 后端: `src/server/admin.ts` — Bun.serve REST API
- Admin 前端内联: `src/server/admin-ui-html.ts` — 自动生成，勿手动编辑
- 前端源码: `webui/src/` — React + Vite + Tailwind
- 构建脚本: `scripts/build-webui.ts` (构建+内联), `scripts/inline-webui.ts`, `scripts/compile-all.ts`, `scripts/publish.ts`
- npm bin wrapper: `npm/bin/legna.cjs` (必须 .cjs，因为 package.json 是 ESM)

## WebUI 内联机制

前端构建产物通过 `scripts/inline-webui.ts` 内联为字符串常量写入 `src/server/admin-ui-html.ts`，编译后的二进制不依赖外部文件。修改前端后必须重新运行 `bun run scripts/build-webui.ts` 再编译。

## settings.json 实际字段

- `alwaysThinkingEnabled` (不是 alwaysThink)
- `skipDangerousModePermissionPrompt` (不是 skipDangerousConfirmation)
- `permissions.defaultMode` (嵌套，不是顶层 permissions)
- `language` (不是 preferredLanguage)
- `env.ANTHROPIC_DEFAULT_OPUS_MODEL` / `SONNET_MODEL` / `HAIKU_MODEL`
- `env.API_TIMEOUT_MS` (不是 CLAUDE_CODE_API_TIMEOUT)
- `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` (值为 "1")

## 会话文件结构

v1.3.0 起，新会话写入项目本地 `<project>/.legna/sessions/<uuid>.jsonl`。读取时三级 fallback：
1. `<project>/.legna/sessions/` — 项目本地（新）
2. `~/.legna/projects/<sanitized-cwd>/` — 全局 legna（旧）
3. `~/.claude/projects/<sanitized-cwd>/` — 全局 claude（legacy）

每行 JSON 有 `type`/`sessionId`/`cwd`/`slug`/`timestamp` 字段，`type: "user"` 的行数即 prompt 数量。

## 存储路径架构 (v1.3.0+)

项目级数据统一在 `<project>/.legna/` 下（自动 gitignore）：
- sessions/, skills/, rules/, settings.json, LEGNA.md, agent-memory/, workflows/, memory/

全局数据在 `~/.legna/`（首次启动从 `~/.claude/` 单向迁移）：
- settings.json, .credentials.json, plugins/, skills/, rules/, agents/

核心路径解析：
- `src/utils/legnaPathResolver.ts` — PROJECT_FOLDER/LEGACY_FOLDER/resolveProjectPath
- `src/utils/envUtils.ts` — getClaudeConfigHomeDir() 直接返回 ~/.legna，runGlobalMigration() 单次迁移
- `src/utils/ensureLegnaGitignored.ts` — 自动 gitignore
- `src/commands/migrate/` — `legna migrate` CLI 命令

## Feedback

- [Exclude vendor directory](feedback_exclude_vendor.md) — 探索/分析代码库时始终跳过 vendor/
