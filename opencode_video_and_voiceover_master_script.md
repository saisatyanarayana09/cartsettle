# CartSettle — Master OpenCode Video + ElevenLabs Voiceover Specification

- **Source Video**: `C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\final_compressed.mp4` (`1920x1080`, `30fps`, `104.13s` / `01:44.13`)
- **Core Focus**: **Local Shoppers & PayPal Dynamic Settlement (`Orders v2 SafeHold` + `Partial Capture` + `Invoicing v2`)**
- **Target Composite Duration**: `124.13 seconds` (`02:04.13`) = **20s Real-World Local Shopper & PayPal Problem Intro** + **104.13s Recorded Product Demo (`final_compressed.mp4`)**

---

## 1. Complete Timeline & Visual + Audio Sync Map

| Composite Time | `final.mp4` Time | Visual Scene | Core Focus (Local Shoppers + PayPal Settlement) |
| :--- | :--- | :--- | :--- |
| **`0:00 – 0:20`** *(20s)* | *(Pre-Video Intro)* | **Scene 0: Local Shoppers & The Upfront Payment Problem** | Local shoppers buy from neighborhood stores where shelf stock changes constantly. Paying 100% upfront traps shopper money for 5–7 days when 1 item is missing. **CartSettle** solves this with **PayPal SafeHold Settlement**. |
| **`0:20 – 0:42`** *(22s)* | `0:00 – 0:22` | **Scene 1: Local Storefront & Ask AI Split-Screen** | Local shopper browses neighborhood store inventory (`Dairy & Eggs`) and opens `✨ Ask AI` split-screen workspace. |
| **`0:42 – 1:11`** *(29s)* | `0:22 – 0:51` | **Scene 2: Handwritten Family Grocery List Scan** | Local shoppers often write paper grocery lists at home. Uploading the handwritten note triggers the green laser scan, matching `Britannia Good Day`, `Amul Butter`, and `Fortune Sunflower Oil` and adding them to the bag in 1 click. |
| **`1:11 – 1:24`** *(13s)* | `0:51 – 1:04` | **Scene 3: Local Bargaining & PayPal SafeHold Authorization** | Just like at a neighborhood counter, shoppers can bargain (`-₹31.00 Store Savings`). At checkout, **PayPal Orders v2 SafeHold** holds `₹566.00` without overcharging the shopper upfront. |
| **`1:24 – 1:47`** *(23s)* | `1:04 – 1:27` | **Scene 4: Local Store Owner Dashboard & Packing Table** | Order `#ORD202600003` (`₹566.00`, 4 items) arrives at the local store's packing counter. The store owner opens `AI Packing & Settlement` and snaps 1 photo of the packed bag. |
| **`1:47 – 2:04`** *(17.13s)* | `1:27 – 1:44.13` | **Scene 5: PayPal Dynamic Partial Capture & Instant Release** | Vision AI sees 3 of 4 items packed (`Amul Cheese Slices` out of stock). One click on **Capture via PayPal** settles **only `₹400.00`** for packed items, **instantly releases `-₹166.00`** back to the local shopper's PayPal wallet, and sends a **PayPal v2 Invoice**. |

---

## 2. ElevenLabs Voiceover Script (Focused on Local Shoppers & PayPal Settlement)

Copy and paste this exact **6-paragraph block** into **ElevenLabs** (keep the blank lines so ElevenLabs creates natural pauses between scenes):

```text
When local shoppers order groceries from neighborhood stores, shelf inventory changes every hour. If just one item is out of stock at the packing counter, traditional checkout still charges one hundred percent upfront—locking up the shopper's money for five to seven days in manual refund disputes. Meet CartSettle: built to protect local shoppers and neighborhood merchants through PayPal Dynamic Settlement.

On the CartSettle storefront, a local shopper browses fresh daily essentials like Dairy and Eggs, then clicks Ask AI. The store smoothly opens a side-by-side assistant built for how real households shop every day.

Instead of searching and typing items one by one, the local shopper simply uploads a photo of their handwritten family grocery list. Watch as our vision scanner reads the handwriting, matches Britannia Good Day, Amul Butter, and Fortune Sunflower Oil against live store stock, and adds all three items to the bag in one click.

Inside the bag, shoppers get the familiar neighborhood store experience with instant AI price bargaining—saving thirty-one rupees—before heading to checkout. Here is where PayPal transforms the payment: instead of charging the full cart upfront, CartSettle places a PayPal Orders v2 SafeHold authorization for five hundred sixty-six rupees.

Now let's look at the Local Store Owner Dashboard. When order O-R-D-2026-00003 arrives for five hundred sixty-six rupees across four items, the store owner packs the physical bag at the counter and uploads a single photo into the AI Packing and Settlement scanner.

Our vision engine audits the bag before payment is finalized. It verifies three of the four items are packed, and flags Amul Cheese Slices as out of stock. With one click on Capture via PayPal, CartSettle dynamically captures only four hundred rupees for the delivered items, instantly releases the remaining one hundred sixty-six rupees back to the local shopper via PayPal, and issues an itemized PayPal v2 invoice—zero overcharging and zero refund wait times.
```

---

## 3. HyperFrames Lightweight Prompt (Paste Directly into OpenCode — Quota-Safe)

Copy and paste the block below directly into OpenCode (`GLM 5.3 Flash`):

```text
Use the local HyperFrames framework in "C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\hyperframes" (read skills/hyperframes/SKILL.md) to build and render a simple, clean 1920x1080 30fps hackathon demo video focused on Local Shoppers and PayPal Dynamic Settlement with NO STOPS and minimal token usage (skip the 3-storyline proposal and SPEC.md; use 100% free local rendering, no paid HeyGen cloud APIs).

Source Files:
- Video: "C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\final_compressed.mp4" (104.13s, 1920x1080, 30fps)
- Voiceover: "C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\voiceover.mp3"
- Scene Timestamps & Script: "S:\Hackathon\cartsettle\opencode_video_and_voiceover_master_script.md"

Exact Composition Plan (Total Duration: 124.13s, root `data-duration="124.13"`):
1. Initialize a lightweight project `cartsettle-hyperframes` and copy `final_compressed.mp4` and `voiceover.mp3` into `assets/` (use `assets/...` paths with no leading `/`).
2. Scene 1 (`compositions/problem-intro.html`, `data-start="0"`, `data-duration="20"`):
   - Clean dark-navy (`#0B1221`) problem card with PayPal Gold (`#FFC439`) & Emerald (`#10B981`) accents, registered on `window.__timelines`:
   - `0s–7s`: "LOCAL SHOPPERS & NEIGHBORHOOD STORES: 1 Missing Shelf Item Traps 100% of Your Upfront Payment"
   - `7s–14s`: "5–7 Days Waiting for Partial Refunds & Merchant Dispute Fees"
   - `14s–20s`: "CartSettle: PayPal Orders v2 SafeHold & Instant Dynamic Settlement"
3. Scene 2 (`<video class="clip" id="demo-video" src="assets/final_compressed.mp4" data-start="20" data-duration="104.13" muted></video>`):
   - Add 5 minimal lower-third glassmorphic badge clips (`class="clip"`, `data-track-kind="graphics"`, inside the 80% title-safe box) focused on Local Shoppers & PayPal Settlement:
     * `data-start="20" data-duration="22"`: "1. Local Storefront & Smart Shopping Assistant"
     * `data-start="42" data-duration="29"`: "2. Local Shopper Handwritten Grocery List -> 1-Click Bag Fill"
     * `data-start="71" data-duration="13"`: "3. Local Store Bargaining (-₹31) + PayPal Orders v2 SafeHold (₹566.00)"
     * `data-start="84" data-duration="23"`: "4. Store Counter Verification -> Packing Table Bag Audit"
     * `data-start="107" data-duration="17.13"`: "5. PayPal Dynamic Settlement: Capture ₹400.00 & Auto-Release -₹166.00 Instantly"
4. Audio Sync (`<audio class="clip" id="voiceover-track" ...>`):
   - Use `ffmpeg silencedetect` to split `assets/voiceover.mp3` at paragraph pauses into 6 clips (`assets/p1.mp3` to `assets/p6.mp3`) and mount each `<audio class="clip" id="vo-1"...>` at exact start times: `0`, `20`, `42`, `71`, `84`, and `107`.
5. Validate & Render Directly (No Stops):
   - Run `npx hyperframes lint` and `npx hyperframes check --json`, fix any contract issues, and render the final MP4 to `C:\Users\SAI SATYANARAYANA\OneDrive\Desktop\DemoVideo\CartSettle_HyperFrames_Final.mp4`.
```
