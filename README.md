# CartSettle 🛒⚡
### Autonomous PayPal Payment & Margin-Protection Engine for Independent Grocers

> **Submission for the PayPal AI Hackathon 2026 (Devpost)**  
> **Targeting:**  
> 🏆 **$12,000 Grand Prize** (Best Overall AI + PayPal Integration)  
> 💡 **$5,000 Best Use of Agentic Commerce** (Autonomous Margin Guard, Packing Settlements & B2B Payouts)  
> 📊 **$5,000 AG Grid Sponsor Prize** (Enterprise Packing Settlement Table)

---

## 🌟 The Problem
Independent grocers, bodegas, and local kirana stores operate on razor-thin net profit margins (typically **12% to 18%**). When customers order online:
1. **The Out-of-Stock Dilemma:** If 1 or 2 fresh items or specific brands are missing when packing, stores either cancel the entire order, issue cumbersome manual refunds, or face payment disputes and processing fees.
2. **Aggressive Haggling Risks:** Independent grocers often discount items to close deals, frequently cutting into their margin below wholesale break-even.
3. **Wholesale Restock Latency:** Shopkeepers manually tally low-stock items at night and write checks or transfer cash to distributors, creating supply bottlenecks.

---

## 🚀 The Solution: CartSettle
**CartSettle** is an autonomous fintech and retail agent that turns PayPal into a dynamic, margin-guarded settlement engine:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CartSettle Commerce Flow                        │
└────────────────────────────────────────────────────────────────────────┘

  1. SHOPPER LIST-TO-CART & PRE-AUTH
     Shopper creates cart → AI bargains while guarding minimum 12% margin
     PayPal Orders v2 (intent="AUTHORIZE") holds maximum total funds.
                            │
                            ▼
  2. PACKING-TABLE AUTO-SETTLEMENT
     Store owner packs order on register table → marks out-of-stock items.
     CartSettle executes PayPal Payments v2 Dynamic Partial Capture:
     [ final_capture = true ]
     👉 Captures ONLY verified packed items.
     👉 Instantly releases remaining held funds back to buyer's PayPal balance.
                            │
                            ▼
  3. OWNER AI CO-PILOT & B2B RESTOCK PAYOUTS
     Voice/text Kirana Co-Pilot powered by Google Gemini 3.5 Flash.
     Audits packing discrepancies + executes autonomous wholesale restocks
     to suppliers via PayPal Payouts v1.
                            │
                            ▼
  4. AG GRID ENTERPRISE SETTLEMENT PORTAL
     High-performance AG Grid table with live status badges, hold-vs-capture
     receipts, CSV export, and 1-click dynamic packing settlement modals.
```

---

## 🛠️ PayPal APIs & Technologies Used

### 1. PayPal REST API Integration
* **`POST /v2/checkout/orders` (`intent: "AUTHORIZE"`):** Pre-authorizes shopper funds at checkout without charging upfront.
* **`POST /v2/checkout/orders/{id}/authorize`:** Locks the authorization hold when buyer confirms approval in the PayPal modal.
* **`POST /v2/payments/authorizations/{auth_id}/capture` (`final_capture: true`):** The core packing-table settlement feature. Automatically captures only the packed items and releases uncaptured funds back to the shopper without refund processing fees.
* **`POST /v2/payments/authorizations/{auth_id}/void`:** Immediately voids the authorization if an order is cancelled or rejected before packing.
* **`POST /v1/payments/payouts`:** Powers autonomous supplier restocks, paying wholesale distributors directly from store proceeds.

### 2. Google Gemini Agentic AI
* Powered by `gemini-3.5-flash` with structured function/tool calling:
  * `inspect_margin`: Audits regular price, wholesale cost, and profit margin %.
  * `bargain_and_guard_margin`: Enforces the 12% safety margin, automatically countering excessive discounts with the maximum safe margin.
  * `execute_supplier_restock_payout`: Autonomous B2B restock payout execution.
  * `audit_order_settlement`: Reconciles packing receipts, captures, and released refunds.
* Live WebSocket thought stream terminal powering real-time agent observability.

### 3. AG Grid Community (Sponsor Prize Submission)
* Modern `ag-theme-quartz` enterprise data grid in the Owner Portal.
* Quick filtering, multi-column sorting, custom cell renderers for PayPal authorization holds, auto-released refund tags, CSV export, and 1-click packing settlement.

---

## 💻 Tech Stack
* **Backend:** Python 3.10+, Django 5.2, Django REST Framework, Django Channels 4.3 + Daphne (ASGI WebSocket streaming), `requests`, SQLite / PostgreSQL.
* **Frontend:** React 19, Vite 8, Tailwind CSS v4, `@paypal/react-paypal-js`, `ag-grid-react`, `ag-grid-community`, Lucide React, Axios.

---

## 🏁 Quickstart Guide

### 1. Prerequisites
* Python 3.10+
* Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend

# Configure environment variables
# Copy .env.example to .env and fill in your PayPal Sandbox and Gemini API keys:
cp .env.example .env

# Run database migrations
python manage.py migrate

# Start the Django ASGI server
python manage.py runserver 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start Vite development server
npm run dev
```

Visit `http://localhost:5173` to explore the Shopper Store, or `http://localhost:5173/owner/orders` to access the AG Grid Enterprise Settlement Portal and Kirana AI Co-Pilot.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
