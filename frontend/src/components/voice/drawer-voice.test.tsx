import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ShopperAgentDrawer from "../ShopperAgentDrawer";
import KiranaCopilotDrawer from "../../owner/components/KiranaCopilotDrawer";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("../../services/api", () => ({ default: api, invalidateCache: vi.fn() }));
vi.mock("../../cart-context", () => ({ useCart: () => ({ cart: { items: [] } }) }));
vi.mock("../../router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("./useVoiceSession", () => ({
  useVoiceSession: ({ onPrompt }: { onPrompt: (text: string) => Promise<unknown> }) => ({
    status: "paused",
    transcript: "",
    toggle: () => onPrompt("Two bags of rice"),
    stop: vi.fn(),
    interrupt: vi.fn(),
  }),
}));
vi.mock("@/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConversationContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConversationScrollButton: () => null,
}));
vi.mock("@/components/ai-elements/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageResponse: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ai-elements/prompt-input", () => ({
  PromptInput: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputTextarea: () => <textarea />,
  PromptInputFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputSubmit: () => null,
}));
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { messages: [] } });
  api.post.mockResolvedValue({
    data: { reply: "Rice is available", voice_reply: "We have rice", actions: [] },
  });
});
afterEach(cleanup);
it.each([
  ["shopper", "shopper_session", ShopperAgentDrawer],
  ["owner", "owner_copilot_session", KiranaCopilotDrawer],
] as const)("sends the exact voice contract for %s", async (persona, session_id, Drawer) => {
  render(<Drawer isOpen onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Start microphone" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
  expect(api.post).toHaveBeenCalledWith("/store/agent/chat/", {
    prompt: "Two bags of rice",
    session_id,
    persona,
    mode: "voice",
    history: [
      expect.objectContaining({ role: "assistant" }),
      { role: "user", content: "Two bags of rice" },
    ],
  });
});
