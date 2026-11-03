import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVoiceSession } from "./voice-session";

class Recognition {
  static instances: Recognition[] = [];
  continuous = false;
  interimResults = false;
  lang = "";
  onresult?: (event: unknown) => void;
  onend?: () => void;
  onerror?: (event: unknown) => void;
  start = vi.fn();
  abort = vi.fn();
  constructor() {
    Recognition.instances.push(this);
  }
}
class Utterance {
  onend?: () => void;
  constructor(public text: string) {}
}
function setup(
  onPrompt = vi.fn().mockResolvedValue({ reply: "Rice is available", voice_reply: "We have rice" }),
) {
  const synthesis = { cancel: vi.fn(), speak: vi.fn<(speech: Utterance) => void>() };
  const onChange = vi.fn();
  const session = createVoiceSession({
    browser: {
      SpeechRecognition: Recognition,
      SpeechSynthesisUtterance: Utterance,
      speechSynthesis: synthesis,
    },
    onChange,
    onPrompt,
  });
  session.setActive(true);
  const recognition = Recognition.instances.at(-1);
  if (!recognition) throw new Error("Microphone was not created");
  return { session, recognition, synthesis, onPrompt, onChange };
}
describe("Voice lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Recognition.instances = [];
  });
  afterEach(() => vi.useRealTimers());
  it("enables interim results and sends once after exactly 450ms silence", async () => {
    const { recognition, onPrompt } = setup();
    expect(recognition.interimResults).toBe(true);
    recognition.onresult?.({ results: [[{ transcript: "rice" }]] });
    await vi.advanceTimersByTimeAsync(300);
    recognition.onresult?.({ results: [[{ transcript: "two bags of rice" }]] });
    await vi.advanceTimersByTimeAsync(449);
    expect(onPrompt).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onPrompt).toHaveBeenCalledExactlyOnceWith("two bags of rice");
  });
  it("pauses the microphone while speaking voice_reply and resumes only after speech ends", async () => {
    const { recognition, synthesis } = setup();
    recognition.onresult?.({ results: [[{ transcript: "rice" }]] });
    await vi.advanceTimersByTimeAsync(450);
    expect(recognition.abort).toHaveBeenCalled();
    const speech = synthesis.speak.mock.calls[0]?.[0];
    expect(speech?.text).toBe("We have rice");
    expect(Recognition.instances).toHaveLength(1);
    speech?.onend?.();
    expect(Recognition.instances).toHaveLength(2);
  });
  it("falls back to reply for spoken output", async () => {
    const { recognition, synthesis } = setup(vi.fn().mockResolvedValue({ reply: "Only reply" }));
    recognition.onresult?.({ results: [[{ transcript: "rice" }]] });
    await vi.advanceTimersByTimeAsync(450);
    expect(synthesis.speak.mock.calls[0]?.[0].text).toBe("Only reply");
  });
  it("cancels speech immediately on tap and prevents a stale speech end restarting the mic", async () => {
    const { session, recognition, synthesis } = setup();
    recognition.onresult?.({ results: [[{ transcript: "rice" }]] });
    await vi.advanceTimersByTimeAsync(450);
    const speech = synthesis.speak.mock.calls[0]?.[0];
    synthesis.cancel.mockClear();
    session.interrupt();
    expect(synthesis.cancel).toHaveBeenCalledOnce();
    speech?.onend?.();
    expect(Recognition.instances).toHaveLength(1);
  });
  it.each(["switch mode", "close"])("cancels a pending utterance on %s", async () => {
    let resolve: (data: unknown) => void = () => {};
    const pending = new Promise((done) => {
      resolve = done;
    });
    const { session, recognition, synthesis } = setup(vi.fn().mockReturnValue(pending));
    recognition.onresult?.({ results: [[{ transcript: "rice" }]] });
    await vi.advanceTimersByTimeAsync(450);
    session.stop();
    resolve({ reply: "Late reply" });
    await vi.advanceTimersByTimeAsync(1);
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(Recognition.instances).toHaveLength(1);
  });
  it("does not send a partial transcript after closing", async () => {
    const { session, recognition, onPrompt } = setup();
    recognition.onresult?.({ results: [[{ transcript: "rice" }]] });
    session.stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(onPrompt).not.toHaveBeenCalled();
  });
});
