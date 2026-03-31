// Stub: @anthropic-ai/sandbox-runtime — not published to npm
// Provides sandbox isolation for Claude Code tool execution.

export class SandboxManager {
  constructor(..._args: any[]) {}
  static isSupportedPlatform(): boolean { return false; }
  static checkDependencies(_opts?: any): { errors: string[]; warnings: string[] } { return { errors: [], warnings: [] }; }
  static wrapWithSandbox(cmd: string, args: string[], opts?: any): any { return { cmd, args, opts }; }
  static async initialize(..._args: any[]): Promise<void> {}
  static updateConfig(_config?: any): void {}
  static reset(): void {}
  static getFsReadConfig(): any { return undefined; }
  static getFsWriteConfig(): any { return undefined; }
  static getNetworkRestrictionConfig(): any { return undefined; }
  static getIgnoreViolations(): any { return undefined; }
  static getAllowUnixSockets(): boolean { return false; }
  static getAllowLocalBinding(): boolean { return false; }
  static getEnableWeakerNestedSandbox(): boolean { return false; }
  static getProxyPort(): number | undefined { return undefined; }
  static getSocksProxyPort(): number | undefined { return undefined; }
  static getLinuxHttpSocketPath(): string | undefined { return undefined; }
  static getLinuxSocksSocketPath(): string | undefined { return undefined; }
  static waitForNetworkInitialization(): Promise<void> { return Promise.resolve(); }
  static getSandboxViolationStore(): SandboxViolationStore { return new SandboxViolationStore(); }
  static annotateStderrWithSandboxFailures(stderr: string): string { return stderr; }
  static cleanupAfterCommand(): void {}
  async shutdown(): Promise<void> {}
}

export class SandboxViolationStore {
  constructor() {}
  getViolations(): any[] { return [] }
}

export const SandboxRuntimeConfigSchema = {
  safeParse: (_: any) => ({ success: true, data: _ }),
}

export type FsReadRestrictionConfig = any
export type FsWriteRestrictionConfig = any
export type IgnoreViolationsConfig = any
export type NetworkHostPattern = any
export type NetworkRestrictionConfig = any
export type SandboxAskCallback = any
export type SandboxDependencyCheck = any
export type SandboxRuntimeConfig = any
export type SandboxViolationEvent = any
