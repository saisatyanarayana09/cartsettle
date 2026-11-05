# CartSettle 🛒⚡
### Autonomous PayPal Payment & Margin-Protection Engine for Independent Grocers

> **Official Submission for the PayPal AI Hackathon 2026 (Devpost)**  
> **Target Prize Tracks:**  
> 🏆 **$12,000 Grand Prize** — Best Overall AI + PayPal Integration  
> 💡 **$5,000 Best Use of Agentic Commerce** — Autonomous Margin Guard, Vision Packing Audit, Dynamic Partial Capture & B2B Restock Payouts  
> 📊 **$5,000 AG Grid Sponsor Prize** — Enterprise Grocery Settlement Portal with Real-Time Delta Updates & 1-Click Operations  

---

## 🌟 The Problem
Independent grocers, bodegas, and local kirana stores operate on razor-thin net profit margins (typically **12% to 18%**). When customers order groceries online, merchants face three crippling friction points:
1. **The Out-of-Stock Dilemma:** Fresh produce and specific brands go out of stock rapidly. When packing, if 1 or 2 items are unavailable, stores either cancel the entire order, perform awkward manual refunds, or face payment dispute fees.
2. **Aggressive Haggling & Margin Erosion:** Independent grocers often discount items to retain loyal shoppers, but frequently cut prices below wholesale cost, operating at a net loss without knowing it.
3. **Wholesale Restock Latency:** Bodega owners manually tally empty shelves at midnight and write manual checks or bank transfers, causing supply bottlenecks.

---

## 🚀 The Solution: CartSettle
**CartSettle** transforms PayPal into an autonomous, margin-guarded settlement and fulfillment engine:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CartSettle Commerce Flow                        │
└────────────────────────────────────────────────────────────────────────┘

  1. SHOPPER LIST-TO-CART & PRE-AUTH
     Shopper creates cart → AI bargains while strictly guarding 12% margin floor.
     PayPal Orders v2 (intent="AUTHORIZE") holds maximum cart total funds.
                            │
                            ▼
  2. MULTIMODAL VISION PACKING AUDIT
     Store packer takes a single photo of packed grocery bag.
     Google Gemini 3.5 Flash Multimodal Vision audits checklist against photo.
                            │
                            ▼
  3. PACKING-TABLE DYNAMIC CAPTURE (ZERO-RISK SETTLEMENT)
     Store owner confirms packed items on AG Grid settlement table.
     CartSettle executes PayPal Payments v2 Dynamic Partial Capture:
     [ final_capture = true ]
     👉 Captures ONLY verified packed items.
     👉 Instantly auto-releases remaining held funds back to buyer's PayPal balance.
     👉 Auto-generates itemized PayPal Tax Invoice (Invoicing v2 API).
                            │
                            ▼
  4. SHIPPING TRACKER & FULFILLMENT PROOF
     Dispatched orders automatically register fulfillment proof to PayPal
     via PayPal Shipping Trackers v1 API, inoculating merchants against disputes.
                            │
                            ▼
  5. OWNER AI CO-PILOT & B2B RESTOCK PAYOUTS
     Voice/text Kirana Co-Pilot powered by Google Gemini 3.5 Flash + PayPal Payouts v1.
     Audits store analytics, flags low inventory, and executes autonomous
     wholesale restock payouts to distributors directly from store revenues.
                            │
                            ▼
  6. AG GRID ENTERPRISE ORDERS & SETTLEMENT PORTAL
     High-performance AG Grid Quartz table with custom hold/capture renderers,
     live WebSocket delta transactions, 1-click settlements, invoice links, and CSV export.
```

---

## 🛠️ PayPal APIs & Technologies Integrated

| PayPal API / Feature | Endpoint / Mechanism | CartSettle Implementation |
| :--- | :--- | :--- |
| **Orders v2 (Authorize)** | `POST /v2/checkout/orders` (`intent: "AUTHORIZE"`) | Holds shopper funds at checkout without upfront debit. |
| **Orders v2 (Approval)** | `POST /v2/checkout/orders/{id}/authorize` | Locks the pre-authorization hold when the buyer approves. |
| **Payments v2 (Capture)** | `POST /v2/payments/authorizations/{id}/capture` | **Core Hackathon Feature:** Dynamic partial capture (`final_capture=true`). Automatically releases held unfulfilled funds back to buyer balance without refund processing fees. |
| **Payments v2 (Void)** | `POST /v2/payments/authorizations/{id}/void` | Instantly voids authorization hold if an order is rejected. |
| **Invoicing v2** | `POST /v2/invoicing/invoices` + `.../send` | Generates official itemized PayPal Tax Invoices with live payer-view URLs upon packing confirmation. |
| **Shipping Trackers v1** | `POST /v1/shipping/trackers-batch` | Attaches delivery rider tracking numbers directly to the PayPal transaction for seller protection. |
| **Disputes v1** | `GET /v1/customer/disputes` + `.../provide-evidence` | In-portal dispute management and autonomous submission of packing photo and settlement audit proof. |
| **Payouts v1** | `POST /v1/payments/payouts` | Kirana AI Co-Pilot executes autonomous wholesale restock payouts to suppliers. |
| **Webhooks** | `POST /api/v1/orders/paypal_webhook/` | Ingests real-time events (`PAYMENT.CAPTURE.COMPLETED`, `CUSTOMER.DISPUTE.CREATED`). |
| **Model Context Protocol (MCP)** | `@paypal/mcp@1.8.1` | Configured in `.mcp/paypal_mcp_config.json` for external LLM agent interoperability. |

---

## 📊 AG Grid Enterprise Portal (Sponsor Prize Submission)

Built in `frontend/src/owner/components/OwnerOrdersAgGrid.jsx` using `ag-grid-react` and `ag-theme-quartz`:
- **Hold vs. Captured Cell Renderer:** Displays authorized hold amount, final captured total, and auto-released refund tags in high-contrast badges.
- **In-Place Row Delta Updates:** Uses `getRowId={(params) => String(params.data?.id || '')}` for smooth, flicker-free row transitions on live WebSocket settlement updates.
- **Action Cell Renderer:** 1-click modal launchers for Gemini Vision Packing Settlement, PayPal Invoice viewer, and Shipping Tracker dispatch.
- **Enterprise Features:** Multi-column sorting, floating filters, status-based row styling, quick search, and CSV export.

---

## 🤖 Google Gemini 3.5 Flash + Zero-Lag 3-Layer Agentic Commerce Engine

- **Sub-25ms Zero-Lag Hybrid Architecture:** Combines a 60s in-memory backend catalog cache (`0.0015ms` read), a 4-minute Render keep-warm heartbeat, and a live-synced client fallback engine (`< 2.5ms`) so voice & text commands respond instantaneously even during free-tier cloud cold starts.
- **4 Zero-Click Autonomous Agentic Suites (Voice & Text):**
  1. **Suite 1 — Zero-Click Checkout & Order Lifecycle:** *"Place my order"*, *"Pay with COD"*, *"Apply promo SAVE10"*, *"Reorder my last order"*, *"Cancel my last order"*.
  2. **Suite 2 — Autonomous Cart & Budget Optimization:** *"Build a cart under \$20"*, *"Swap with cheaper alternative"*, *"Set milk quantity to 3 in cart"*.
  3. **Suite 3 — Store Owner Bulk Operations:** *"Settle all pending orders"*, *"Restock all low stock items"*, *"Discount all dairy by 10%"*.
  4. **Suite 4 — Profile, Address, Wishlist & Order Filtering:** *"Switch address to Work"*, *"Add milk to favorites"*, *"Move favorites to cart"*, *"Show delivered orders"*.
- **Multimodal Vision Bag Auditor:** Scans packing photos to verify expected grocery items, quantities, and missing items before settlement.
- **Margin Guard Shopper Tool (`bargain_and_guard_margin`):** Computes live item margins (`(price - cost) / price`). Enforces a strict **12% margin floor**, countering discounts that would cause store losses.
- **Autonomous Kirana Co-Pilot (`execute_supplier_restock_payout`):** Chat & voice agent that analyzes sales, calculates inventory depletion, and triggers supplier payouts via PayPal Payouts v1.

---

## 🔑 Judge Test Credentials & Live Evaluation

### 1. Store Owner Portal (AG Grid & Settlement)
- **URL:** `/owner/login`
- **Username:** `owner`
- **Password:** `CartSettle@2026`

### 2. Shopper Portal (Voice AI Concierge, Bargaining & Pre-Auth Checkout)
- **URL:** `/login`
- **Username:** `shopper`
- **Password:** `Shopper@2026`

### 3. PayPal Sandbox Buyer Account
- Use any PayPal Sandbox Personal buyer account (or `shopper-sandbox@cartsettle.test`) at checkout via the **Pay with PayPal** button.

---

## 🧪 Comprehensive End-to-End Test Suite

Run the full 9-step verification suite against live PayPal Sandbox & Gemini APIs:

```bash
python backend/scratch/e2e_full_verification.py
```

### Verified Test Matrix (100% Pass)
```text
============================================================
>> CARTSETTLE COMPREHENSIVE END-TO-END TEST SUITE
============================================================
[STEP 1] Testing Shopper Bargain Tool with Margin Guard (12% Floor)... [PASS]
[STEP 2] Testing PayPal Orders v2 Pre-Authorization Hold ($50.00)... [PASS]
[STEP 3] Persisting Order with PayPal Hold in Database... [PASS]
[STEP 4] Testing Gemini Multimodal Vision Bag Scanner (/vision_pack/)... [PASS]
[STEP 5] Testing Packing Table Dynamic Capture (/settle_packing/)... [PASS]
[STEP 6] Testing PayPal Invoicing v2 API (/generate_invoice/)... [PASS]
[STEP 7] Testing Shipping Tracker v1 Dispatch (/dispatch_tracking/)... [PASS]
[STEP 8] Testing PayPal Disputes API v1 (/orders/disputes/)... [PASS]
[STEP 9] Testing Kirana AI Co-Pilot Chat (/store/agent/chat/)... [PASS]
============================================================
>> ALL 9 CRITICAL SYSTEM TESTS PASSED CLEANLY WITH ZERO ERRORS!
============================================================
```

---

## 💻 Tech Stack
- **Backend:** Python 3.10+, Django 5.2, Django REST Framework, Django Channels 4.3 + Daphne (WebSocket streaming), PostgreSQL / SQLite, `requests`, Google Generative AI SDK (`google-genai`).
- **Frontend:** React 19, Vite 8, Tailwind CSS v4, `ag-grid-react`, `ag-grid-community`, `@paypal/react-paypal-js`, Lucide React, Axios.

---

## 🏁 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and GEMINI_API_KEY in .env
python manage.py migrate
python manage.py runserver 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Visit:
- **Shopper Portal:** `http://localhost:5173`
- **Owner AG Grid Settlement Portal:** `http://localhost:5173/owner/orders`
- **Owner Dashboard:** `http://localhost:5173/owner/dashboard`

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
