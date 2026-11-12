import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
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

it("renders SalesAnalyticsCard with gross revenue, paypal captured and navigates", () => {
  const onNavigate = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "SALES_ANALYTICS_CARD",
          analytics: {
            total_revenue: 1842.50,
            total_captured: 1690.00,
            total_released: 152.50,
            total_orders: 56,
            pending_orders: 0,
            aov: 32.90,
          },
        },
      ]}
      currency="USD"
      onNavigate={onNavigate}
    />,
  );
  expect(screen.getByText("Sales & Revenue Analytics")).toBeInTheDocument();
  expect(screen.getByText("$1,842.50")).toBeInTheDocument();
  expect(screen.getByText("$1,690.00")).toBeInTheDocument();
  expect(screen.getByText("56")).toBeInTheDocument();

  const navBtn = screen.getByRole("button", { name: /Open Sales Analytics/i });
  fireEvent.click(navBtn);
  expect(onNavigate).toHaveBeenCalledWith("/owner/sales");
});

it("renders PromoCodesCard with active coupon codes", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "PROMO_CODES_CARD",
          promos: [
            { code: "SAVE15", discount_type: "PERCENTAGE", discount_value: 15, status: "ACTIVE" },
            { code: "WELCOME5", discount_type: "FLAT", discount_value: 5, status: "ACTIVE" },
          ],
        },
      ]}
    />,
  );
  expect(screen.getByText("Promotions & Coupons")).toBeInTheDocument();
  expect(screen.getByText("SAVE15")).toBeInTheDocument();
  expect(screen.getByText("15% OFF")).toBeInTheDocument();
  expect(screen.getByText("WELCOME5")).toBeInTheDocument();
  expect(screen.getByText("$5 OFF")).toBeInTheDocument();
});

it("renders CategoriesCard with active categories", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "CATEGORIES_CARD",
          total_categories: 3,
          categories: [
            { name: "Produce", product_count: 18 },
            { name: "Dairy & Eggs", product_count: 12 },
            { name: "Bakery", product_count: 8 },
          ],
        },
      ]}
    />,
  );
  expect(screen.getByText("Catalog Categories")).toBeInTheDocument();
  expect(screen.getByText("Produce")).toBeInTheDocument();
  expect(screen.getByText("(18)")).toBeInTheDocument();
  expect(screen.getByText("Dairy & Eggs")).toBeInTheDocument();
});

it("renders CustomersFleetCard for delivery partners and customer directory", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "CUSTOMERS_FLEET_CARD",
          delivery_partners: [
            { id: 1, name: "Rahul Sharma", phone: "+1 555-0192", vehicle: "EV Bike", status: "AVAILABLE" },
            { id: 2, name: "Amit Patel", phone: "+1 555-0188", vehicle: "Motorcycle", status: "ON_DELIVERY" },
          ],
        },
      ]}
    />,
  );
  expect(screen.getByText("Delivery Fleet Partners")).toBeInTheDocument();
  expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
  expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
  expect(screen.getByText("Amit Patel")).toBeInTheDocument();
  expect(screen.getByText("ON_DELIVERY")).toBeInTheDocument();
});

it("renders BroadcastCard with customer notification preview", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "BROADCAST_CARD",
          title: "Weekend Flash Deals",
          message: "Enjoy 15% off fresh produce for the next 4 hours.",
          sent_at: "Just now",
        },
      ]}
    />,
  );
  expect(screen.getByText("Customer Push Broadcast")).toBeInTheDocument();
  expect(screen.getByText("Weekend Flash Deals")).toBeInTheDocument();
  expect(screen.getByText("Enjoy 15% off fresh produce for the next 4 hours.")).toBeInTheDocument();
  expect(screen.getByText("Transmitted")).toBeInTheDocument();
});

it("renders CartItemsCard with active cart items, quantity stepper, and checkout trigger", () => {
  const onUpdate = vi.fn();
  const onNavigate = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "CART_ITEMS_CARD",
          items: [
            { id: 101, name: "Organic Whole Milk", price: 4.5, quantity: 2 },
            { id: 102, name: "Fresh Strawberries", price: 5.0, quantity: 1 },
          ],
          total: 14.0,
          count: 3,
        },
      ]}
      onUpdate={onUpdate}
      onNavigate={onNavigate}
    />,
  );
  expect(screen.getByText("Cart Items")).toBeInTheDocument();
  expect(screen.getByText("3 items \u2022 $14.00")).toBeInTheDocument();
  expect(screen.getByText("Organic Whole Milk")).toBeInTheDocument();
  expect(screen.getByText("Fresh Strawberries")).toBeInTheDocument();
  expect(screen.getByText("$14.00")).toBeInTheDocument();

  const incBtn = screen.getByRole("button", { name: "Increase Organic Whole Milk quantity" });
  fireEvent.click(incBtn);
  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ id: 101, name: "Organic Whole Milk" }),
    3,
  );

  const checkoutBtn = screen.getByRole("button", { name: /Checkout/i });
  fireEvent.click(checkoutBtn);
  expect(onNavigate).toHaveBeenCalledWith("/checkout");
});

it("renders empty state in CartItemsCard when cart is empty", () => {
  const onNavigate = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "CART_ITEMS_CARD",
          items: [],
          total: 0,
          count: 0,
          empty: true,
        },
      ]}
      onNavigate={onNavigate}
    />,
  );
  expect(screen.getByText("Your cart is currently empty.")).toBeInTheDocument();
  const browseBtn = screen.getByRole("button", { name: "Browse Products" });
  fireEvent.click(browseBtn);
  expect(onNavigate).toHaveBeenCalledWith("/products");
});

it("renders OrdersListCard with multi-order ledger and inspect trigger", () => {
  const onSend = vi.fn();
  const onNavigate = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "ORDERS_LIST_CARD",
          count: 3,
          orders: [
            { id: "ORD202600005", customer: "Alex Rivera", status: "READY", total: 46.80, items_count: 3, can_settle: true, created_at: "Today, 2:30 PM" },
            { id: "ORD202600004", customer: "Priya Sharma", status: "PREPARING", total: 32.50, items_count: 2, can_settle: true, created_at: "Today, 1:15 PM" },
            { id: "ORD202600003", customer: "Marcus Vance", status: "ACCEPTED", total: 28.90, items_count: 2, can_settle: true, created_at: "Yesterday" },
          ],
        },
      ]}
      persona="owner"
      onSend={onSend}
      onNavigate={onNavigate}
    />,
  );
  expect(screen.getByText("3 Recent Orders")).toBeInTheDocument();
  expect(screen.getByText("3 items")).toBeInTheDocument();
  expect(screen.getByText("#ORD202600005")).toBeInTheDocument();
  expect(screen.getByText(/Alex Rivera/)).toBeInTheDocument();
  expect(screen.getByText(/Priya Sharma/)).toBeInTheDocument();
  expect(screen.getByText(/Marcus Vance/)).toBeInTheDocument();

  // Test 1-click Inspect trigger
  const inspectBtns = screen.getAllByRole("button", { name: /Inspect/i });
  expect(inspectBtns.length).toBeGreaterThan(0);
  fireEvent.click(inspectBtns[0]);
  expect(onSend).toHaveBeenCalledWith("order details ORD202600005");
});

it("renders TopCustomersCard with ranked leaderboard and 1-click actions", () => {
  const onSend = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "TOP_CUSTOMERS_CARD",
          customers: [
            { rank: 1, name: "Rahul Sharma", email: "rahul.s@example.com", total_spent: 1485.50, orders_count: 32, aov: 46.42, tier: "VIP Gold" },
            { rank: 2, name: "Priya Verma", email: "priya.v@example.com", total_spent: 1240.00, orders_count: 24, aov: 51.67, tier: "Platinum" },
          ],
        },
      ]}
      onSend={onSend}
    />,
  );
  expect(screen.getByText("Top Customers Leaderboard")).toBeInTheDocument();
  expect(screen.getByText("#1")).toBeInTheDocument();
  expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
  expect(screen.getByText("VIP Gold")).toBeInTheDocument();
  expect(screen.getByText("#2")).toBeInTheDocument();
  expect(screen.getByText("Priya Verma")).toBeInTheDocument();

  // Test 1-click Dossier button
  const dossierBtns = screen.getAllByRole("button", { name: /Dossier/i });
  fireEvent.click(dossierBtns[0]);
  expect(onSend).toHaveBeenCalledWith("display Rahul Sharma customer details");

  // Test 1-click Credit $10 button
  const creditBtns = screen.getAllByRole("button", { name: /Credit \$10/i });
  fireEvent.click(creditBtns[0]);
  expect(onSend).toHaveBeenCalledWith("credit $10 to customer Rahul Sharma");
});

it("renders CustomerProfileCard for owner with dossier, wallet balance, and credit chips", () => {
  const onSend = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "CUSTOMER_PROFILE_CARD",
          persona: "owner",
          customer: {
            id: 101,
            name: "Rahul Sharma",
            email: "rahul.s@example.com",
            phone: "+1 555-0192",
            tier: "VIP Gold",
            total_spent: 1485.50,
            orders_count: 32,
            wallet_balance: 45.00,
            recent_orders: [
              { id: "ORD202600005", created_at: "Today, 2:30 PM", total: 46.80, status: "READY", items_count: 3 },
            ],
          },
        },
      ]}
      persona="owner"
      onSend={onSend}
    />,
  );
  expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
  expect(screen.getByText(/rahul\.s@example\.com/)).toBeInTheDocument();
  expect(screen.getByText("$45.00")).toBeInTheDocument();
  expect(screen.getByText("#ORD202600005")).toBeInTheDocument();

  // Test credit chips
  const credit10Btn = screen.getByRole("button", { name: /Add \$10 Credit/i });
  fireEvent.click(credit10Btn);
  expect(onSend).toHaveBeenCalledWith("credit $10 to customer Rahul Sharma");
});

it("renders CustomerProfileCard for shopper with savings and referral hub", () => {
  render(
    <ActionCards
      actions={[
        {
          type: "CUSTOMER_PROFILE_CARD",
          persona: "shopper",
          customer: {
            name: "Alex Rivera",
            tier: "Gold Shopper",
            wallet_balance: 65.00,
            lifetime_savings: 142.50,
            referral_code: "CARTREF2026",
            referral_earnings: 25.00,
          },
        },
      ]}
      persona="shopper"
    />,
  );
  expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
  expect(screen.getByText("Gold Shopper")).toBeInTheDocument();
  expect(screen.getByText("$65.00")).toBeInTheDocument();
  expect(screen.getByText("$142.50")).toBeInTheDocument();
  expect(screen.getByText("CARTREF2026")).toBeInTheDocument();
});

it("renders DynamicCompositeCard with polymorphic schema KPIs and actions", () => {
  const onSend = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "DYNAMIC_COMPOSITE_CARD",
          title: "Operations Pulse",
          subtitle: "Live system telemetry",
          badge: "Real-Time",
          kpis: [
            { label: "Active Orders", value: 14, trend: "+3", positive: true },
            { label: "Fulfillment Rate", value: "98.4%", trend: "+1.2%", positive: true },
          ],
          key_values: [
            { key: "Courier Fleet", value: "8 Online" },
            { key: "Avg Delivery Time", value: "18 mins" },
          ],
          actions: [
            { label: "Audit Fleet", action_type: "send", payload: "Show delivery fleet status", variant: "default" },
          ],
        },
      ]}
      onSend={onSend}
    />,
  );
  expect(screen.getByText("Operations Pulse")).toBeInTheDocument();
  expect(screen.getByText("Live system telemetry")).toBeInTheDocument();
  expect(screen.getByText("Real-Time")).toBeInTheDocument();
  expect(screen.getByText("Active Orders")).toBeInTheDocument();
  expect(screen.getByText("14")).toBeInTheDocument();
  expect(screen.getByText("Fulfillment Rate")).toBeInTheDocument();
  expect(screen.getByText("98.4%")).toBeInTheDocument();
  expect(screen.getByText("Courier Fleet")).toBeInTheDocument();
  expect(screen.getByText("8 Online")).toBeInTheDocument();

  const actionBtn = screen.getByRole("button", { name: "Audit Fleet" });
  fireEvent.click(actionBtn);
  expect(onSend).toHaveBeenCalledWith("Show delivery fleet status");
});

it("AutoDismissCardWrapper has duration=0 for turn-based persistence and dismiss button", () => {
  vi.useFakeTimers();
  const onDismiss = vi.fn();
  render(
    <ActionCards
      actions={[
        {
          type: "DYNAMIC_COMPOSITE_CARD",
          title: "Persistent Turn Card",
          kpis: [{ label: "Turn State", value: "Active" }],
        },
      ]}
      onDismiss={onDismiss}
    />,
  );
  expect(screen.getByText("Persistent Turn Card")).toBeInTheDocument();
  const dismissBtn = screen.getByRole("button", { name: "Dismiss preview" });
  expect(dismissBtn).toBeInTheDocument();
  act(() => {
    fireEvent.click(dismissBtn);
    vi.advanceTimersByTime(200);
  });
  expect(onDismiss).toHaveBeenCalled();
  vi.useRealTimers();
});



