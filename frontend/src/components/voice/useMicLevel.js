import { useEffect, useState } from "react";

/**
 * Lightweight voice activity level (0..1) for the 3D Orb.
 * Avoids opening a competing getUserMedia stream alongside SpeechRecognition
 * (which causes audio capture conflicts and dropped words on desktop/mobile browsers)
 * and avoids 60fps React re-renders.
 */
export function useMicLevel(enabled) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLevel(0);
      return undefined;
    }

    setLevel(0.28);
    const interval = setInterval(() => {
      setLevel((prev) => (prev > 0.35 ? 0.22 : 0.42));
    }, 650);

    return () => {
      clearInterval(interval);
      setLevel(0);
    };
  }, [enabled]);

  return level;
}
