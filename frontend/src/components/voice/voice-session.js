// Browser speech stays outside module evaluation and is owned by one drawer.
export function createVoiceSession({ browser, onChange, onPrompt, silenceMs = 450 }) {
  let active = false;
  let generation = 0;
  let recognition;
  let timer;
  let transcript = "";
  let status = "idle";
  const emit = (next, text = transcript) => {
    status = next;
    transcript = text;
    onChange({ status, transcript });
  };
  const cancel = () => {
    generation += 1;
    clearTimeout(timer);
    if (recognition) {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.abort();
      recognition = undefined;
    }
    browser.speechSynthesis?.cancel();
  };
  const listen = () => {
    if (!active) return;
    cancel();
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) {
      emit("unavailable", "Voice isn’t available in this browser.");
      return;
    }
    const turn = generation;
    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = browser.navigator?.language || "en-IN";
    emit("listening", "");
    recognition.onresult = (event) => {
      if (!active || turn !== generation) return;
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      emit("listening", text);
      clearTimeout(timer);
      if (text) timer = setTimeout(() => submit(text), silenceMs);
    };
    recognition.onerror = (event) => {
      if (turn !== generation) return;
      cancel();
      emit(
        "error",
        event.error === "not-allowed"
          ? "Microphone access is off."
          : "Couldn’t hear you. Try again.",
      );
    };
    recognition.onend = () => {
      if (!active || turn !== generation) return;
      // Preserve the silence timer if the browser ends a recognition segment.
      if (!transcript) timer = setTimeout(listen, 150);
    };
    try {
      recognition.start();
    } catch {
      cancel();
      emit("error", "Microphone unavailable. Try again.");
    }
  };
  const submit = async (text) => {
    cancel(); // Pause the microphone before sending or speaking.
    const turn = generation;
    emit("working", text);
    try {
      const data = await onPrompt(text);
      if (!active || turn !== generation) return;
      const reply = data?.voice_reply || data?.reply;
      if (!reply || !browser.speechSynthesis || !browser.SpeechSynthesisUtterance) {
        emit("paused", text);
        return;
      }
      const speech = new browser.SpeechSynthesisUtterance(reply);
      speech.lang = browser.navigator?.language || "en-IN";
      speech.onend = () => {
        if (active && turn === generation) listen();
      };
      speech.onerror = () => {
        if (active && turn === generation) emit("paused", text);
      };
      emit("speaking", text);
      browser.speechSynthesis.speak(speech);
    } catch {
      if (active && turn === generation) emit("error", "Try again.");
    }
  };
  return {
    setActive(value) {
      active = value;
      cancel();
      if (value) listen();
      else emit("idle", "");
    },
    interrupt() {
      if (status === "speaking") {
        cancel();
        emit("paused");
      }
    },
    toggle() {
      if (status === "listening" || status === "speaking" || status === "working") {
        cancel();
        emit("paused");
      } else listen();
    },
    stop() {
      active = false;
      cancel();
      emit("idle", "");
    },
  };
}
