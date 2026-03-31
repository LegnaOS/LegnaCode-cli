// Stub: color-diff-napi — native syntax highlighting / color diff module.
// The codebase has a pure-TS fallback in src/native-ts/color-diff/.

export class ColorDiff {
  static create(..._args: any[]): ColorDiff { return new ColorDiff() }
  diff(..._args: any[]): any[] { return [] }
  render(..._args: any[]): string[] | null { return null }
}

export class ColorFile {
  static create(..._args: any[]): ColorFile { return new ColorFile() }
  highlight(..._args: any[]): string { return '' }
  render(..._args: any[]): string[] | null { return null }
}

export type SyntaxTheme = Record<string, string>

export function getSyntaxTheme(..._args: any[]): SyntaxTheme {
  return {}
}
