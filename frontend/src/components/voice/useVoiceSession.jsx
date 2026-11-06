import { useEffect, useRef, useState } from "react";
import { createVoiceSession } from "./voice-session";

export function useVoiceSession({ active, onPrompt }) {
  const [state, setState] = useState({ status: "idle", transcript: "" });
  const session = useRef(null);
  const promptRef = useRef(onPrompt);
  promptRef.current = onPrompt;
  useEffect(() => {
    const controller = createVoiceSession({
      browser: window,
      onChange: setState,
      onPrompt: (text) => promptRef.current(text),
      silenceMs: 1200,
      lang: "en-US",
    });
    session.current = controller;
    return () => {
      controller.stop();
      session.current = null;
    };
  }, []);
  useEffect(() => {
    session.current?.setActive(active);
    return () => session.current?.stop();
  }, [active]);
  return {
    ...state,
    toggle: () => session.current?.toggle(),
    interrupt: () => session.current?.interrupt(),
    stop: () => session.current?.stop(),
  };
}
