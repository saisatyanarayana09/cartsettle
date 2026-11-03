import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ActionCards } from "./ActionCards";
afterEach(cleanup);
it("adds exactly the quantity selected with the product stepper", () => {
  const onAdd = vi.fn();
  render(
    <ActionCards
      actions={[{ type: "SEARCH_RESULTS", items: [{ id: 7, name: "Rice", price: 80 }] }]}
      onAdd={onAdd}
      currency="INR"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Increase Rice quantity" }));
  fireEvent.click(screen.getByRole("button", { name: "Increase Rice quantity" }));
  fireEvent.click(screen.getByRole("button", { name: "Decrease Rice quantity" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 2 Rice to cart" }));
  expect(onAdd).toHaveBeenCalledWith({ id: 7, name: "Rice", price: 80, quantity: 2 });
});
it("settles the displayed order through the existing agent command", () => {
  const onSend = vi.fn();
  render(
    <ActionCards
      actions={[{ type: "ORDER_CARD", order: { id: 42, can_settle: true, total: 100 } }]}
      onSend={onSend}
      currency="INR"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Settle" }));
  expect(onSend).toHaveBeenCalledExactlyOnceWith("Settle order 42");
});
it("sends the selected low-stock reorder quantity", () => {
  const onSend = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "LOW_STOCK_LIST",
          items: [{ id: 5, name: "Atta", stock: 2, recommended_reorder: 10 }],
        },
      ]}
      onSend={onSend}
      currency="INR"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Increase Atta reorder quantity" }));
  fireEvent.click(screen.getByRole("button", { name: "Restock" }));
  expect(onSend).toHaveBeenCalledExactlyOnceWith("Restock 11 units of Atta via PayPal Payout");
});
