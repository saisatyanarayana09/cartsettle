import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ActionCards } from "./ActionCards";

afterEach(cleanup);

it("updates a live cart row without adding a duplicate product", () => {
  const onUpdate = vi.fn();
  const onAdd = vi.fn();
  const row = { id: 19, product: 7, quantity: 2 };
  render(
    <ActionCards
      actions={[{ type: "ADD_TO_CART", item: { id: 7, name: "Rice", price: 80 } }]}
      cartItems={[row]}
      onUpdate={onUpdate}
      onAdd={onAdd}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Increase Rice quantity" }));
  expect(onUpdate).toHaveBeenCalledWith(row, 3);
  expect(onAdd).not.toHaveBeenCalled();
});

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

it("reviews the displayed order before sending a settlement command", () => {
  const onSend = vi.fn();
  const onReviewPayment = vi.fn();
  render(
    <ActionCards
      actions={[{ type: "ORDER_CARD", order: { id: 42, can_settle: true, total: 100 } }]}
      onSend={onSend}
      onReviewPayment={onReviewPayment}
      currency="INR"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Settle" }));
  expect(onSend).not.toHaveBeenCalled();
  expect(onReviewPayment).toHaveBeenCalledWith(
    expect.objectContaining({ prompt: "Settle order 42", amount: 100 }),
  );
});

it("sends the selected low-stock reorder quantity", () => {
  const onSend = vi.fn();
  const onReviewPayment = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "LOW_STOCK_LIST",
          items: [{ id: 5, name: "Atta", stock: 2, recommended_reorder: 10 }],
        },
      ]}
      onSend={onSend}
      onReviewPayment={onReviewPayment}
      currency="INR"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Increase Atta reorder quantity" }));
  fireEvent.click(screen.getByRole("button", { name: "Restock" }));
  expect(onSend).not.toHaveBeenCalled();
  expect(onReviewPayment).toHaveBeenCalledWith(
    expect.objectContaining({ prompt: "Restock 11 units of Atta via PayPal Payout" }),
  );
});

it("renders live order status card with estimated delivery ETA and stages", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "ORDER_STATUS_CARD",
          order: {
            id: "202601",
            status: "OUT_FOR_DELIVERY",
            delivery_eta: "Today by 6:45 PM",
            total: 24.5,
          },
        },
      ]}
      currency="USD"
    />,
  );
  expect(screen.getByText("Order #202601")).toBeInTheDocument();
  expect(screen.getByText(/Estimated Delivery: Today by 6:45 PM/i)).toBeInTheDocument();
  expect(screen.getByText("On The Way")).toBeInTheDocument();
});

it("renders grocery checklist card and triggers adding available items to cart", () => {
  const onAdd = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "GROCERY_CHECKLIST",
          checklist: [
            { name: "Organic Milk", quantity: 2, in_stock: true, product: { id: 101, name: "Organic Milk", price: 4.2 } },
            { name: "Saffron", quantity: 1, in_stock: false },
          ],
        },
      ]}
      onAdd={onAdd}
      currency="USD"
    />,
  );
  expect(screen.getByText(/Scanned Grocery Checklist/i)).toBeInTheDocument();
  expect(screen.getByText(/Organic Milk/i)).toBeInTheDocument();
  expect(screen.getByText(/In Stock/i)).toBeInTheDocument();
  expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();

  const addBtn = screen.getByRole("button", { name: /Add Available Items to Cart/i });
  fireEvent.click(addBtn);
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 101, quantity: 2 }));
});

it("renders referral rewards card with invite stats and code", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "REFERRAL_STATUS_CARD",
          referral: {
            code: "CARTREF99",
            friends_invited: 7,
            rewards_earned: 35.0,
          },
        },
      ]}
    />,
  );
  expect(screen.getByText("CARTREF99")).toBeInTheDocument();
  expect(screen.getByText("7")).toBeInTheDocument();
  expect(screen.getByText("$35.00")).toBeInTheDocument();
});

it("renders auto-dismiss theme switch card and handles undo", () => {
  const onToggleTheme = vi.fn();
  render(
    <ActionCards
      actions={[{ type: "SWITCH_THEME", theme: "light" }]}
      onToggleTheme={onToggleTheme}
    />,
  );
  expect(screen.getByText("Switched to Light Mode")).toBeInTheDocument();
  const undoBtn = screen.getByRole("button", { name: "Undo" });
  fireEvent.click(undoBtn);
  expect(onToggleTheme).toHaveBeenCalledWith("dark");
});

it("renders calculation result preview card with expression and result", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "CALCULATION_RESULT",
          expression: "50 * 12 + 100",
          result: 700,
        },
      ]}
    />,
  );
  expect(screen.getByText("Calculation")).toBeInTheDocument();
  expect(screen.getByText("50 * 12 + 100")).toBeInTheDocument();
  expect(screen.getByText("= 700")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Copy/i })).toBeInTheDocument();
});

it("renders data breakdown preview card with metrics summary and chips", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "DATA_ANALYSIS",
          summary: "Summary: 3 points analyzed.",
          stats: { count: 3, sum: 150, avg: 50 },
        },
      ]}
    />,
  );
  expect(screen.getByText("Data Breakdown")).toBeInTheDocument();
  expect(screen.getByText("Summary: 3 points analyzed.")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("150")).toBeInTheDocument();
  expect(screen.getByText("50")).toBeInTheDocument();
});

it("renders wallet card with balance, pending cashback and navigation buttons", () => {
  const onNavigate = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "WALLET_CARD",
          wallet: {
            balance: 450.0,
            pending_cashback: 25.0,
            usage_policy: "100% usable on store groceries",
          },
        },
      ]}
      onNavigate={onNavigate}
    />,
  );
  expect(screen.getByText("Store Wallet")).toBeInTheDocument();
  expect(screen.getByText("$450.00")).toBeInTheDocument();
  expect(screen.getByText("+$25.00")).toBeInTheDocument();
  expect(screen.getByText("100% usable on store groceries")).toBeInTheDocument();

  const addFundsBtn = screen.getByRole("button", { name: "Add Funds" });
  fireEvent.click(addFundsBtn);
  expect(onNavigate).toHaveBeenCalledWith("/profile/wallet");
});

it("renders rich itemized order card with line items and reorder action", () => {
  const onReorder = vi.fn();
  const onNavigate = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "ORDER_CARD",
          order: {
            id: "ORD202600009",
            status: "ACCEPTED",
            total_amount: 59.2,
            order_type: "DELIVERY",
            items: [
              { id: 1, name: "Organic Honey", quantity: 2, price: 15.0, total: 30.0 },
              { id: 2, name: "Greek Yogurt", quantity: 1, price: 5.2, total: 5.2 },
            ],
          },
        },
      ]}
      persona="shopper"
      onReorder={onReorder}
      onNavigate={onNavigate}
    />,
  );
  expect(screen.getByText("Order #ORD202600009")).toBeInTheDocument();
  expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
  expect(screen.getByText("Doorstep Delivery")).toBeInTheDocument();
  expect(screen.getByText("Organic Honey")).toBeInTheDocument();
  expect(screen.getByText("Greek Yogurt")).toBeInTheDocument();
  expect(screen.getByText("$59.20")).toBeInTheDocument();

  const reorderBtn = screen.getByRole("button", { name: /Reorder/i });
  fireEvent.click(reorderBtn);
  expect(onReorder).toHaveBeenCalledWith([
    { id: 1, name: "Organic Honey", quantity: 2, price: 15.0, total: 30.0 },
    { id: 2, name: "Greek Yogurt", quantity: 1, price: 5.2, total: 5.2 },
  ]);
});

it("renders personalized referral card when person name is specified", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "REFERRAL_STATUS_CARD",
          referral: {
            name: "Priya's Referral Status",
            code: "PRIYA2026",
            friends_invited: 3,
            rewards_earned: 15.0,
          },
        },
      ]}
    />,
  );
  expect(screen.getByText("Priya's Referral Status")).toBeInTheDocument();
  expect(screen.getByText("PRIYA2026")).toBeInTheDocument();
  expect(screen.getByText("$15.00")).toBeInTheDocument();
});

it("allows manual dismissal of auto-dismissing cards via X button", () => {
  const onDismiss = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "WALLET_CARD",
          wallet: { balance: 100 },
        },
      ]}
      onDismiss={onDismiss}
    />,
  );
  const dismissBtn = screen.getByRole("button", { name: "Dismiss preview" });
  expect(dismissBtn).toBeInTheDocument();
  fireEvent.click(dismissBtn);
});


