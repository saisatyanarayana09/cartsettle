export const WELCOME_HOLD_MS: 2000;
export const WELCOME_FADE_MS: 300;
export function startWelcomeSequence(options: {
  onFade: (leaving: boolean) => void;
  onContinue: () => void;
  ready?: boolean;
  clock?: Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'>;
}): { skip: () => void; cancel: () => void; setReady: (value: boolean) => void };
export function readWelcomeName(storage: { getItem: (key: string) => string | null } | undefined, key: string): string;