import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { requiresPaymentReview, validPaymentDetails } from "./payment-review";
import { PaymentReview } from "./PaymentReview";
afterEach(cleanup);
it.each(["Pay with wallet", "Place my order", "Settle order 42", "Restock 11 units of Atta via PayPal Payout", "Buy my cart", "Complete order"])("holds financial intent: %s", (prompt) => {
  expect(requiresPaymentReview(prompt)).toBe(true);
});
it("does not block grocery search", () => { expect(requiresPaymentReview("Search for milk")).toBe(false); });
it("cannot confirm without both amount and recipient", () => {
  expect(validPaymentDetails({ amount: 100 })).toBe(false);
  expect(validPaymentDetails({ recipient: "Merchant" })).toBe(false);
  const onConfirm = vi.fn();
  render(<PaymentReview review={{ prompt: "Pay" }} onConfirm={onConfirm} onCancel={vi.fn()} onOpen={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "Confirm payment" })).toBeNull();
  expect(onConfirm).not.toHaveBeenCalled();
});
it("only explicit confirmation invokes payment", () => {
  const onConfirm = vi.fn();
  render(<PaymentReview review={{ prompt: "Settle order 42", amount: 100, recipient: "Merchant", currency: "INR" }} onConfirm={onConfirm} onCancel={vi.fn()} onOpen={vi.fn()} />);
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm payment" }));
  expect(onConfirm).toHaveBeenCalledOnce();
});