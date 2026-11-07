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

  it("applies status and dynamic mic loudness css variables", () => {
    const { container } = render(<VoiceOrb status="listening" micLevel={0.75} />);
    const containerEl = container.querySelector(".voice-orb-container");
    expect(containerEl).toHaveStyle({ "--orb-level": "0.750" });
    const sphere = container.querySelector(".voice-orb-sphere");
    expect(sphere).toHaveAttribute("data-state", "listening");
  });
});
