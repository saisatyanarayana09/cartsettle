export interface VoiceController {
  setActive(value: boolean): void;
  interrupt(): void;
  toggle(): void;
  stop(): void;
}
export function createVoiceSession(options: {
  browser: unknown;
  onChange: (state: { status: string; transcript: string }) => void;
  onPrompt: (prompt: string) => Promise<unknown>;
  silenceMs?: number;
}): VoiceController;
