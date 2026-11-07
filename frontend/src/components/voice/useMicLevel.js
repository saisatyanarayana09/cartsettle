import { useEffect, useState } from "react";

/**
 * Steady, smooth voice activity level (0..1) for the 3D Orb.
 * Avoids stepped intervals that cause a heartbeat/pulsing throb,
 * providing a calm, continuous state signal while listening or speaking.
 */
export function useMicLevel(enabled) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLevel(0);
      return undefined;
    }
    setLevel(0.35);
    return () => {
      setLevel(0);
    };
  }, [enabled]);

  return level;
}
