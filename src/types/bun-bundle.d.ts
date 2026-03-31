/**
 * Type declarations for Bun's build-time feature flag system.
 *
 * `bun:bundle` provides compile-time dead code elimination.
 * `feature(flag)` returns a boolean that Bun evaluates at bundle time,
 * allowing the bundler to strip unreachable branches entirely.
 *
 * All 87 feature flags extracted from the codebase are listed below.
 */
declare module 'bun:bundle' {
  export function feature(
    flag:
      | 'ABLATION_BASELINE'
      | 'AGENT_MEMORY_SNAPSHOT'
      | 'AGENT_TRIGGERS'
      | 'AGENT_TRIGGERS_REMOTE'
      | 'ALLOW_TEST_VERSIONS'
      | 'ANTI_DISTILLATION_CC'
      | 'AUTO_THEME'
      | 'AWAY_SUMMARY'
      | 'BASH_CLASSIFIER'
      | 'BG_SESSIONS'
      | 'BREAK_CACHE_COMMAND'
      | 'BRIDGE_MODE'
      | 'BUDDY'
      | 'BUILDING_CLAUDE_APPS'
      | 'BUILTIN_EXPLORE_PLAN_AGENTS'
      | 'BYOC_ENVIRONMENT_RUNNER'
      | 'CACHED_MICROCOMPACT'
      | 'CCR_AUTO_CONNECT'
      | 'CCR_MIRROR'
      | 'CCR_REMOTE_SETUP'
      | 'CHICAGO_MCP'
      | 'COMMIT_ATTRIBUTION'
      | 'COMPACTION_REMINDERS'
      | 'CONNECTOR_TEXT'
      | 'CONTEXT_COLLAPSE'
      | 'COORDINATOR_MODE'
      | 'COWORKER_TYPE_TELEMETRY'
      | 'DAEMON'
      | 'DIRECT_CONNECT'
      | 'DOWNLOAD_USER_SETTINGS'
      | 'DUMP_SYSTEM_PROMPT'
      | 'ENHANCED_TELEMETRY_BETA'
      | 'EXPERIMENTAL_SKILL_SEARCH'
      | 'EXTRACT_MEMORIES'
      | 'FILE_PERSISTENCE'
      | 'FORK_SUBAGENT'
      | 'HARD_FAIL'
      | 'HISTORY_PICKER'
      | 'HISTORY_SNIP'
      | 'HOOK_PROMPTS'
      | 'IS_LIBC_GLIBC'
      | 'IS_LIBC_MUSL'
      | 'KAIROS'
      | 'KAIROS_BRIEF'
      | 'KAIROS_CHANNELS'
      | 'KAIROS_DREAM'
      | 'KAIROS_GITHUB_WEBHOOKS'
      | 'KAIROS_PUSH_NOTIFICATION'
      | 'LODESTONE'
      | 'MCP_RICH_OUTPUT'
      | 'MCP_SKILLS'
      | 'MEMORY_SHAPE_TELEMETRY'
      | 'MESSAGE_ACTIONS'
      | 'MONITOR_TOOL'
      | 'NATIVE_CLIENT_ATTESTATION'
      | 'NATIVE_CLIPBOARD_IMAGE'
      | 'NEW_INIT'
      | 'OVERFLOW_TEST_TOOL'
      | 'PERFETTO_TRACING'
      | 'POWERSHELL_AUTO_MODE'
      | 'PROACTIVE'
      | 'PROMPT_CACHE_BREAK_DETECTION'
      | 'QUICK_SEARCH'
      | 'REACTIVE_COMPACT'
      | 'REVIEW_ARTIFACT'
      | 'RUN_SKILL_GENERATOR'
      | 'SELF_HOSTED_RUNNER'
      | 'SHOT_STATS'
      | 'SKILL_IMPROVEMENT'
      | 'SLOW_OPERATION_LOGGING'
      | 'SSH_REMOTE'
      | 'STREAMLINED_OUTPUT'
      | 'TEAMMEM'
      | 'TEMPLATES'
      | 'TERMINAL_PANEL'
      | 'TOKEN_BUDGET'
      | 'TORCH'
      | 'TRANSCRIPT_CLASSIFIER'
      | 'TREE_SITTER_BASH'
      | 'TREE_SITTER_BASH_SHADOW'
      | 'UDS_INBOX'
      | 'ULTRAPLAN'
      | 'ULTRATHINK'
      | 'UNATTENDED_RETRY'
      | 'UPLOAD_USER_SETTINGS'
      | 'VERIFICATION_AGENT'
      | 'VOICE_MODE'
      | 'WEB_BROWSER_TOOL'
      | 'WORKFLOW_SCRIPTS',
  ): boolean
}

/**
 * Build-time macro replacements.
 * These are substituted by Bun's bundler via `[bundle.define]` in bunfig.toml.
 */
declare const MACRO: {
  readonly VERSION: string
  readonly BUILD_TIME: string
  readonly PACKAGE_URL: string
  readonly NATIVE_PACKAGE_URL: string
  readonly FEEDBACK_CHANNEL: string
  readonly ISSUES_EXPLAINER: string
  readonly VERSION_CHANGELOG: string
}
