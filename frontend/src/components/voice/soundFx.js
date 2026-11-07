/**
 * Pure Web Audio API Crystalline Micro-Sound Synthesizer
 * Zero external audio assets; safe no-op in headless/test environments.
 */

let sharedCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    if (!sharedCtx) {
      sharedCtx = new AudioCtx();
    }
    if (sharedCtx.state === "suspended") {
      sharedCtx.resume?.().catch(() => {});
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

function playTone(freq, startOffset, duration, maxGain = 0.035, type = "sine") {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(maxGain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Ignore audio context restrictions
  }
}

export function playOrbWakeChime() {
  playTone(587.33, 0, 0.14, 0.025, "sine"); // D5
  playTone(880.0, 0.06, 0.22, 0.03, "sine"); // A5
}

export function playCartActionChime() {
  playTone(659.25, 0, 0.12, 0.028, "sine"); // E5
  playTone(987.77, 0.05, 0.2, 0.032, "sine"); // B5
}

export function playOrderConfirmedChime() {
  playTone(523.25, 0, 0.14, 0.03, "sine"); // C5
  playTone(659.25, 0.07, 0.16, 0.032, "sine"); // E5
  playTone(783.99, 0.14, 0.18, 0.035, "sine"); // G5
  playTone(1046.5, 0.22, 0.34, 0.04, "sine"); // C6
}
