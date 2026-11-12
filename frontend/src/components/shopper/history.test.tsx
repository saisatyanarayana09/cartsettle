import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShopperAgentDrawer from "../ShopperAgentDrawer";
import { SHOPPER_HISTORY_KEY } from "./history";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("../../services/api", () => ({ default: api }));
vi.mock("../../cart-context", () => ({ useCart: () => ({ cart: { items: [] }, add: cart.add }) }));
vi.mock("../../router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../../context/ThemeContext", () => ({ useTheme: () => ({ toggleTheme: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const cart = vi.hoisted(() => ({ add: vi.fn() }));
vi.mock("../voice/useVoiceSession", () => ({
  useVoiceSession: () => ({
    status: "paused",
    transcript: "",
    toggle: vi.fn(),
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
  PromptInput: ({ children, onSubmit }: { children: React.ReactNode; onSubmit: (data: {text: string}) => void }) => <form onSubmit={(event) => { event.preventDefault(); onSubmit({text: "Find groceries"}); }}>{children}<button type="submit">Find groceries</button></form>,
  PromptInputTextarea: () => <textarea aria-label="Message Shopper AI" />,
  PromptInputFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputButton: () => null,
  PromptInputSubmit: () => null,
}));

describe("Shopper conversation lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { messages: [] } });
    api.delete.mockResolvedValue({ data: {} });
  });
  afterEach(cleanup);

  it("clears conversation automatically and fires api.delete when closed and reopened", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<ShopperAgentDrawer isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close concierge" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(api.delete).toHaveBeenCalled();
    expect(localStorage.getItem(SHOPPER_HISTORY_KEY)).toBeNull();

    rerender(<ShopperAgentDrawer isOpen={false} onClose={onClose} />);
    rerender(<ShopperAgentDrawer isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Type instead" }));
    expect(screen.getByText("What’s on your list?")).toBeInTheDocument();
  });

  it("does not render a manual clear conversation button in the header", () => {
    render(<ShopperAgentDrawer isOpen onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "More options" })).not.toBeInTheDocument();
    expect(screen.queryByText("Clear conversation")).not.toBeInTheDocument();
  });

  it("opens in voice mode", () => {
    render(<ShopperAgentDrawer isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Type instead" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("adds items to the cart when the reply asks to add them", async () => {
    api.post.mockResolvedValue({
      data: {
        reply: "Added",
        actions: [{ type: "ADD_TO_CART", item: { id: 7, name: "Rice", price: 60 } }],
      },
    });
    localStorage.clear();
    render(<ShopperAgentDrawer isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Type instead" }));
    fireEvent.click(screen.getByRole("button", { name: /Find groceries/ }));
    await waitFor(() => expect(cart.add).toHaveBeenCalledOnce());
    expect(cart.add.mock.calls[0]?.[0]).toMatchObject({ id: 7, name: "Rice" });
  });
});
