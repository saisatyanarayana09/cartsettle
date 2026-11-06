import { useEffect, useRef, useState } from "react";
import { createVoiceSession } from "./voice-session";

export function useVoiceSession({ active, onPrompt }) {
  const [state, setState] = useState({ status: "idle", transcript: "" });
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("cartsettle_voice_lang") || "en-IN";
    } catch {
      return "en-IN";
    }
  });
  const session = useRef(null);
  const promptRef = useRef(onPrompt);
  promptRef.current = onPrompt;
  useEffect(() => {
    const controller = createVoiceSession({
      browser: window,
      onChange: setState,
      onPrompt: (text) => promptRef.current(text),
      silenceMs: 1200,
      lang,
    });
    session.current = controller;
    return () => {
      controller.stop();
      session.current = null;
    };
  }, [lang]);
  useEffect(() => {
    session.current?.setActive(active);
    return () => session.current?.stop();
  }, [active, lang]);
  const changeLang = (nextLang) => {
    try {
      localStorage.setItem("cartsettle_voice_lang", nextLang);
    } catch {}
    setLang(nextLang);
  };
  return {
    ...state,
    lang,
    setLang: changeLang,
    toggle: () => session.current?.toggle(),
    interrupt: () => session.current?.interrupt(),
    stop: () => session.current?.stop(),
  };
}
