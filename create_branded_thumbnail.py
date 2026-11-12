import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_thumbnail():
    width, height = 1920, 1080
    
    # 1. Base Gradient Canvas (Deep Obsidian / Dark Indigo)
    base = Image.new('RGB', (width, height), (7, 10, 19))
    draw = ImageDraw.Draw(base)

    # Gradient background
    for y in range(height):
        # subtle vertical gradient from (7, 10, 19) to (12, 18, 32)
        r = int(7 + (12 - 7) * (y / height))
        g = int(10 + (18 - 10) * (y / height))
        b = int(19 + (32 - 19) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Ambient Light Overlays (Emerald & Electric Cyan)
    glow_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow_layer)
    # Right-hand side glow behind Deal Card
    g_draw.ellipse([920, 120, 1900, 950], fill=(6, 182, 212, 38))
    # Top-left brand glow
    g_draw.ellipse([40, 40, 600, 500], fill=(16, 185, 129, 45))
    # Bottom glow
    g_draw.ellipse([400, 700, 1400, 1200], fill=(16, 185, 129, 22))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(110))

    img = Image.alpha_composite(base.convert('RGBA'), glow_layer)
    draw = ImageDraw.Draw(img)

    # Ultra-subtle, elegant grid lines (alpha = 8)
    grid_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_overlay)
    for x in range(0, width, 160):
        grid_draw.line([(x, 0), (x, height)], fill=(255, 255, 255, 8), width=1)
    for y in range(0, height, 160):
        grid_draw.line([(0, y), (width, y)], fill=(255, 255, 255, 8), width=1)
    img = Image.alpha_composite(img, grid_overlay)
    draw = ImageDraw.Draw(img)

    # Fonts
    font_brand = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 56)
    font_hero_1 = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 78)
    font_hero_2 = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 78)
    font_sub = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 24)
    font_card_title = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 23)
    font_card_desc = ImageFont.truetype('C:\\Windows\\Fonts\\segoeui.ttf', 18)
    font_pill = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 16)
    font_price_big = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 52)
    font_price_strike = ImageFont.truetype('C:\\Windows\\Fonts\\segoeui.ttf', 28)
    font_badge = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 16)

    # ================= 1. HEADER BRAND ROW =================
    header_y = 65
    logo_path = 'frontend/public/logo-transparent.png'
    if os.path.exists(logo_path):
        logo_img = Image.open(logo_path).convert('RGBA')
        logo_img = logo_img.resize((125, 125), Image.Resampling.LANCZOS)
        # Soft vibrant shadow
        logo_shadow = Image.new('RGBA', (155, 155), (0, 0, 0, 0))
        ls_draw = ImageDraw.Draw(logo_shadow)
        ls_draw.ellipse([15, 15, 140, 140], fill=(16, 185, 129, 120))
        logo_shadow = logo_shadow.filter(ImageFilter.GaussianBlur(18))
        img.paste(logo_shadow, (80, header_y - 15), logo_shadow)
        img.paste(logo_img, (95, header_y), logo_img)

    # Brand Title: CARTSETTLE
    draw.text((245, header_y + 20), "CARTSETTLE", font=font_brand, fill=(255, 255, 255))
    
    # Category Pill
    pill_x, pill_y = 620, header_y + 36
    draw.rounded_rectangle([pill_x, pill_y, pill_x + 230, pill_y + 40], radius=20, fill=(16, 185, 129, 35), outline=(16, 185, 129, 200), width=1)
    draw.ellipse([pill_x + 18, pill_y + 15, pill_x + 28, pill_y + 25], fill=(52, 211, 153))
    draw.text((pill_x + 40, pill_y + 9), "VOICE COMMERCE", font=font_pill, fill=(52, 211, 153))

    # Top Right: Zero-Downtime Engine Pill
    rp_x = 1270
    draw.rounded_rectangle([rp_x, pill_y, rp_x + 550, pill_y + 40], radius=20, fill=(15, 23, 42, 220), outline=(56, 189, 248, 160), width=1)
    draw.ellipse([rp_x + 20, pill_y + 15, rp_x + 30, pill_y + 25], fill=(56, 189, 248))
    draw.text((rp_x + 42, pill_y + 9), "4-TIER ZERO-DOWNTIME AI FAILOVER ENGINE", font=font_pill, fill=(241, 245, 249))

    # ================= 2. LEFT HERO: VALUE PROPOSITION & FEATURES =================
    left_x = 95
    hero_y = 230
    draw.text((left_x, hero_y), "Talk. Bargain.", font=font_hero_1, fill=(255, 255, 255))
    draw.text((left_x, hero_y + 90), "Settle in Seconds.", font=font_hero_2, fill=(56, 189, 248))

    draw.text((left_x, hero_y + 200), "The Kirana Store of the Future with Zero-Downtime Multi-Model AI", font=font_sub, fill=(148, 163, 184))

    # 3 High-Impact Feature Cards (No emoji missing boxes - using custom drawn color badges)
    card_y = hero_y + 260
    features = [
        ("VOICE AI", "Real-Time Voice Shopping", "Hands-free ordering in Indian English & Hindi with smart brand normalization.", (16, 185, 129)),
        ("BARGAIN", "Interactive Counter Bargaining", "Customers negotiate deals live. AI preserves store profit floors automatically.", (56, 189, 248)),
        ("VISION", "Computer Vision Packing Audit", "Owner camera audits packed grocery bags against receipts to eliminate errors.", (168, 85, 247))
    ]

    for tag, title, desc, accent in features:
        card_w, card_h = 760, 118
        # Glassmorphic card
        draw.rounded_rectangle([left_x, card_y, left_x + card_w, card_y + card_h], radius=16, fill=(15, 23, 42, 210), outline=(51, 65, 85, 180), width=1)
        # Accent left vertical line
        draw.rounded_rectangle([left_x, card_y + 18, left_x + 6, card_y + card_h - 18], radius=3, fill=accent)
        
        # Tag Badge
        draw.rounded_rectangle([left_x + 24, card_y + 18, left_x + 115, card_y + 42], radius=6, fill=accent)
        draw.text((left_x + 32, card_y + 22), tag, font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 13), fill=(10, 15, 28))
        
        # Title
        draw.text((left_x + 130, card_y + 18), title, font=font_card_title, fill=(255, 255, 255))
        # Description
        draw.text((left_x + 24, card_y + 64), desc, font=font_card_desc, fill=(148, 163, 184))
        card_y += card_h + 22

    # Bottom left guarantee text
    draw.text((left_x, card_y + 18), "100% Zero-Downtime Guarantee  |  Strict Margin Protection  |  Multi-Portal Dispatch", font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 17), fill=(100, 116, 139))

    # ================= 3. RIGHT HERO: ACTUAL APP FEATURE UI CARDS =================
    right_x = 920
    right_w = 900

    # FEATURE CARD 1: Authentic DealCard (from DealCard.jsx)
    deal_y = 230
    deal_h = 285
    draw.rounded_rectangle([right_x, deal_y, right_x + right_w, deal_y + deal_h], radius=22, fill=(15, 23, 42, 240), outline=(16, 185, 129, 230), width=2)
    
    # Deal Card Header Badges
    draw.rounded_rectangle([right_x + 28, deal_y + 24, right_x + 280, deal_y + 64], radius=12, fill=(16, 185, 129, 45), outline=(16, 185, 129, 220), width=1)
    draw.ellipse([right_x + 44, deal_y + 39, right_x + 54, deal_y + 49], fill=(52, 211, 153))
    draw.text((right_x + 64, deal_y + 34), "DEAL ACCEPTED & SETTLED", font=font_badge, fill=(52, 211, 153))

    draw.rounded_rectangle([right_x + right_w - 230, deal_y + 24, right_x + right_w - 28, deal_y + 64], radius=12, fill=(30, 41, 59, 220), outline=(56, 189, 248, 140), width=1)
    draw.text((right_x + right_w - 208, deal_y + 34), "MARGIN LOCKED: 18%", font=font_badge, fill=(56, 189, 248))

    # Product Title
    draw.text((right_x + 32, deal_y + 88), "Fortune Sunlite Refined Sunflower Oil (1L Pouch)", font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 29), fill=(255, 255, 255))
    draw.text((right_x + 32, deal_y + 128), "Verified Store Inventory  •  Unit: 1 Litre  •  In Stock: 64", font=font_card_desc, fill=(148, 163, 184))

    # Price Settlement Row
    price_y = deal_y + 170
    draw.text((right_x + 32, price_y), "Rs 125.00", font=font_price_big, fill=(52, 211, 153))
    draw.text((right_x + 265, price_y + 18), "Rs 145.00", font=font_price_strike, fill=(100, 116, 139))
    # Strikethrough line
    draw.line([(right_x + 260, price_y + 32), (right_x + 380, price_y + 32)], fill=(100, 116, 139), width=2)

    # Discount Pill
    draw.rounded_rectangle([right_x + 400, price_y + 12, right_x + 520, price_y + 48], radius=8, fill=(16, 185, 129, 50))
    draw.text((right_x + 418, price_y + 18), "SAVE 14%", font=font_pill, fill=(52, 211, 153))

    # Action Button
    btn_x = right_x + right_w - 280
    draw.rounded_rectangle([btn_x, price_y + 6, btn_x + 252, price_y + 54], radius=12, fill=(16, 185, 129), outline=(52, 211, 153), width=1)
    draw.text((btn_x + 32, price_y + 18), "APPLIED TO CART", font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 18), fill=(7, 11, 20))

    # Bottom Safety Guarantee
    draw.line([(right_x + 32, deal_y + 245), (right_x + right_w - 32, deal_y + 245)], fill=(30, 41, 59), width=1)
    draw.text((right_x + 32, deal_y + 255), "Autonomous Margin Guard: Product sold strictly above wholesale cost (Rs 112.00).", font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeui.ttf', 15), fill=(148, 163, 184))

    # FEATURE CARD 2: Real-time Voice Dialogue Bubble
    voice_y = deal_y + deal_h + 20
    voice_h = 240
    draw.rounded_rectangle([right_x, voice_y, right_x + right_w, voice_y + voice_h], radius=22, fill=(15, 23, 42, 220), outline=(56, 189, 248, 180), width=2)

    draw.text((right_x + 32, voice_y + 20), "LIVE VOICE SHOPPING & BARGAIN CONVERSATION", font=font_badge, fill=(56, 189, 248))

    # Shopper speech bubble
    sh_y = voice_y + 52
    draw.rounded_rectangle([right_x + 32, sh_y, right_x + 620, sh_y + 55], radius=14, fill=(30, 41, 59, 240), outline=(51, 65, 85, 180), width=1)
    draw.text((right_x + 48, sh_y + 16), 'Customer: "Can you give 2 oils and 5kg rice for Rs 399?"', font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 19), fill=(241, 245, 249))

    # AI Agent response bubble
    ai_y = sh_y + 68
    draw.rounded_rectangle([right_x + 80, ai_y, right_x + right_w - 32, ai_y + 76], radius=14, fill=(16, 185, 129, 35), outline=(16, 185, 129, 160), width=1)
    draw.text((right_x + 100, ai_y + 14), 'CartSettle AI: "Deal confirmed! Added 2x Oil & 5kg Rice for Rs 399.', font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 18), fill=(52, 211, 153))
    draw.text((right_x + 100, ai_y + 42), 'Saved Rs 60 under Store Bundle Offer. Ready to checkout!"', font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeui.ttf', 17), fill=(203, 213, 225))

    # FEATURE CARD 3: 4-Tier Failover Architecture Strip
    footer_y = voice_y + voice_h + 20
    footer_h = 75
    draw.rounded_rectangle([right_x, footer_y, right_x + right_w, footer_y + footer_h], radius=16, fill=(15, 23, 42, 220), outline=(51, 65, 85, 180), width=1)
    
    tier_badges = [
        ("Tier 1", "Gemini Core", (52, 211, 153)),
        ("Tier 2", "Gemini Backup", (56, 189, 248)),
        ("Tier 3", "Groq LPU (0.8s)", (250, 204, 21)),
        ("Tier 4", "Local AI Engine", (168, 85, 247)),
    ]
    badge_x = right_x + 28
    for t_num, t_name, t_color in tier_badges:
        draw.rounded_rectangle([badge_x, footer_y + 18, badge_x + 198, footer_y + 56], radius=10, fill=(30, 41, 59, 220), outline=t_color, width=1)
        draw.ellipse([badge_x + 14, footer_y + 32, badge_x + 24, footer_y + 42], fill=t_color)
        draw.text((badge_x + 32, footer_y + 26), f"{t_name}", font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 15), fill=(241, 245, 249))
        badge_x += 215

    # Save to disk
    img = img.convert('RGB')
    out_paths = [
        's:\\Hackathon\\cartsettle\\thumbnail.jpg',
        's:\\Hackathon\\cartsettle\\frontend\\public\\thumbnail.jpg'
    ]
    for p in out_paths:
        img.save(p, 'JPEG', quality=96)
        print(f"Saved refined branded thumbnail to: {p}")

if __name__ == '__main__':
    create_thumbnail()
