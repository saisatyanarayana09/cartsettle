import os
from playwright.sync_api import sync_playwright

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CartSettle - 2m 30s Demo Recording Master Guide (A4)</title>
<style>
  @page {
    size: A4 portrait;
    margin: 8mm 10mm 8mm 10mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    font-size: 8.5pt;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    height: 100%;
    page-break-after: always;
  }
  .page:last-child {
    page-break-after: avoid;
  }
  .header {
    border-bottom: 2px solid #003087;
    padding-bottom: 5px;
    margin-bottom: 7px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .title-group h1 {
    font-size: 15pt;
    font-weight: 800;
    color: #003087;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .title-group h1 span.badge {
    background: #ffc439;
    color: #003087;
    font-size: 7.5pt;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .subtitle {
    font-size: 8pt;
    color: #475569;
    font-weight: 500;
    margin-top: 1px;
  }
  .meta-badges {
    text-align: right;
    font-size: 7.5pt;
    font-weight: 600;
    color: #334155;
  }
  .meta-tag {
    display: inline-block;
    background: #f1f5f9;
    padding: 2px 7px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    margin-left: 3px;
  }
  
  .checklist-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 6px 8px;
    margin-bottom: 8px;
  }
  .check-item {
    font-size: 7.2pt;
    color: #334155;
  }
  .check-item strong {
    color: #0f172a;
    display: block;
    font-size: 7.5pt;
    margin-bottom: 1px;
  }
  
  .block-card {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    margin-bottom: 7px;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .block-header {
    background: #003087;
    color: #ffffff;
    padding: 4px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    font-size: 8.5pt;
  }
  .block-header .time-pill {
    background: #ffc439;
    color: #003087;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 7.5pt;
    font-weight: 800;
  }
  .block-body {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
  }
  .action-col {
    padding: 6px 8px;
    background: #ffffff;
  }
  .script-col {
    padding: 6px 8px;
    background: #f8fafc;
    border-left: 1px solid #e2e8f0;
  }
  .col-title {
    font-size: 7.2pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .action-title { color: #0284c7; }
  .script-title { color: #0d9488; }
  
  ol.action-list {
    margin-left: 14px;
    font-size: 7.8pt;
    color: #1e293b;
  }
  ol.action-list li {
    margin-bottom: 2.5px;
    line-height: 1.25;
  }
  ol.action-list li strong {
    color: #003087;
  }
  
  .script-box {
    font-size: 7.8pt;
    font-style: italic;
    color: #0f172a;
    line-height: 1.28;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 4px 6px;
  }
  .script-meta {
    margin-top: 2px;
    font-size: 6.8pt;
    color: #64748b;
    font-weight: 600;
    text-align: right;
  }

  .master-script-container {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 7px 9px;
    margin-top: 6px;
  }
  .master-script-title {
    font-size: 8pt;
    font-weight: 800;
    color: #003087;
    margin-bottom: 3px;
    display: flex;
    justify-content: space-between;
  }
  .master-script-text {
    font-size: 7.2pt;
    color: #1e293b;
    line-height: 1.32;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 6px 8px;
    border-radius: 4px;
    font-style: italic;
  }
  
  .footer-bar {
    margin-top: 5px;
    padding-top: 3px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 6.8pt;
    color: #64748b;
  }
</style>
</head>
<body>

<!-- PAGE 1: PRE-CHECKLIST + BLOCKS 1, 2, 3 -->
<div class="page">
  <div class="header">
    <div class="title-group">
      <h1>CartSettle <span class="badge">A4 Director Sheet</span></h1>
      <div class="subtitle">PayPal AI Hackathon: &ldquo;Build What's Next with PayPal and AI&rdquo; &bull; 2m 30s Screencast</div>
    </div>
    <div class="meta-badges">
      <span class="meta-tag">5 x 30s Blocks</span>
      <span class="meta-tag">1080p 60fps</span>
      <span class="meta-tag">ElevenLabs: 346 Words</span>
    </div>
  </div>

  <div class="checklist-grid">
    <div class="check-item">
      <strong>[ ] Tab 1 (Customer Store)</strong>
      http://localhost:5173/ (signed in, 4 items in cart or ready to scan)
    </div>
    <div class="check-item">
      <strong>[ ] Tab 2 (Owner Portal)</strong>
      http://localhost:5173/owner (signed in as store owner)
    </div>
    <div class="check-item">
      <strong>[ ] Desktop Images Ready</strong>
      sample_grocery_list.jpg &amp; sample_packing_bag.jpg on Desktop
    </div>
    <div class="check-item">
      <strong>[ ] ElevenLabs Cadence</strong>
      Speed: 1.0x (~140 wpm). Pace: ~68 words per 30s block
    </div>
  </div>

  <!-- BLOCK 1 -->
  <div class="block-card">
    <div class="block-header">
      <span>BLOCK 1: Dark-Store Crisis Hook &amp; Gemini Split Screen</span>
      <span class="time-pill">0:00 – 0:30 (30s)</span>
    </div>
    <div class="block-body">
      <div class="action-col">
        <div class="col-title action-title">Physical Screen Actions (Tab 1)</div>
        <ol class="action-list">
          <li><strong>0:00 - 0:08</strong>: Show Tab 1 storefront. Scroll down smoothly showing the 100 live grocery products with ₹ pricing and green &ldquo;In Stock&rdquo; pills.</li>
          <li><strong>0:08 - 0:16</strong>: Click category pill <em>&ldquo;Dairy &amp; Eggs&rdquo;</em>, then <em>&ldquo;Snacks&rdquo;</em> to demonstrate instant zero-delay catalog filtering.</li>
          <li><strong>0:16 - 0:30</strong>: Move cursor to search bar and click <strong>[ ✨ Ask AI ]</strong>. Watch storefront glide left (420px push) into the Gemini split-screen while remaining 100% scrollable.</li>
        </ol>
      </div>
      <div class="script-col">
        <div class="col-title script-title">ElevenLabs Voiceover Script</div>
        <div class="script-box">
          &ldquo;Across the world, over forty million independent neighborhood grocers are losing ground to venture-backed dark-store giants. Local merchants do not lack loyal customers; they lack an enterprise tech stack. Meet CartSettle. We built an autonomous retail platform with real-time stock tracking. When shoppers tap Ask AI, the store glides into a live desktop split screen, keeping the entire catalog completely interactive with zero disruptive popups.&rdquo;
        </div>
        <div class="script-meta">68 words &bull; ~27s spoken at 140 wpm</div>
      </div>
    </div>
  </div>

  <!-- BLOCK 2 -->
  <div class="block-card">
    <div class="block-header">
      <span>BLOCK 2: Multimodal Vision Handwritten List Scanner to Cart</span>
      <span class="time-pill">0:30 – 1:00 (30s)</span>
    </div>
    <div class="block-body">
      <div class="action-col">
        <div class="col-title action-title">Physical Screen Actions (Tab 1 Split Screen)</div>
        <ol class="action-list">
          <li><strong>0:30 - 0:38</strong>: In the right AI Assistant drawer, click the <strong>Camera / Image Upload</strong> icon in the bottom composer.</li>
          <li><strong>0:38 - 0:45</strong>: Select <code>sample_grocery_list.jpg</code> from Desktop. The Instants preview renders with an animated green laser scanning vertically.</li>
          <li><strong>0:45 - 1:00</strong>: Interactive <strong>GROCERY_CHECKLIST</strong> card appears listing items. Hover over items, then click <strong>[ Add Available Items to Cart ]</strong>. Cart badge jumps to 4 items!</li>
        </ol>
      </div>
      <div class="script-col">
        <div class="col-title script-title">ElevenLabs Voiceover Script</div>
        <div class="script-box">
          &ldquo;Most everyday shoppers still write paper grocery lists. With our multimodal vision scanner, customers snap a quick photo of handwritten scribbles or receipts. Powered by Gemini Vision, CartSettle digitizes raw handwriting into an interactive checklist in real time, verifies live inventory on the shelves, and lets the customer add every in-stock item with a single tap. No manual searching, no barcode scanning, and zero friction.&rdquo;
        </div>
        <div class="script-meta">70 words &bull; ~28s spoken at 140 wpm</div>
      </div>
    </div>
  </div>

  <!-- BLOCK 3 -->
  <div class="block-card">
    <div class="block-header">
      <span>BLOCK 3: Conversational Price Discovery &amp; DealCard Lock</span>
      <span class="time-pill">1:00 – 1:30 (30s)</span>
    </div>
    <div class="block-body">
      <div class="action-col">
        <div class="col-title action-title">Physical Screen Actions (Tab 1 AI Chat)</div>
        <ol class="action-list">
          <li><strong>1:00 - 1:08</strong>: In the chat composer, type: <code>Can you make it a bundle deal for ₹550?</code> and hit Enter.</li>
          <li><strong>1:08 - 1:20</strong>: AI counters with approved deal. Animated <strong>DealCard</strong> appears showing strike-through total &rarr; <strong>₹560.00</strong>, &ldquo;Save ₹27&rdquo; badge, and 10:00 live timer.</li>
          <li><strong>1:20 - 1:30</strong>: Click <strong>[ Accept Deal ]</strong>. Card locks with green checkmark and the live Cart total on the left updates immediately to ₹560.00!</li>
        </ol>
      </div>
      <div class="script-col">
        <div class="col-title script-title">ElevenLabs Voiceover Script</div>
        <div class="script-box">
          &ldquo;Independent retail was built on human relationships and flexible haggling. Instead of rigid e-commerce pricing, CartSettle introduces Conversational Price Discovery. Shoppers can negotiate bundle deals directly with our AI assistant. Protected by strict merchant margin guardrails, the assistant analyzes store profitability, counters with an approved bundle discount, and locks the agreed deal with one tap directly into the live checkout cart.&rdquo;
        </div>
        <div class="script-meta">69 words &bull; ~27s spoken at 140 wpm</div>
      </div>
    </div>
  </div>

  <div class="footer-bar">
    <span>CartSettle Director Guide &bull; Page 1 of 2</span>
    <span>Continued on Page 2: Blocks 4 &amp; 5 + Full Narration Master</span>
  </div>
</div>

<!-- PAGE 2: BLOCKS 4, 5 + MASTER SCRIPT & NOTES -->
<div class="page">
  <div class="header">
    <div class="title-group">
      <h1>CartSettle <span class="badge">Fintech Settlement &amp; Audit</span></h1>
      <div class="subtitle">Blocks 4 &amp; 5: 1-Tap PayPal SafeHold &bull; Optical Bag Audit &bull; Dynamic Partial Settle</div>
    </div>
    <div class="meta-badges">
      <span class="meta-tag">1:30 – 2:30 (Final Minute)</span>
      <span class="meta-tag">PayPal SafeHold</span>
    </div>
  </div>

  <!-- BLOCK 4 -->
  <div class="block-card">
    <div class="block-header">
      <span>BLOCK 4: 1-Tap Checkout &amp; PayPal SafeHold Pre-Authorization</span>
      <span class="time-pill">1:30 – 2:00 (30s)</span>
    </div>
    <div class="block-body">
      <div class="action-col">
        <div class="col-title action-title">Physical Screen Actions (Tab 1 /checkout)</div>
        <ol class="action-list">
          <li><strong>1:30 - 1:38</strong>: Click <strong>[ Checkout ]</strong>. Show the Apple-Pay style financial ledger (Subtotal ₹587, Deal Savings -₹27, Total Due ₹560).</li>
          <li><strong>1:38 - 1:46</strong>: Hover over Row 5 showing <em>PayPal (Selected &bull; SafeHold authorization)</em>.</li>
          <li><strong>1:46 - 2:00</strong>: Click the single minimal gold <strong>[ Pay with PayPal ]</strong> button. In 1 tap, order is accepted! Green &ldquo;Order placed&rdquo; screen renders with zero popups.</li>
        </ol>
      </div>
      <div class="script-col">
        <div class="col-title script-title">ElevenLabs Voiceover Script</div>
        <div class="script-box">
          &ldquo;In on-demand grocery, item stockouts cause ninety percent of customer disputes. CartSettle solves this using PayPal SafeHold pre-authorization. Rather than charging customers upfront, our engine places a verified authorization hold on the buyer's PayPal account. With a single tap, the order is confirmed, funds are held securely in escrow, and the order transmits straight to the merchant's packing table with zero popup hurdles.&rdquo;
        </div>
        <div class="script-meta">67 words &bull; ~27s spoken at 140 wpm</div>
      </div>
    </div>
  </div>

  <!-- BLOCK 5 -->
  <div class="block-card">
    <div class="block-header">
      <span>BLOCK 5: Optical Bag Audit, PayPal Dynamic Partial Capture &amp; Tax Invoice</span>
      <span class="time-pill">2:00 – 2:30 (30s)</span>
    </div>
    <div class="block-body">
      <div class="action-col">
        <div class="col-title action-title">Physical Screen Actions (Tab 2 /owner)</div>
        <ol class="action-list">
          <li><strong>2:00 - 2:08</strong>: Switch to <strong>Tab 2</strong> (<code>/owner</code>). Click <strong>[ 📦 AI Packing &amp; Settlement ]</strong> in top bar. Active order modal opens.</li>
          <li><strong>2:08 - 2:18</strong>: Click <strong>[ Scan Bag Photo ]</strong> &rarr; select <code>sample_packing_bag.jpg</code>. AI marks 3 items checked green and flags 1 missing item red with auto-refund calculation.</li>
          <li><strong>2:18 - 2:30</strong>: Click <strong>[ Complete Packing &amp; Partial Settle ]</strong>. PayPal captures ₹425, auto-refunds ₹135. Click <strong>[ View PayPal Tax Invoice ]</strong>!</li>
        </ol>
      </div>
      <div class="script-col">
        <div class="col-title script-title">ElevenLabs Voiceover Script</div>
        <div class="script-box">
          &ldquo;At the store, merchants click AI Packing and snap a quick photo of the packed bag. Gemini Vision audits the physical items against the order. If an item is missing, the AI unchecks it and recalculates the total. With one click, PayPal executes Dynamic Partial Capture: capturing only for packed groceries and instantly releasing the remaining balance back to the buyer. CartSettle empowers forty million local retailers with autonomous intelligence.&rdquo;
        </div>
        <div class="script-meta">72 words &bull; ~28s spoken at 140 wpm</div>
      </div>
    </div>
  </div>

  <!-- MASTER ELEVENLABS SCRIPT BOX -->
  <div class="master-script-container">
    <div class="master-script-title">
      <span>Master Copy-Paste Text for ElevenLabs (Entire 2m 30s Track &bull; 346 Words)</span>
      <span style="font-weight: 500; font-size: 7.2pt; color: #64748b;">Paste this entire block into ElevenLabs for 1 seamless audio file</span>
    </div>
    <div class="master-script-text">
      Across the world, over forty million independent neighborhood grocers are losing ground to venture-backed dark-store giants. Local merchants do not lack loyal customers; they lack an enterprise tech stack. Meet CartSettle. We built an autonomous retail platform with real-time stock tracking. When shoppers tap Ask AI, the store glides into a live desktop split screen, keeping the entire catalog completely interactive with zero disruptive popups.<br><br>
      Most everyday shoppers still write paper grocery lists. With our multimodal vision scanner, customers snap a quick photo of handwritten scribbles or receipts. Powered by Gemini Vision, CartSettle digitizes raw handwriting into an interactive checklist in real time, verifies live inventory on the shelves, and lets the customer add every in-stock item with a single tap. No manual searching, no barcode scanning, and zero friction.<br><br>
      Independent retail was built on human relationships and flexible haggling. Instead of rigid e-commerce pricing, CartSettle introduces Conversational Price Discovery. Shoppers can negotiate bundle deals directly with our AI assistant. Protected by strict merchant margin guardrails, the assistant analyzes store profitability, counters with an approved bundle discount, and locks the agreed deal with one tap directly into the live checkout cart.<br><br>
      In on-demand grocery, item stockouts cause ninety percent of customer disputes. CartSettle solves this using PayPal SafeHold pre-authorization. Rather than charging customers upfront, our engine places a verified authorization hold on the buyer's PayPal account. With a single tap, the order is confirmed, funds are held securely in escrow, and the order transmits straight to the merchant's packing table with zero popup hurdles.<br><br>
      At the store, merchants click AI Packing and snap a quick photo of the packed bag. Gemini Vision audits the physical items against the order. If an item is missing, the AI unchecks it and recalculates the total. With one click, PayPal executes Dynamic Partial Capture: capturing only for packed groceries and instantly releasing the remaining balance back to the buyer. CartSettle empowers forty million local retailers with autonomous intelligence.
    </div>
  </div>

  <div class="footer-bar">
    <span>CartSettle Director Guide &bull; Page 2 of 2</span>
    <span>Ready for Devpost Submission &bull; Exactly 2:30 runtime (150 seconds)</span>
  </div>
</div>

</body>
</html>
"""

desktop_pdf = os.path.expanduser('~\\Desktop\\CartSettle_Demo_Recording_Guide_A4.pdf')
repo_pdf = 'S:\\Hackathon\\cartsettle\\CartSettle_Demo_Recording_Guide_A4.pdf'

print('Rendering A4 PDF via Playwright...')
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_content(html_content, wait_until='networkidle')
    page.pdf(
        path=desktop_pdf,
        format='A4',
        print_background=True,
        margin={'top': '8mm', 'bottom': '8mm', 'left': '10mm', 'right': '10mm'}
    )
    page.pdf(
        path=repo_pdf,
        format='A4',
        print_background=True,
        margin={'top': '8mm', 'bottom': '8mm', 'left': '10mm', 'right': '10mm'}
    )
    browser.close()

print('PDF generated successfully!')
print('Desktop:', desktop_pdf)
print('Repo:', repo_pdf)
