function pickBestVoice(browser, preferredLang = "en-US") {
  const voices = browser.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;

  const prefLower = String(preferredLang || "en-US").toLowerCase();
  const prefPrefix = prefLower.split("-")[0] || "en";

  const scoreVoice = (v) => {
    const name = String(v.name || "").toLowerCase();
    const vLang = String(v.lang || "").toLowerCase();
    let score = 0;

    if (vLang === prefLower) score += 45;
    else if (vLang.startsWith(prefPrefix)) score += 25;
    else if (vLang.startsWith("en")) score += 15;
    else return -100;

    if (name.includes("natural") || name.includes("neural") || name.includes("online")) score += 50;
    if (name.includes("google")) score += 40;
    if (
      name.includes("aria") ||
      name.includes("jenny") ||
      name.includes("guy") ||
      name.includes("sonia") ||
      name.includes("samantha") ||
      name.includes("siri") ||
      name.includes("daniel")
    ) {
      score += 35;
    }
    if (name.includes("desktop") || name.includes("espeak")) score -= 25;
    return score;
  };

  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return scoreVoice(sorted[0]) > 0 ? sorted[0] : null;
}

// Browser speech stays outside module evaluation and is owned by one drawer.
export function createVoiceSession({
  browser,
  onChange,
  onPrompt,
  silenceMs = 450,
  lang,
}) {
  let active = false;
  let generation = 0;
  let recognition;
  let timer;
  let speechWatchdog;
  let transcript = "";
  let status = "idle";
  const effectiveLang = lang || browser.navigator?.language || "en-US";

  // Pre-warm browser voice list
  try {
    browser.speechSynthesis?.getVoices?.();
  } catch {}

  const emit = (next, text = transcript) => {
    status = next;
    transcript = text;
    onChange({ status, transcript });
  };

  const cancel = () => {
    generation += 1;
    clearTimeout(timer);
    clearTimeout(speechWatchdog);
    if (recognition) {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {}
      recognition = undefined;
    }
    try {
      browser.speechSynthesis?.cancel();
    } catch {}
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
    recognition.maxAlternatives = 3;
    recognition.lang = effectiveLang;
    emit("listening", "");

    recognition.onresult = (event) => {
      if (!active || turn !== generation) return;
      const resultsArr = Array.from(event.results || []);
      const text = resultsArr
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      emit("listening", text);
      clearTimeout(timer);
      if (text) {
        let waitTime = silenceMs;
        if (silenceMs > 500) {
          const lastRes = resultsArr[resultsArr.length - 1];
          const isFinal = Boolean(lastRes?.isFinal);
          waitTime = isFinal ? 650 : silenceMs;
        }
        timer = setTimeout(() => submit(text), waitTime);
      }
    };

    recognition.onerror = (event) => {
      if (turn !== generation) return;
      const errCode = event?.error || "";
      if (errCode === "no-speech" || errCode === "aborted") {
        if (transcript && transcript.trim()) {
          submit(transcript.trim());
        } else if (active) {
          cancel();
          timer = setTimeout(listen, 180);
        }
        return;
      }
      cancel();
      emit(
        "error",
        errCode === "not-allowed" || errCode === "service-not-allowed"
          ? "Microphone access is off."
          : "Tap the orb to speak.",
      );
    };

    recognition.onend = () => {
      if (!active || turn !== generation) return;
      if (transcript && transcript.trim()) {
        clearTimeout(timer);
        timer = setTimeout(() => submit(transcript.trim()), 200);
      } else {
        timer = setTimeout(listen, 180);
      }
    };

    try {
      recognition.start();
    } catch {
      cancel();
      emit("paused", "");
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
        emit("paused", "");
        return;
      }
      const speech = new browser.SpeechSynthesisUtterance(reply);
      speech.lang = effectiveLang;
      const bestVoice = pickBestVoice(browser, effectiveLang);
      if (bestVoice) {
        speech.voice = bestVoice;
        speech.lang = bestVoice.lang || effectiveLang;
      }
      speech.rate = 0.98;
      speech.pitch = 1.0;

      const finishSpeech = () => {
        clearTimeout(speechWatchdog);
        if (active && turn === generation) listen();
      };

      speech.onend = finishSpeech;
      speech.onerror = () => {
        clearTimeout(speechWatchdog);
        if (active && turn === generation) listen();
      };

      emit("speaking", "");
      try {
        browser.speechSynthesis.resume?.();
      } catch {}
      browser.speechSynthesis.speak(speech);

      // Watchdog for browsers where speechSynthesis.onend silently stalls
      if (silenceMs > 500) {
        const watchdogMs = Math.min(12000, Math.max(3000, String(reply).length * 75));
        speechWatchdog = setTimeout(finishSpeech, watchdogMs);
      }
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
        emit("paused", "");
      }
    },
    toggle() {
      if (status === "listening" && transcript && transcript.trim().length > 0) {
        submit(transcript.trim());
        return;
      }
      if (status === "speaking" || status === "working") {
        cancel();
        listen();
        return;
      }
      // Always start or refresh microphone listening on direct user orb tap
      active = true;
      listen();
    },
    stop() {
      active = false;
      cancel();
      emit("idle", "");
    },
  };
}
