import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_minimalist_thumbnail():
    width, height = 1920, 1080
    
    # 1. Canvas: Pure deep obsidian matte background (#050811)
    base = Image.new('RGB', (width, height), (5, 8, 17))
    draw = ImageDraw.Draw(base)

    # Subtle bottom floor gradient
    for y in range(height):
        # Very gentle gradient towards bottom
        factor = (y / height)
        r = int(5 + 4 * factor)
        g = int(8 + 6 * factor)
        b = int(17 + 10 * factor)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # 2. Ambient Lighting (Vibrant Emerald & Electric Cyan Radial Aura)
    glow_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow_layer)
    
    # Large soft atmospheric aura behind the bag
    g_draw.ellipse([1000, 150, 1850, 950], fill=(6, 182, 212, 35))
    g_draw.ellipse([1150, 220, 1720, 850], fill=(16, 185, 129, 55))
    g_draw.ellipse([1280, 280, 1620, 680], fill=(52, 211, 153, 40))
    
    # Soft left ambient aura behind text
    g_draw.ellipse([80, 300, 650, 800], fill=(16, 185, 129, 20))
    
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(130))
    img = Image.alpha_composite(base.convert('RGBA'), glow_layer)

    # 3. Floor Reflection Surface
    floor_y = 790
    floor_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    f_draw = ImageDraw.Draw(floor_overlay)
    f_draw.line([(0, floor_y), (width, floor_y)], fill=(255, 255, 255, 14), width=1)
    img = Image.alpha_composite(img, floor_overlay)

    # 4. Prepare the Official 3D Emerald Shopping Bag Logo
    logo_path = 'frontend/public/logo-transparent.png'
    if os.path.exists(logo_path):
        logo_raw = Image.open(logo_path).convert('RGBA')
        logo_size = 540
        logo = logo_raw.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

        # Bag Position on Right Side
        bag_x = 1220
        bag_y = 265

        # Create realistic floor reflection
        reflect = logo.transpose(Image.FLIP_TOP_BOTTOM)
        # Gradient mask for reflection (fading down to 0)
        mask = Image.new('L', (logo_size, logo_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        for i in range(logo_size):
            alpha = max(0, int(90 * (1.0 - (i / (logo_size * 0.45)))))
            mask_draw.line([(0, i), (logo_size, i)], fill=alpha)
        
        reflect_blur = reflect.filter(ImageFilter.GaussianBlur(4))
        img.paste(reflect_blur, (bag_x, bag_y + logo_size - 10), mask)

        # Soft drop shadow directly underneath bag
        shadow_layer = Image.new('RGBA', (logo_size + 100, 80), (0, 0, 0, 0))
        sh_draw = ImageDraw.Draw(shadow_layer)
        sh_draw.ellipse([30, 10, logo_size + 70, 70], fill=(0, 0, 0, 160))
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(14))
        img.paste(shadow_layer, (bag_x - 50, bag_y + logo_size - 40), shadow_layer)

        # Paste the crisp official 3D bag
        img.paste(logo, (bag_x, bag_y), logo)

    draw = ImageDraw.Draw(img)

    # 5. Floating Glowing AI Voice Wave & Holographic Orb above/beside Bag
    orb_cx, orb_cy = 1490, 180

    # Orb Aura
    orb_glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    og_draw = ImageDraw.Draw(orb_glow)
    og_draw.ellipse([orb_cx - 90, orb_cy - 90, orb_cx + 90, orb_cy + 90], fill=(6, 182, 212, 110))
    og_draw.ellipse([orb_cx - 55, orb_cy - 55, orb_cx + 55, orb_cy + 55], fill=(52, 211, 153, 160))
    orb_glow = orb_glow.filter(ImageFilter.GaussianBlur(28))
    img = Image.alpha_composite(img, orb_glow)
    draw = ImageDraw.Draw(img)

    # Core Holographic Orb
    draw.ellipse([orb_cx - 40, orb_cy - 40, orb_cx + 40, orb_cy + 40], fill=(11, 23, 48), outline=(56, 189, 248), width=2)
    draw.ellipse([orb_cx - 30, orb_cy - 30, orb_cx + 30, orb_cy + 30], fill=(16, 185, 129, 220))
    draw.ellipse([orb_cx - 16, orb_cy - 16, orb_cx + 16, orb_cy + 16], fill=(240, 253, 250))

    # Soundwave Frequency Bars across the Orb
    wave_bars = [
        (-140, 10), (-120, 16), (-100, 28), (-80, 44), (-60, 56),
        (60, 56), (80, 44), (100, 28), (120, 16), (140, 10)
    ]
    for offset_x, bar_h in wave_bars:
        bx = orb_cx + offset_x
        draw.line([(bx, orb_cy - bar_h // 2), (bx, orb_cy + bar_h // 2)], fill=(56, 189, 248, 200), width=4)

    # 6. Minimalist Floating Bargain Settlement Badge
    deal_x, deal_y = 1040, 540
    deal_w, deal_h = 290, 78
    
    # Glassmorphic Badge Layer
    badge_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(badge_layer)
    b_draw.rounded_rectangle([deal_x, deal_y, deal_x + deal_w, deal_y + deal_h], radius=18, fill=(15, 23, 42, 235), outline=(16, 185, 129, 240), width=2)
    
    # Small Checkmark Circle
    b_draw.ellipse([deal_x + 20, deal_y + 19, deal_x + 60, deal_y + 59], fill=(16, 185, 129, 45), outline=(52, 211, 153), width=2)
    # Checkmark lines
    b_draw.line([(deal_x + 30, deal_y + 39), (deal_x + 37, deal_y + 46)], fill=(52, 211, 153), width=3)
    b_draw.line([(deal_x + 37, deal_y + 46), (deal_x + 50, deal_y + 32)], fill=(52, 211, 153), width=3)

    font_deal_tag = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 13)
    font_deal_price = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 24)
    font_deal_strike = ImageFont.truetype('C:\\Windows\\Fonts\\segoeui.ttf', 16)
    font_deal_save = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 14)

    b_draw.text((deal_x + 72, deal_y + 16), "DEAL SETTLED", font=font_deal_tag, fill=(148, 163, 184))
    b_draw.text((deal_x + 72, deal_y + 36), "Rs 48", font=font_deal_price, fill=(255, 255, 255))
    b_draw.text((deal_x + 144, deal_y + 42), "Rs 56", font=font_deal_strike, fill=(100, 116, 139))
    b_draw.line([(deal_x + 142, deal_y + 51), (deal_x + 188, deal_y + 51)], fill=(100, 116, 139), width=2)
    b_draw.text((deal_x + 200, deal_y + 42), "-14%", font=font_deal_save, fill=(52, 211, 153))

    img = Image.alpha_composite(img, badge_layer)
    draw = ImageDraw.Draw(img)

    # ================= 7. LEFT SIDE: BIG BOLD MINIMALIST TYPOGRAPHY =================
    left_x = 130
    title_y = 380

    font_title = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 108)
    font_pill = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 20)
    font_tagline = ImageFont.truetype('C:\\Windows\\Fonts\\segoeui.ttf', 38)
    font_footer = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 18)

    # 1. Main Title (Huge, High-Contrast White)
    draw.text((left_x, title_y), "CARTSETTLE", font=font_title, fill=(255, 255, 255))

    # 2. Vibrant Cyan Pill Tag (Identical to first thumbnail: solid vibrant cyan with bold dark text)
    pill_y = title_y + 140
    pill_w, pill_h = 560, 62
    draw.rounded_rectangle([left_x, pill_y, left_x + pill_w, pill_y + pill_h], radius=31, fill=(6, 214, 240))
    # Dark Dot
    draw.ellipse([left_x + 28, pill_y + 24, left_x + 42, pill_y + 38], fill=(5, 10, 20))
    draw.text((left_x + 58, pill_y + 16), "Voice AI  •  Real-Time Bargaining", font=ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', 24), fill=(5, 10, 20))

    # 3. Simple Punchy Tagline
    draw.text((left_x, pill_y + 90), "Talk. Bargain. Settle.", font=font_tagline, fill=(148, 163, 184))

    # 4. Ultra-Clean Sub-Feature Badges (Minimal, single line)
    badge_y = pill_y + 175
    draw.text((left_x, badge_y), "Zero-Downtime Multi-Model Engine  •  Hyperlocal Kirana Commerce", font=font_footer, fill=(71, 85, 105))

    # Save to disk
    img = img.convert('RGB')
    out_paths = [
        's:\\Hackathon\\cartsettle\\thumbnail.jpg',
        's:\\Hackathon\\cartsettle\\frontend\\public\\thumbnail.jpg'
    ]
    for p in out_paths:
        img.save(p, 'JPEG', quality=98)
        print(f"Saved minimalist thumbnail to: {p}")

if __name__ == '__main__':
    create_minimalist_thumbnail()
