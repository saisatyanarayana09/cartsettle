# Synchronized 2m 30s Demo Video Plan & ElevenLabs Voiceover Script

> **Total Video Run Time**: Exactly 2 Minutes 30 Seconds (150 Seconds)  
> **Structure**: 5 Discrete 30-Second Blocks (0:00 - 2:30)  
> **Voice Cadence**: ~140 words/minute (~67–72 words per 30-second segment)  
> **Output Quality**: 1920x1080 (16:9), 60 FPS Screencast (No webcam face required)

---

## Executive Summary & Setup Checklist

Before recording or generating audio, verify the following 2-minute setup:

- [ ] **Tab 1 (Customer Storefront)**: Open `http://localhost:5173/` (signed in as customer). 
- [ ] **Tab 2 (Merchant Dashboard)**: Open `http://localhost:5173/owner` (signed in as owner).
- [ ] **Desktop Asset Files Ready**:
  - `sample_grocery_list.jpg` (Handwritten grocery note on Desktop).
  - `sample_packing_bag.jpg` (Packed grocery bag photo on Desktop).
- [ ] **Browser Window**: Full screen (100% zoom, F11 or maximized 1080p).
- [ ] **ElevenLabs Voice Settings**: Voice style: Professional, confident, clear (e.g., *Adam*, *Antoni*, or *Rachel*). Stability: ~55%, Similarity: ~75%, Speed: 1.0x.

---

## 30-Second Segment Breakdown & Physical Choreography

```
========================================================================================================================
BLOCK & TIMING    | PHYSICAL SCREEN ACTIONS (WHAT TO DO)          | ELEVENLABS NARRATION SCRIPT (~70 WORDS / 30S)
========================================================================================================================
BLOCK 1           | 0:00 - 0:10: Show CartSettle storefront on    | "Across the world, over forty million independent
[0:00 – 0:30]     | Tab 1. Scroll down smoothly across live       | neighborhood grocers are losing ground to venture-
                  | products with rupee (₹) pricing and stock.    | backed dark-store giants. Local merchants do not lack
Problem Hook &    |                                               | loyal customers; they lack an enterprise tech stack.
Gemini Split      | 0:10 - 0:18: Click category pill "Dairy &     | Meet CartSettle. We built an autonomous retail
Screen            | Eggs", then "Snacks" to show instant filters. | platform with real-time stock tracking. When shoppers
                  |                                               | tap Ask AI, the store glides into a live desktop
                  | 0:18 - 0:30: Move cursor to search bar and    | split screen, keeping the entire catalog completely
                  | click "[ ✨ Ask AI ]". Storefront glides left | interactive with zero disruptive popups."
                  | into interactive split screen.                |
                  |                                               | (Word count: 68 words | Spoken time: ~27s)
------------------------------------------------------------------------------------------------------------------------
BLOCK 2           | 0:30 - 0:42: In the right AI Assistant        | "Most everyday shoppers still write paper grocery
[0:30 – 1:00]     | drawer, click the Camera/Image Upload icon    | lists. With our multimodal vision scanner, customers
                  | in the bottom composer. Select                | snap a quick photo of handwritten scribbles or receipts.
Multimodal Vision | 'sample_grocery_list.jpg'.                    | Powered by Gemini Vision, CartSettle digitizes raw
List Scanner to   |                                               | handwriting into an interactive checklist in real time,
Live Cart         | 0:42 - 0:50: Watch the animated green laser   | verifies live inventory on the shelves, and lets the
                  | scan beam sweep across the handwritten note.  | customer add every in-stock item with a single tap.
                  |                                               | No manual searching, no barcode scanning, and zero
                  | 0:50 - 1:00: Interactive GROCERY_CHECKLIST    | friction."
                  | card renders. Click "[ Add Available Items    |
                  | to Cart ]". Bag badge updates immediately!    | (Word count: 70 words | Spoken time: ~28s)
------------------------------------------------------------------------------------------------------------------------
BLOCK 3           | 1:00 - 1:12: In the AI Assistant composer     | "Independent retail was built on human relationships
[1:00 – 1:30]     | input, type:                                  | and flexible haggling. Instead of rigid e-commerce
                  | "Can you make it a bundle deal for ₹550?"     | pricing, CartSettle introduces Conversational Price
Conversational    | and press Enter.                              | Discovery. Shoppers can negotiate bundle deals directly
Price Discovery & |                                               | with our AI assistant. Protected by strict merchant
DealCard Lock     | 1:12 - 1:22: Animated DealCard appears in     | margin guardrails, the assistant analyzes store
                  | chat with original price crossed out, deal    | profitability, counters with an approved bundle
                  | price (₹560), and 10:00 timer countdown.      | discount, and locks the agreed deal with one tap
                  |                                               | directly into the live checkout cart."
                  | 1:22 - 1:30: Click "[ Accept Deal ]". Card    |
                  | locks with green checkmark and Cart Total     | (Word count: 69 words | Spoken time: ~27s)
                  | updates live on the left!                     |
------------------------------------------------------------------------------------------------------------------------
BLOCK 4           | 1:30 - 1:40: Click "[ Checkout ]". Review the | "In on-demand grocery, item stockouts cause ninety
[1:30 – 2:00]     | minimal Apple-Pay style ledger (Subtotal,     | percent of customer disputes. CartSettle solves this
                  | Deal Savings, Delivery, Total Due).           | using PayPal SafeHold pre-authorization. Rather than
1-Tap Checkout &  |                                               | charging customers upfront, our engine places a
PayPal SafeHold   | 1:40 - 1:50: Point cursor to the single gold  | verified authorization hold on the buyer's PayPal
Pre-Auth          | "[ Pay with PayPal ]" button.                 | account. With a single tap, the order is confirmed,
                  |                                               | funds are held securely in escrow, and the order
                  | 1:50 - 2:00: Click "[ Pay with PayPal ]". In  | transmits straight to the merchant's packing table
                  | 1 tap, the order confirms! Green "Order       | with zero popup hurdles."
                  | placed" confirmation renders instantly.       |
                  |                                               | (Word count: 67 words | Spoken time: ~27s)
------------------------------------------------------------------------------------------------------------------------
BLOCK 5           | 2:00 - 2:10: Switch to Tab 2                  | "At the store, merchants click AI Packing and snap a
[2:00 – 2:30]     | (http://localhost:5173/owner). In the top     | quick photo of the packed bag. Gemini Vision audits
                  | bar, click "[ 📦 AI Packing & Settlement ]".  | the physical items against the order. If an item is
Optical Bag       |                                               | missing, the AI unchecks it and recalculates the
Audit, Dynamic    | 2:10 - 2:18: Click "[ Scan Bag Photo ]",      | total. With one click, PayPal executes Dynamic Partial
Partial Capture & | select 'sample_packing_bag.jpg'. AI checks 3  | Capture: capturing only for packed groceries and
Tax Invoice       | items green, flags 1 missing item in red.     | instantly releasing the remaining balance back to the
                  |                                               | buyer. CartSettle empowers forty million local
                  | 2:18 - 2:30: Click "[ Complete Packing &      | retailers with autonomous intelligence."
                  | Partial Settle ]". Point to PayPal Capture ID |
                  | and click "[ View PayPal Tax Invoice ]".      | (Word count: 72 words | Spoken time: ~28s)
========================================================================================================================
```

---

## Master ElevenLabs Copy-Paste Script (Full Audio Track)

> [!TIP]
> You can paste this entire text directly into ElevenLabs as a single prompt, or generate each 30-second block individually and drop them into your video editor (CapCut, Premiere, DaVinci Resolve, or Screenity).

### Full 2m 30s Narration (346 Words)

```text
Across the world, over forty million independent neighborhood grocers are losing ground to venture-backed dark-store giants. Local merchants do not lack loyal customers; they lack an enterprise tech stack. Meet CartSettle. We built an autonomous retail platform with real-time stock tracking. When shoppers tap Ask AI, the store glides into a live desktop split screen, keeping the entire catalog completely interactive with zero disruptive popups.

Most everyday shoppers still write paper grocery lists. With our multimodal vision scanner, customers snap a quick photo of handwritten scribbles or receipts. Powered by Gemini Vision, CartSettle digitizes raw handwriting into an interactive checklist in real time, verifies live inventory on the shelves, and lets the customer add every in-stock item with a single tap. No manual searching, no barcode scanning, and zero friction.

Independent retail was built on human relationships and flexible haggling. Instead of rigid e-commerce pricing, CartSettle introduces Conversational Price Discovery. Shoppers can negotiate bundle deals directly with our AI assistant. Protected by strict merchant margin guardrails, the assistant analyzes store profitability, counters with an approved bundle discount, and locks the agreed deal with one tap directly into the live checkout cart.

In on-demand grocery, item stockouts cause ninety percent of customer disputes. CartSettle solves this using PayPal SafeHold pre-authorization. Rather than charging customers upfront, our engine places a verified authorization hold on the buyer's PayPal account. With a single tap, the order is confirmed, funds are held securely in escrow, and the order transmits straight to the merchant's packing table with zero popup hurdles.

At the store, merchants click AI Packing and snap a quick photo of the packed bag. Gemini Vision audits the physical items against the order. If an item is missing, the AI unchecks it and recalculates the total. With one click, PayPal executes Dynamic Partial Capture: capturing only for packed groceries and instantly releasing the remaining balance back to the buyer. CartSettle empowers forty million local retailers with autonomous intelligence.
```

---

## Detailed Step-by-Step Recording Actions (Second-by-Second)

### Block 1 (0:00 – 0:30): Storefront & Split Screen
1. **0:00**: Chrome is full screen on `http://localhost:5173/`. Mouse is near the top banner.
2. **0:05**: Scroll down slowly 2 mouse-wheel clicks to show the product grid (Amul Butter, Amul Milk, Atta, Ghee with authentic ₹ prices and green "In Stock" pills).
3. **0:12**: Move mouse to the category filter bar. Click **Dairy & Eggs**. Products instantly filter.
4. **0:18**: Click **All Categories** or **Edible Oils**.
5. **0:22**: Hover over the search bar button that says **✨ Ask AI**.
6. **0:25**: Click **Ask AI**. The main storefront animates smoothly to the left (420px push), and the Kirana Copilot / AI Assistant drawer docks neatly on the right.
7. **0:28**: Scroll the product grid on the left once to prove the store remains 100% interactive while the assistant is open.

### Block 2 (0:30 – 1:00): Handwritten List Vision to Cart
1. **0:30**: Move mouse to the AI Assistant drawer on the right.
2. **0:33**: In the bottom message composer, click the **Camera / Upload icon**.
3. **0:37**: File picker opens &rarr; double-click `sample_grocery_list.jpg` on your Desktop.
4. **0:41**: The Instants image preview appears in chat showing your handwritten note with an animated green laser beam scanning vertically.
5. **0:48**: The multimodal `GROCERY_CHECKLIST` card appears in the chat feed listing the digitized items:
   - Amul Butter (₹260.00) — In Stock
   - Amul Taaza Milk (₹72.00) — In Stock
   - Amul Malai Paneer (₹89.00) — In Stock
   - Amul Cheese Slices (₹135.00) — In Stock
6. **0:54**: Hover over the checklist items to highlight them.
7. **0:57**: Click the green button at the bottom of the card: **[ Add Available Items to Cart ]**.
8. **0:59**: The bag badge in the top right jumps to **4 items**, and the subtotal updates.

### Block 3 (1:00 – 1:30): Conversational Bargaining & DealCard Lock
1. **1:00**: Click the chat composer input at the bottom of the AI drawer.
2. **1:04**: Type: `Can you make it a bundle deal for ₹550?`
3. **1:08**: Press **Enter** (or click the Send arrow).
4. **1:12**: The AI assistant responds: *"I can do ₹560 for this dairy bundle!"* and renders the animated **DealCard**:
   - Shows crossed-out original total: ~₹587~ &rarr; **₹560.00**
   - Shows badge: **Save ₹27.00**
   - Live countdown timer: `09:59`
5. **1:22**: Move mouse over the **DealCard**.
6. **1:25**: Click the green button: **[ ✓ Accept (₹560.00) ]**.
7. **1:28**: The card locks to **Deal Locked · ₹560.00 applied**. The live Cart total on the left side of the split screen immediately reflects the discounted ₹560.00 total!

### Block 4 (1:30 – 2:00): 1-Tap Checkout & PayPal SafeHold
1. **1:30**: Click the **Bag** button or click **Checkout** in the top navigation bar.
2. **1:33**: The checkout page loads smoothly.
3. **1:36**: Point cursor to the right-hand financial breakdown:
   - Subtotal: ₹587.00
   - Deal Discount: -₹27.00
   - Shipping: FREE
   - Total Due: **₹560.00**
4. **1:42**: Point cursor to Row 5: **PayPal (Selected · SafeHold authorization)**.
5. **1:47**: Hover over the single gold CTA button: **[ Pay with PayPal ]**.
6. **1:52**: Click **[ Pay with PayPal ]**.
7. **1:55**: In 1 tap, the order is confirmed! The screen smoothly transitions to the green **Order placed** screen:
   - Green checkmark icon
   - Headline: *"Order placed"*
   - Subtext: *"Your order has been confirmed and sent to the store for fulfillment."*
   - Order ID and pre-authorized SafeHold hold generated.

### Block 5 (2:00 – 2:30): Optical Bag Audit & Dynamic Capture
1. **2:00**: Switch to **Tab 2** (`http://localhost:5173/owner`).
2. **2:04**: In the owner navigation bar, click **[ 📦 AI Packing & Settlement ]**.
3. **2:08**: The modal opens displaying the active order with the 4 ordered items.
4. **2:12**: Click **[ 📸 Scan Bag Photo ]**.
5. **2:14**: Select `sample_packing_bag.jpg` from your Desktop.
6. **2:17**: Gemini Vision performs the optical audit:
   - Amul Butter &rarr; **✓ AI Checked**
   - Amul Taaza Milk &rarr; **✓ AI Checked**
   - Amul Malai Paneer &rarr; **✓ AI Checked**
   - Amul Cheese Slices &rarr; **Missing (Auto-Refund)** (uncheck icon highlighted in red).
7. **2:22**: Point mouse to the live settlement calculation banner:
   - Authorized: ₹560.00 &rarr; Packed: ₹425.00 &rarr; Auto-Refund: ₹135.00.
8. **2:25**: Click **[ Complete Packing & Partial Settle ]**.
9. **2:27**: The green settlement receipt card displays:
   - PayPal Dynamic Capture ID: `CAP-SANDBOX-...`
   - Instant refund released back to buyer: ₹135.00.
10. **2:29**: Click **[ View PayPal Tax Invoice ]** to show the generated invoice, then finish the recording.

---

## Production Tips for Video Editors

- **ElevenLabs Settings**: Generate each of the 5 audio blocks as separate MP3 files (`block1.mp3` through `block5.mp3`).
- **Syncing in Video Editor**: Place the 5 audio clips at markers `0:00`, `0:30`, `1:00`, `1:30`, and `2:00`.
- **Speed Adjustment**: If your physical screen actions take 1-2 seconds longer or shorter, simply speed up the screencast clip by 1.1x or add a subtle zoom-in on the relevant button to align the visual cut with the audio narration.
