# CartSettle — Master OpenCode & HyperFrames Video Execution File

> **Instructions for OpenCode Agent (`GLM 5.3 Flash`)**:
> Execute this specification directly with **NO STOPS** and **minimal token usage**. Do **NOT** generate 3 storyline proposals (`story.md`) or `SPEC.md`, and do **NOT** call any paid HeyGen cloud APIs. Build the composition locally using the free local HyperFrames engine and render the final MP4 directly.

---

## 1. Project Context & Core Hackathon Goal

- **Project Name**: **CartSettle**
- **Hackathon Focus**: **Local Shoppers & PayPal Dynamic Settlement (`Orders v2 SafeHold` + `Dynamic Partial Capture` + `Invoicing v2`)**
- **The Real-World Problem**:
  - When local shoppers order groceries from neighborhood stores, shelf inventory changes every hour.
  - If even **1 item out of 4** is out of stock at the packing counter, traditional checkout platforms still charge **100% of the cart upfront**—trapping the local shopper's money for **5 to 7 business days** in manual refund disputes and costing merchants dispute fees.
- **How CartSettle Solves It**:
  1. **Local Shopper Storefront & Smart Assistant (`✨ Ask AI`)**: Side-by-side shopping assistant built for real household grocery shopping.
  2. **Handwritten Family Grocery List Vision Scan**: Local shoppers upload a photo of a handwritten paper grocery list; Gemini Multimodal Vision scans the handwriting, matches `Britannia Good Day` (`₹36`), `Amul Butter` (`₹260`), and `Fortune Sunflower Oil` (`₹132`) against live store inventory, and adds all 3 items to the bag in 1 click.
  3. **Neighborhood Store Bargaining + PayPal Orders v2 SafeHold**: Inside the bag, shoppers can negotiate instant AI volume discounts (`-₹31.00 Store Savings`). At checkout, instead of overcharging upfront, CartSettle places a **PayPal Orders v2 SafeHold authorization** for **`₹566.00`**.
  4. **Local Store Owner Dashboard & Packing Table Scanner**: Order `#ORD202600003` (`₹566.00`, 4 items) arrives at the counter. The store owner packs the physical bag and uploads 1 photo into the `AI Packing & Settlement` modal.
  5. **PayPal Dynamic Partial Capture & Instant Release**: Gemini Vision verifies **3 of 4 items are packed (`75% Present`)** and flags **`Amul Cheese Slices` (`₹166.00`) as missing/out of stock**. Clicking **`Capture ₹400.00 & Auto-Release Difference via PayPal`** dynamically captures **only `₹400.00`** for the delivered items, **instantly releases `-₹166.00`** back to the local shopper via PayPal, and dispatches an itemized **PayPal v2 Invoice**.

---

## 2. Ready-to-Use Local Media Assets (Already Pre-Synced!)

All files are located in `C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\`:

1. **Main Screen Recording Video (`104.133333s`, `1920x1080`, `30fps`)**:
   - Compressed Fast-Render File (Recommended): `C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\final_compressed.mp4` (`6.69 MB`)
   - Original Source File: `C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\final.mp4` (`60.53 MB`)
2. **Pre-Locked Master Voiceover (`123.99s`, 192 kbps MP3)**:
   - Master File: `C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\voiceover.mp3`
   - **IMPORTANT**: This `voiceover.mp3` has **ALREADY been split, cleaned, and millisecond-locked** to match the exact `124.13s` composite timeline (`20.00s` Problem Intro + `104.13s` Demo Video). Do **NOT** run `silencedetect` or re-split `voiceover.mp3`—simply mount `assets/voiceover.mp3` at `data-start="0" data-duration="124.13"`!
3. **Individual Pre-Trimmed Paragraph Clips (Optional Backup in Same Folder)**:
   - `p1.mp3` (`19.97s` — starts at `0.0s`)
   - `p2.mp3` (`13.40s` — starts at `20.0s`)
   - `p3.mp3` (`20.30s` — starts at `42.0s`)
   - `p4.mp3` (`18.49s` — starts at `68.0s`)
   - `p5.mp3` (`15.10s` — starts at `87.0s`)
   - `p6.mp3` (`22.69s` — starts at `101.3s`)

---

## 3. Exact Millisecond Timeline & Scene Map (`124.13s` Total)

| Composite Time (`data-start` / `data-duration`) | Source `final_compressed.mp4` Time | Visual Scene | Lower-Third Overlay Badge Copy |Synced Voiceover Transcript (`voiceover.mp3`) |
| :--- | :--- | :--- | :--- | :--- |
| **`0.0s – 20.0s`** (`start="0"`, `duration="20"`) | *(Pre-Video Intro Card)* | **Scene 1: Real-World Problem Intro (`compositions/problem-intro.html`)** | *Full-screen animated problem cards (see Section 4)* | *"When local shoppers order groceries from neighborhood stores, shelf inventory changes every hour. If just one item is out of stock at the packing counter, traditional checkout still charges one hundred percent upfront—locking up the shopper's money for five to seven days in manual refund disputes. Meet CartSettle: built to protect local shoppers and neighborhood merchants through PayPal Dynamic Settlement."* |
| **`20.0s – 42.0s`** (`start="20"`, `duration="22"`) | `0:00 – 0:22` | **Scene 2A: Storefront & `✨ Ask AI` Split-Screen** | **`1. Local Storefront & Smart Shopping Assistant`** | *"On the CartSettle storefront, a local shopper browses fresh daily essentials like Dairy and Eggs, then clicks Ask AI. The store smoothly opens a side-by-side assistant built for how real households shop every day."* |
| **`42.0s – 68.0s`** (`start="42"`, `duration="26"`) | `0:22 – 0:48` | **Scene 2B: Handwritten Family Grocery List Laser Scan** | **`2. Handwritten Family Grocery List -> 1-Click Bag Fill`** | *"Instead of searching and typing items one by one, the local shopper simply uploads a photo of their handwritten family grocery list. Watch as our vision scanner reads the handwriting, matches Britannia Good Day, Amul Butter, and Fortune Sunflower Oil against live store stock, and adds all three items to the bag in one click."* |
| **`68.0s – 87.0s`** (`start="68"`, `duration="19"`) | `0:48 – 1:07` | **Scene 2C: Local Bargaining & PayPal SafeHold Checkout** | **`3. Local Store Bargaining (-₹31) + PayPal SafeHold (₹566.00)`** | *"Inside the bag, shoppers get the familiar neighborhood store experience with instant AI price bargaining—saving thirty-one rupees—before heading to checkout. Here is where PayPal transforms the payment: instead of charging the full cart upfront, CartSettle places a PayPal Orders v2 SafeHold authorization for five hundred sixty-six rupees."* |
| **`87.0s – 101.3s`** (`start="87"`, `duration="14.3"`) | `1:07 – 1:21.3` | **Scene 2D: Local Store Owner Dashboard & Packing Scanner** | **`4. Store Counter Verification -> Packing Table Bag Audit`** | *"Now let's look at the Local Store Owner Dashboard. When order three arrives for five hundred sixty-six rupees across four items, the store owner packs the physical bag at the counter and uploads a single photo into the AI Packing and Settlement scanner."* |
| **`101.3s – 124.13s`** (`start="101.3"`, `duration="22.83"`) | `1:21.3 – 1:44.13` | **Scene 2E: Vision Audit & PayPal Dynamic Partial Capture** | **`5. PayPal Dynamic Capture: ₹400.00 Settled | -₹166.00 Auto-Released`** | *"Our vision engine audits the bag before payment is finalized. It verifies three of the four items are packed, and flags Amul Cheese Slices as out of stock. With one click on Capture via PayPal, CartSettle dynamically captures only four hundred rupees for the delivered items, instantly releases the remaining one hundred sixty-six rupees back to the local shopper via PayPal, and issues an itemized PayPal v2 invoice—zero overcharging and zero refund wait times."* |

---

## 4. Step-by-Step HyperFrames Build Instructions for OpenCode

1. **Read the HyperFrames Contract**:
   - Read `C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\hyperframes\skills\hyperframes\SKILL.md`.
2. **Initialize Project & Copy Assets**:
   - Create project folder `C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\cartsettle-hyperframes`.
   - Copy `final_compressed.mp4` and `voiceover.mp3` into `cartsettle-hyperframes/assets/`.
   - Always reference paths as `assets/final_compressed.mp4` and `assets/voiceover.mp3` (no leading `/`).
3. **Build Root `index.html` (`1920x1080`, `30fps`, `data-duration="124.13"`)**:
   - Mount Scene 1 sub-composition (`compositions/problem-intro.html`) with `class="clip" data-start="0" data-duration="20" data-track-kind="graphics"`.
   - Mount the main video `<video class="clip" id="demo-video" src="assets/final_compressed.mp4" data-start="20" data-duration="104.13" muted></video>`.
   - Mount the 5 lower-third glassmorphic badge clips (`class="clip"`, `data-track-kind="graphics"`, inside the 80% title-safe bottom-left area, `z-index: 10`) at:
     - `id="badge-1" data-start="20" data-duration="22"`
     - `id="badge-2" data-start="42" data-duration="26"`
     - `id="badge-3" data-start="68" data-duration="19"`
     - `id="badge-4" data-start="87" data-duration="14.3"`
     - `id="badge-5" data-start="101.3" data-duration="22.83"`
   - Mount the pre-synced voiceover `<audio class="clip" id="voiceover-track" src="assets/voiceover.mp3" data-start="0" data-duration="124.13"></audio>`.
   - Register the paused GSAP timeline on `window.__timelines["<data-composition-id>"] = tl`.
4. **Build `compositions/problem-intro.html` (`0s – 20s`)**:
   - Dark navy background (`#0B1221`) with PayPal Gold (`#FFC439`), PayPal Blue (`#0079C1`), and Emerald (`#10B981`) accents.
   - `0s – 7s`: Animated card showing **"LOCAL SHOPPERS & NEIGHBORHOOD STORES: 1 Out-of-Stock Shelf Item Traps 100% of Your Upfront Payment"**.
   - `7s – 13.5s`: Animated comparison showing **"Traditional Checkout: 100% Charged Upfront → 5–7 Days Waiting for Partial Refunds & Disputes"**.
   - `13.5s – 20s`: Reveal card showing **"CartSettle: PayPal Orders v2 SafeHold + Vision Bag Audit → Capture ₹400.00 | Auto-Release ₹166.00 Instantly"**.
5. **Validate & Render Directly (No Stops)**:
   - Run `npx hyperframes lint` and `npx hyperframes check --json` inside the project directory.
   - Fix any contract errors if reported.
   - Render the final MP4 to:
     `C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\CartSettle_HyperFrames_Final.mp4`
