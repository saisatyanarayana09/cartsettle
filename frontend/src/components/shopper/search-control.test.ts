import { expect, it } from "vitest";
import { showIdleAssistant } from "./search-control";

const idle = { enabled: true, focused: false, query: "", listening: false };
it("shows the assistant for idle desktop search", () => {
  expect(showIdleAssistant(idle)).toBe(true);
});
it("switches to voice search on focus and restores the assistant after empty blur", () => {
  expect(showIdleAssistant({ ...idle, focused: true })).toBe(false);
  expect(showIdleAssistant({ ...idle, focused: false })).toBe(true);
});
it("keeps voice search when text remains after blur", () => {
  expect(showIdleAssistant({ ...idle, query: "rice" })).toBe(false);
});
it("keeps the microphone available during listening", () => {
  expect(showIdleAssistant({ ...idle, listening: true })).toBe(false);
});
it("does not enable the assistant in mobile search", () => {
  expect(showIdleAssistant({ ...idle, enabled: false })).toBe(false);
});