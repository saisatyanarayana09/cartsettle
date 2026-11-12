import os
import subprocess
import time

edge = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
out_dir = os.path.abspath('gallery_images')
os.makedirs(out_dir, exist_ok=True)

targets = [
    ("01_shopper_storefront.png", "https://cartsettle.vercel.app/"),
    ("02_product_catalog.png", "https://cartsettle.vercel.app/products"),
    ("03_category_aisles.png", "https://cartsettle.vercel.app/categories"),
    ("04_owner_login_portal.png", "https://cartsettle.vercel.app/owner/login"),
    ("05_delivery_login_portal.png", "https://cartsettle.vercel.app/delivery/login"),
]

for filename, url in targets:
    out_file = os.path.join(out_dir, filename)
    print(f"Capturing {filename} from {url}...")
    cmd = [
        edge,
        '--headless=new',
        '--disable-gpu',
        '--window-size=1280,853',
        '--virtual-time-budget=8000',
        f'--screenshot={out_file}',
        url
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        size_kb = os.path.getsize(out_file) / 1024 if os.path.exists(out_file) else 0
        print(f" -> Saved {filename} ({size_kb:.1f} KB)")
    except Exception as e:
        print(f" -> Error capturing {filename}: {e}")

print("All screenshots captured in:", out_dir)
