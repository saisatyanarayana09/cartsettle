import { useEffect, useState } from "react";

/**
 * Smooth, organic voice activity level (0..1) for the 3D Orb.
 * Avoids opening a competing getUserMedia stream alongside SpeechRecognition
 * (which causes audio capture conflicts and dropped words on desktop/mobile browsers)
 * while driving fluid acoustic pulsing during listening and speaking states.
 */
export function useMicLevel(enabled) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLevel(0);
      return undefined;
    }

    const steps = [0.24, 0.46, 0.32, 0.58, 0.28, 0.52, 0.36];
    let idx = 0;
    setLevel(steps[0]);

    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length;
      setLevel(steps[idx]);
    }, 340);

    return () => {
      clearInterval(interval);
      setLevel(0);
    };
  }, [enabled]);

  return level;
}
