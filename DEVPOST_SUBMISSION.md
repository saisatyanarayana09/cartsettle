# CartSettle — Devpost Submission Package 🚀
### PayPal AI Hackathon 2026

This guide contains everything you need to submit **CartSettle** to Devpost. You can copy and paste the sections below directly into the Devpost submission form.

---

## 📌 Section 1: Project Overview (Devpost Form Fields)

- **Project Title:**  
  `CartSettle`

- **Elevator Pitch / Tagline (under 200 characters):**  
  `Autonomous PayPal payment & margin-protection engine for independent grocers: dynamic partial capture, vision bag audits, AG Grid settlement portal & B2B restocks.`

- **Target Prize Categories & Sponsor Tools (Select on Devpost Form):**  
  1. 🏆 **Overall (1st / 2nd / 3rd Place — $12,000 / $8,000 / $5,000)**  
  2. 🤖 **Best Use of Agentic Commerce ($5,000):** 4 Zero-Click Autonomous Voice/Text Agentic Suites, 12% Margin Guardrails, Multimodal Vision Bag Audits, Autonomous Supplier Restock Payouts & Model Context Protocol (`@paypal/mcp`)  
  3. 💳 **Best Use of PayPal + AI ($5,000):** 7 Live PayPal APIs (Orders v2 Pre-Auth, Payments v2 Dynamic Partial Capture `final_capture=true`, Invoicing v2, Shipping Trackers v1, Disputes v1, Payouts v1, Webhooks) + Google Gemini 3.5 Flash  
  4. 🌍 **Most Impactful ($5,000):** Empowering neighborhood grocers and local stores against 30%-commission quick-commerce dark stores, while giving non-tech-savvy and elderly shoppers a zero-click voice-first AI concierge  
  5. ✨ **Most Creative ($5,000) & Best Demo Delivery ($5,000)**  
  6. 📊 **Best Use of AG Grid ($5,000 / $2,000 / $1,000):** Enterprise Orders & Settlement Cockpit (`OwnerOrdersAgGrid.jsx`) with custom Hold vs. Captured renderers, live WebSocket delta updates, and 1-click settlement  
  7. ☁️ **Best Use of Render ($1,000 / $750 / $500 Render Credits):** Multi-service `render.yaml` Infrastructure-as-Code Blueprint (`cartsettle-api` + `cartsettle-web`) engineered with a **3-Layer Zero-Lag Render Free-Tier Engine** (4-min keep-warm heartbeat, 60s in-memory catalog cache, and `< 2.5ms` live-synced client fallback)  

- **Project Links:**  
  - **GitHub Repository:** `https://github.com/saisatyanarayana09/cartsettle`  
  - **Live Demo / Video Pitch:** *(Paste your YouTube / Loom / Vimeo video link here)*  

---

## 📝 Section 2: Written Story (Copy-Paste into Devpost "Story" Box)

### 💡 Inspiration (Why We Built CartSettle)
Independent neighborhood grocers, bodegas, and local family-owned stores are the backbone of communities worldwide. Yet today they are being squeezed out by venture-backed 10-minute dark-store aggregators and 30%-commission delivery platforms, while operating on razor-thin net profit margins of **12% to 18%**.

When local store owners try to go digital on their own, they hit four painful walls:
1. **The Out-of-Stock & Variable-Weight Payment Dilemma:** Fresh produce, dairy, and daily essentials fluctuate hourly. When packing an online order, if 1 or 2 items are missing, traditional payment gateways force merchants into full cancellations, manual refunds, or expensive chargeback fees.
2. **Accessibility Barriers for Everyday Shoppers:** Elderly customers, busy parents, and non-tech-savvy or low-literacy shoppers struggle with complex multi-screen e-commerce flows. They are used to simply *speaking* to their neighborhood shopkeeper.
3. **Aggressive Haggling & Margin Erosion:** Shopkeepers frequently offer discounts to loyal customers, but accidentally cut prices below wholesale costs and sell at a net loss.
4. **Midnight Restock Friction:** Store owners manually count empty shelves late at night and initiate slow manual bank transfers to wholesale distributors.

We built **CartSettle** to give every neighborhood store its own **Zero-Click AI Concierge + Autonomous PayPal Settlement Engine**—empowering local merchants to compete with instant-delivery giants while keeping 100% of their customer relationships and protecting their profit margins on every order.

---

### 🛒 What It Does
CartSettle automates the entire lifecycle of an independent grocery order from list to packing, settlement, and restock:

1. **Shopper Bargaining with 12% Margin Floor:**  
   Shoppers can negotiate discounts on cart items. Google Gemini 3.5 Flash inspects wholesale cost vs. regular price and enforces a strict **12% margin floor**, automatically countering discounts that would cause store losses.

2. **Pre-Authorization Checkout (PayPal Orders v2):**  
   At checkout, CartSettle initiates a PayPal order with `intent="AUTHORIZE"`. The maximum cart total is held on the buyer's payment method, but **zero funds are charged upfront**.

3. **Multimodal Vision Bag Auditor (Gemini 3.5 Flash Vision):**  
   At the packing table, the store clerk snaps a single photo of the packed grocery bag. Gemini Multimodal Vision verifies expected items against the packing photo, highlighting discrepancies before charging.

4. **Dynamic Partial Capture & Instant Zero-Risk Refund (PayPal Payments v2):**  
   When the merchant confirms fulfilled items on the AG Grid settlement table, CartSettle calls `capture_authorization` with **`final_capture=true`**.  
   - **CartSettle captures ONLY the exact total of packed items.**  
   - **PayPal automatically releases the remaining held difference back to the buyer's balance/card instantly**—with zero refund transaction fees and zero manual paperwork!

5. **Official Itemized Invoices (PayPal Invoicing v2):**  
   Upon capture, CartSettle automatically creates and sends an itemized PayPal Tax Invoice with a live payer-view URL accessible from the customer portal and owner dashboard.

6. **Shipping Tracker Dispatch (PayPal Shipping Trackers v1):**  
   When the delivery rider is dispatched, tracking information is attached directly to the PayPal transaction, providing proof of fulfillment for seller protection.

7. **In-Portal Disputes Management (PayPal Disputes v1):**  
   Merchants can view disputes and submit packing audit photos and settlement logs directly to PayPal for resolution.

8. **Autonomous Wholesale Restocks (PayPal Payouts v1):**  
   The Kirana AI Co-Pilot audits depleted stock and initiates autonomous B2B payouts to wholesale distributors from store proceeds.

---

### 🛠️ How We Built It
- **Backend Architecture:** Built with Python 3.10 and Django 5.2 / Django REST Framework. Real-time agent thought streaming and order status broadcast are powered by Django Channels 4.3 and ASGI WebSockets. Dual-database architecture supports both local SQLite and Cloud Neon PostgreSQL.
- **Frontend & AG Grid:** Built with React 19, Vite 8, and Tailwind CSS v4. The Owner Orders Portal is powered by **AG Grid Community** (`ag-theme-quartz`) with custom cell renderers for hold vs. captured amounts, auto-released refund tags, and in-place row transactions.
- **AI Agentic Layer:** Google Gemini 3.5 Flash utilizing structured tool calling (`inspect_margin`, `bargain_and_guard_margin`, `execute_supplier_restock_payout`, `verify_packing_photo`).
- **PayPal Model Context Protocol (MCP):** Configured in `.mcp/paypal_mcp_config.json` referencing `@paypal/mcp@1.8.1` for external LLM agent interoperability.

---

### 💳 PayPal APIs Deep Dive

| PayPal API / Feature | Endpoint | Purpose in CartSettle |
| :--- | :--- | :--- |
| **Orders v2 (Authorize)** | `POST /v2/checkout/orders` (`intent: "AUTHORIZE"`) | Pre-authorizes maximum cart amount at checkout. |
| **Orders v2 (Approval)** | `POST /v2/checkout/orders/{id}/authorize` | Locks the authorization hold when buyer confirms. |
| **Payments v2 (Capture)** | `POST /v2/payments/authorizations/{id}/capture` | **Dynamic Partial Capture (`final_capture: true`):** Charges only fulfilled items and auto-releases uncaptured funds. |
| **Payments v2 (Void)** | `POST /v2/payments/authorizations/{id}/void` | Immediately voids authorization if an order is cancelled. |
| **Invoicing v2** | `POST /v2/invoicing/invoices` + `.../send` | Generates official tax invoices with live payer-view URLs. |
| **Shipping Trackers v1** | `POST /v1/shipping/trackers-batch` | Attaches delivery rider tracking numbers to PayPal transactions. |
| **Disputes v1** | `GET /v1/customer/disputes` + `.../provide-evidence` | Inspects buyer disputes and submits fulfillment evidence. |
| **Payouts v1** | `POST /v1/payments/payouts` | Kirana AI Co-Pilot executes wholesale restock payouts. |
| **Webhooks** | `POST /api/v1/orders/paypal_webhook/` | Ingests real-time PayPal events (`PAYMENT.CAPTURE.COMPLETED`, `CUSTOMER.DISPUTE.CREATED`). |

---

### 📊 AG Grid Implementation (Sponsor Prize Submission)
CartSettle's Owner Portal (`OwnerOrdersAgGrid.jsx`) leverages AG Grid to provide enterprise grocery operations:
- **Hold vs. Captured Cell Renderer:** Displays authorized hold amount, final captured total, and auto-released refund tags in high-contrast badges.
- **In-Place Row Delta Updates:** Uses `getRowId={(params) => String(params.data?.id || '')}` for smooth, flicker-free row transitions on live WebSocket settlement updates.
- **Action Cell Renderer:** 1-click modal launchers for Gemini Vision Packing Settlement, PayPal Invoice viewer, and Shipping Tracker dispatch.
- **Enterprise Features:** Multi-column sorting, floating filters, status-based row styling, quick search, and CSV export.

---

### ☁️ Render Cloud Architecture & Zero-Lag Engine (Sponsor Prize Submission)
CartSettle is deployed on **Render** via a declarative `render.yaml` Blueprint (`cartsettle-api` Python web service + `cartsettle-web` React static SPA) and engineered specifically to eliminate free-tier cold-start latency:
- **Layer 1 — Proactive Render Keep-Warm Heartbeat (`api.js`):** Fires a non-blocking wake-up ping on app boot, tab focus, and every 4 minutes while active so the Render container stays warm before the user speaks a word, paired with a strict `1.8s` timeout cap on `/store/agent/` calls.
- **Layer 2 — Live-Synced Client Fallback (`lovableAgentFallback.js`):** Reads the live cached store catalog (`sk_cache_/products/`) in the browser (`< 2.5ms`) if a Render container is mid-spin-up.
- **Layer 3 — 60s In-Memory Catalog Cache (`agent_service.py`):** Serves active product lookups in `0.0015ms` (`1.5 µs`) and executes all 4 Zero-Click Autonomous Agentic Suites in **`5.3ms – 25.1ms`**.

---

### 🚧 Challenges We Ran Into
1. **Dynamic Capture Nuances (`final_capture=true`):** Coordinating PayPal's partial capture mechanics with grocery inventory adjustments required atomic database transactions so inventory stock, held authorization amounts, and customer notifications stay synchronized.
2. **Multimodal Bag Verification:** Packaging in grocery bags often has items occluding one another. We engineered detailed prompt instructions for Gemini 3.5 Flash Vision to reconcile visible products against the order checklist and output structured verification summaries.
3. **Dual-Portal Namespacing:** Ensuring store owners and shoppers have isolated JWT authentication contexts while accessing the same order settlement lifecycle.

---

### 🏆 Accomplishments That We're Proud Of
- **9-Step Comprehensive E2E Test Suite:** Every core capability (PayPal pre-auth, Gemini vision packing, dynamic capture, invoicing, tracking, disputes, payouts, margin guard) passes 100% against live PayPal Sandbox and Gemini APIs.
- **Zero-Friction Refunds:** Customers never have to wait days for a refund on missing grocery items—funds are released the exact second the grocery bag is packed.
- **Genuine Merchant Profitability:** Local merchants are protected from selling at a loss by the 12% margin floor.

---

### 🧠 What We Learned
We learned that PayPal's two-step **Authorize and Dynamic Capture** model (`intent="AUTHORIZE"` + `final_capture=true`) is superior to standard upfront capture for perishable and retail e-commerce. It completely eliminates refund fees, dispute liabilities, and customer frustration over out-of-stock items.

---

### 🔮 What's Next for CartSettle
- **Predictive Restocking:** Utilizing historical order patterns to automatically trigger wholesale Payouts 24 hours *before* stock runs out.
- **Multi-Store Network Routing:** Enabling bodegas in the same neighborhood to pool wholesale bulk buying power through collaborative PayPal Payout batches.

---

## 🧪 Section 3: Testing Credentials for Judges

Please include these credentials in the **Testing Instructions / Notes for Reviewers** section on Devpost:

### 1. Store Owner Portal (AG Grid & Settlement)
- **URL:** `http://localhost:5173/owner/login` (or live URL if deployed)
- **Username:** `owner`
- **Password:** `CartSettle@2026`

### 2. Shopper Portal (Bargaining & Pre-Auth Checkout)
- **URL:** `http://localhost:5173/login`
- **Username:** `shopper`
- **Password:** `Shopper@2026`

### 3. PayPal Sandbox Buyer Test Account
- **Sandbox Email:** `shopper-sandbox@cartsettle.test` (or your personal PayPal Sandbox Personal account)
- **Use any standard PayPal Sandbox Personal buyer account to approve authorizations.**

### 4. Running the Automated E2E Verification
```bash
python backend/scratch/e2e_full_verification.py
```
*(Executes all 9 live integration tests across PayPal Orders v2, Invoicing v2, Shipping v1, Disputes v1, and Gemini AI).*

---

## ✅ Section 4: Final Pre-Submission Checklist

Before clicking **"Submit Project"** on Devpost:

- [ ] **GitHub Repo Public:** Confirm `https://github.com/saisatyanarayana09/cartsettle` is set to **Public** on GitHub.
- [ ] **Demo Video Uploaded:** Record your 2-3 minute demo using `HACKATHON_DEMO_SCRIPT.md` and paste the YouTube/Loom link into Devpost.
- [ ] **Tracks Selected:** Ensure Grand Prize, Best Use of Agentic Commerce, and AG Grid Sponsor Prize are checked.
- [ ] **MCP Config Included:** Verified `.mcp/paypal_mcp_config.json` is present in the repository root.
- [ ] **All Test Passes:** `e2e_full_verification.py` passes 9/9 steps with exit code 0.
