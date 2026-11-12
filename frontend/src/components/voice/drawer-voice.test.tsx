import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ShopperAgentDrawer from "../ShopperAgentDrawer";
import KiranaCopilotDrawer from "../../owner/components/KiranaCopilotDrawer";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
const spoken = vi.hoisted(() => ({ prompt: "Two bags of rice" }));
vi.mock("../../services/api", () => ({ default: api, invalidateCache: vi.fn() }));
vi.mock("../../cart-context", () => ({ useCart: () => ({ cart: { items: [] } }) }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("../../router", () => ({ useNavigate: () => navigate }));
vi.mock("../../context/ThemeContext", () => ({ useTheme: () => ({ toggleTheme: vi.fn() }) }));
vi.mock("./useVoiceSession", () => ({
  useVoiceSession: ({ onPrompt }: { onPrompt: (text: string) => Promise<unknown> }) => ({
    status: "paused",
    transcript: "",
    toggle: () => onPrompt(spoken.prompt),
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
  spoken.prompt = "Two bags of rice";
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { messages: [] } });
  api.post.mockResolvedValue({
    data: { reply: "Rice is available", voice_reply: "We have rice", actions: [] },
  });
});
it.each([
  ["shopper", ShopperAgentDrawer],
  ["owner", KiranaCopilotDrawer],
] as const)("never sends a spoken payment request before a tap for %s", async (_, Drawer) => {
  spoken.prompt = "Pay with wallet";
  render(<Drawer isOpen onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Start microphone" }));
  await screen.findByRole("heading", { name: "Review payment details" });
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Confirm payment" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(api.post).not.toHaveBeenCalled();
});
it("never replays an owner card payment prompt, even with amount and recipient", async () => {
  localStorage.setItem("cartsettle_owner_agent_chat_v2", JSON.stringify([
    { role: "assistant", content: "Order ready", actions: [{ type: "ORDER_CARD", order: { id: 42, can_settle: true, total: 100, recipient: "Merchant" } }] },
    { role: "assistant", content: "Review the order", actions: [{ type: "ORDER_CARD", order: { id: 42, can_settle: true, total: 100, recipient: "Merchant" } }] },
  ]));
  render(<KiranaCopilotDrawer isOpen onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Settle" }));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Confirm payment" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open payment details" }));
  expect(api.post).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith("/owner/orders");
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
    session_id: expect.stringMatching(new RegExp(`^${session_id}`)),
    persona,
    mode: "voice",
    history: [
      expect.objectContaining({ role: "assistant" }),
      { role: "user", content: "Two bags of rice" },
    ],
  });
});
