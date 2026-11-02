# CartSettle: Devpost Hackathon 3-Minute Video Pitch & Demo Script

> **PayPal AI Hackathon 2026 Submission**  
> **Target Prizes:**  
> 1. 🏆 **$12,000 Grand Prize** (Best Overall PayPal + AI Integration)  
> 2. 🤖 **$5,000 Best Use of Agentic Commerce** (Margin Guardrails + Dynamic Capture + B2B Wholesale Payouts + MCP)  
> 3. 📊 **$5,000 AG Grid Sponsor Prize** (Real-Time Settlement & Operations Cockpit)

---

## ⏱️ Video Breakdown (180 Seconds Total)

### 0:00 - 0:30 | The Problem (The Bodega / Kirana Dilemma)
* **Visual:** Show grocery store shelf with variable-weight produce and out-of-stock items.
* **Speaker:**  
  *"For millions of independent grocers and bodegas, online checkout is broken. Traditional payment gateways force an immediate full charge. But when 2 out of 5 items are out-of-stock or produce weighs less than expected, grocers are forced into manual chargebacks, customer frustration, and payment disputes.*  
  *Enter **CartSettle**: an autonomous PayPal payment and margin-protection engine designed for independent neighborhood commerce."*

---

### 0:30 - 1:05 | Act 1: Shopper Checkout & Agentic Bargaining
* **Visual:** Shopper on `CartPage.jsx` and `CheckoutPage.jsx`.
* **Action:**
  1. Click **"🤝 Bargain with AI"** on a grocery item.
  2. Select **10% OFF**.
  3. Show Gemini 3.5 Flash inspecting cost price and approving with: *"Margin protected at 16.4% (> 12% safety floor)"*.
  4. Select **30% OFF** -> Show autonomous counter-offer: *"Rejected: breaches 12% safety margin floor. Countering with max safe discount of 11.2%"*.
  5. Click **Checkout with PayPal**. Show the pre-authorization modal with `intent="AUTHORIZE"`.
  6. Shopper places order. Card has a pre-auth hold of **\$45.00** without charging yet!
* **Speaker:**  
  *"CartSettle turns commerce truly agentic. Shoppers can negotiate discounts directly with our Gemini AI Agent, which algorithmically enforces a strict 12% gross profit margin floor to protect the grocer. At checkout, CartSettle uses PayPal Orders v2 in pre-authorization mode—placing a safe hold on the shopper's card without charging a cent."*

---

### 1:05 - 1:55 | Act 2: Store Owner AG Grid Cockpit & Multimodal Bag Scanner
* **Visual:** Owner portal on `OwnerOrdersAgGrid.jsx`.
* **Action:**
  1. Highlight the AG Grid Quartz table with custom cell renderers:
     - Gold pulsing **PayPal Pre-Auth Hold** pill.
     - Protected **Margin Guard (12%)** shield.
  2. Click **"Settle Pack"** on the order -> Opens `PackingSettlementModal.jsx`.
  3. Click **"📸 Scan Bag Photo"** -> Uploads grocery bag photo.
  4. Watch Gemini 3.5 Flash Multimodal Vision audit the bag, detect packed items, and flag unfulfilled items!
  5. The unfulfilled item (\$15) is automatically unchecked.
  6. Click **"Capture \$30.00 & Auto-Release Difference"**:
     - Executes PayPal Payments v2 Dynamic Capture with `final_capture=true`.
     - Automatically releases \$15 back to buyer card instantly!
     - Invoicing v2 draft is generated and sent!
* **Speaker:**  
  *"On the store owner side, AG Grid serves as the real-time financial cockpit. Packers don't do tedious manual calculations—they simply snap a photo of the packed bag. Gemini 3.5 Flash Multimodal Vision scans the tote and verifies fulfilled goods. With one click, CartSettle triggers PayPal Payments v2 Dynamic Capture with `final_capture=true`. PayPal captures only the packed \$30 and instantly releases the \$15 difference back to the customer's balance—zero disputes, zero refund fees."*

---

### 1:55 - 2:35 | Act 3: Invoicing v2, Shipping Tracker & B2B Wholesale Payouts
* **Visual:** Back to AG Grid and Shopper Order Detail page.
* **Action:**
  1. Show cell delta update: row flashes emerald, displaying **Captured (\$30)**, **Auto-Released (-\$15)**.
  2. Click **"📄 Invoice"** -> Opens live official PayPal Invoicing v2 payer-view URL.
  3. Click **"Dispatch Rider"** -> PayPal Shipping Tracker v1 assigns tracking tag `CS-TRK-XXXX`.
  4. Open **Kirana AI Co-Pilot Drawer** (`KiranaCopilotDrawer.jsx`):
     - Voice/Text prompt: *"Reorder 20 units of Atta from supplier"*
     - Shows tool calling `execute_supplier_restock_payout` via PayPal Payouts v1 API!
  5. Click **"PayPal Disputes"** -> Show Disputes API v1 automated proof submission.
* **Speaker:**  
  *"Instantly, PayPal Invoicing v2 generates and sends a tax invoice directly to the shopper, while the Shipping Tracker API attaches delivery tracking to the transaction. For wholesale restocking, our autonomous Kirana AI agent monitors inventory and executes B2B supplier restock payouts using the PayPal Payouts v1 API."*

---

### 2:35 - 3:00 | Conclusion & Architecture
* **Visual:** Architecture diagram, GitHub repository, and live Neon PostgreSQL cloud database.
* **Speaker:**  
  *"CartSettle bridges modern PayPal APIs—Orders v2, Payments v2, Invoicing v2, Shipping Tracker v1, Disputes API, and Payouts v1—with Google Gemini Agentic AI, AG Grid, and Neon Serverless PostgreSQL. It is zero-risk, margin-protected autonomous commerce for neighborhood grocers worldwide. Thank you!"*

---

## 🛠️ Key Technology Checklist for Judges

- [x] **PayPal Orders v2**: `intent="AUTHORIZE"` for pre-authorization holds.
- [x] **PayPal Payments v2**: Dynamic partial capture with `final_capture=true`.
- [x] **PayPal Invoicing v2**: Automated itemized invoice creation and send with live payer URL.
- [x] **PayPal Shipping Tracker v1**: Live tracking batch carrier integration.
- [x] **PayPal Customer Disputes API v1**: Automated fulfillment evidence generation.
- [x] **PayPal Payouts v1**: Autonomous B2B supplier restocking payouts.
- [x] **Model Context Protocol (MCP)**: `.mcp/paypal_mcp_config.json` referencing `@paypal/mcp`.
- [x] **AG Grid Enterprise/Community**: Live Quartz financial cockpit with custom renderers, quick filter, and CSV exports.
- [x] **Google Gemini 3.5 Flash**: Multimodal vision packing bag verification + tool calling with 12% margin guardrails.
- [x] **Neon Serverless PostgreSQL**: Dual-database cloud architecture (`ep-proud-leaf-...aws.neon.tech`).
