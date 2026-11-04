export const WELCOME_HOLD_MS = 2000;
export const WELCOME_FADE_MS = 300;

export function startWelcomeSequence({ onFade, onContinue, ready = true, clock = globalThis }) {
  let completed = false;
  let elapsed = false;
  let skipped = false;
  let fading = false;
  let fadeTimer;
  const holdTimer = clock.setTimeout(() => {
    elapsed = true;
    proceed();
  }, WELCOME_HOLD_MS);

  function proceed() {
    if (completed || !ready || (!elapsed && !skipped)) return;
    if (skipped) { finish(); return; }
    if (fading) return;
    fading = true;
    onFade(true);
    fadeTimer = clock.setTimeout(finish, WELCOME_FADE_MS);
  }

  function clear() {
    clock.clearTimeout(holdTimer);
    clock.clearTimeout(fadeTimer);
  }
  function finish() {
    if (completed) return;
    completed = true;
    clear();
    onContinue();
  }
  return {
    skip() { skipped = true; proceed(); },
    setReady(value) {
      ready = value;
      if (!completed && !ready && fading) {
        clock.clearTimeout(fadeTimer);
        fading = false;
        onFade(false);
      }
      proceed();
    },
    cancel() { completed = true; clear(); },
  };
}

export function readWelcomeName(storage, key) {
  try {
    const user = JSON.parse(storage?.getItem(key) || 'null');
    const name = user?.first_name || user?.username;
    return typeof name === 'string' ? name.trim() : '';
  } catch {
    return '';
  }
}