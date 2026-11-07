import { render, screen, cleanup, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveTaskActivity } from "./LiveTaskActivity";

describe("LiveTaskActivity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders processing task label with spinner", () => {
    render(
      <LiveTaskActivity
        task={{ id: "task-1", label: "Adding 2 × Whole Milk to cart...", state: "processing" }}
      />
    );
    expect(screen.getByText("Adding 2 × Whole Milk to cart...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders success state and auto-dismisses after 1.5s", () => {
    const onDismiss = vi.fn();
    render(
      <LiveTaskActivity
        task={{ id: "task-2", label: "Added 2 × Whole Milk to cart", state: "success" }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText("Added 2 × Whole Milk to cart")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("renders error state when task fails", () => {
    const onDismiss = vi.fn();
    render(
      <LiveTaskActivity
        task={{ id: "task-3", label: "Could not update cart", state: "error" }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText("Could not update cart")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
