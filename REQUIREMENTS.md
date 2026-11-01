# CartSettle — Master Requirements & Implementation Specification

## 1. Platform & Scope Rules
1. **Mobile-First Responsive Web Application Only:** Runs directly in any mobile, tablet, or desktop browser. Native mobile APK codebases are excluded.
2. **Preserve Existing Production Features:** Keep all existing `accounts`, `products`, `cart`, `orders`, `offers`, `notifications`, `store`, Delivery Partner workflows, Invoices, and Django Channels WebSockets intact.
3. **Deterministic Financial Authority:** The LLM never computes money. All cart totals, negotiation floor prices (`cost_price` + minimum margin), partial-capture adjustments, and B2B restock totals are calculated strictly in Python `Decimal`.
4. **Open-Source Hackathon Compliance:** Public GitHub repository (`https://github.com/saisatyanarayana09/cartsettle`), root `MIT LICENSE`, `.env.example`, OpenAPI/Postman collection, and a <3-minute YouTube demonstration video.

---

## 2. Core Functional Modules to Implement

### Module 1: PayPal Developer Sandbox Engine (`backend/payments/` or `backend/services/paypal_service.py`)
* **OAuth2 Token Management:** `POST https://api-m.sandbox.paypal.com/v1/oauth2/token` (cached token exchange using `PAYPAL_CLIENT_ID` & `PAYPAL_CLIENT_SECRET`).
* **Create Negotiated / Cart Order (`AUTHORIZE`):** `POST /v2/checkout/orders` with `intent="AUTHORIZE"`, supporting deterministic USD conversion/pricing for Sandbox settlement.
* **Authorize Approved Order:** `POST /v2/checkout/orders/{order_id}/authorize` → stores `paypal_order_id`, `paypal_authorization_id`, `authorized_amount`, and `payment_status='AUTHORIZED'` on `Order`.
* **Packing-Table Dynamic Partial Capture:** `POST /v2/payments/authorizations/{authorization_id}/capture` with `{"amount": {"currency_code": "USD", "value": packed_total}, "final_capture": True}` when order packing completes (`READY`), recording `captured_amount`, `released_amount`, and `paypal_capture_id`.
* **B2B Supplier Batch Payout:** `POST /v1/payments/payouts` for human-approved wholesale restock orders → stores `payout_batch_id` and increments `Product.stock_quantity`.

### Module 2: Shop Owner AI Co-Pilot (`backend/agent/` + Owner Portal UI)
* **Security:** Protected strictly by `IsAuthenticated` + `IsOwnerUser`.
* **Real-Time Streaming:** Broadcasts structured step events (`REASONING`, `GUARDRAIL`, `TOOL_CALL`, `PAYPAL_API`, `RESULT`) over the existing JWT-authenticated WebSocket / HTTP stream to the **Split-Screen Live Agent Thought Terminal** inside `OwnerLayout.jsx`.
* **Authorized Tool Registry:**
  1. `inspect_inventory_and_margins(query, low_stock_only, expiring_within_days)`
  2. `update_product_price_or_stock(product_query, regular_price, offer_price, stock_quantity, is_in_stock)` *(with 1-click Undo snapshot)*
  3. `pack_and_settle_order(order_id, reject_item_names, new_status)` *(auto-triggers PayPal Partial Capture when transitioning an authorized order to `READY`)*
  4. `stage_b2b_supplier_restock(low_stock_auto, items, supplier_email)` *(stages PayPal Payout for 1-click owner confirmation)*
  5. `get_financial_and_sales_briefing(period)`
  6. `create_expiry_clearance_promo(discount_percent, code)`

### Module 3: Shopper AI List-to-Cart & Margin-Guarded Checkout Bargainer
* **Multimodal List/Slip Scanner:** Accepts handwritten grocery slip image or messy natural-language list → extracts items via Gemini Vision/Flash → matches active in-stock `Product` records → populates cart.
* **Live Checkout Bargainer:** Evaluates shopper offer against deterministic Python margin rules (`cost_price`, `expiry_date` urgency, bundle size) → counter-offers or locks a **5-minute signed discount token** applied directly to the PayPal `AUTHORIZE` checkout session.

### Module 4: Sponsor Integrations
* **AG Grid (`ag-grid-react`):** Enterprise Settlement, Margin & Inventory Grid in the Owner Portal showing `Order ID`, `PayPal Auth ID`, `Authorized ($)`, `Captured ($)`, `Auto-Released ($)`, and `Status` with filtering, sorting, and CSV export.
* **Render & OpenAPI / Postman:** Uses existing `drf-spectacular` schema + `Procfile` / `build.sh` for 1-click Postman export and Render deployment.

---

## 3. Environment Variables (`backend/.env.example`)
```env
GEMINI_API_KEY=your_google_ai_studio_gemini_key
GEMINI_MODEL=gemini-2.0-flash

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CURRENCY=USD
PAYPAL_SUPPLIER_SANDBOX_EMAIL=sb-supplier@business.example.com
```
