import { describe, it, expect } from "vitest";
import { handleLovableAgentFallback } from "./lovableAgentFallback";

describe("lovableAgentFallback mock engine", () => {
  it("generates ORDERS_LIST_CARD when multi orders are queried", () => {
    const res = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "show last 3 orders",
        persona: "owner",
        session_id: "test_fallback_orders",
      },
    });
    expect(res).toBeDefined();
    expect(res.reply).toContain("orders");
    const listCard = res.actions?.find((a: any) => a.type === "ORDERS_LIST_CARD");
    expect(listCard).toBeDefined();
    expect(listCard.orders.length).toBe(3);
    expect(listCard.orders[0]).toHaveProperty("id");
    expect(listCard.orders[0]).toHaveProperty("total");
    expect(listCard.orders[0]).toHaveProperty("status");
  });

  it("generates TOP_CUSTOMERS_CARD when top buying customers are queried", () => {
    const res = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "top 3 highest buying users",
        persona: "owner",
        session_id: "test_fallback_top",
      },
    });
    expect(res).toBeDefined();
    const topCard = res.actions?.find((a: any) => a.type === "TOP_CUSTOMERS_CARD");
    expect(topCard).toBeDefined();
    expect(topCard.customers.length).toBe(3);
    expect(topCard.customers[0].rank).toBe(1);
    expect(topCard.customers[0]).toHaveProperty("total_spent");
    expect(topCard.customers[0]).toHaveProperty("tier");
  });

  it("generates CUSTOMER_PROFILE_CARD when customer details are queried", () => {
    const res = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "customer details Rahul",
        persona: "owner",
        session_id: "test_fallback_profile",
      },
    });
    expect(res).toBeDefined();
    const profCard = res.actions?.find((a: any) => a.type === "CUSTOMER_PROFILE_CARD");
    expect(profCard).toBeDefined();
    expect(profCard.customer.name).toContain("Rahul");
    expect(profCard.customer).toHaveProperty("wallet_balance");
    expect(profCard.customer).toHaveProperty("recent_orders");
  });

  it("handles dynamic wallet credit for owner", () => {
    const res = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "credit $15 to customer Rahul",
        persona: "owner",
        session_id: "test_fallback_credit",
      },
    });
    expect(res).toBeDefined();
    expect(res.reply).toContain("Credited $15.00");
    const profCard = res.actions?.find((a: any) => a.type === "CUSTOMER_PROFILE_CARD");
    expect(profCard).toBeDefined();
    expect(profCard.customer.wallet_balance).toBeGreaterThanOrEqual(15.0);
  });

  it("generates CUSTOMER_PROFILE_CARD for shopper account dossier", () => {
    const res = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "my account",
        persona: "shopper",
        session_id: "test_fallback_shopper",
      },
    });
    expect(res).toBeDefined();
    const profCard = res.actions?.find((a: any) => a.type === "CUSTOMER_PROFILE_CARD");
    expect(profCard).toBeDefined();
    expect(profCard.persona).toBe("shopper");
    expect(profCard.customer).toHaveProperty("lifetime_savings");
    expect(profCard.customer).toHaveProperty("referral_code");
  });

  it("generates rich single ORDER_CARD with line items and financial audit", () => {
    const res = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "order details ORD202600005",
        persona: "owner",
        session_id: "test_fallback_single_order",
      },
    });
    expect(res).toBeDefined();
    const orderCard = res.actions?.find((a: any) => a.type === "ORDER_CARD");
    expect(orderCard).toBeDefined();
    expect(orderCard.order.id).toBe("ORD202600005");
    expect(orderCard.order.authorized_amount).toBeDefined();
    expect(orderCard.order.captured_amount).toBeDefined();
    expect(orderCard.order.items.length).toBeGreaterThan(0);
  });

  it("owner gets customer profile card for 'what about the sai satyanarayana' without customer keyword", () => {
    const res = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "what about the sai satyanarayana",
        persona: "owner",
        session_id: "test_sai_owner",
      },
    });
    expect(res).toBeDefined();
    expect(res.reply).toContain("K Sai Satyanarayana");
    const profCard = res.actions?.find((a: any) => a.type === "CUSTOMER_PROFILE_CARD");
    expect(profCard).toBeDefined();
    expect(profCard.customer.name).toContain("Sai");
  });

  it("shopper receives privacy refusal with 0 cards for 'what about the sai satyanarayana'", () => {
    const res = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "what about the sai satyanarayana",
        persona: "shopper",
        session_id: "test_sai_shopper",
      },
    });
    expect(res).toBeDefined();
    expect(res.reply).toContain("Customer account details and profiles are private");
    expect(res.actions).toEqual([]);
  });

  it("honorifics and hyphenated names resolve for owner", () => {
    const resDr = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "who is Dr. Sai Satyanarayana",
        persona: "owner",
        session_id: "test_dr_sai",
      },
    });
    expect(resDr.reply).toContain("K Sai Satyanarayana");

    const resHyphen = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "what about sai-satyanarayana",
        persona: "owner",
        session_id: "test_hyphen_sai",
      },
    });
    expect(resHyphen.reply).toContain("K Sai Satyanarayana");
  });

  it("'what about whole wheat bread' falls through to product search, never customer privacy", () => {
    const res = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "what about whole wheat bread",
        persona: "shopper",
        session_id: "test_bread_shopper",
      },
    });
    expect(res).toBeDefined();
    expect(res.reply).not.toContain("private");
    expect(res.reply).not.toContain("restricted");
  });

  it("system names and common terms do not trigger customer lookup", () => {
    const resOwner = handleLovableAgentFallback({
      method: "post",
      data: {
        prompt: "who is owner",
        persona: "owner",
        session_id: "test_who_owner",
      },
    });
    const card = resOwner.actions?.find((a: any) => a.type === "CUSTOMER_PROFILE_CARD");
    expect(card).toBeUndefined();
  });
});
