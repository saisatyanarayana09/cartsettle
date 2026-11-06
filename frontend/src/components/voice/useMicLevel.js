import { useEffect, useRef, useState } from "react";

/**
 * Live microphone loudness (0..1) for the voice visual. Only opens the mic
 * while `enabled` (listening state); SpeechRecognition already holds the
 * permission, so this shares the same grant. Cleans up fully on disable.
 */
export function useMicLevel(enabled) {
  const [level, setLevel] = useState(0);
  const levelRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      levelRef.current = 0;
      setLevel(0);
      return undefined;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      return undefined;
    }

    let cancelled = false;
    let stream;
    let ctx;
    let raf;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i += 1) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          // Map RMS to a perceptual 0..1 with a noise floor.
          const next = Math.min(1, Math.max(0, (rms - 0.015) * 6));
          // Smooth toward the new value so the orb breathes instead of jittering.
          levelRef.current += (next - levelRef.current) * 0.35;
          setLevel(levelRef.current);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        // No mic access — the orb simply stays at its resting glow.
      }
    };
    start();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close?.().catch(() => {});
      levelRef.current = 0;
      setLevel(0);
    };
  }, [enabled]);

  return level;
}
