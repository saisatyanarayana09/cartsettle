import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceOrb } from "./VoiceOrb";

afterEach(cleanup);

describe("VoiceOrb", () => {
  it("renders with default idle state and accessible label", () => {
    render(<VoiceOrb label="Test microphone" />);
    const orb = screen.getByRole("button", { name: "Test microphone" });
    expect(orb).toBeInTheDocument();
  });

  it("handles click and keyboard events when enabled", () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    render(<VoiceOrb onClick={onClick} onKeyDown={onKeyDown} label="Toggle voice" />);
    const orb = screen.getByRole("button", { name: "Toggle voice" });

    fireEvent.click(orb);
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(orb, { key: "Enter" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onClick when disabled", () => {
    const onClick = vi.fn();
    render(<VoiceOrb onClick={onClick} disabled label="Disabled orb" />);
    const orb = screen.getByRole("button", { name: "Disabled orb" });
    expect(orb).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(orb);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies status and dynamic mic loudness css variables without circular border rings", () => {
    const { container } = render(<VoiceOrb status="listening" micLevel={0.75} />);
    const containerEl = container.querySelector(".voice-orb-container");
    expect(containerEl).toHaveStyle({ "--orb-level": "0.750" });
    const sphere = container.querySelector(".voice-orb-sphere");
    expect(sphere).toHaveAttribute("data-state", "listening");
    expect(container.querySelector(".voice-orb-canvas")).toBeInTheDocument();
    expect(container.querySelector(".voice-orb-sphere img")).toBeNull();
    expect(container.querySelector(".voice-orb-plasma-ribbon-a")).toBeInTheDocument();
    expect(container.querySelector(".voice-orb-plasma-ribbon-b")).toBeInTheDocument();
    expect(container.querySelector(".voice-orb-acoustic-core")).toBeInTheDocument();
    expect(container.querySelector(".voice-orb-pulse-ring")).toBeNull();
    expect(container.querySelector(".voice-orb-orbital-halo")).toBeNull();
  });
});

describe("lovableAgentFallback intelligence", () => {
  it("suggests biryani requirements, clears cart items in real time, and supports turn off dark mode", async () => {
    const { handleLovableAgentFallback } = await import("../../services/lovableAgentFallback");

    const biryaniRes = handleLovableAgentFallback({
      method: "post",
      data: {
        message: "im today making biryani so suggest me the biryani requirements within your store",
        persona: "shopper",
        session_id: "test-biryani-session",
      },
    });
    expect(biryaniRes.reply.toLowerCase()).toContain("biryani");
    expect(biryaniRes.reply).not.toBe("Done.");
    const discoveryAction = biryaniRes.actions?.find((a: any) => a.type === "RECOMMEND_BASKET");
    expect(discoveryAction).toBeDefined();
    expect(discoveryAction.recipe).toBe("Hyderabadi Biryani");
    expect(discoveryAction.items.length).toBeGreaterThan(0);

    const addAllRes = handleLovableAgentFallback({
      method: "post",
      data: {
        message: "add all of them to cart",
        persona: "shopper",
        session_id: "test-biryani-session",
      },
    });
    const addActions = addAllRes.actions?.filter((a: any) => a.type === "ADD_TO_CART") || [];
    expect(addActions.length).toBeGreaterThan(0);

    const clearAllRes = handleLovableAgentFallback({
      method: "post",
      data: {
        message: "remove all cart items",
        persona: "shopper",
        session_id: "test-biryani-session",
        cart_items: [{ id: 109, name: "Royal Basmati Rice (1kg)", price: 110, quantity: 1 }],
      },
    });
    expect(clearAllRes.actions?.some((a: any) => a.type === "CLEAR_CART")).toBe(true);

    const removeSingleRes = handleLovableAgentFallback({
      method: "post",
      data: {
        message: "remove sourdough bread from cart",
        persona: "shopper",
        session_id: "test-biryani-session",
        cart_items: [{ id: 505, name: "Artisan Sourdough Bread", price: 55, quantity: 2 }],
      },
    });
    const remAction = removeSingleRes.actions?.find((a: any) => a.type === "REMOVE_FROM_CART");
    expect(remAction).toBeDefined();
    expect(remAction.product_id).toBe(505);

    const themeOffRes = handleLovableAgentFallback({
      method: "post",
      data: {
        message: "turn off dark mode",
        persona: "shopper",
        session_id: "test-biryani-session",
      },
    });
    const themeAction = themeOffRes.actions?.find((a: any) => a.type === "SWITCH_THEME");
    expect(themeAction?.theme).toBe("light");

    const openQuestionRes = handleLovableAgentFallback({
      method: "post",
      data: {
        message: "can you help me plan a family dinner tonight?",
        persona: "shopper",
        session_id: "test-biryani-session",
      },
    });
    expect(openQuestionRes.reply.length).toBeGreaterThan(10);
    expect(openQuestionRes.reply).not.toBe("Done.");
  });
});
