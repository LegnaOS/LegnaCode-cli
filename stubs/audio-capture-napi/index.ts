// Stub: audio-capture-napi — native audio recording module.
// Links against CoreAudio.framework on macOS for push-to-talk voice input.

export function isNativeAudioAvailable(): boolean {
  return false
}

export function startCapture(..._args: any[]): void {}
export function stopCapture(): Buffer {
  return Buffer.alloc(0)
}
