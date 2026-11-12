import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DealCard } from "./DealCard";
import { ActionCards } from "./ActionCards";

afterEach(cleanup);

describe("DealCard", () => {
  const sampleDecision = {
    status: "COUNTER_OFFER",
    product: "Your basket (2 items)",
    original_total: 1020,
    deal_total: 975,
    savings: 45,
    savings_pct: 4.4,
    expires_at: new Date(Date.now() + 600 * 1000).toISOString(),
    deal_token: "test.token.xyz",
    lines: [
      {
        product_id: 1,
        product_name: "Fresh Whole Milk",
        quantity: 2,
        catalog_unit: 60,
        deal_unit: 55,
        deal_line_total: 110,
        savings_line: 10,
      },
      {
        product_id: 2,
        product_name: "Basmati Rice 5kg",
        quantity: 1,
        catalog_unit: 900,
        deal_unit: 865,
        deal_line_total: 865,
        savings_line: 35,
      },
    ],
    message: "Best offer is ₹975.00. You save ₹45.00.",
  };

  it("renders counter-offer badge, hero pricing, and savings chip", () => {
    render(<DealCard decision={sampleDecision} />);

    expect(screen.getByText(/Counter-Offer/i)).toBeDefined();
    expect(screen.getByText(/Your basket \(2 items\)/i)).toBeDefined();
    expect(screen.getByText("₹1,020.00")).toBeDefined();
    expect(screen.getByText("₹975.00")).toBeDefined();
    expect(screen.getByText(/You save ₹45.00/i)).toBeDefined();
    expect(screen.getByText(/4.4% OFF/i)).toBeDefined();
  });

  it("renders approved deal badge when status is APPROVED", () => {
    const approvedDecision = {
      ...sampleDecision,
      status: "APPROVED",
      deal_total: 950,
      savings: 70,
    };
    render(<DealCard decision={approvedDecision} />);

    expect(screen.getByText(/Deal Approved/i)).toBeDefined();
    expect(screen.getByText("₹950.00")).toBeDefined();
  });

  it("renders line items in bundle breakdown", () => {
    render(<DealCard decision={sampleDecision} />);

    expect(screen.getByText("Fresh Whole Milk")).toBeDefined();
    expect(screen.getByText("×2")).toBeDefined();
    expect(screen.getByText("Basmati Rice 5kg")).toBeDefined();
    expect(screen.getByText("×1")).toBeDefined();
  });

  it("calls onAccept when Accept button is clicked and shows locked state", async () => {
    const onAccept = vi.fn().mockResolvedValue(true);
    render(<DealCard decision={sampleDecision} onAccept={onAccept} />);

    const acceptBtn = screen.getByRole("button", { name: /Accept/i });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    expect(onAccept).toHaveBeenCalledWith(sampleDecision);
    expect(screen.getByText(/Deal Locked · ₹975.00 applied/i)).toBeDefined();
  });

  it("calls onCounter when quick counter chip is clicked", () => {
    const onCounter = vi.fn();
    render(<DealCard decision={sampleDecision} onCounter={onCounter} />);

    const counterChip = screen.getByText(/Can you do ₹950.00\?/i);
    fireEvent.click(counterChip);

    expect(onCounter).toHaveBeenCalledWith("Can you do ₹950.00?");
  });

  it("calls onDecline when Decline button is clicked", () => {
    const onDecline = vi.fn();
    render(<DealCard decision={sampleDecision} onDecline={onDecline} />);

    const declineBtn = screen.getByRole("button", { name: /Decline/i });
    fireEvent.click(declineBtn);

    expect(onDecline).toHaveBeenCalled();
  });

  it("integrates seamlessly into ActionCards when persona is shopper", () => {
    const onAcceptDeal = vi.fn();
    render(
      <ActionCards
        actions={[{ type: "MARGIN_DECISION", decision: sampleDecision }]}
        persona="shopper"
        onAcceptDeal={onAcceptDeal}
      />
    );

    expect(screen.getByText(/Counter-Offer/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Accept/i })).toBeDefined();
  });
});
