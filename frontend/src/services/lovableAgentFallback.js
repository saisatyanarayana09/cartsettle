/**
 * Client-Side Data Contract Fallback for Cloud Previews (Lovable.dev / Static Hosting)
 * Only activates if the Django `/store/agent/chat/` endpoint is unreachable or returns 404.
 * Mirrors the exact backend response contract (`reply`, `voice_reply`, `mode`, `actions`, `tools_used`, `follow_ups`).
 */

const SESSION_STORE = {};

const DEMO_PRODUCTS = [
  {"id": 320, "name": "Amul Butter", "brand": "Amul", "unit": "500 g Box", "price": 260.0, "regular_price": 275.0, "offer_price": 260.0, "cost_price": 240.0, "stock": 60, "stock_quantity": 60, "category": "Dairy & Eggs", "category_name": "Dairy & Eggs", "margin_pct": 7.7, "max_safe_discount_pct": 5.0, "best_deal_price": 234.0, "image": "/media/products/packshots/p1.svg", "thumbnail": "/media/products/packshots/p1.svg", "aliases": ["amul", "butter", "amul"]},
  {"id": 321, "name": "Amul Taaza Milk", "brand": "Amul", "unit": "1 L Tetra", "price": 72.0, "regular_price": 72.0, "offer_price": 72.0, "cost_price": 64.0, "stock": 90, "stock_quantity": 90, "category": "Dairy & Eggs", "category_name": "Dairy & Eggs", "margin_pct": 11.1, "max_safe_discount_pct": 5.5, "best_deal_price": 64.8, "image": "/media/products/packshots/p2.svg", "thumbnail": "/media/products/packshots/p2.svg", "aliases": ["amul", "taaza", "milk", "amul"]},
  {"id": 322, "name": "Amul Malai Paneer", "brand": "Amul", "unit": "200 g Pack", "price": 89.0, "regular_price": 95.0, "offer_price": 89.0, "cost_price": 80.0, "stock": 40, "stock_quantity": 40, "category": "Dairy & Eggs", "category_name": "Dairy & Eggs", "margin_pct": 10.1, "max_safe_discount_pct": 5.0, "best_deal_price": 80.1, "image": "/media/products/packshots/p3.svg", "thumbnail": "/media/products/packshots/p3.svg", "aliases": ["amul", "malai", "paneer", "amul"]},
  {"id": 323, "name": "Amul Cheese Slices", "brand": "Amul", "unit": "200 g Pack", "price": 135.0, "regular_price": 145.0, "offer_price": 135.0, "cost_price": 120.0, "stock": 45, "stock_quantity": 45, "category": "Dairy & Eggs", "category_name": "Dairy & Eggs", "margin_pct": 11.1, "max_safe_discount_pct": 5.5, "best_deal_price": 121.5, "image": "/media/products/packshots/p4.svg", "thumbnail": "/media/products/packshots/p4.svg", "aliases": ["amul", "cheese", "slices", "amul"]},
  {"id": 324, "name": "Mother Dairy Dahi", "brand": "Mother Dairy", "unit": "400 g Tub", "price": 35.0, "regular_price": 35.0, "offer_price": 35.0, "cost_price": 28.0, "stock": 50, "stock_quantity": 50, "category": "Dairy & Eggs", "category_name": "Dairy & Eggs", "margin_pct": 20.0, "max_safe_discount_pct": 10.0, "best_deal_price": 31.5, "image": "/media/products/packshots/p5.svg", "thumbnail": "/media/products/packshots/p5.svg", "aliases": ["mother", "dairy", "dahi", "mother dairy"]},
  {"id": 325, "name": "Farm Fresh Eggs", "brand": "Eggoz", "unit": "Pack of 6", "price": 49.0, "regular_price": 55.0, "offer_price": 49.0, "cost_price": 40.0, "stock": 75, "stock_quantity": 75, "category": "Dairy & Eggs", "category_name": "Dairy & Eggs", "margin_pct": 18.4, "max_safe_discount_pct": 9.2, "best_deal_price": 44.1, "image": "/media/products/packshots/p6.svg", "thumbnail": "/media/products/packshots/p6.svg", "aliases": ["farm", "fresh", "eggs", "eggoz"]},
  {"id": 326, "name": "Amul Fresh Cream", "brand": "Amul", "unit": "250 ml Tetra", "price": 68.0, "regular_price": 68.0, "offer_price": 68.0, "cost_price": 58.0, "stock": 35, "stock_quantity": 35, "category": "Dairy & Eggs", "category_name": "Dairy & Eggs", "margin_pct": 14.7, "max_safe_discount_pct": 7.3, "best_deal_price": 61.2, "image": "/media/products/packshots/p7.svg", "thumbnail": "/media/products/packshots/p7.svg", "aliases": ["amul", "fresh", "cream", "amul"]},
  {"id": 327, "name": "Gowardhan Cow Ghee", "brand": "Gowardhan", "unit": "500 ml Jar", "price": 360.0, "regular_price": 385.0, "offer_price": 360.0, "cost_price": 320.0, "stock": 40, "stock_quantity": 40, "category": "Dairy & Eggs", "category_name": "Dairy & Eggs", "margin_pct": 11.1, "max_safe_discount_pct": 5.5, "best_deal_price": 324.0, "image": "/media/products/packshots/p8.svg", "thumbnail": "/media/products/packshots/p8.svg", "aliases": ["gowardhan", "cow", "ghee", "gowardhan"]},
  {"id": 328, "name": "Aashirvaad Atta", "brand": "Aashirvaad", "unit": "5 kg Bag", "price": 275.0, "regular_price": 295.0, "offer_price": 275.0, "cost_price": 250.0, "stock": 80, "stock_quantity": 80, "category": "Atta, Flours & Grains", "category_name": "Atta, Flours & Grains", "margin_pct": 9.1, "max_safe_discount_pct": 5.0, "best_deal_price": 247.5, "image": "/media/products/packshots/p9.svg", "thumbnail": "/media/products/packshots/p9.svg", "aliases": ["aashirvaad", "atta", "aashirvaad"]},
  {"id": 329, "name": "Aashirvaad Select Atta", "brand": "Aashirvaad", "unit": "5 kg Bag", "price": 310.0, "regular_price": 325.0, "offer_price": 310.0, "cost_price": 280.0, "stock": 60, "stock_quantity": 60, "category": "Atta, Flours & Grains", "category_name": "Atta, Flours & Grains", "margin_pct": 9.7, "max_safe_discount_pct": 5.0, "best_deal_price": 279.0, "image": "/media/products/packshots/p10.svg", "thumbnail": "/media/products/packshots/p10.svg", "aliases": ["aashirvaad", "select", "atta", "aashirvaad"]},
  {"id": 330, "name": "Fortune Maida", "brand": "Fortune", "unit": "1 kg Pack", "price": 44.0, "regular_price": 48.0, "offer_price": 44.0, "cost_price": 38.0, "stock": 50, "stock_quantity": 50, "category": "Atta, Flours & Grains", "category_name": "Atta, Flours & Grains", "margin_pct": 13.6, "max_safe_discount_pct": 6.8, "best_deal_price": 39.6, "image": "/media/products/packshots/p11.svg", "thumbnail": "/media/products/packshots/p11.svg", "aliases": ["fortune", "maida", "fortune"]},
  {"id": 331, "name": "Fortune Besan", "brand": "Fortune", "unit": "500 g Pack", "price": 58.0, "regular_price": 65.0, "offer_price": 58.0, "cost_price": 50.0, "stock": 55, "stock_quantity": 55, "category": "Atta, Flours & Grains", "category_name": "Atta, Flours & Grains", "margin_pct": 13.8, "max_safe_discount_pct": 6.9, "best_deal_price": 52.2, "image": "/media/products/packshots/p12.svg", "thumbnail": "/media/products/packshots/p12.svg", "aliases": ["fortune", "besan", "fortune"]},
  {"id": 332, "name": "Rajdhani Sooji", "brand": "Rajdhani", "unit": "500 g Pack", "price": 38.0, "regular_price": 42.0, "offer_price": 38.0, "cost_price": 32.0, "stock": 45, "stock_quantity": 45, "category": "Atta, Flours & Grains", "category_name": "Atta, Flours & Grains", "margin_pct": 15.8, "max_safe_discount_pct": 7.9, "best_deal_price": 34.2, "image": "/media/products/packshots/p13.svg", "thumbnail": "/media/products/packshots/p13.svg", "aliases": ["rajdhani", "sooji", "rajdhani"]},
  {"id": 333, "name": "Kelloggs Oats", "brand": "Kelloggs", "unit": "400 g Pack", "price": 99.0, "regular_price": 110.0, "offer_price": 99.0, "cost_price": 85.0, "stock": 35, "stock_quantity": 35, "category": "Atta, Flours & Grains", "category_name": "Atta, Flours & Grains", "margin_pct": 14.1, "max_safe_discount_pct": 7.0, "best_deal_price": 89.1, "image": "/media/products/packshots/p14.svg", "thumbnail": "/media/products/packshots/p14.svg", "aliases": ["kelloggs", "oats", "kelloggs"]},
  {"id": 334, "name": "Tata Sampann Besan", "brand": "Tata", "unit": "500 g Pack", "price": 64.0, "regular_price": 70.0, "offer_price": 64.0, "cost_price": 55.0, "stock": 40, "stock_quantity": 40, "category": "Atta, Flours & Grains", "category_name": "Atta, Flours & Grains", "margin_pct": 14.1, "max_safe_discount_pct": 7.0, "best_deal_price": 57.6, "image": "/media/products/packshots/p15.svg", "thumbnail": "/media/products/packshots/p15.svg", "aliases": ["tata", "sampann", "besan", "tata"]},
  {"id": 335, "name": "Pillsbury Chakki Atta", "brand": "Pillsbury", "unit": "5 kg Bag", "price": 270.0, "regular_price": 285.0, "offer_price": 270.0, "cost_price": 245.0, "stock": 50, "stock_quantity": 50, "category": "Atta, Flours & Grains", "category_name": "Atta, Flours & Grains", "margin_pct": 9.3, "max_safe_discount_pct": 5.0, "best_deal_price": 243.0, "image": "/media/products/packshots/p16.svg", "thumbnail": "/media/products/packshots/p16.svg", "aliases": ["pillsbury", "chakki", "atta", "pillsbury"]},
  {"id": 336, "name": "Daawat Basmati Rice", "brand": "Daawat", "unit": "1 kg Bag", "price": 115.0, "regular_price": 125.0, "offer_price": 115.0, "cost_price": 98.0, "stock": 70, "stock_quantity": 70, "category": "Rice & Pulses", "category_name": "Rice & Pulses", "margin_pct": 14.8, "max_safe_discount_pct": 7.4, "best_deal_price": 103.5, "image": "/media/products/packshots/p17.svg", "thumbnail": "/media/products/packshots/p17.svg", "aliases": ["daawat", "basmati", "rice", "daawat"]},
  {"id": 337, "name": "India Gate Basmati", "brand": "India Gate", "unit": "1 kg Bag", "price": 99.0, "regular_price": 110.0, "offer_price": 99.0, "cost_price": 85.0, "stock": 65, "stock_quantity": 65, "category": "Rice & Pulses", "category_name": "Rice & Pulses", "margin_pct": 14.1, "max_safe_discount_pct": 7.0, "best_deal_price": 89.1, "image": "/media/products/packshots/p18.svg", "thumbnail": "/media/products/packshots/p18.svg", "aliases": ["india", "gate", "basmati", "india gate"]},
  {"id": 338, "name": "Fortune Rozana Basmati", "brand": "Fortune", "unit": "5 kg Bag", "price": 399.0, "regular_price": 450.0, "offer_price": 399.0, "cost_price": 350.0, "stock": 45, "stock_quantity": 45, "category": "Rice & Pulses", "category_name": "Rice & Pulses", "margin_pct": 12.3, "max_safe_discount_pct": 6.2, "best_deal_price": 359.1, "image": "/media/products/packshots/p19.svg", "thumbnail": "/media/products/packshots/p19.svg", "aliases": ["fortune", "rozana", "basmati", "fortune"]},
  {"id": 339, "name": "Tata Sampann Toor Dal", "brand": "Tata", "unit": "1 kg Pack", "price": 158.0, "regular_price": 175.0, "offer_price": 158.0, "cost_price": 138.0, "stock": 60, "stock_quantity": 60, "category": "Rice & Pulses", "category_name": "Rice & Pulses", "margin_pct": 12.7, "max_safe_discount_pct": 6.3, "best_deal_price": 142.2, "image": "/media/products/packshots/p20.svg", "thumbnail": "/media/products/packshots/p20.svg", "aliases": ["tata", "sampann", "toor", "dal", "tata"]},
  {"id": 340, "name": "Tata Sampann Moong Dal", "brand": "Tata", "unit": "500 g Pack", "price": 82.0, "regular_price": 90.0, "offer_price": 82.0, "cost_price": 70.0, "stock": 50, "stock_quantity": 50, "category": "Rice & Pulses", "category_name": "Rice & Pulses", "margin_pct": 14.6, "max_safe_discount_pct": 7.3, "best_deal_price": 73.8, "image": "/media/products/packshots/p21.svg", "thumbnail": "/media/products/packshots/p21.svg", "aliases": ["tata", "sampann", "moong", "dal", "tata"]},
  {"id": 341, "name": "Tata Sampann Chana Dal", "brand": "Tata", "unit": "1 kg Pack", "price": 108.0, "regular_price": 120.0, "offer_price": 108.0, "cost_price": 92.0, "stock": 55, "stock_quantity": 55, "category": "Rice & Pulses", "category_name": "Rice & Pulses", "margin_pct": 14.8, "max_safe_discount_pct": 7.4, "best_deal_price": 97.2, "image": "/media/products/packshots/p22.svg", "thumbnail": "/media/products/packshots/p22.svg", "aliases": ["tata", "sampann", "chana", "dal", "tata"]},
  {"id": 342, "name": "Fortune Rajma Chitra", "brand": "Fortune", "unit": "500 g Pack", "price": 105.0, "regular_price": 115.0, "offer_price": 105.0, "cost_price": 90.0, "stock": 40, "stock_quantity": 40, "category": "Rice & Pulses", "category_name": "Rice & Pulses", "margin_pct": 14.3, "max_safe_discount_pct": 7.2, "best_deal_price": 94.5, "image": "/media/products/packshots/p23.svg", "thumbnail": "/media/products/packshots/p23.svg", "aliases": ["fortune", "rajma", "chitra", "fortune"]},
  {"id": 343, "name": "Fortune Kabuli Chana", "brand": "Fortune", "unit": "500 g Pack", "price": 95.0, "regular_price": 105.0, "offer_price": 95.0, "cost_price": 82.0, "stock": 45, "stock_quantity": 45, "category": "Rice & Pulses", "category_name": "Rice & Pulses", "margin_pct": 13.7, "max_safe_discount_pct": 6.8, "best_deal_price": 85.5, "image": "/media/products/packshots/p24.svg", "thumbnail": "/media/products/packshots/p24.svg", "aliases": ["fortune", "kabuli", "chana", "fortune"]},
  {"id": 344, "name": "Tata Sampann Urad Dal", "brand": "Tata", "unit": "500 g Pack", "price": 88.0, "regular_price": 95.0, "offer_price": 88.0, "cost_price": 75.0, "stock": 40, "stock_quantity": 40, "category": "Rice & Pulses", "category_name": "Rice & Pulses", "margin_pct": 14.8, "max_safe_discount_pct": 7.4, "best_deal_price": 79.2, "image": "/media/products/packshots/p25.svg", "thumbnail": "/media/products/packshots/p25.svg", "aliases": ["tata", "sampann", "urad", "dal", "tata"]},
  {"id": 345, "name": "Fortune Mustard Oil", "brand": "Fortune", "unit": "1 L Bottle", "price": 152.0, "regular_price": 165.0, "offer_price": 152.0, "cost_price": 132.0, "stock": 65, "stock_quantity": 65, "category": "Edible Oils & Ghee", "category_name": "Edible Oils & Ghee", "margin_pct": 13.2, "max_safe_discount_pct": 6.6, "best_deal_price": 136.8, "image": "/media/products/packshots/p26.svg", "thumbnail": "/media/products/packshots/p26.svg", "aliases": ["fortune", "mustard", "oil", "fortune"]},
  {"id": 346, "name": "Fortune Sunflower Oil", "brand": "Fortune", "unit": "1 L Pouch", "price": 132.0, "regular_price": 145.0, "offer_price": 132.0, "cost_price": 115.0, "stock": 70, "stock_quantity": 70, "category": "Edible Oils & Ghee", "category_name": "Edible Oils & Ghee", "margin_pct": 12.9, "max_safe_discount_pct": 6.5, "best_deal_price": 118.8, "image": "/media/products/packshots/p27.svg", "thumbnail": "/media/products/packshots/p27.svg", "aliases": ["fortune", "sunflower", "oil", "fortune"]},
  {"id": 347, "name": "Saffola Gold Oil", "brand": "Saffola", "unit": "1 L Bottle", "price": 169.0, "regular_price": 185.0, "offer_price": 169.0, "cost_price": 148.0, "stock": 50, "stock_quantity": 50, "category": "Edible Oils & Ghee", "category_name": "Edible Oils & Ghee", "margin_pct": 12.4, "max_safe_discount_pct": 6.2, "best_deal_price": 152.1, "image": "/media/products/packshots/p28.svg", "thumbnail": "/media/products/packshots/p28.svg", "aliases": ["saffola", "gold", "oil", "saffola"]},
  {"id": 348, "name": "Dhara Mustard Oil", "brand": "Dhara", "unit": "1 L Bottle", "price": 148.0, "regular_price": 160.0, "offer_price": 148.0, "cost_price": 128.0, "stock": 45, "stock_quantity": 45, "category": "Edible Oils & Ghee", "category_name": "Edible Oils & Ghee", "margin_pct": 13.5, "max_safe_discount_pct": 6.8, "best_deal_price": 133.2, "image": "/media/products/packshots/p29.svg", "thumbnail": "/media/products/packshots/p29.svg", "aliases": ["dhara", "mustard", "oil", "dhara"]},
  {"id": 349, "name": "Amul Pure Ghee", "brand": "Amul", "unit": "1 L Tin", "price": 580.0, "regular_price": 620.0, "offer_price": 580.0, "cost_price": 520.0, "stock": 40, "stock_quantity": 40, "category": "Edible Oils & Ghee", "category_name": "Edible Oils & Ghee", "margin_pct": 10.3, "max_safe_discount_pct": 5.2, "best_deal_price": 522.0, "image": "/media/products/packshots/p30.svg", "thumbnail": "/media/products/packshots/p30.svg", "aliases": ["amul", "pure", "ghee", "amul"]},
  {"id": 350, "name": "Figaro Olive Oil", "brand": "Figaro", "unit": "500 ml Bottle", "price": 649.0, "regular_price": 699.0, "offer_price": 649.0, "cost_price": 560.0, "stock": 25, "stock_quantity": 25, "category": "Edible Oils & Ghee", "category_name": "Edible Oils & Ghee", "margin_pct": 13.7, "max_safe_discount_pct": 6.8, "best_deal_price": 584.1, "image": "/media/products/packshots/p31.svg", "thumbnail": "/media/products/packshots/p31.svg", "aliases": ["figaro", "olive", "oil", "figaro"]},
  {"id": 351, "name": "Parachute Coconut Oil", "brand": "Parachute", "unit": "500 ml Bottle", "price": 180.0, "regular_price": 195.0, "offer_price": 180.0, "cost_price": 155.0, "stock": 50, "stock_quantity": 50, "category": "Edible Oils & Ghee", "category_name": "Edible Oils & Ghee", "margin_pct": 13.9, "max_safe_discount_pct": 7.0, "best_deal_price": 162.0, "image": "/media/products/packshots/p32.svg", "thumbnail": "/media/products/packshots/p32.svg", "aliases": ["parachute", "coconut", "oil", "parachute"]},
  {"id": 352, "name": "Fortune Rice Bran Oil", "brand": "Fortune", "unit": "1 L Pouch", "price": 138.0, "regular_price": 150.0, "offer_price": 138.0, "cost_price": 120.0, "stock": 45, "stock_quantity": 45, "category": "Edible Oils & Ghee", "category_name": "Edible Oils & Ghee", "margin_pct": 13.0, "max_safe_discount_pct": 6.5, "best_deal_price": 124.2, "image": "/media/products/packshots/p33.svg", "thumbnail": "/media/products/packshots/p33.svg", "aliases": ["fortune", "rice", "bran", "oil", "fortune"]},
  {"id": 353, "name": "Maggi Masala Noodles", "brand": "Maggi", "unit": "70 g Pack", "price": 14.0, "regular_price": 14.0, "offer_price": 14.0, "cost_price": 11.5, "stock": 120, "stock_quantity": 120, "category": "Instant Food & Noodles", "category_name": "Instant Food & Noodles", "margin_pct": 17.9, "max_safe_discount_pct": 8.9, "best_deal_price": 12.6, "image": "/media/products/packshots/p34.svg", "thumbnail": "/media/products/packshots/p34.svg", "aliases": ["maggi", "masala", "noodles", "maggi"]},
  {"id": 354, "name": "Maggi 4-Pack Noodles", "brand": "Maggi", "unit": "280 g Pack", "price": 52.0, "regular_price": 56.0, "offer_price": 52.0, "cost_price": 45.0, "stock": 80, "stock_quantity": 80, "category": "Instant Food & Noodles", "category_name": "Instant Food & Noodles", "margin_pct": 13.5, "max_safe_discount_pct": 6.8, "best_deal_price": 46.8, "image": "/media/products/packshots/p35.svg", "thumbnail": "/media/products/packshots/p35.svg", "aliases": ["maggi", "4-pack", "noodles", "maggi"]},
  {"id": 355, "name": "Yippee Magic Masala", "brand": "Sunfeast", "unit": "65 g Pack", "price": 14.0, "regular_price": 14.0, "offer_price": 14.0, "cost_price": 11.5, "stock": 85, "stock_quantity": 85, "category": "Instant Food & Noodles", "category_name": "Instant Food & Noodles", "margin_pct": 17.9, "max_safe_discount_pct": 8.9, "best_deal_price": 12.6, "image": "/media/products/packshots/p36.svg", "thumbnail": "/media/products/packshots/p36.svg", "aliases": ["yippee", "magic", "masala", "sunfeast"]},
  {"id": 356, "name": "Chings Hakka Noodles", "brand": "Chings", "unit": "150 g Pack", "price": 36.0, "regular_price": 40.0, "offer_price": 36.0, "cost_price": 30.0, "stock": 50, "stock_quantity": 50, "category": "Instant Food & Noodles", "category_name": "Instant Food & Noodles", "margin_pct": 16.7, "max_safe_discount_pct": 8.3, "best_deal_price": 32.4, "image": "/media/products/packshots/p37.svg", "thumbnail": "/media/products/packshots/p37.svg", "aliases": ["chings", "hakka", "noodles", "chings"]},
  {"id": 357, "name": "Knorr Tomato Soup", "brand": "Knorr", "unit": "53 g Pack", "price": 50.0, "regular_price": 55.0, "offer_price": 50.0, "cost_price": 42.0, "stock": 45, "stock_quantity": 45, "category": "Instant Food & Noodles", "category_name": "Instant Food & Noodles", "margin_pct": 16.0, "max_safe_discount_pct": 8.0, "best_deal_price": 45.0, "image": "/media/products/packshots/p38.svg", "thumbnail": "/media/products/packshots/p38.svg", "aliases": ["knorr", "tomato", "soup", "knorr"]},
  {"id": 358, "name": "Nissin Cup Noodles", "brand": "Nissin", "unit": "70 g Cup", "price": 42.0, "regular_price": 45.0, "offer_price": 42.0, "cost_price": 35.0, "stock": 40, "stock_quantity": 40, "category": "Instant Food & Noodles", "category_name": "Instant Food & Noodles", "margin_pct": 16.7, "max_safe_discount_pct": 8.3, "best_deal_price": 37.8, "image": "/media/products/packshots/p39.svg", "thumbnail": "/media/products/packshots/p39.svg", "aliases": ["nissin", "cup", "noodles", "nissin"]},
  {"id": 359, "name": "Bambino Roasted Vermicelli", "brand": "Bambino", "unit": "400 g Pack", "price": 40.0, "regular_price": 45.0, "offer_price": 40.0, "cost_price": 32.0, "stock": 50, "stock_quantity": 50, "category": "Instant Food & Noodles", "category_name": "Instant Food & Noodles", "margin_pct": 20.0, "max_safe_discount_pct": 10.0, "best_deal_price": 36.0, "image": "/media/products/packshots/p40.svg", "thumbnail": "/media/products/packshots/p40.svg", "aliases": ["bambino", "roasted", "vermicelli", "bambino"]},
  {"id": 360, "name": "Tata Sampann Poha", "brand": "Tata", "unit": "500 g Pack", "price": 48.0, "regular_price": 55.0, "offer_price": 48.0, "cost_price": 40.0, "stock": 55, "stock_quantity": 55, "category": "Instant Food & Noodles", "category_name": "Instant Food & Noodles", "margin_pct": 16.7, "max_safe_discount_pct": 8.3, "best_deal_price": 43.2, "image": "/media/products/packshots/p41.svg", "thumbnail": "/media/products/packshots/p41.svg", "aliases": ["tata", "sampann", "poha", "tata"]},
  {"id": 361, "name": "Disano Macaroni Pasta", "brand": "Disano", "unit": "500 g Pack", "price": 75.0, "regular_price": 85.0, "offer_price": 75.0, "cost_price": 62.0, "stock": 40, "stock_quantity": 40, "category": "Instant Food & Noodles", "category_name": "Instant Food & Noodles", "margin_pct": 17.3, "max_safe_discount_pct": 8.7, "best_deal_price": 67.5, "image": "/media/products/packshots/p42.svg", "thumbnail": "/media/products/packshots/p42.svg", "aliases": ["disano", "macaroni", "pasta", "disano"]},
  {"id": 362, "name": "Parle-G Biscuits", "brand": "Parle", "unit": "250 g Pack", "price": 25.0, "regular_price": 25.0, "offer_price": 25.0, "cost_price": 21.0, "stock": 100, "stock_quantity": 100, "category": "Snacks, Biscuits & Namkeen", "category_name": "Snacks, Biscuits & Namkeen", "margin_pct": 16.0, "max_safe_discount_pct": 8.0, "best_deal_price": 22.5, "image": "/media/products/packshots/p43.svg", "thumbnail": "/media/products/packshots/p43.svg", "aliases": ["parle-g", "biscuits", "parle"]},
  {"id": 363, "name": "Britannia Good Day", "brand": "Britannia", "unit": "200 g Pack", "price": 36.0, "regular_price": 40.0, "offer_price": 36.0, "cost_price": 30.0, "stock": 75, "stock_quantity": 75, "category": "Snacks, Biscuits & Namkeen", "category_name": "Snacks, Biscuits & Namkeen", "margin_pct": 16.7, "max_safe_discount_pct": 8.3, "best_deal_price": 32.4, "image": "/media/products/packshots/p44.svg", "thumbnail": "/media/products/packshots/p44.svg", "aliases": ["britannia", "good", "day", "britannia"]},
  {"id": 364, "name": "Britannia Marie Gold", "brand": "Britannia", "unit": "250 g Pack", "price": 32.0, "regular_price": 35.0, "offer_price": 32.0, "cost_price": 27.0, "stock": 60, "stock_quantity": 60, "category": "Snacks, Biscuits & Namkeen", "category_name": "Snacks, Biscuits & Namkeen", "margin_pct": 15.6, "max_safe_discount_pct": 7.8, "best_deal_price": 28.8, "image": "/media/products/packshots/p45.svg", "thumbnail": "/media/products/packshots/p45.svg", "aliases": ["britannia", "marie", "gold", "britannia"]},
  {"id": 365, "name": "Cadbury Oreo Original", "brand": "Oreo", "unit": "120 g Pack", "price": 35.0, "regular_price": 35.0, "offer_price": 35.0, "cost_price": 28.0, "stock": 70, "stock_quantity": 70, "category": "Snacks, Biscuits & Namkeen", "category_name": "Snacks, Biscuits & Namkeen", "margin_pct": 20.0, "max_safe_discount_pct": 10.0, "best_deal_price": 31.5, "image": "/media/products/packshots/p46.svg", "thumbnail": "/media/products/packshots/p46.svg", "aliases": ["cadbury", "oreo", "original", "oreo"]},
  {"id": 366, "name": "Kurkure Masala Munch", "brand": "Kurkure", "unit": "75 g Pouch", "price": 20.0, "regular_price": 20.0, "offer_price": 20.0, "cost_price": 16.5, "stock": 90, "stock_quantity": 90, "category": "Snacks, Biscuits & Namkeen", "category_name": "Snacks, Biscuits & Namkeen", "margin_pct": 17.5, "max_safe_discount_pct": 8.8, "best_deal_price": 18.0, "image": "/media/products/packshots/p47.svg", "thumbnail": "/media/products/packshots/p47.svg", "aliases": ["kurkure", "masala", "munch", "kurkure"]},
  {"id": 367, "name": "Lays Classic Salted", "brand": "Lays", "unit": "50 g Pouch", "price": 20.0, "regular_price": 20.0, "offer_price": 20.0, "cost_price": 16.5, "stock": 85, "stock_quantity": 85, "category": "Snacks, Biscuits & Namkeen", "category_name": "Snacks, Biscuits & Namkeen", "margin_pct": 17.5, "max_safe_discount_pct": 8.8, "best_deal_price": 18.0, "image": "/media/products/packshots/p48.svg", "thumbnail": "/media/products/packshots/p48.svg", "aliases": ["lays", "classic", "salted", "lays"]},
  {"id": 368, "name": "Haldiram Aloo Bhujia", "brand": "Haldiram", "unit": "200 g Pouch", "price": 49.0, "regular_price": 55.0, "offer_price": 49.0, "cost_price": 40.0, "stock": 65, "stock_quantity": 65, "category": "Snacks, Biscuits & Namkeen", "category_name": "Snacks, Biscuits & Namkeen", "margin_pct": 18.4, "max_safe_discount_pct": 9.2, "best_deal_price": 44.1, "image": "/media/products/packshots/p49.svg", "thumbnail": "/media/products/packshots/p49.svg", "aliases": ["haldiram", "aloo", "bhujia", "haldiram"]},
  {"id": 369, "name": "Haldiram Khatta Meetha", "brand": "Haldiram", "unit": "200 g Pouch", "price": 49.0, "regular_price": 55.0, "offer_price": 49.0, "cost_price": 40.0, "stock": 60, "stock_quantity": 60, "category": "Snacks, Biscuits & Namkeen", "category_name": "Snacks, Biscuits & Namkeen", "margin_pct": 18.4, "max_safe_discount_pct": 9.2, "best_deal_price": 44.1, "image": "/media/products/packshots/p50.svg", "thumbnail": "/media/products/packshots/p50.svg", "aliases": ["haldiram", "khatta", "meetha", "haldiram"]},
  {"id": 370, "name": "Act II Popcorn Butter", "brand": "Act II", "unit": "70 g Pack", "price": 32.0, "regular_price": 35.0, "offer_price": 32.0, "cost_price": 26.0, "stock": 50, "stock_quantity": 50, "category": "Snacks, Biscuits & Namkeen", "category_name": "Snacks, Biscuits & Namkeen", "margin_pct": 18.8, "max_safe_discount_pct": 9.4, "best_deal_price": 28.8, "image": "/media/products/packshots/p51.svg", "thumbnail": "/media/products/packshots/p51.svg", "aliases": ["act", "popcorn", "butter", "act ii"]},
  {"id": 371, "name": "Tata Tea Gold", "brand": "Tata", "unit": "500 g Pack", "price": 299.0, "regular_price": 330.0, "offer_price": 299.0, "cost_price": 265.0, "stock": 60, "stock_quantity": 60, "category": "Beverages, Tea & Coffee", "category_name": "Beverages, Tea & Coffee", "margin_pct": 11.4, "max_safe_discount_pct": 5.7, "best_deal_price": 269.1, "image": "/media/products/packshots/p52.svg", "thumbnail": "/media/products/packshots/p52.svg", "aliases": ["tata", "tea", "gold", "tata"]},
  {"id": 372, "name": "Red Label Tea", "brand": "Brooke Bond", "unit": "500 g Pack", "price": 265.0, "regular_price": 290.0, "offer_price": 265.0, "cost_price": 235.0, "stock": 55, "stock_quantity": 55, "category": "Beverages, Tea & Coffee", "category_name": "Beverages, Tea & Coffee", "margin_pct": 11.3, "max_safe_discount_pct": 5.7, "best_deal_price": 238.5, "image": "/media/products/packshots/p53.svg", "thumbnail": "/media/products/packshots/p53.svg", "aliases": ["red", "label", "tea", "brooke bond"]},
  {"id": 373, "name": "Taj Mahal Tea", "brand": "Brooke Bond", "unit": "250 g Box", "price": 195.0, "regular_price": 210.0, "offer_price": 195.0, "cost_price": 170.0, "stock": 45, "stock_quantity": 45, "category": "Beverages, Tea & Coffee", "category_name": "Beverages, Tea & Coffee", "margin_pct": 12.8, "max_safe_discount_pct": 6.4, "best_deal_price": 175.5, "image": "/media/products/packshots/p54.svg", "thumbnail": "/media/products/packshots/p54.svg", "aliases": ["taj", "mahal", "tea", "brooke bond"]},
  {"id": 374, "name": "Nescafe Classic", "brand": "Nescafe", "unit": "100 g Jar", "price": 330.0, "regular_price": 360.0, "offer_price": 330.0, "cost_price": 290.0, "stock": 50, "stock_quantity": 50, "category": "Beverages, Tea & Coffee", "category_name": "Beverages, Tea & Coffee", "margin_pct": 12.1, "max_safe_discount_pct": 6.0, "best_deal_price": 297.0, "image": "/media/products/packshots/p55.svg", "thumbnail": "/media/products/packshots/p55.svg", "aliases": ["nescafe", "classic", "nescafe"]},
  {"id": 375, "name": "Bru Gold Coffee", "brand": "Bru", "unit": "100 g Jar", "price": 299.0, "regular_price": 330.0, "offer_price": 299.0, "cost_price": 260.0, "stock": 40, "stock_quantity": 40, "category": "Beverages, Tea & Coffee", "category_name": "Beverages, Tea & Coffee", "margin_pct": 13.0, "max_safe_discount_pct": 6.5, "best_deal_price": 269.1, "image": "/media/products/packshots/p56.svg", "thumbnail": "/media/products/packshots/p56.svg", "aliases": ["bru", "gold", "coffee", "bru"]},
  {"id": 376, "name": "Real Mixed Fruit", "brand": "Real", "unit": "1 L Tetra", "price": 119.0, "regular_price": 130.0, "offer_price": 119.0, "cost_price": 100.0, "stock": 50, "stock_quantity": 50, "category": "Beverages, Tea & Coffee", "category_name": "Beverages, Tea & Coffee", "margin_pct": 16.0, "max_safe_discount_pct": 8.0, "best_deal_price": 107.1, "image": "/media/products/packshots/p57.svg", "thumbnail": "/media/products/packshots/p57.svg", "aliases": ["real", "mixed", "fruit", "real"]},
  {"id": 377, "name": "Frooti Mango Drink", "brand": "Frooti", "unit": "1 L Bottle", "price": 69.0, "regular_price": 75.0, "offer_price": 69.0, "cost_price": 58.0, "stock": 60, "stock_quantity": 60, "category": "Beverages, Tea & Coffee", "category_name": "Beverages, Tea & Coffee", "margin_pct": 15.9, "max_safe_discount_pct": 8.0, "best_deal_price": 62.1, "image": "/media/products/packshots/p58.svg", "thumbnail": "/media/products/packshots/p58.svg", "aliases": ["frooti", "mango", "drink", "frooti"]},
  {"id": 378, "name": "Lipton Green Tea", "brand": "Lipton", "unit": "25 Bags Box", "price": 155.0, "regular_price": 175.0, "offer_price": 155.0, "cost_price": 135.0, "stock": 35, "stock_quantity": 35, "category": "Beverages, Tea & Coffee", "category_name": "Beverages, Tea & Coffee", "margin_pct": 12.9, "max_safe_discount_pct": 6.5, "best_deal_price": 139.5, "image": "/media/products/packshots/p59.svg", "thumbnail": "/media/products/packshots/p59.svg", "aliases": ["lipton", "green", "tea", "lipton"]},
  {"id": 379, "name": "Tata Salt", "brand": "Tata", "unit": "1 kg Pack", "price": 28.0, "regular_price": 28.0, "offer_price": 28.0, "cost_price": 23.0, "stock": 150, "stock_quantity": 150, "category": "Spices & Seasonings", "category_name": "Spices & Seasonings", "margin_pct": 17.9, "max_safe_discount_pct": 8.9, "best_deal_price": 25.2, "image": "/media/products/packshots/p60.svg", "thumbnail": "/media/products/packshots/p60.svg", "aliases": ["tata", "salt", "tata"]},
  {"id": 380, "name": "Everest Turmeric Powder", "brand": "Everest", "unit": "200 g Pack", "price": 58.0, "regular_price": 65.0, "offer_price": 58.0, "cost_price": 48.0, "stock": 70, "stock_quantity": 70, "category": "Spices & Seasonings", "category_name": "Spices & Seasonings", "margin_pct": 17.2, "max_safe_discount_pct": 8.6, "best_deal_price": 52.2, "image": "/media/products/packshots/p61.svg", "thumbnail": "/media/products/packshots/p61.svg", "aliases": ["everest", "turmeric", "powder", "everest"]},
  {"id": 381, "name": "MDH Deggi Mirch", "brand": "MDH", "unit": "100 g Box", "price": 88.0, "regular_price": 95.0, "offer_price": 88.0, "cost_price": 75.0, "stock": 65, "stock_quantity": 65, "category": "Spices & Seasonings", "category_name": "Spices & Seasonings", "margin_pct": 14.8, "max_safe_discount_pct": 7.4, "best_deal_price": 79.2, "image": "/media/products/packshots/p62.svg", "thumbnail": "/media/products/packshots/p62.svg", "aliases": ["mdh", "deggi", "mirch", "mdh"]},
  {"id": 382, "name": "Catch Coriander Powder", "brand": "Catch", "unit": "200 g Pack", "price": 62.0, "regular_price": 70.0, "offer_price": 62.0, "cost_price": 52.0, "stock": 50, "stock_quantity": 50, "category": "Spices & Seasonings", "category_name": "Spices & Seasonings", "margin_pct": 16.1, "max_safe_discount_pct": 8.1, "best_deal_price": 55.8, "image": "/media/products/packshots/p63.svg", "thumbnail": "/media/products/packshots/p63.svg", "aliases": ["catch", "coriander", "powder", "catch"]},
  {"id": 383, "name": "Everest Garam Masala", "brand": "Everest", "unit": "100 g Box", "price": 82.0, "regular_price": 90.0, "offer_price": 82.0, "cost_price": 70.0, "stock": 55, "stock_quantity": 55, "category": "Spices & Seasonings", "category_name": "Spices & Seasonings", "margin_pct": 14.6, "max_safe_discount_pct": 7.3, "best_deal_price": 73.8, "image": "/media/products/packshots/p64.svg", "thumbnail": "/media/products/packshots/p64.svg", "aliases": ["everest", "garam", "masala", "everest"]},
  {"id": 384, "name": "Catch Black Pepper", "brand": "Catch", "unit": "100 g Jar", "price": 122.0, "regular_price": 135.0, "offer_price": 122.0, "cost_price": 105.0, "stock": 40, "stock_quantity": 40, "category": "Spices & Seasonings", "category_name": "Spices & Seasonings", "margin_pct": 13.9, "max_safe_discount_pct": 7.0, "best_deal_price": 109.8, "image": "/media/products/packshots/p65.svg", "thumbnail": "/media/products/packshots/p65.svg", "aliases": ["catch", "black", "pepper", "catch"]},
  {"id": 385, "name": "MDH Chaat Masala", "brand": "MDH", "unit": "100 g Box", "price": 72.0, "regular_price": 78.0, "offer_price": 72.0, "cost_price": 60.0, "stock": 45, "stock_quantity": 45, "category": "Spices & Seasonings", "category_name": "Spices & Seasonings", "margin_pct": 16.7, "max_safe_discount_pct": 8.3, "best_deal_price": 64.8, "image": "/media/products/packshots/p66.svg", "thumbnail": "/media/products/packshots/p66.svg", "aliases": ["mdh", "chaat", "masala", "mdh"]},
  {"id": 386, "name": "Everest Kasuri Methi", "brand": "Everest", "unit": "50 g Box", "price": 40.0, "regular_price": 45.0, "offer_price": 40.0, "cost_price": 32.0, "stock": 40, "stock_quantity": 40, "category": "Spices & Seasonings", "category_name": "Spices & Seasonings", "margin_pct": 20.0, "max_safe_discount_pct": 10.0, "best_deal_price": 36.0, "image": "/media/products/packshots/p67.svg", "thumbnail": "/media/products/packshots/p67.svg", "aliases": ["everest", "kasuri", "methi", "everest"]},
  {"id": 387, "name": "Catch Cumin Seeds", "brand": "Catch", "unit": "100 g Pack", "price": 72.0, "regular_price": 80.0, "offer_price": 72.0, "cost_price": 60.0, "stock": 45, "stock_quantity": 45, "category": "Spices & Seasonings", "category_name": "Spices & Seasonings", "margin_pct": 16.7, "max_safe_discount_pct": 8.3, "best_deal_price": 64.8, "image": "/media/products/packshots/p68.svg", "thumbnail": "/media/products/packshots/p68.svg", "aliases": ["catch", "cumin", "seeds", "catch"]},
  {"id": 388, "name": "Cadbury Dairy Milk", "brand": "Cadbury", "unit": "55 g Bar", "price": 50.0, "regular_price": 50.0, "offer_price": 50.0, "cost_price": 42.0, "stock": 90, "stock_quantity": 90, "category": "Chocolates, Honey & Spreads", "category_name": "Chocolates, Honey & Spreads", "margin_pct": 16.0, "max_safe_discount_pct": 8.0, "best_deal_price": 45.0, "image": "/media/products/packshots/p69.svg", "thumbnail": "/media/products/packshots/p69.svg", "aliases": ["cadbury", "dairy", "milk", "cadbury"]},
  {"id": 389, "name": "Nestle KitKat", "brand": "Nestle", "unit": "38 g Pack", "price": 30.0, "regular_price": 30.0, "offer_price": 30.0, "cost_price": 25.0, "stock": 85, "stock_quantity": 85, "category": "Chocolates, Honey & Spreads", "category_name": "Chocolates, Honey & Spreads", "margin_pct": 16.7, "max_safe_discount_pct": 8.3, "best_deal_price": 27.0, "image": "/media/products/packshots/p70.svg", "thumbnail": "/media/products/packshots/p70.svg", "aliases": ["nestle", "kitkat", "nestle"]},
  {"id": 390, "name": "Nutella Hazelnut Spread", "brand": "Nutella", "unit": "350 g Jar", "price": 369.0, "regular_price": 399.0, "offer_price": 369.0, "cost_price": 320.0, "stock": 35, "stock_quantity": 35, "category": "Chocolates, Honey & Spreads", "category_name": "Chocolates, Honey & Spreads", "margin_pct": 13.3, "max_safe_discount_pct": 6.7, "best_deal_price": 332.1, "image": "/media/products/packshots/p71.svg", "thumbnail": "/media/products/packshots/p71.svg", "aliases": ["nutella", "hazelnut", "spread", "nutella"]},
  {"id": 391, "name": "Dabur Honey", "brand": "Dabur", "unit": "400 g Squeezy", "price": 199.0, "regular_price": 225.0, "offer_price": 199.0, "cost_price": 170.0, "stock": 45, "stock_quantity": 45, "category": "Chocolates, Honey & Spreads", "category_name": "Chocolates, Honey & Spreads", "margin_pct": 14.6, "max_safe_discount_pct": 7.3, "best_deal_price": 179.1, "image": "/media/products/packshots/p72.svg", "thumbnail": "/media/products/packshots/p72.svg", "aliases": ["dabur", "honey", "dabur"]},
  {"id": 392, "name": "Kissan Mixed Jam", "brand": "Kissan", "unit": "500 g Jar", "price": 158.0, "regular_price": 175.0, "offer_price": 158.0, "cost_price": 135.0, "stock": 40, "stock_quantity": 40, "category": "Chocolates, Honey & Spreads", "category_name": "Chocolates, Honey & Spreads", "margin_pct": 14.6, "max_safe_discount_pct": 7.3, "best_deal_price": 142.2, "image": "/media/products/packshots/p73.svg", "thumbnail": "/media/products/packshots/p73.svg", "aliases": ["kissan", "mixed", "jam", "kissan"]},
  {"id": 393, "name": "Pintola Peanut Butter", "brand": "Pintola", "unit": "350 g Jar", "price": 179.0, "regular_price": 199.0, "offer_price": 179.0, "cost_price": 150.0, "stock": 35, "stock_quantity": 35, "category": "Chocolates, Honey & Spreads", "category_name": "Chocolates, Honey & Spreads", "margin_pct": 16.2, "max_safe_discount_pct": 8.1, "best_deal_price": 161.1, "image": "/media/products/packshots/p74.svg", "thumbnail": "/media/products/packshots/p74.svg", "aliases": ["pintola", "peanut", "butter", "pintola"]},
  {"id": 394, "name": "Bournvita Drink Mix", "brand": "Bournvita", "unit": "500 g Jar", "price": 239.0, "regular_price": 260.0, "offer_price": 239.0, "cost_price": 205.0, "stock": 40, "stock_quantity": 40, "category": "Chocolates, Honey & Spreads", "category_name": "Chocolates, Honey & Spreads", "margin_pct": 14.2, "max_safe_discount_pct": 7.1, "best_deal_price": 215.1, "image": "/media/products/packshots/p75.svg", "thumbnail": "/media/products/packshots/p75.svg", "aliases": ["bournvita", "drink", "mix", "bournvita"]},
  {"id": 395, "name": "Hersheys Chocolate Syrup", "brand": "Hersheys", "unit": "623 g Bottle", "price": 215.0, "regular_price": 240.0, "offer_price": 215.0, "cost_price": 185.0, "stock": 30, "stock_quantity": 30, "category": "Chocolates, Honey & Spreads", "category_name": "Chocolates, Honey & Spreads", "margin_pct": 14.0, "max_safe_discount_pct": 7.0, "best_deal_price": 193.5, "image": "/media/products/packshots/p76.svg", "thumbnail": "/media/products/packshots/p76.svg", "aliases": ["hersheys", "chocolate", "syrup", "hersheys"]},
  {"id": 396, "name": "Surf Excel Matic", "brand": "Surf Excel", "unit": "1 kg Pouch", "price": 225.0, "regular_price": 245.0, "offer_price": 225.0, "cost_price": 195.0, "stock": 50, "stock_quantity": 50, "category": "Household & Cleaning", "category_name": "Household & Cleaning", "margin_pct": 13.3, "max_safe_discount_pct": 6.7, "best_deal_price": 202.5, "image": "/media/products/packshots/p77.svg", "thumbnail": "/media/products/packshots/p77.svg", "aliases": ["surf", "excel", "matic", "surf excel"]},
  {"id": 397, "name": "Ariel Complete Matic", "brand": "Ariel", "unit": "1 kg Pouch", "price": 235.0, "regular_price": 255.0, "offer_price": 235.0, "cost_price": 200.0, "stock": 45, "stock_quantity": 45, "category": "Household & Cleaning", "category_name": "Household & Cleaning", "margin_pct": 14.9, "max_safe_discount_pct": 7.5, "best_deal_price": 211.5, "image": "/media/products/packshots/p78.svg", "thumbnail": "/media/products/packshots/p78.svg", "aliases": ["ariel", "complete", "matic", "ariel"]},
  {"id": 398, "name": "Vim Dishwash Gel", "brand": "Vim", "unit": "750 ml Bottle", "price": 165.0, "regular_price": 185.0, "offer_price": 165.0, "cost_price": 140.0, "stock": 60, "stock_quantity": 60, "category": "Household & Cleaning", "category_name": "Household & Cleaning", "margin_pct": 15.2, "max_safe_discount_pct": 7.6, "best_deal_price": 148.5, "image": "/media/products/packshots/p79.svg", "thumbnail": "/media/products/packshots/p79.svg", "aliases": ["vim", "dishwash", "gel", "vim"]},
  {"id": 399, "name": "Harpic Power Plus", "brand": "Harpic", "unit": "1 L Bottle", "price": 195.0, "regular_price": 215.0, "offer_price": 195.0, "cost_price": 165.0, "stock": 50, "stock_quantity": 50, "category": "Household & Cleaning", "category_name": "Household & Cleaning", "margin_pct": 15.4, "max_safe_discount_pct": 7.7, "best_deal_price": 175.5, "image": "/media/products/packshots/p80.svg", "thumbnail": "/media/products/packshots/p80.svg", "aliases": ["harpic", "power", "plus", "harpic"]},
  {"id": 400, "name": "Lizol Floor Cleaner", "brand": "Lizol", "unit": "1 L Bottle", "price": 199.0, "regular_price": 220.0, "offer_price": 199.0, "cost_price": 170.0, "stock": 55, "stock_quantity": 55, "category": "Household & Cleaning", "category_name": "Household & Cleaning", "margin_pct": 14.6, "max_safe_discount_pct": 7.3, "best_deal_price": 179.1, "image": "/media/products/packshots/p81.svg", "thumbnail": "/media/products/packshots/p81.svg", "aliases": ["lizol", "floor", "cleaner", "lizol"]},
  {"id": 401, "name": "Colin Glass Cleaner", "brand": "Colin", "unit": "500 ml Spray", "price": 99.0, "regular_price": 110.0, "offer_price": 99.0, "cost_price": 85.0, "stock": 40, "stock_quantity": 40, "category": "Household & Cleaning", "category_name": "Household & Cleaning", "margin_pct": 14.1, "max_safe_discount_pct": 7.0, "best_deal_price": 89.1, "image": "/media/products/packshots/p82.svg", "thumbnail": "/media/products/packshots/p82.svg", "aliases": ["colin", "glass", "cleaner", "colin"]},
  {"id": 402, "name": "Pril Lime Dishwash", "brand": "Pril", "unit": "750 ml Bottle", "price": 155.0, "regular_price": 175.0, "offer_price": 155.0, "cost_price": 132.0, "stock": 45, "stock_quantity": 45, "category": "Household & Cleaning", "category_name": "Household & Cleaning", "margin_pct": 14.8, "max_safe_discount_pct": 7.4, "best_deal_price": 139.5, "image": "/media/products/packshots/p83.svg", "thumbnail": "/media/products/packshots/p83.svg", "aliases": ["pril", "lime", "dishwash", "pril"]},
  {"id": 403, "name": "Odonil Air Freshener", "brand": "Odonil", "unit": "50 g Pack", "price": 52.0, "regular_price": 60.0, "offer_price": 52.0, "cost_price": 42.0, "stock": 50, "stock_quantity": 50, "category": "Household & Cleaning", "category_name": "Household & Cleaning", "margin_pct": 19.2, "max_safe_discount_pct": 9.6, "best_deal_price": 46.8, "image": "/media/products/packshots/p84.svg", "thumbnail": "/media/products/packshots/p84.svg", "aliases": ["odonil", "air", "freshener", "odonil"]},
  {"id": 404, "name": "Dettol Original Soap", "brand": "Dettol", "unit": "Pack of 4", "price": 145.0, "regular_price": 160.0, "offer_price": 145.0, "cost_price": 125.0, "stock": 60, "stock_quantity": 60, "category": "Personal Care & Hygiene", "category_name": "Personal Care & Hygiene", "margin_pct": 13.8, "max_safe_discount_pct": 6.9, "best_deal_price": 130.5, "image": "/media/products/packshots/p85.svg", "thumbnail": "/media/products/packshots/p85.svg", "aliases": ["dettol", "original", "soap", "dettol"]},
  {"id": 405, "name": "Dove Beauty Bar", "brand": "Dove", "unit": "Pack of 3", "price": 179.0, "regular_price": 195.0, "offer_price": 179.0, "cost_price": 150.0, "stock": 45, "stock_quantity": 45, "category": "Personal Care & Hygiene", "category_name": "Personal Care & Hygiene", "margin_pct": 16.2, "max_safe_discount_pct": 8.1, "best_deal_price": 161.1, "image": "/media/products/packshots/p86.svg", "thumbnail": "/media/products/packshots/p86.svg", "aliases": ["dove", "beauty", "bar", "dove"]},
  {"id": 406, "name": "Lifebuoy Handwash", "brand": "Lifebuoy", "unit": "450 ml Bottle", "price": 119.0, "regular_price": 135.0, "offer_price": 119.0, "cost_price": 99.0, "stock": 50, "stock_quantity": 50, "category": "Personal Care & Hygiene", "category_name": "Personal Care & Hygiene", "margin_pct": 16.8, "max_safe_discount_pct": 8.4, "best_deal_price": 107.1, "image": "/media/products/packshots/p87.svg", "thumbnail": "/media/products/packshots/p87.svg", "aliases": ["lifebuoy", "handwash", "lifebuoy"]},
  {"id": 407, "name": "Colgate Total Toothpaste", "brand": "Colgate", "unit": "150 g Pack", "price": 130.0, "regular_price": 145.0, "offer_price": 130.0, "cost_price": 110.0, "stock": 70, "stock_quantity": 70, "category": "Personal Care & Hygiene", "category_name": "Personal Care & Hygiene", "margin_pct": 15.4, "max_safe_discount_pct": 7.7, "best_deal_price": 117.0, "image": "/media/products/packshots/p88.svg", "thumbnail": "/media/products/packshots/p88.svg", "aliases": ["colgate", "total", "toothpaste", "colgate"]},
  {"id": 408, "name": "Head & Shoulders", "brand": "Head & Shoulders", "unit": "340 ml Bottle", "price": 315.0, "regular_price": 350.0, "offer_price": 315.0, "cost_price": 270.0, "stock": 40, "stock_quantity": 40, "category": "Personal Care & Hygiene", "category_name": "Personal Care & Hygiene", "margin_pct": 14.3, "max_safe_discount_pct": 7.2, "best_deal_price": 283.5, "image": "/media/products/packshots/p89.svg", "thumbnail": "/media/products/packshots/p89.svg", "aliases": ["head", "shoulders", "head & shoulders"]},
  {"id": 409, "name": "Pantene Conditioner", "brand": "Pantene", "unit": "180 ml Tube", "price": 195.0, "regular_price": 220.0, "offer_price": 195.0, "cost_price": 165.0, "stock": 35, "stock_quantity": 35, "category": "Personal Care & Hygiene", "category_name": "Personal Care & Hygiene", "margin_pct": 15.4, "max_safe_discount_pct": 7.7, "best_deal_price": 175.5, "image": "/media/products/packshots/p90.svg", "thumbnail": "/media/products/packshots/p90.svg", "aliases": ["pantene", "conditioner", "pantene"]},
  {"id": 410, "name": "Nivea Soft Cream", "brand": "Nivea", "unit": "100 ml Tub", "price": 160.0, "regular_price": 180.0, "offer_price": 160.0, "cost_price": 135.0, "stock": 40, "stock_quantity": 40, "category": "Personal Care & Hygiene", "category_name": "Personal Care & Hygiene", "margin_pct": 15.6, "max_safe_discount_pct": 7.8, "best_deal_price": 144.0, "image": "/media/products/packshots/p91.svg", "thumbnail": "/media/products/packshots/p91.svg", "aliases": ["nivea", "soft", "cream", "nivea"]},
  {"id": 411, "name": "Gillette Mach3 Razor", "brand": "Gillette", "unit": "1 Pack", "price": 269.0, "regular_price": 299.0, "offer_price": 269.0, "cost_price": 225.0, "stock": 30, "stock_quantity": 30, "category": "Personal Care & Hygiene", "category_name": "Personal Care & Hygiene", "margin_pct": 16.4, "max_safe_discount_pct": 8.2, "best_deal_price": 242.1, "image": "/media/products/packshots/p92.svg", "thumbnail": "/media/products/packshots/p92.svg", "aliases": ["gillette", "mach3", "razor", "gillette"]},
  {"id": 412, "name": "Madhur Pure Sugar", "brand": "Madhur", "unit": "1 kg Pouch", "price": 56.0, "regular_price": 62.0, "offer_price": 56.0, "cost_price": 48.0, "stock": 80, "stock_quantity": 80, "category": "Packaged Essentials & Sugar", "category_name": "Packaged Essentials & Sugar", "margin_pct": 14.3, "max_safe_discount_pct": 7.2, "best_deal_price": 50.4, "image": "/media/products/packshots/p93.svg", "thumbnail": "/media/products/packshots/p93.svg", "aliases": ["madhur", "pure", "sugar", "madhur"]},
  {"id": 413, "name": "Dhampure Gur Pouch", "brand": "Dhampure", "unit": "500 g Pouch", "price": 68.0, "regular_price": 75.0, "offer_price": 68.0, "cost_price": 55.0, "stock": 50, "stock_quantity": 50, "category": "Packaged Essentials & Sugar", "category_name": "Packaged Essentials & Sugar", "margin_pct": 19.1, "max_safe_discount_pct": 9.6, "best_deal_price": 61.2, "image": "/media/products/packshots/p94.svg", "thumbnail": "/media/products/packshots/p94.svg", "aliases": ["dhampure", "gur", "pouch", "dhampure"]},
  {"id": 414, "name": "Tata Sampann Poha", "brand": "Tata", "unit": "500 g Pack", "price": 48.0, "regular_price": 55.0, "offer_price": 48.0, "cost_price": 40.0, "stock": 60, "stock_quantity": 60, "category": "Packaged Essentials & Sugar", "category_name": "Packaged Essentials & Sugar", "margin_pct": 16.7, "max_safe_discount_pct": 8.3, "best_deal_price": 43.2, "image": "/media/products/packshots/p95.svg", "thumbnail": "/media/products/packshots/p95.svg", "aliases": ["tata", "sampann", "poha", "tata"]},
  {"id": 415, "name": "Organic Jaggery Powder", "brand": "24 Mantra", "unit": "500 g Pouch", "price": 76.0, "regular_price": 85.0, "offer_price": 76.0, "cost_price": 62.0, "stock": 45, "stock_quantity": 45, "category": "Packaged Essentials & Sugar", "category_name": "Packaged Essentials & Sugar", "margin_pct": 18.4, "max_safe_discount_pct": 9.2, "best_deal_price": 68.4, "image": "/media/products/packshots/p96.svg", "thumbnail": "/media/products/packshots/p96.svg", "aliases": ["organic", "jaggery", "powder", "24 mantra"]},
  {"id": 416, "name": "Happilo Almonds", "brand": "Happilo", "unit": "200 g Pouch", "price": 219.0, "regular_price": 245.0, "offer_price": 219.0, "cost_price": 185.0, "stock": 40, "stock_quantity": 40, "category": "Packaged Essentials & Sugar", "category_name": "Packaged Essentials & Sugar", "margin_pct": 15.5, "max_safe_discount_pct": 7.8, "best_deal_price": 197.1, "image": "/media/products/packshots/p97.svg", "thumbnail": "/media/products/packshots/p97.svg", "aliases": ["happilo", "almonds", "happilo"]},
  {"id": 417, "name": "Happilo Cashews", "brand": "Happilo", "unit": "200 g Pouch", "price": 265.0, "regular_price": 295.0, "offer_price": 265.0, "cost_price": 225.0, "stock": 40, "stock_quantity": 40, "category": "Packaged Essentials & Sugar", "category_name": "Packaged Essentials & Sugar", "margin_pct": 15.1, "max_safe_discount_pct": 7.5, "best_deal_price": 238.5, "image": "/media/products/packshots/p98.svg", "thumbnail": "/media/products/packshots/p98.svg", "aliases": ["happilo", "cashews", "happilo"]},
  {"id": 418, "name": "Happilo Kishmish", "brand": "Happilo", "unit": "250 g Pouch", "price": 148.0, "regular_price": 165.0, "offer_price": 148.0, "cost_price": 125.0, "stock": 45, "stock_quantity": 45, "category": "Packaged Essentials & Sugar", "category_name": "Packaged Essentials & Sugar", "margin_pct": 15.5, "max_safe_discount_pct": 7.8, "best_deal_price": 133.2, "image": "/media/products/packshots/p99.svg", "thumbnail": "/media/products/packshots/p99.svg", "aliases": ["happilo", "kishmish", "happilo"]},
  {"id": 419, "name": "Kelloggs Corn Flakes", "brand": "Kelloggs", "unit": "475 g Box", "price": 178.0, "regular_price": 195.0, "offer_price": 178.0, "cost_price": 155.0, "stock": 50, "stock_quantity": 50, "category": "Packaged Essentials & Sugar", "category_name": "Packaged Essentials & Sugar", "margin_pct": 12.9, "max_safe_discount_pct": 6.5, "best_deal_price": 160.2, "image": "/media/products/packshots/p100.svg", "thumbnail": "/media/products/packshots/p100.svg", "aliases": ["kelloggs", "corn", "flakes", "kelloggs"]},
];

const DEMO_ORDERS = [
  {
    id: 'ORD202600005',
    status: 'READY',
    customer: 'Alex Rivera',
    total_amount: 46.80,
    authorized_amount: 54.00,
    captured_amount: 46.80,
    released_amount: 7.20,
    items_count: 3,
    payment_method: 'PAYPAL',
    order_type: 'DELIVERY',
    delivery_address: '142 Market Street, Suite 4',
    created_at: 'Today, 2:30 PM',
    can_settle: true,
    items: [
      { id: 101, name: 'Aashirvaad Shudh Chakki Atta 5kg', quantity: 1, price: 290.00, total: 290.00 },
      { id: 102, name: 'Tata Salt 1kg', quantity: 2, price: 28.00, total: 56.00 },
      { id: 103, name: 'Fortune Sunlite Sunflower Oil 1L', quantity: 1, price: 165.00, total: 165.00 },
    ],
  },
  {
    id: 'ORD202600004',
    status: 'PREPARING',
    customer: 'Priya Sharma',
    total_amount: 32.50,
    authorized_amount: 37.38,
    captured_amount: 0,
    released_amount: 0,
    items_count: 2,
    payment_method: 'WALLET',
    order_type: 'PICKUP',
    delivery_address: 'In-Store Pickup',
    created_at: 'Today, 1:15 PM',
    can_settle: true,
    items: [
      { id: 104, name: 'Amul Butter 500g', quantity: 1, price: 275.00, total: 275.00 },
      { id: 105, name: 'Maggi 2-Minute Noodles 280g', quantity: 2, price: 55.00, total: 110.00 },
    ],
  },
  {
    id: 'ORD202600003',
    status: 'ACCEPTED',
    customer: 'Marcus Vance',
    total_amount: 28.90,
    authorized_amount: 33.24,
    captured_amount: 0,
    released_amount: 0,
    items_count: 2,
    payment_method: 'COD',
    order_type: 'DELIVERY',
    delivery_address: '88 Oak Avenue, Doorstep',
    created_at: 'Yesterday',
    can_settle: true,
    items: [
      { id: 106, name: 'India Gate Basmati Rice 5kg', quantity: 1, price: 420.00, total: 420.00 },
      { id: 107, name: 'Everest Turmeric Powder 200g', quantity: 1, price: 62.00, total: 62.00 },
    ],
  },
  {
    id: 'ORD202600002',
    status: 'NEW',
    customer: 'Elena Rostova',
    total_amount: 50.00,
    authorized_amount: 57.50,
    captured_amount: 0,
    released_amount: 0,
    items_count: 3,
    payment_method: 'PAYPAL',
    order_type: 'DELIVERY',
    delivery_address: '22 Elm St, Flat 3B',
    created_at: 'Yesterday',
    can_settle: true,
    items: [
      { id: 108, name: 'Tata Tea Gold 500g', quantity: 1, price: 310.00, total: 310.00 },
      { id: 109, name: 'Madhur Pure & Hygienic Sugar 1kg', quantity: 2, price: 52.00, total: 104.00 },
    ],
  },
];

const STOP_WORDS = new Set([
  'update', 'change', 'set', 'price', 'stock', 'add', 'buy', 'get', 'put',
  'cart', 'bag', 'basket', 'order', 'find', 'search', 'check', 'best', 'deal',
  'deals', 'for', 'the', 'and', 'with', 'from', 'remove', 'delete', 'create',
  'product', 'products', 'item', 'items', 'units', 'unit', 'off', 'discount',
  'margin', 'margins', 'restock', 'payout', 'via', 'paypal', 'please', 'can',
  'you', 'want', 'need', 'show', 'me', 'how', 'much', 'many', 'what', 'which',
  'who', 'where', 'when', 'is', 'are', 'was', 'were', 'in', 'of', 'to', 'my',
  'our', 'store', 'shop', 'have', 'has', 'do', 'does', 'cost', 'costs',
  'available', 'left', 'about', 'tell', 'give', 'some', 'any', 'all', 'more',
  'most', 'least', 'cheapest', 'expensive', 'highest', 'lowest', 'total',
  'under', 'over', 'above', 'below', 'dollar', 'dollars', 'percent',
  'it', 'that', 'them', 'those', 'this', 'these', 'there', 'here',
  'ready', 'checkout', 'pay', 'paying', 'payment', 'cook', 'cooking',
  'make', 'making', 'prepare', 'preparing', 'tonight', 'today', 'tomorrow',
  'hello', 'hi', 'hey', 'help', 'recipe', 'ingredients', 'requirements',
  'status', 'pending', 'settle', 'settlement', 'settlements', 'pack', 'packing',
  'overview', 'summary', 'analytics', 'sales', 'revenue', 'deliv', 'deliver', 'delivery',
]);

const MODIFIER_WORDS = new Set([
  'organic', 'fresh', 'farm', 'whole', 'california', 'imported', 'creamy',
  'aged', 'pasture', 'raised', 'artisanal', 'bronze', 'cut', 'san', 'marzano',
  'hass', 'greek', 'wheat', 'chakki', 'pack', 'lb', 'oz', 'gal', 'ct',
  'bottle', 'jar', 'box', 'loaf',
]);

function getLiveCatalog() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sk_cache_/products/')) {
          const parsed = JSON.parse(localStorage.getItem(k));
          const list = Array.isArray(parsed?.data?.results)
            ? parsed.data.results
            : Array.isArray(parsed?.data)
            ? parsed.data
            : null;
          if (list && list.length > 0) {
            return list.map((p) => {
              const sell = Number(p.offer_price || p.price || p.regular_price || 4.99);
              const reg = Number(p.regular_price || sell);
              const cost = Number(p.cost_price || (sell * 0.78).toFixed(2));
              const marginPct = sell > 0 ? Number((((sell - cost) / sell) * 100).toFixed(1)) : 20.0;
              const minSafe = Number((cost / 0.88).toFixed(2));
              const maxDisc = sell > 0 ? Math.max(0, Number((((sell - minSafe) / sell) * 100).toFixed(1))) : 10.0;
              const stockQty = Number(p.stock_quantity ?? p.stock ?? 20);
              return {
                id: p.id,
                name: p.name,
                unit: p.unit || '1 unit',
                price: sell,
                regular_price: reg,
                offer_price: sell,
                cost_price: cost,
                stock: stockQty,
                stock_quantity: stockQty,
                category: p.category_name || p.category?.name || (typeof p.category === 'string' ? p.category : 'Groceries'),
                category_name: p.category_name || p.category?.name || 'Groceries',
                margin_pct: marginPct,
                max_safe_discount_pct: maxDisc,
                best_deal_price: minSafe < sell ? minSafe : sell,
                image: p.image || p.primary_image || p.thumbnail || null,
                thumbnail: p.thumbnail || p.image || p.primary_image || null,
                aliases: [],
              };
            });
          }
        }
      }
    } catch {
      // ignore localStorage read errors
    }
  }
  return DEMO_PRODUCTS;
}

function stemWord(w) {
  if (w.endsWith('ies') && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith('oes') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

function matchProductsFromText(text, limit = 6) {
  if (!text) return [];
  const lower = String(text).toLowerCase();
  const qTokens = (lower.match(/[a-z]+/g) || []).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  if (qTokens.length === 0) return [];

  const catalog = getLiveCatalog();
  const scored = [];
  for (const p of catalog) {
    const pLower = p.name.toLowerCase();
    const pTokens = (pLower.match(/[a-z]+/g) || []).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
    const allWords = [...pTokens, ...(p.aliases || [])];
    let score = 0;
    let coreMatched = false;

    if (lower.includes(pLower)) {
      score += 50;
      coreMatched = true;
    }

    for (const qt of qTokens) {
      const qtStem = stemWord(qt);
      let bestTok = 0;
      let tokCore = false;
      for (const pw of allWords) {
        const pwStem = stemWord(pw);
        if (qt === pw || qtStem === pwStem) {
          if (MODIFIER_WORDS.has(pw) && MODIFIER_WORDS.has(qt)) {
            if (bestTok < 3) bestTok = 3;
          } else if (bestTok < 20) {
            bestTok = 20;
            tokCore = true;
          }
        }
      }
      score += bestTok;
      if (tokCore) coreMatched = true;
    }

    if (score > 0) {
      scored.push({ score, coreMatched, prod: p });
    }
  }

  if (scored.length === 0) return [];
  const hasCore = scored.some((s) => s.coreMatched);
  const filtered = hasCore
    ? scored.filter((s) => s.coreMatched)
    : scored.filter((s) => s.score >= 3);

  filtered.sort((a, b) => b.score - a.score || a.prod.id - b.prod.id);
  return filtered.slice(0, limit).map((s) => s.prod);
}

function matchSingleProduct(text) {
  const matches = matchProductsFromText(text, 1);
  return matches[0] || null;
}

function extractItemsWithQuantities(text) {
  if (!text) return [];
  const clauses = String(text)
    .split(/\s*(?:\band\b|,|\bplus\b|\bwith\b|&|\balso\b)\s*/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const extractQty = (segment) => {
    const cleaned = segment.replace(/\$\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:%|lb|lbs|oz|ct|gal|kg|g|pack)\b|\b(?:bag\s+of\s+\d+|ord\d+\w*)\b/gi, '');
    const m = cleaned.match(/\b(\d+)\b/);
    return m ? Math.max(1, Math.min(Number(m[1]), 99)) : 1;
  };

  const map = new Map();
  for (const clause of clauses) {
    const prod = matchSingleProduct(clause);
    if (prod) {
      const qty = extractQty(clause);
      if (map.has(prod.id)) {
        map.get(prod.id).qty += qty;
      } else {
        map.set(prod.id, { prod, qty });
      }
    }
  }

  if (map.size === 0) {
    const single = matchSingleProduct(text);
    if (single) return [{ prod: single, qty: extractQty(text) }];
    return [];
  }
  return Array.from(map.values());
}

function normalizeVoiceTranscript(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let out = rawText.trim();
  if (!out) return '';

  const wordToNum = [
    [/\btwenty[\s-]+five\b/gi, '25'],
    [/\btwenty[\s-]+four\b/gi, '24'],
    [/\btwenty[\s-]+three\b/gi, '23'],
    [/\btwenty[\s-]+two\b/gi, '22'],
    [/\btwenty[\s-]+one\b/gi, '21'],
    [/\btwenty\b/gi, '20'],
    [/\bnineteen\b/gi, '19'],
    [/\beighteen\b/gi, '18'],
    [/\bseventeen\b/gi, '17'],
    [/\bsixteen\b/gi, '16'],
    [/\bfifteen\b/gi, '15'],
    [/\bfourteen\b/gi, '14'],
    [/\bthirteen\b/gi, '13'],
    [/\btwelve\b/gi, '12'],
    [/\beleven\b/gi, '11'],
    [/\bten\b/gi, '10'],
    [/\bnine\b/gi, '9'],
    [/\beight\b/gi, '8'],
    [/\bseven\b/gi, '7'],
    [/\bsix\b/gi, '6'],
    [/\bfive\b/gi, '5'],
    [/\bfour\b/gi, '4'],
    [/\bthree\b/gi, '3'],
    [/\btwo\b/gi, '2'],
    [/\bone\b/gi, '1'],
    [/\bthirty\b/gi, '30'],
    [/\bforty\b/gi, '40'],
    [/\bfifty\b/gi, '50'],
    [/\bhundred\b/gi, '100'],
  ];
  for (const [re, digit] of wordToNum) {
    out = out.replace(re, digit);
  }

  // Guard payment cards (credit card, debit card, etc.)
  const PROTECTED_CARDS = [
    [/\b(credit|debit|gift|id|pan|aadhaar|aadhar|sim|atm|bank|loyalty|scratch)\s+card\b/gi, '##$1_CARD##'],
    [/\bcard\s+(number|pin|cvv|expiry|holder|details|statement)\b/gi, '##CARD_$1##'],
  ];
  for (const [re, token] of PROTECTED_CARDS) {
    out = out.replace(re, token);
  }

  // CART Phonetic Normalization (card, part, car, court, cot, caught, kart, etc.)
  out = out.replace(/\b(?:kart|caart|kaart|kaat|kurt)\b/gi, 'cart');
  out = out.replace(/\b(to|into|in|from|my|the|this|that|view|show|open|check|clear|empty|clean|reset|see)\s+card\b/gi, '$1 cart');
  out = out.replace(/\bcard\s+(total|items?|summary|contents?|value|status|count)\b/gi, 'cart $1');
  if (/^\s*(?:my\s+|the\s+)?card\s*$/i.test(out)) {
    out = out.replace(/\bcard\b/gi, 'cart');
  }
  out = out.replace(/\b(add\b.*?\bto)\s+card\b/gi, '$1 cart');
  out = out.replace(/\b(put\b.*?\b(?:in|into))\s+card\b/gi, '$1 cart');

  // "part" slips
  out = out.replace(/\b(to|into|in|from|my|the|view|show|open|check|clear|empty)\s+(?:the\s+)?part\b/gi, '$1 cart');
  out = out.replace(/\bpart\s+(total|items?|summary|contents?)\b/gi, 'cart $1');
  out = out.replace(/\b(add\b.*?\b(?:to|into|in))\s+(?:the\s+)?part\b/gi, '$1 cart');

  // "car" / "court" / "cot" / "caught" / "chart" slips
  out = out.replace(/\b(to|into|in|from|view|show|open|check|clear|empty)\s+(?:the\s+|my\s+)?(?:car|court|cot|caught|chart)\b/gi, '$1 cart');
  out = out.replace(/\b(?:car|court|cot|caught|chart)\s+(total|items?|summary|contents?)\b/gi, 'cart $1');
  out = out.replace(/\b(add\b.*?\b(?:to|into|in))\s+(?:the\s+|my\s+)?(?:car|court|cot|caught|chart)\b/gi, '$1 cart');
  if (/^\s*(?:my\s+|the\s+)?(?:car|court|cot|kart)\s*$/i.test(out)) {
    out = out.replace(/\b(?:car|court|cot|kart)\b/gi, 'cart');
  }

  // Restore protected payment card tokens
  out = out.replace(/##([a-z0-9]+)_CARD##/gi, '$1 card');
  out = out.replace(/##CARD_([a-z0-9]+)##/gi, 'card $1');

  // Command slips
  const actionSlips = [
    [/\b(?:check[\s-]*out|cheqout|chekout|chikout|check\s+aut)\b/gi, 'checkout'],
    [/\b(?:setal|satel|settel|sattle)\b/gi, 'settle'],
    [/\b(?:kansal|cansel|cancle)\b/gi, 'cancel'],
    [/\b(?:auder|ordo|odder)\b/gi, 'order'],
    [/\b(?:re[\s-]*order|riorder)\b/gi, 'reorder'],
    [/\b(?:restok|re[\s-]+stock)\b/gi, 'restock'],
    [/\b(?:cheepar|chipper|cheper)\b/gi, 'cheaper'],
    [/\b(?:fayvorit|fevret|favourite|favourit)\b/gi, 'favorite'],
    [/\b(?:fayvorits|fevrets|favourites|favourits)\b/gi, 'favorites'],
    [/\b(?:remuv|remov|rimuv)\b/gi, 'remove'],
    [/\b(?:dilit|delet)\b/gi, 'delete'],
    [/\b(?:discont|discound|discout)\b/gi, 'discount'],
  ];
  for (const [re, replacement] of actionSlips) {
    out = out.replace(re, replacement);
  }

  // Product phonetic slips
  const productSlips = [
    [/\b(?:straberry|strawbery|straberries|stoberry)\b/gi, 'strawberries'],
    [/\b(?:avacado|avacados|abocado|avocadoes)\b/gi, 'avocados'],
    [/\b(?:yoghurt|yogart|yougurt)\b/gi, 'yogurt'],
    [/\b(?:paasta)\b/gi, 'pasta'],
    [/\b(?:marinera)\b/gi, 'marinara'],
    [/\b(?:grosary|groceris|grossary|grosery)\b/gi, 'groceries'],
    [/\b(?:produs|prodice)\b/gi, 'produce'],
    [/\b(?:dary|dayry|deri)\b/gi, 'dairy'],
    [/\b(?:bekari|bekary)\b/gi, 'bakery'],
    [/\b(?:milkk|melk)\b/gi, 'milk'],
    [/\b(?:bred|braed)\b/gi, 'bread'],
    [/\b(?:cold\s+drinks?|soft\s+drinks?)\b/gi, 'colddrink'],
    [/\b(?:aashirvaad|ashirwaad|aashirwad)\b/gi, 'ashirvad'],
    [/\b(?:thums\s+up|thumbs\s+up)\b/gi, 'thumpsup'],
    [/\b(?:ice[\s-]+cream|icecream)\b/gi, 'ice cream'],
  ];
  for (const [re, replacement] of productSlips) {
    out = out.replace(re, replacement);
  }

  // Kirana vernacular & Hinglish
  const vernacularMap = [
    [/\b(?:doodh|dudh|dhudh|dood)\b/gi, 'milk'],
    [/\b(?:ande|anday|anda)\b/gi, 'eggs'],
    [/\b(?:chawal|chaaval|chaval)\b/gi, 'rice'],
    [/\b(?:aata|ata)\b/gi, 'atta'],
    [/\b(?:cheeni|chini|shakkar)\b/gi, 'sugar'],
    [/\b(?:tamatar|tamator|tamater)\b/gi, 'tomato'],
    [/\b(?:pyaaz|pyaz|kanda|piyaz)\b/gi, 'onion'],
    [/\b(?:aalu|alu|batata)\b/gi, 'potato'],
    [/\b(?:panir|panner|paner)\b/gi, 'paneer'],
    [/\b(?:biriyani|briyani|birani)\b/gi, 'biryani'],
    [/\b(?:chaai|chay)\b/gi, 'chai'],
    [/\b(?:dahi)\b/gi, 'yogurt'],
    [/\b(?:sasta|kam\s+(?:price|dam))\b/gi, 'cheaper'],
    [/\b(?:hatao|nikalo)\b/gi, 'remove'],
    [/\b(?:khali\s+karo|saaf\s+karo)\b/gi, 'clear cart'],
    [/\b(?:total\s+kitna(?:\s+hua)?|kitna\s+hua|kitne\s+paise\s+hue|bill\s+kitna(?:\s+hua)?|kitna\s+bill)\b/gi, 'cart total'],
  ];
  for (const [re, replacement] of vernacularMap) {
    out = out.replace(re, replacement);
  }

  out = out.replace(/(\d+(?:\.\d+)?)\s*(?:percent|per\s+cent)\b/gi, '$1%');
  out = out.replace(/\b(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?|usd)\b/gi, '$$$1');
  return out;
}

function serializeCardItem(prod, quantity = 1, customPrice = null) {
  const finalPrice = customPrice !== null ? Number(customPrice) : prod.price;
  return {
    id: prod.id,
    name: prod.name,
    price: finalPrice,
    regular_price: prod.regular_price || prod.price,
    offer_price: finalPrice,
    best_deal_price: prod.best_deal_price || finalPrice,
    max_safe_discount_pct: prod.max_safe_discount_pct || 10,
    unit: prod.unit || '1 unit',
    quantity,
    stock: prod.stock_quantity,
    stock_quantity: prod.stock_quantity,
    category: prod.category || prod.category_name || 'Groceries',
    image: prod.image || null,
    thumbnail: prod.thumbnail || prod.image || null,
  };
}

function matchCustomerUser(candStr) {
  if (!candStr) return null;
  let raw = candStr.trim();
  raw = raw.replace(/^[?!.,'"<>()]+|[?!.,'"<>()]+$/g, '').trim();
  if (!raw || raw.length < 2) return null;

  const systemNames = new Set(['owner', 'test_owner', 'shopper', 'test_shopper', 'admin', 'root']);
  if (systemNames.has(raw.toLowerCase())) return null;

  if (raw.includes('@')) {
    const lowerRaw = raw.toLowerCase();
    if (lowerRaw.includes('saisatyanarayana2004@gmail.com') || lowerRaw.includes('saisai97574@gmail.com')) {
      return { name: 'K Sai Satyanarayana', email: 'saisatyanarayana2004@gmail.com', isSai: true };
    }
    if (lowerRaw.includes('rahul@')) {
      return { name: 'Rahul Sharma', email: 'rahul@cartsettle.shop', isSai: false, ordersCount: 0 };
    }
    if (lowerRaw.includes('priya@')) {
      return { name: 'Priya Sharma', email: 'priya@example.com', isSai: false, ordersCount: 2 };
    }
    if (lowerRaw.includes('perali.narendra@gmail.com')) {
      return { name: 'Kothamasu Narendra', email: 'perali.narendra@gmail.com', isSai: false };
    }
  }

  let clean = raw.toLowerCase();
  clean = clean.replace(/^(?:the|a|an)\s+/i, '').replace(/[?!.,'"]+/g, '').trim();
  clean = clean.replace(/\b(?:customer|user|shopper|profile|details?|info|dossier|account)\b/gi, '').trim();
  clean = clean.replace(/[-_]+/g, ' ');
  clean = clean.replace(/\s+/g, ' ');
  if (!clean || clean.length < 2) return null;
  if (systemNames.has(clean)) return null;

  const nonPerson = new Set([
    'what', 'about', 'the', 'product', 'products', 'item', 'items', 'cart',
    'orders', 'order', 'bread', 'milk', 'oil', 'soap', 'tea', 'coffee',
    'egg', 'eggs', 'atta', 'flour', 'rice', 'dal', 'salt', 'sugar', 'ghee',
    'noodles', 'maggi', 'pasta', 'butter', 'cheese', 'paneer', 'cleaner',
    'whole wheat bread', 'fresh milk', 'fortune sunflower oil', 'delivery', 'policy', 'refund',
    'art', 'com', 'store', 'shop', 'gmail', 'test'
  ]);
  if (nonPerson.has(clean)) return null;

  // Catalog collision guard
  if (DEMO_PRODUCTS.some((p) => p.name.toLowerCase() === clean)) {
    return null;
  }

  // Strip honorifics for matching
  const noHonorific = clean.replace(/^(?:mr|mrs|ms|dr|prof|shri|sri)\.?\s+/i, '').trim();
  const searchTerms = [clean];
  if (noHonorific && noHonorific !== clean && noHonorific.length >= 2) {
    searchTerms.push(noHonorific);
  }

  for (const term of searchTerms) {
    if (term.includes('sai') || term.includes('satyanarayana')) {
      return { name: 'K Sai Satyanarayana', email: 'saisatyanarayana2004@gmail.com', isSai: true };
    }
    if (term.includes('rahul')) {
      return { name: 'Rahul Sharma', email: 'rahul@cartsettle.shop', isSai: false, ordersCount: 0 };
    }
    if (term.includes('priya')) {
      return { name: 'Priya Sharma', email: 'priya@example.com', isSai: false, ordersCount: 2 };
    }
    if (term.includes('testcustomer') || term.includes('test customer')) {
      return { name: 'Test Customer', email: 'test@example.com', isSai: false };
    }
    if (term.includes('narendra')) {
      return { name: 'Kothamasu Narendra', email: 'perali.narendra@gmail.com', isSai: false };
    }
    if (term.includes('vikram')) {
      return { name: 'Vikram Singh', email: 'dummy140@test.com', isSai: false };
    }
    if (term.includes('raju')) {
      return { name: 'Raju Bhai', email: 'dummy286@test.com', isSai: false };
    }

    const orderMatch = DEMO_ORDERS.find((o) => (o.customer || '').toLowerCase().includes(term));
    if (orderMatch) {
      return { name: orderMatch.customer, email: `${orderMatch.customer.toLowerCase().replace(/\s+/g, '')}@example.com`, isSai: false };
    }
  }

  return null;
}

export function handleLovableAgentFallback(config) {
  const method = (config.method || 'get').toLowerCase();
  let body = {};
  try {
    body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
  } catch {
    body = {};
  }

  let urlParams = {};
  if (config.url && config.url.includes('?')) {
    try {
      const qs = config.url.split('?')[1];
      urlParams = Object.fromEntries(new URLSearchParams(qs).entries());
    } catch {}
  }

  const params = config.params || {};
  const isOwnerRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/owner');
  const portalHeader = config.headers?.['X-Portal-Context'];
  const defaultPersona = (portalHeader === 'owner' || isOwnerRoute) ? 'owner' : 'shopper';

  const sessionId = body.session_id || params.session_id || urlParams.session_id || (defaultPersona === 'owner' ? 'owner_copilot_session' : 'shopper_session');
  const persona = String(body.persona || body.role || params.persona || params.role || urlParams.persona || urlParams.role || defaultPersona).toLowerCase();
  const mode = String(body.mode || params.mode || urlParams.mode || 'chat').toLowerCase();
  const key = `${persona}:${sessionId}`;

  if (!SESSION_STORE[key]) {
    SESSION_STORE[key] = { session_id: sessionId, persona, messages: [], last_order_id: 'ORD202600005', last_product: null };
  }

  if (method === 'delete') {
    SESSION_STORE[key] = { session_id: sessionId, persona, messages: [], last_order_id: null, last_product: null };
    return { status: 'cleared', messages: [] };
  }

  if (method === 'get') {
    return SESSION_STORE[key];
  }

  const rawPrompt = String(body.prompt || body.message || '').trim();
  let prompt = normalizeVoiceTranscript(rawPrompt);
  const mem = SESSION_STORE[key];

  // Contextual Pronoun Resolution ('it', 'that', 'them', 'those')
  const lowerRaw = prompt.toLowerCase();
  const isBulkOrClearPhrase =
    /\b(clear|empty|all|everything|both|these|suggested)\b/i.test(lowerRaw) ||
    lowerRaw.includes('cart items') ||
    lowerRaw.includes('items from cart');
  if (
    mem.last_order_id &&
    [
      'that order', 'this order', 'settle it', 'audit it', 'capture it', 'the order', 'my order',
      'why', 'rejected', 'reject', 'cancel', 'cancelled', 'status', 'reason', 'details', 'explain',
      'what happened', 'how come'
    ].some((w) => lowerRaw.includes(w))
  ) {
    if (!/\bord\d+\w*\b/i.test(lowerRaw)) {
      prompt = `${prompt} (${mem.last_order_id})`;
    }
  } else if (
    mem.last_product &&
    !isBulkOrClearPhrase &&
    !matchSingleProduct(prompt) &&
    !['i want you', 'who are you', 'what are you', 'how are you', 'who r u', 'tell me about', 'what can you do', 'i need you', 'i want to'].some((p) => lowerRaw.includes(p))
  ) {
    if (/\b(it|that|this item|that item|more)\b/i.test(lowerRaw) || ['% off', 'discount', 'in stock', 'how much'].some((w) => lowerRaw.includes(w))) {
      prompt = `${prompt} (${mem.last_product})`;
    }
  }

  const lower = prompt.toLowerCase().replace(/\s+/g, ' ').trim();

  // --- A. MALICIOUS ATTACK GUARDRAIL (< 5ms) ---
  const MALICIOUS_REGEX = /\b(?:hack|exploit|malware|virus|phishing|bypass access|ddos|cyberattack|illegal contraband)\b/i;
  if (MALICIOUS_REGEX.test(lower)) {
    const refusal = "I cannot assist with requests involving exploits, cyberattacks, or harmful activities. How can I help with your store operations or grocery shopping?";
    return {
      reply: refusal,
      voice_reply: refusal,
      mode: 'chat',
      actions: [],
      tools_used: [{ name: 'security_guardrail', args: { restricted: true } }],
      follow_ups: persona === 'owner'
        ? ['Audit pending orders', 'Inspect low stock items', 'Review today sales']
        : ['Explore categories', 'Show fresh dairy products', 'What is your return policy?'],
      latency_ms: 5,
    };
  }

  // --- A1. DYNAMIC COMPOSITE ACTION CARD ENGINE ---
  const isDynamicCardRequest =
    /\b(?:dynamic\s+card|overview\s+card|summary\s+card|dashboard\s+card|scorecard|kpi\s+card|render\s+card|show\s+card|analytics\s+card)\b/i.test(lower) ||
    (lower.includes("card") && ["overview", "summary", "dashboard", "metrics", "kpi", "status", "performance"].some((w) => lower.includes(w)));
  if (isDynamicCardRequest) {
    const dynamicAction = persona === "owner" ? {
      type: "DYNAMIC_COMPOSITE_CARD",
      title: "Store Operations Command Center",
      subtitle: "Real-time Kirana metrics across orders and inventory",
      badge: "LIVE OPERATIONS",
      kpis: [
        { label: "Active Orders", value: "26", trend: "+12.4%", positive: true },
        { label: "Settled Volume", value: "₹3,679.30", trend: "Live", positive: true },
        { label: "Stock Health", value: "98.2%", trend: "Optimal", positive: true }
      ],
      progress_bars: [
        { label: "Packing Fulfillment", current: 22, max: 26, unit: "Orders" },
        { label: "Target Profit Margin", current: 14.8, max: 15.0, unit: "%" }
      ],
      key_values: [
        { key: "PayPal Settlement Mode", value: "Instant Dynamic Capture" },
        { key: "Store Radius Coverage", value: "8.0 Miles Express" },
        { key: "Pending Dispatch", value: "4 Orders Ready" }
      ],
      actions: [
        { label: "Audit Pending Orders", payload: "audit pending orders", variant: "default" },
        { label: "Review Today Sales", payload: "review today sales", variant: "outline" },
        { label: "Inspect Low Stock", payload: "show low stock items", variant: "outline" }
      ]
    } : {
      type: "DYNAMIC_COMPOSITE_CARD",
      title: "Smart Grocery Overview",
      subtitle: "Personalized deals, pantry essentials, and express delivery",
      badge: "SHOPPER DASHBOARD",
      kpis: [
        { label: "Express Delivery", value: "15-25m", trend: "Active", positive: true },
        { label: "Deals Unlocked", value: "12 Items", trend: "Up to 15% off", positive: true },
        { label: "Store Wallet", value: "₹450.00", trend: "100% Usable", positive: true }
      ],
      progress_bars: [
        { label: "Free Express Delivery", current: 360, max: 500, unit: "₹" }
      ],
      key_values: [
        { key: "Primary Store", value: "Narendra Kirana Store" },
        { key: "Operating Hours", value: "8:00 AM – 10:00 PM Daily" },
        { key: "Return Policy", value: "24h instant replacement or credit" }
      ],
      actions: [
        { label: "Explore Fresh Dairy", payload: "show Dairy & Eggs", variant: "default" },
        { label: "Browse Top Deals", payload: "show deals", variant: "outline" },
        { label: "View My Cart", payload: "view cart", variant: "outline" }
      ]
    };

    const reply = persona === "owner"
      ? "Here is your live Store Operations Command Center card with active order metrics, fulfillment progress, and quick action shortcuts."
      : "Here is your Smart Grocery Overview card with express delivery status, active deals, and store shortcuts.";

    return {
      reply,
      voice_reply: reply,
      mode,
      actions: [dynamicAction],
      tools_used: [{ name: "render_dynamic_card", args: { title: dynamicAction.title } }],
      follow_ups: persona === "owner"
        ? ["Audit pending orders", "Inspect low stock items", "Review today sales"]
        : ["Show Dairy & Eggs", "Recommend a recipe kit", "View cart"],
      latency_ms: 10
    };
  }

  // --- A2. GENERAL TECHNICAL & OPEN-ENDED INTELLIGENCE IN FALLBACK ---
  if (/\b(?:python|javascript|typescript|django|react|fibonacci|algorithm|b-tree|rest api|docker|sql)\b/i.test(lower)) {
    let techReply = "Technical guidance: Maintain modular design, strict typing, automated test coverage, and idempotent operations.";
    if (lower.includes("fibonacci")) {
      techReply = "Here is a clean Python implementation:\n\ndef fibonacci(n: int) -> int:\n    if n <= 0: return 0\n    elif n == 1: return 1\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b";
    } else if (lower.includes("b-tree") || lower.includes("index")) {
      techReply = "A B-Tree index maintains balanced sorted keys, reducing lookup complexity from O(N) full-table scans to O(log N) block traversals.";
    } else if (lower.includes("rest api")) {
      techReply = "REST APIs use standard HTTP verbs (GET, POST, PUT, DELETE) on stateless resource URIs with JSON payloads.";
    }
    return {
      reply: techReply,
      voice_reply: techReply,
      mode: 'chat',
      actions: [],
      tools_used: [{ name: 'technical_guidance', args: { topic: lower } }],
      follow_ups: ['How does database indexing work?', 'Show fresh dairy products', 'What is your return policy?'],
      latency_ms: 15,
    };
  }

  // --- B. STORE POLICIES (Returns, Delivery, Refunds, Timings) ---
  if (/\b(?:return policy|refund policy|delivery policy|exchange policy|shipping policy|how to return|how do returns work|can i return|returns)\b/i.test(lower)) {
    return {
      reply: "We offer hassle-free returns within 24 hours of delivery for packaged items with original seal intact. Perishable items (fresh dairy, fresh bakery, produce) can be reported immediately upon delivery for an instant replacement or store wallet credit.",
      voice_reply: "Returns are accepted within 24 hours for packaged goods, and instant store credit is provided for perishable items.",
      mode: 'chat',
      actions: [],
      tools_used: [{ name: 'get_store_policy', args: { policy: 'returns_and_refunds' } }],
      follow_ups: ['How does delivery work?', 'What payment methods do you accept?', 'Browse dairy products'],
      latency_ms: 12,
    };
  }
  if (/\b(?:delivery timing|delivery time|delivery hours|operating hours|when do you deliver|shipping time|delivery schedule)\b/i.test(lower)) {
    return {
      reply: "Standard delivery runs daily from 7:00 AM to 10:00 PM. Instant 30-minute delivery is available for orders within our active 8-mile delivery radius. Store pickup is free at our retail counter.",
      voice_reply: "We deliver daily between 7 AM and 10 PM with 30-minute express service available.",
      mode: 'chat',
      actions: [],
      tools_used: [{ name: 'get_store_policy', args: { policy: 'delivery_timings' } }],
      follow_ups: ['What is the delivery fee?', 'Show popular products', 'View cart'],
      latency_ms: 12,
    };
  }

  // --- B0. CONVERSATIONAL ASSISTANT IDENTITY & PERSONAL PHRASING FAST-PATH ---
  if (
    /\b(?:i\s+want\s+you|i\s+need\s+you|i\s+like\s+you|i\s+love\s+you|who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|what\s+do\s+you\s+do|how\s+can\s+you\s+help|tell\s+me\s+about\s+you|tell\s+about\s+yourself|who\s+r\s+u)\b/i.test(lower)
  ) {
    const reply = persona === 'owner'
      ? "I am CartSettle AI, your kirana store operations copilot. I can audit orders, settle payments, track inventory, credit customer wallets, and review sales analytics. How can I assist with store management today?"
      : "I am CartSettle AI, your kirana grocery assistant! I can help you find products, check prices, recommend recipes, and manage your cart. What groceries can I help you find today?";
    return {
      reply,
      voice_reply: reply,
      mode: 'chat',
      actions: [],
      tools_used: [{ name: 'assistant_identity_info', args: { persona } }],
      follow_ups: persona === 'owner'
        ? ['Audit pending orders', 'Inspect low stock items', 'Review today sales']
        : ['Show Dairy & Eggs', 'Recommend a recipe kit', 'What is your delivery policy?'],
      latency_ms: 8,
    };
  }

  // --- B1. OPERATIONS PULSE & EXECUTIVE STORE HEALTH FAST-PATH ---
  if (/(?:how\s+is\s+the\s+store\s+doing|operations?\s+pulse|system\s+status|health\s+check|store\s+health|how\s+are\s+sales\s+today|store\s+summary|operations?\s+summary|kpi\s+overview|kpis|operations?\s+dashboard)/i.test(lower)) {
    if (persona === 'owner') {
      return {
        reply: 'Store health nominal: 26 total orders, 4 pending packing, 100/100 products in stock.',
        voice_reply: 'Store health nominal with 26 orders and full stock readiness.',
        mode: 'chat',
        actions: [
          {
            type: 'DYNAMIC_COMPOSITE_CARD',
            title: 'Operations Pulse',
            subtitle: 'Real-time Kirana metrics across orders and inventory',
            badge: 'HEALTH NOMINAL',
            kpis: [
              { label: 'Active Orders', value: '26', trend: 'Live', positive: true },
              { label: 'Pending Packing', value: '4', trend: 'Normal', positive: true },
              { label: 'Catalog In-Stock', value: '100/100', trend: '100%', positive: true },
            ],
            progress_bars: [
              { label: 'Catalog Stock Readiness', current: 100, max: 100, unit: 'items' },
            ],
            key_values: [
              { key: 'Catalog Health', value: '100 products active across 12 categories' },
              { key: 'Pending Fulfillment', value: '4 orders waiting to be packed' },
            ],
            actions: [
              { label: 'Audit Pending Orders', action_type: 'send', payload: 'Show pending orders' },
              { label: 'Inspect Low Stock', action_type: 'send', payload: 'Inspect low stock items' },
            ],
          },
        ],
        tools_used: [{ name: 'get_operations_pulse', args: {} }],
        follow_ups: ['Show pending orders', 'Inspect low stock items', 'Review today sales'],
        latency_ms: 10,
      };
    } else {
      return {
        reply: 'CartSettle is open and fully operational! We have 100 live products active across 12 categories. What groceries can I help you find today?',
        voice_reply: 'CartSettle is open and operational with 100 products in stock.',
        mode: 'chat',
        actions: [],
        tools_used: [{ name: 'store_status_info', args: {} }],
        follow_ups: ['Explore categories', 'Show popular products', 'What is your delivery policy?'],
        latency_ms: 10,
      };
    }
  }

  // --- B2. CATEGORIES & CATEGORY-FILTERED PRODUCTS FAST-PATH ---
  const isPulseOp = ['operations', 'system', 'health', 'check', 'summary', 'pulse'].filter((w) => lower.includes(w)).length >= 2;
  const categoryMap = [
    { keywords: ['dairy', 'diary', 'egg', 'eggs', 'milk', 'cheese', 'dahi', 'yogurt'], name: 'Dairy & Eggs' },
    { keywords: ['atta', 'flour', 'flours', 'grain', 'grains', 'sooji', 'maida', 'wheat', 'besan'], name: 'Atta, Flours & Grains' },
    { keywords: ['rice', 'pulses', 'dal', 'dhal', 'daal', 'basmati', 'moong', 'toor', 'chana', ...(isPulseOp ? [] : ['pulse'])], name: 'Rice & Pulses' },
    { keywords: ['edible oil', 'edible oils', 'cooking oil', 'oil', 'oils', 'ghee'], name: 'Edible Oils & Ghee' },
    { keywords: ['instant food', 'instant foods', 'noodle', 'noodles', 'pasta', 'instant mix'], name: 'Instant Food & Noodles' },
    { keywords: ['snack', 'snacks', 'biscuit', 'biscuits', 'namkeen', 'cookie', 'cookies', 'chips', 'bhujia'], name: 'Snacks, Biscuits & Namkeen' },
    { keywords: ['beverage', 'beverages', 'tea', 'coffee', 'drink', 'drinks', 'colddrink', 'soda', 'juice'], name: 'Beverages, Tea & Coffee' },
    { keywords: ['spice', 'spices', 'seasoning', 'seasonings', 'masala'], name: 'Spices & Seasonings' },
    { keywords: ['chocolate', 'chocolates', 'honey', 'spread', 'spreads', 'jam'], name: 'Chocolates, Honey & Spreads' },
    { keywords: ['household', 'cleaning', 'detergent', 'soap', 'harpic', 'surf', 'vim', 'dishwash'], name: 'Household & Cleaning' },
    { keywords: ['personal care', 'hygiene', 'shampoo', 'toothpaste', 'colgate', 'dettol', 'dove', 'skin care'], name: 'Personal Care & Hygiene' },
    { keywords: ['packaged essentials', 'sugar', 'jaggery'], name: 'Packaged Essentials & Sugar' },
  ];

  let matchedCatTarget = null;
  for (const { keywords, name } of categoryMap) {
    for (const kw of keywords) {
      const rx = new RegExp(`\\b${kw}\\b`, 'i');
      if (rx.test(lower)) {
        matchedCatTarget = name;
        break;
      }
    }
    if (matchedCatTarget) break;
  }

  const hasSpecificCategory = Boolean(matchedCatTarget);

  const isCategoryInquiry = (
    (
      /\b(?:how many categories|how many category|list categories|show categories|all categories|what categories|store categories|catalog categories|remaining category|remaining categories|other category|other categories|what about the remaining|what about the other|rest of the categories|more categories)\b/i.test(lower) ||
      ((lower.includes('category') || lower.includes('categories')) && ['what', 'which', 'list', 'show', 'count', 'how many', 'all', 'remaining', 'other', 'more'].some((w) => lower.includes(w)))
    ) &&
    !hasSpecificCategory &&
    !['create', 'delete', 'remove', 'add category', 'discount', 'increase', 'reduce', 'price', 'stock', 'item', 'items', 'product', 'products', 'belong'].some((w) => lower.includes(w))
  );

  if (isCategoryInquiry) {
    const allCategories = [
      { name: 'Dairy & Eggs', product_count: 8 },
      { name: 'Atta, Flours & Grains', product_count: 8 },
      { name: 'Rice & Pulses', product_count: 9 },
      { name: 'Edible Oils & Ghee', product_count: 8 },
      { name: 'Instant Food & Noodles', product_count: 9 },
      { name: 'Snacks, Biscuits & Namkeen', product_count: 9 },
      { name: 'Beverages, Tea & Coffee', product_count: 8 },
      { name: 'Spices & Seasonings', product_count: 9 },
      { name: 'Chocolates, Honey & Spreads', product_count: 8 },
      { name: 'Household & Cleaning', product_count: 8 },
      { name: 'Personal Care & Hygiene', product_count: 8 },
      { name: 'Packaged Essentials & Sugar', product_count: 8 },
    ];
    const catSummary = allCategories.map((c) => `${c.name} (${c.product_count})`).join(', ');
    const isRemaining = ['remaining', 'other', 'rest'].some((k) => lower.includes(k));
    const reply = isRemaining
      ? `All 12 store categories are active with 100 products: ${catSummary}.`
      : `We have 12 active catalog categories with 100 live products: ${catSummary}.`;
    return {
      reply,
      voice_reply: "12 active categories with 100 products across the store.",
      mode: 'chat',
      actions: [{
        type: 'CATEGORIES_CARD',
        total_categories: 12,
        categories: allCategories,
      }],
      tools_used: [{ name: 'list_categories', args: { count: 12 } }],
      follow_ups: ['Explore Dairy & Eggs', 'Explore Instant Food & Noodles', 'Check stock'],
      latency_ms: 10,
    };
  }

  const isCategoryProductQuery = (
    hasSpecificCategory &&
    !['how many', 'count', 'cheapest', 'lowest price', 'margin', 'highest margin', 'lowest margin', 'create', 'delete', 'remove', 'discount', 'increase', 'reduce', 'raise', 'cut', 'mark down', 'replenish', 'restock', 'payout', 'price of'].some((w) => lower.includes(w)) &&
    !((lower.includes('in stock') || lower.includes('available')) && ['is ', 'are ', 'stock of '].some((w) => lower.includes(w)) && !['category', 'belong', 'under', 'items', 'products'].some((w) => lower.includes(w)))
  );

  if (isCategoryProductQuery && matchedCatTarget) {
    const catalog = getLiveCatalog().filter((p) => (p.stock_quantity ?? p.stock ?? 1) > 0);
    const catKw = matchedCatTarget.toLowerCase().split(/[&, ]+/).filter((w) => w.length > 2);
    let matchedProds = catalog.filter((p) => {
      const pCat = (p.category || p.category_name || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      return catKw.some((kw) => pCat.includes(kw) || pName.includes(kw));
    });
    if (matchedProds.length === 0) {
      matchedProds = catalog.slice(0, 6);
    }
    const cards = matchedProds.slice(0, 8).map((p) => serializeCardItem(p, 1));
    const topNames = cards.slice(0, 3).map((c) => `${c.name} (₹${Number(c.price).toFixed(2)})`).join(', ');
    const reply = `Found ${cards.length} matching items in ${matchedCatTarget}: ${topNames}.`;
    return {
      reply,
      voice_reply: `Found ${cards.length} items in ${matchedCatTarget}.`,
      mode: 'chat',
      actions: [{ type: 'SEARCH_RESULTS', items: cards, query: matchedCatTarget }],
      tools_used: [{ name: 'filter_catalog_advanced', args: { category: matchedCatTarget } }],
      follow_ups: [`Add ${cards[0]?.name || 'item'} to cart`, 'Browse more categories', 'View cart'],
      latency_ms: 10,
    };
  }

  // --- C. CATALOG BROWSING & SHOW PRODUCTS FAST-PATH ---
  const isCatalogBrowse = (
    (
      /\b(?:what products|show products|show all products|what do you sell|what's in store|what is in store|browse catalog|browse store|store catalog|show items|show me products|list products|see products|available products|view products)\b/i.test(lower) ||
      lower === 'products' || lower === 'catalog' || lower === 'items'
    ) && !hasSpecificCategory && !['category', 'categories', 'belong', 'in', 'from', 'for'].some((k) => lower.includes(k))
  );
  if (isCatalogBrowse) {
    const catalog = getLiveCatalog().filter((p) => (p.stock_quantity ?? p.stock ?? 1) > 0);
    const topItems = catalog.slice(0, 6).map((p) => serializeCardItem(p, 1));
    const reply = persona === 'owner'
      ? `${catalog.length} live products active across categories in store catalog.`
      : "Here are featured in-stock items from our store catalog. Tap + to add directly to your cart:";
    const actions = persona === 'owner'
      ? [{
          type: 'CATALOG_SUMMARY',
          total: catalog.length,
          in_stock: catalog.length,
          categories: 12,
          items: topItems,
        }]
      : [{
          type: 'SEARCH_RESULTS',
          items: topItems,
          query: 'catalog',
        }];
    return {
      reply,
      voice_reply: persona === 'owner'
        ? `${catalog.length} products active in store catalog.`
        : "Here are popular products from our catalog. You can tap plus to add them to your cart.",
      mode: 'chat',
      actions,
      tools_used: [{ name: 'search_products_and_stock', args: { query: 'all' } }],
      follow_ups: persona === 'owner'
        ? ['Audit pending orders', 'Inspect low stock items', 'Review today sales']
        : ['Show Dairy & Eggs', 'Show Snacks & Munchies', 'What is your return policy?'],
      latency_ms: 15,
    };
  }

  // --- D. CUSTOMER-FILTERED OR STATUS-FILTERED ORDERS & DOSSIER FAST-PATH ---
  let targetCustQ = null;
  let matchedUser = null;
  let isOrderQuery = false;
  const orderStopwords = ['recent', 'latest', 'last', 'newest', 'pending', 'cancelled', 'canceled', 'rejected', 'my', 'all', 'total', 'past', 'store', 'today', 'yesterday', 'delivered', 'show', 'get', 'view', 'track', 'how', 'many', 'these', 'me', 'details', 'profile', 'info', 'dossier', 'account', 'orders', 'order'];

  if (!['settle', 'accept', 'reject', 'cancel', 'pack', 'credit', 'customer care', 'customer support', 'customer service'].some((w) => lower.includes(w))) {
    if (lower.includes('order')) {
      isOrderQuery = true;
      const custOrderMatch = lower.match(/\b(?:by|for|from|of|placed by|made by)\s+([a-z0-9_.'@ ]{2,50})\b/i);
      const isPossessiveMatch = lower.match(/\b([a-z0-9_\-.@]{2,40}(?:\s+[a-z0-9_\-.@]{2,40})?)'s\s+orders?\b/i);
      const doesHaveMatch = lower.match(/\b(?:does|did)\s+([a-z0-9_.'@ ]{2,50})\s+(?:have|make|place)\b/i);
      const directNameOrderMatch = lower.match(/\b([a-z0-9_\-.@]{2,40}(?:\s+[a-z0-9_\-.@]{2,40})?)\s+orders?\b/i);

      if (isPossessiveMatch) {
        targetCustQ = isPossessiveMatch[1].trim();
      } else if (doesHaveMatch) {
        targetCustQ = doesHaveMatch[1].trim();
      } else if (custOrderMatch) {
        const cand = custOrderMatch[1].replace(/\b(?:please|today|yesterday|now|detail|details|customer|user|shopper)\b/gi, '').trim();
        if (!cand.split(/\s+/).some((w) => orderStopwords.includes(w.toLowerCase()))) {
          targetCustQ = cand;
        }
      } else if (directNameOrderMatch) {
        const cand = directNameOrderMatch[1].trim();
        if (!cand.split(/\s+/).some((w) => orderStopwords.includes(w.toLowerCase()))) {
          targetCustQ = cand;
        }
      }

      if (targetCustQ) {
        matchedUser = matchCustomerUser(targetCustQ);
      }
    }

    if (!targetCustQ) {
      // --- Tier 1: Explicit patterns (who is <name>, <name>'s profile/details, <name> customer profile, customer <name>, about/details of customer <name>) ---
      const mPost = lower.match(/\b([a-z0-9_\-\.@ ]{2,50})\s+customer\s+(?:details|profile|info|account)\b/i);
      const mPoss = lower.match(/\b([a-z0-9_\-\.@ ]{2,50})'s\s+(?:details|profile|info|account|dossier)\b/i);
      const mAboutCust = lower.match(/\b(?:what\s+about|about|tell\s+me\s+about|who\s+is|details\s+(?:of|for)|info\s+on|show\s+me|show)\s+(?:the\s+)?(?:customer\s+|user\s+|shopper\s+)([a-z0-9_\-\.@ ]{2,50})\b/i);
      const mCust = lower.match(/\b(?:customer|shopper|user)\s+(?:(?:details|profile|info|dossier|account)\s+(?:for|of)\s+)?([a-z0-9_\-\.@ ]{2,50})\b/i);
      const mWhoIs = lower.match(/^(?:who\s+is|tell\s+me\s+who\s+is)\s+(?:the\s+)?([a-z0-9_\-\.@ ]{2,50})$/i);

      for (const m of [mPost, mPoss, mAboutCust, mCust, mWhoIs]) {
        if (m) {
          let cand = m[1].replace(/\b(?:details?|profile|orders?|account|info|dossier|please|today|yesterday|now|the|customer|user|shopper)\b/gi, '').trim();
          cand = cand.replace(/\s+/g, ' ');
          if (cand && !['owner', 'test_owner', 'shopper', 'test_shopper', 'admin'].includes(cand.toLowerCase()) && !cand.split(/\s+/).some((w) => orderStopwords.includes(w.toLowerCase())) && cand.length >= 2) {
            targetCustQ = cand;
            matchedUser = matchCustomerUser(targetCustQ);
            break;
          }
        }
      }
    }

    if (!targetCustQ) {
      // --- Tier 2: Patterns without "customer" keyword (what about [the] <cand>, about <cand>, details of <cand>, bare names 1-4 words) ---
      // BUT ONLY hijack if matchCustomerUser(cand) actually finds a customer!
      // This ensures queries like "what about whole wheat bread" safely fall through to product search!
      const tier2Cands = [];
      const mWa = lower.match(/^(?:what\s+about|how\s+about)\s+(?:the\s+)?(.+)$/i);
      const mAb = lower.match(/^(?:about|tell\s+me\s+about|tell\s+about)\s+(?:the\s+)?(.+)$/i);
      const mWho = lower.match(/^(?:who\s+is|tell\s+me\s+who\s+is)\s+(?:the\s+)?(.+)$/i);
      const mDet = lower.match(/^(?:details|info)\s+(?:of|for|on)\s+(?:the\s+)?(.+)$/i);

      for (const m of [mWa, mAb, mWho, mDet]) {
        if (m) {
          let cand = m[1].replace(/[?!.,'"]+/g, '').trim();
          cand = cand.replace(/\b(?:please|today|yesterday|now|the)\b/gi, '').trim();
          cand = cand.replace(/\s+/g, ' ');
          if (cand && !cand.split(/\s+/).some((w) => orderStopwords.includes(w.toLowerCase())) && cand.length >= 2) {
            tier2Cands.push(cand);
          }
        }
      }

      const words = lower.split(/\s+/);
      if (words.length >= 1 && words.length <= 4) {
        if (!['cart', 'clear', 'checkout', 'help', 'order', 'orders', 'status', 'promo', 'delivery', 'store', 'product', 'products', 'item', 'items', 'category', 'categories', 'price', 'stock', 'sales', 'revenue', 'pack', 'settle', 'accept', 'reject', 'show', 'list', 'view'].some((cmd) => lower.includes(cmd))) {
          let cleanBare = lower.replace(/[?!.,'"]+/g, '').trim();
          cleanBare = cleanBare.replace(/^(?:the|a|an)\s+/i, '').trim();
          if (cleanBare && cleanBare.length >= 2) {
            tier2Cands.push(cleanBare);
          }
        }
      }

      for (const cand of tier2Cands) {
        const candUser = matchCustomerUser(cand);
        if (candUser) {
          targetCustQ = cand;
          matchedUser = candUser;
          break;
        }
      }
    }
  }

  if (targetCustQ) {
    if (persona === 'shopper') {
      const reply = isOrderQuery
        ? "Auditing customer orders is restricted to store operations. You can ask to view your own cart or track your personal orders."
        : "Customer account details and profiles are private. How can I help with your shopping or personal cart today?";
      return {
        reply,
        voice_reply: reply,
        mode: 'chat',
        actions: [],
        tools_used: [{ name: 'customer_privacy_guardrail', args: { restricted: true, persona: 'shopper' } }],
        follow_ups: ['Show Dairy & Eggs', 'What is your return policy?', 'View cart'],
        latency_ms: 10,
      };
    }
    const qLower = targetCustQ.toLowerCase();
    const isSai = matchedUser?.isSai ?? (qLower.includes('sai') || qLower.includes('satyanarayana'));
    const matchedOrders = DEMO_ORDERS.filter((o) => (o.customer || '').toLowerCase().includes(qLower));
    const cnt = isSai ? 26 : (matchedUser?.ordersCount !== undefined ? matchedUser.ordersCount : matchedOrders.length);
    const formattedName = matchedUser?.name || (isSai
      ? 'K Sai Satyanarayana'
      : targetCustQ.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '));

    if (isOrderQuery) {
      if (lower.includes('how many') || lower.includes('count') || lower.includes('total') || cnt === 0) {
        return {
          reply: `${formattedName} has placed ${cnt} orders.`,
          voice_reply: `${formattedName} has placed ${cnt} orders.`,
          mode: 'chat',
          actions: [],
          tools_used: [{ name: 'query_orders', args: { customer_name: formattedName, count: cnt } }],
          follow_ups: ['Audit pending orders', 'Show today sales', 'Check low stock'],
          latency_ms: 10,
        };
      } else {
        return {
          reply: `${formattedName} has placed ${cnt} orders.`,
          voice_reply: `${cnt} orders for ${formattedName}.`,
          mode: 'chat',
          actions: [{ type: 'ORDERS_LIST_CARD', orders: matchedOrders, count: cnt, persona }],
          tools_used: [{ name: 'query_orders', args: { customer_name: formattedName, count: cnt } }],
          follow_ups: ['Audit pending orders', 'Show today sales', 'Check low stock'],
          latency_ms: 10,
        };
      }
    } else {
      if (!matchedUser) {
        const reply = `No customer named '${targetCustQ}' found in store records.`;
        return {
          reply,
          voice_reply: reply,
          mode: 'chat',
          actions: [],
          tools_used: [{ name: 'query_customers', args: { customer_name: targetCustQ, found: false } }],
          follow_ups: ['Audit pending orders', 'Show today sales', 'Check low stock'],
          latency_ms: 10,
        };
      }
      const email = isSai ? 'saisatyanarayana2004@gmail.com' : `${formattedName.toLowerCase().replace(/\s+/g, '')}@example.com`;
      const spentTotal = isSai ? 3679.30 : (cnt * 45.0);
      const walletBal = isSai ? 2709.00 : 45.00;
      const recentList = isSai ? [
        { id: 'ORD202600001', status: 'READY', total: 45.0, total_amount: 45.0, created_at: 'Nov 02, 2026' },
        { id: 'ORD26080032', status: 'READY', total: 700.0, total_amount: 700.0, created_at: 'Aug 18, 2026' },
      ] : matchedOrders.slice(0, 3).map(o => ({ id: o.id, status: o.status, total: o.total_amount || 0, total_amount: o.total_amount || 0, created_at: o.created_at || 'Recent' }));

      const reply = cnt > 0
        ? `Customer ${formattedName} (${email}) has placed ${cnt} orders (₹${spentTotal.toFixed(2)} total spend). Latest order is #${recentList[0]?.id || 'ORD202600001'} (${recentList[0]?.status || 'READY'}, ₹${(recentList[0]?.total || 45).toFixed(2)}).`
        : `Customer ${formattedName} (${email}) has placed 0 orders (₹0.00 total spend). Wallet balance: ₹${walletBal.toFixed(2)}.`;

      return {
        reply,
        voice_reply: `Customer profile for ${formattedName}: ${cnt} orders placed, ₹${spentTotal.toFixed(2)} total spend.`,
        mode: 'chat',
        actions: [{
          type: 'CUSTOMER_PROFILE_CARD',
          customer: {
            id: isSai ? 3 : 101,
            name: formattedName,
            username: email,
            email,
            phone: '+91 98765 43210',
            joined: 'Nov 2025',
            wallet_balance: walletBal,
            total_spent: spentTotal,
            orders_count: cnt,
            tier: spentTotal >= 1000 ? 'VIP Platinum' : 'VIP Gold',
            recent_orders: recentList,
          },
          persona: 'owner',
        }],
        tools_used: [{ name: 'get_customer_profile', args: { customer_name: formattedName } }],
        follow_ups: [`Credit ₹10 to customer ${formattedName}`, 'View all orders', 'Check store revenue'],
        latency_ms: 10,
      };
    }
  }

  // --- E. REJECTED / CANCELLED ORDERS ---
  if ((lower.includes('rejected order') || lower.includes('cancelled order') || lower.includes('canceled order')) && !lower.includes('why')) {
    if (persona === 'shopper') {
      return {
        reply: "Storewide order status auditing is restricted to store operations. You can check your personal order status in your profile.",
        voice_reply: "Store order status auditing is restricted to store operations.",
        mode: 'chat',
        actions: [],
        tools_used: [{ name: 'query_orders', args: { restricted: true, persona: 'shopper' } }],
        follow_ups: ['Show popular products', 'What is your delivery timing?', 'View cart'],
        latency_ms: 10,
      };
    }
    const rejectedOrders = DEMO_ORDERS.filter((o) => ['REJECTED', 'CANCELLED'].includes(o.status));
    return {
      reply: `${rejectedOrders.length} rejected orders.`,
      voice_reply: `${rejectedOrders.length} rejected orders found.`,
      mode: 'chat',
      actions: [{ type: 'ORDERS_LIST_CARD', orders: rejectedOrders, count: rejectedOrders.length, persona }],
      tools_used: [{ name: 'query_orders', args: { status: 'REJECTED', count: rejectedOrders.length } }],
      follow_ups: ['Why was order rejected?', 'Show pending orders', 'Review today sales'],
      latency_ms: 10,
    };
  }

  // --- F. CHEAPEST COOKING OIL / CATEGORY SUPERLATIVE ---
  if ((lower.includes('cheapest') || lower.includes('lowest price')) && (lower.includes('oil') || lower.includes('ghee'))) {
    const catalog = getLiveCatalog();
    const oilProducts = catalog.filter((p) => (p.category || '').toLowerCase().includes('oil') || (p.name || '').toLowerCase().includes('oil') || (p.name || '').toLowerCase().includes('ghee'));
    const sorted = [...oilProducts].sort((a, b) => a.price - b.price);
    const topOil = sorted[0] || catalog[0];
    const topCards = sorted.slice(0, 4).map((p) => serializeCardItem(p, 1));
    return {
      reply: `Cheapest oil is ${topOil.name} at ₹${topOil.price.toFixed(2)} per ${topOil.unit || '1 unit'} with ${topOil.stock_quantity || 90} in stock.`,
      voice_reply: `Cheapest oil is ${topOil.name} at ₹${topOil.price.toFixed(2)}.`,
      mode: 'chat',
      actions: [{ type: 'SEARCH_RESULTS', items: topCards }],
      tools_used: [{ name: 'filter_catalog_advanced', args: { category: 'oil', sort_by: 'price_asc' } }],
      follow_ups: ['Show all cooking oils', 'Show dairy products', 'What is your return policy?'],
      latency_ms: 12,
    };
  }

  // --- G. SPECIFIC PRODUCT STOCK LOOKUP (e.g. "is Maggi in stock", "do you have dragonfruit in stock") ---
  if ((lower.includes('in stock') || lower.includes('available')) && (lower.includes('is ') || lower.includes('are ') || lower.includes('do you have ') || lower.includes('maggi'))) {
    const catalog = getLiveCatalog();
    const matched = catalog.filter((p) => lower.includes(p.name.toLowerCase()) || (p.aliases || []).some((a) => lower.includes(a)));
    if (matched.length > 0) {
      const topP = matched[0];
      const pCard = serializeCardItem(topP, 1);
      return {
        reply: `${topP.name} has ${topP.stock_quantity || 120} in stock at ₹${topP.price.toFixed(2)} per ${topP.unit || '1 unit'}.`,
        voice_reply: `${topP.name} has ${topP.stock_quantity || 120} in stock at ₹${topP.price.toFixed(2)}.`,
        mode: 'chat',
        actions: [{ type: 'SEARCH_RESULTS', items: [pCard] }],
        tools_used: [{ name: 'search_products_and_stock', args: { query: topP.name } }],
        follow_ups: [`Add 1 ${topP.name}`, 'Browse all products', 'View cart'],
        latency_ms: 12,
      };
    } else {
      let cand = prompt.replace(/^(?:is|are|do you have|stock of)\s+/i, '').replace(/\s+(?:in stock|available)\??$/i, '').trim();
      if (cand && cand.length >= 3) {
        cand = cand.charAt(0).toUpperCase() + cand.slice(1);
        return {
          reply: `We do not currently stock '${cand}'. You can browse our 12 store categories or ask for in-stock grocery essentials.`,
          voice_reply: `'${cand}' is not in stock.`,
          mode: 'chat',
          actions: [],
          tools_used: [{ name: 'search_products_and_stock', args: { query: cand, found: false } }],
          follow_ups: ['Show Dairy & Eggs', 'Show Snacks & Munchies', 'Browse catalog'],
          latency_ms: 10,
        };
      }
    }
  }


  let reply = 'How can I help?';
  let actions = [];
  let tools_used = [{ name: 'live_store_memory', args: {} }];
  let follow_ups = persona === 'owner'
    ? ['Check pending orders', 'Check low stock', 'Which product has the highest margin?']
    : ['What is the cheapest item?', 'Add 1 Whole Milk', '15% off Strawberries'];

  // 0A. Live Theme Switch ("switch to dark mode", "turn off dark mode", "switch to light mode")
  if (
    ['dark mode', 'light mode', 'dark theme', 'light theme', 'switch theme', 'toggle theme', 'night mode', 'day mode'].some((k) =>
      lower.includes(k)
    )
  ) {
    const wantsOffDark =
      lower.includes('off dark') ||
      lower.includes('disable dark') ||
      lower.includes('exit dark') ||
      lower.includes('stop dark') ||
      (lower.includes('turn off') && lower.includes('dark'));
    const wantsOffLight =
      lower.includes('off light') ||
      lower.includes('disable light') ||
      (lower.includes('turn off') && lower.includes('light'));
    const targetTheme = wantsOffDark
      ? 'light'
      : wantsOffLight
        ? 'dark'
        : lower.includes('light') || lower.includes('day')
          ? 'light'
          : 'dark';
    const label = targetTheme === 'light' ? 'Light Mode' : 'Dark Mode';
    reply = `Switched to ${label}.`;
    actions = [{ type: 'SWITCH_THEME', theme: targetTheme }];
    tools_used = [{ name: 'switch_theme', args: { theme: targetTheme } }];
  }
  // 0B. Live Cart Items Preview Card ("show cart", "view cart", "show items in cart", "court items", etc.)
  else if (
    (
      [
        'cart', 'my cart', 'the cart', 'open cart', 'show cart', 'check cart', 'view cart',
        'view my cart', 'cart items', 'cart summary', 'cart status', 'cart details', 'court',
        'my court', 'show court', 'court items', 'show items in court', 'show items in the court',
        'what is in my cart', "what's in my cart", 'what is in cart', 'show my cart',
        'view cart', 'check my cart', 'cart contents', 'items in my cart', 'in my cart',
        'items in cart', 'items in the cart', 'items in the court', 'items in court',
        'show items in cart', 'show items in my cart', 'show items in the cart',
        'show cart items', 'display cart', 'display items in cart', 'what do i have in cart',
        'list cart', 'list cart items', 'list items in cart', 'see my cart', 'see cart',
      ].some((k) => lower === k || lower.includes(k)) ||
      ((lower.includes('cart') || lower.includes('court')) &&
        ['item', 'show', 'view', 'display', 'list', 'see', 'content', 'what'].some((w) => lower.includes(w)))
    ) &&
    !['clear', 'empty', 'remove', 'delete', 'add', 'put', 'buy'].some((w) => lower.includes(w))
  ) {
    const clientCart = Array.isArray(body.cart_items) ? body.cart_items : [];
    const tot = clientCart.reduce((sum, ci) => sum + Number(ci.price || 0) * Number(ci.quantity || 1), 0);
    const cnt = clientCart.reduce((sum, ci) => sum + Number(ci.quantity || 1), 0);
    reply = cnt > 0
      ? `Cart items displayed • ${cnt} items total ($${tot.toFixed(2)}).`
      : 'Cart is currently empty • 0 items ($0.00).';
    actions = [
      {
        type: 'CART_ITEMS_CARD',
        items: clientCart,
        total: tot,
        count: cnt,
        empty: cnt === 0,
      },
    ];
    tools_used = [{ name: 'get_active_cart', args: { count: cnt, total: tot } }];
    return {
      reply,
      voice_reply: cnt > 0 ? `Your cart has ${cnt} items totaling $${tot.toFixed(2)}.` : 'Your cart is currently empty.',
      mode,
      actions,
      tools_used,
      follow_ups: cnt > 0 ? ['Proceed to checkout', 'Clear cart', 'What is cheapest?'] : ['Browse products', 'Add 1 Whole Milk'],
      latency_ms: 10,
    };
  }
  // 0. Strict Settings Guardrail
  else if (
    lower.includes('setting') ||
    lower.includes('operating hour') ||
    lower.includes('delivery radius') ||
    lower.includes('change store name') ||
    lower.includes('change password')
  ) {
    reply = 'Settings can only be changed manually.';
    actions = [];
    tools_used = [{ name: 'settings_guardrail', args: { blocked: true } }];
  }
  // 1. Navigation commands (All shop pages EXCEPT settings)
  else if (/^(open|go to|navigate to|visit)\s+/.test(lower) || lower.includes('go to checkout') || lower === 'checkout') {
    const ordMatch = lower.match(/\b(ord\d+\w*)\b/i);
    if (ordMatch) {
      const oid = ordMatch[1].toUpperCase();
      reply = `Opening Order #${oid}.`;
      actions = [{ type: 'NAVIGATE', path: `/owner/orders/${oid}`, label: `Order #${oid}` }];
    } else if (lower.includes('order')) {
      const path = persona === 'owner' ? '/owner/orders' : '/profile/orders';
      reply = 'Opening Orders.';
      actions = [{ type: 'NAVIGATE', path, label: 'Orders' }];
    } else if (lower.includes('product') || lower.includes('catalog') || lower.includes('inventory')) {
      const path = persona === 'owner' ? '/owner/products' : '/products';
      reply = 'Opening Products.';
      actions = [{ type: 'NAVIGATE', path, label: 'Products' }];
    } else if (lower.includes('categor')) {
      const path = persona === 'owner' ? '/owner/categories' : '/categories';
      reply = 'Opening Categories.';
      actions = [{ type: 'NAVIGATE', path, label: 'Categories' }];
    } else if (lower.includes('offer') || lower.includes('promo') || lower.includes('coupon')) {
      const path = persona === 'owner' ? '/owner/offers' : '/profile/offers';
      reply = 'Opening Offers.';
      actions = [{ type: 'NAVIGATE', path, label: 'Offers' }];
    } else if (lower.includes('sale') || lower.includes('revenue')) {
      if (persona === 'owner') {
        reply = 'Opening Sales.';
        actions = [{ type: 'NAVIGATE', path: '/owner/sales', label: 'Sales' }];
      } else {
        reply = 'Store sales analytics are restricted to store managers. What groceries can I help you find today?';
        actions = [];
      }
    } else if (lower.includes('customer')) {
      if (persona === 'owner') {
        reply = 'Opening Customers.';
        actions = [{ type: 'NAVIGATE', path: '/owner/customers', label: 'Customers' }];
      } else {
        reply = 'How can I assist you with your customer account or cart?';
        actions = [];
      }
    } else if (lower.includes('invoice')) {
      if (persona === 'owner') {
        reply = 'Opening Orders & Settlements for invoice management.';
        actions = [{ type: 'NAVIGATE', path: '/owner/orders', label: 'Orders & Invoices' }];
      } else {
        reply = 'You can download your order invoices from your Orders profile page.';
        actions = [{ type: 'NAVIGATE', path: '/profile/orders', label: 'My Orders' }];
      }
    } else if (lower.includes('delivery')) {
      if (persona === 'owner') {
        reply = 'Opening Delivery.';
        actions = [{ type: 'NAVIGATE', path: '/owner/delivery-partners', label: 'Delivery' }];
      } else {
        reply = 'Standard delivery runs daily 7 AM - 10 PM with 30-minute express service.';
        actions = [];
      }
    } else if (lower.includes('dashboard') || lower.includes('analytics')) {
      if (persona === 'owner') {
        reply = 'Opening Dashboard.';
        actions = [{ type: 'NAVIGATE', path: '/owner', label: 'Dashboard' }];
      } else {
        reply = 'Store management dashboard is restricted to store owners. What groceries can I help you find?';
        actions = [];
      }
    } else if (lower.includes('checkout') || (['pay now', 'ready to checkout', 'proceed to checkout', 'proceed to payment'].some((k) => lower.includes(k)) && !lower.includes('how to'))) {
      reply = 'Navigating to PayPal Checkout.';
      actions = [{ type: 'NAVIGATE', path: '/checkout', label: 'Checkout' }];
    } else if (lower.includes('cart')) {
      reply = 'Opening Cart.';
      actions = [{ type: 'NAVIGATE', path: '/cart', label: 'Cart' }];
    }
    tools_used = [{ name: 'navigate_portal', args: {} }];
  }
  // 1b. Superlative & Analytical Queries (Cheapest, Most Expensive, Highest/Lowest Margin, Stock)
  else if (
    ['cheapest', 'lowest price', 'least expensive', 'most affordable', 'most expensive', 'highest price', 'priciest', 'highest margin', 'best margin', 'most profitable', 'lowest margin', 'most stock', 'highest stock', 'least stock', 'lowest stock'].some((k) => lower.includes(k))
  ) {
    if (['cheapest', 'lowest price', 'least expensive', 'most affordable'].some((k) => lower.includes(k))) {
      const sorted = [...DEMO_PRODUCTS].sort((a, b) => a.price - b.price);
      const top = sorted[0];
      const cards = sorted.slice(0, 4).map((p) => serializeCardItem(p, 1));
      reply = `Cheapest item is ${top.name} at ₹${top.price.toFixed(2)} per ${top.unit} with ${top.stock_quantity} in stock.`;
      actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    } else if (['most expensive', 'highest price', 'priciest'].some((k) => lower.includes(k))) {
      const sorted = [...DEMO_PRODUCTS].sort((a, b) => b.price - a.price);
      const top = sorted[0];
      const cards = sorted.slice(0, 4).map((p) => serializeCardItem(p, 1));
      reply = `Most expensive item is ${top.name} at ₹${top.price.toFixed(2)} per ${top.unit} with ${top.stock_quantity} in stock.`;
      actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    } else if (['highest margin', 'best margin', 'most profitable', 'lowest margin'].some((k) => lower.includes(k))) {
      if (persona === 'owner') {
        const isLow = lower.includes('lowest margin');
        const sorted = [...DEMO_PRODUCTS].sort((a, b) => (isLow ? a.margin_pct - b.margin_pct : b.margin_pct - a.margin_pct));
        const top = sorted[0];
        reply = `${isLow ? 'Lowest' : 'Highest'} margin is ${top.name} at ${top.margin_pct.toFixed(1)}% margin, selling at ₹${top.price.toFixed(2)} with ₹${top.cost_price.toFixed(2)} cost.`;
        actions = [{ type: 'MARGIN_LIST', products: sorted.slice(0, 4).map((p) => ({ ...p, selling_price: p.price })) }];
      } else {
        reply = 'Product profit margins and wholesale costs are restricted to store managers. Would you like to see our highest-rated or best value products?';
        actions = [];
      }
    } else {
      const isLow = lower.includes('least stock') || lower.includes('lowest stock');
      const sorted = [...DEMO_PRODUCTS].sort((a, b) => (isLow ? a.stock_quantity - b.stock_quantity : b.stock_quantity - a.stock_quantity));
      const top = sorted[0];
      const cards = sorted.slice(0, 4).map((p) => serializeCardItem(p, 1));
      reply = `${isLow ? 'Lowest' : 'Highest'} stock is ${top.name} with ${top.stock_quantity} units at ₹${top.price.toFixed(2)}.`;
      actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    }
    tools_used = [{ name: 'search_products_and_stock', args: { query: prompt } }];
  }
  // 1c. Create / Delete Product
  else if (/(create|add|new|delete|remove)\s+product/.test(lower)) {
    if (persona === 'owner') {
      if (lower.includes('delete') || lower.includes('remove')) {
        reply = 'Product removed.';
        actions = [{ type: 'REFRESH_DATA' }];
        tools_used = [{ name: 'create_or_delete_product', args: { action: 'delete' } }];
      } else {
        const priceMatch = lower.match(/\$?(\d+(?:\.\d+)?)/);
        const price = priceMatch ? Number(priceMatch[1]) : 4.99;
        const newProd = { id: Date.now(), name: 'Organic Honey', unit: '12 oz', price, regular_price: price, offer_price: price, cost_price: Number((price * 0.78).toFixed(2)), stock: 25, stock_quantity: 25, category: 'Pantry', category_name: 'Pantry', margin_pct: 22.0, max_safe_discount_pct: 10.0, best_deal_price: Number((price * 0.9).toFixed(2)), aliases: ['honey'] };
        DEMO_PRODUCTS.unshift(newProd);
        reply = `Added ${newProd.name} at ₹${price.toFixed(2)}.`;
        actions = [{ type: 'PRODUCT_UPDATED', product: newProd }, { type: 'REFRESH_DATA' }];
        tools_used = [{ name: 'create_or_delete_product', args: { action: 'create', price } }];
      }
    } else {
      reply = 'Catalog product management is restricted to store managers. What groceries can I help you find?';
      actions = [];
    }
  }
  // 1d. Categories, Promo Codes, Sales, Fleet/Customers, Broadcast (Owner Live Preview Cards)
  else if (
    (
      lower.includes('categor') ||
      lower.includes('department') ||
      ['remaining category', 'other category', 'other categories', 'what about the remaining', 'more categories', 'all categories'].some((k) => lower.includes(k))
    ) &&
    !['dairy', 'diary', 'eggs', 'atta', 'flour', 'rice', 'pulse', 'oil', 'ghee', 'noodle', 'snack', 'biscuit', 'tea', 'coffee', 'spice', 'chocolate', 'cleaning', 'hygiene', 'sugar'].some((k) => lower.includes(k))
  ) {
    const isRemaining = ['remaining', 'other', 'rest'].some((k) => lower.includes(k));
    const allCategories = [
      { name: 'Dairy & Eggs', product_count: 8 },
      { name: 'Atta, Flours & Grains', product_count: 8 },
      { name: 'Rice & Pulses', product_count: 9 },
      { name: 'Edible Oils & Ghee', product_count: 8 },
      { name: 'Instant Food & Noodles', product_count: 9 },
      { name: 'Snacks, Biscuits & Namkeen', product_count: 9 },
      { name: 'Beverages, Tea & Coffee', product_count: 8 },
      { name: 'Spices & Seasonings', product_count: 9 },
      { name: 'Chocolates, Honey & Spreads', product_count: 8 },
      { name: 'Household & Cleaning', product_count: 8 },
      { name: 'Personal Care & Hygiene', product_count: 8 },
      { name: 'Packaged Essentials & Sugar', product_count: 8 },
    ];
    const catSummary = allCategories.map((c) => `${c.name} (${c.product_count})`).join(', ');
    reply = isRemaining
      ? `All 12 store categories are active with 100 products: ${catSummary}.`
      : `12 active catalog categories • 100 products across the store: ${catSummary}.`;
    actions = [{
      type: 'CATEGORIES_CARD',
      total_categories: 12,
      categories: allCategories,
    }];
    tools_used = [{ name: 'manage_category', args: { action: 'list' } }];
    follow_ups = ['Explore Dairy & Eggs', 'Explore Instant Food & Noodles', 'Check stock'];
  } else if (
    (lower.includes('promo') || lower.includes('coupon') || lower.includes('offers')) &&
    !(persona === 'shopper' && ['apply ', 'use ', 'best '].some((w) => lower.includes(w)))
  ) {
    if (persona === 'owner' && (lower.includes('create') || lower.includes('add'))) {
      reply = 'Created promo code SAVE15 • 15% discount.';
      actions = [{
        type: 'PROMO_CODES_CARD',
        status_message: 'Created promo code SAVE15 with 15% discount.',
        promos: [
          { code: 'SAVE15', discount_type: 'PERCENTAGE', discount_value: 15, status: 'ACTIVE' },
          { code: 'SAVE10', discount_type: 'PERCENTAGE', discount_value: 10, status: 'ACTIVE' },
          { code: 'FRESH15', discount_type: 'PERCENTAGE', discount_value: 15, status: 'ACTIVE' },
        ],
      }];
    } else {
      reply = '3 active promotional codes.';
      actions = [{
        type: 'PROMO_CODES_CARD',
        promos: [
          { code: 'SAVE10', discount_type: 'PERCENTAGE', discount_value: 10, status: 'ACTIVE' },
          { code: 'FRESH15', discount_type: 'PERCENTAGE', discount_value: 15, status: 'ACTIVE' },
          { code: 'WELCOME5', discount_type: 'FLAT', discount_value: 5, status: 'ACTIVE' },
        ],
      }];
    }
    tools_used = [{ name: 'manage_promo_code', args: {} }];
    follow_ups = persona === 'owner' ? ['Create promo SAVE20', 'Manage offers', 'Check sales'] : ['Apply promo SAVE10', 'Browse catalog', 'View cart'];
  } else if (lower.includes('sales') || lower.includes('revenue') || lower.includes('aov') || lower.includes('income') || lower.includes('analytics')) {
    if (persona === 'owner') {
      reply = 'Revenue ₹1,842.50 • 56 orders • 0 pending.';
      actions = [{
        type: 'SALES_ANALYTICS_CARD',
        analytics: {
          total_revenue: 1842.50,
          total_captured: 1690.00,
          total_released: 152.50,
          total_orders: 56,
          pending_orders: 0,
          aov: 32.90,
        },
      }];
      tools_used = [{ name: 'get_sales_and_analytics', args: {} }];
      follow_ups = ['Open sales analytics', 'Check pending orders', 'Audit low stock'];
    } else {
      reply = 'Store sales and financial analytics are restricted to store managers. What groceries can I help you find today?';
      actions = [];
      tools_used = [{ name: 'get_sales_and_analytics', args: { restricted: true, persona: 'shopper' } }];
      follow_ups = ['Show daily essentials', 'What is your return policy?', 'View cart'];
    }
  } else if (persona === 'owner' && (lower.includes('broadcast') || lower.includes('notify customer') || lower.includes('push'))) {
    reply = 'Broadcast transmitted to all active shoppers.';
    actions = [{
      type: 'BROADCAST_CARD',
      title: 'Store Fresh Update',
      message: 'New fresh arrivals in Dairy and Bakery are ready for 20-min delivery.',
      sent_at: 'Just now',
    }];
    tools_used = [{ name: 'send_customer_broadcast', args: {} }];
    follow_ups = ['Send promo broadcast', 'Check delivery fleet', 'View sales'];
  }
  // 1c. Top customers leaderboard
  else if (
    persona === 'owner' && (
      ['highest buying', 'top customer', 'top 3 customer', 'top buyer', 'top spending', 'best customer', 'top spenders', 'highest spending'].some((k) => lower.includes(k)) ||
      (lower.includes('top') && lower.includes('customer'))
    )
  ) {
    const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    const topLimitMatch = lower.match(/\b(?:top|highest)\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
    let cLimit = topLimitMatch ? (wordToNum[topLimitMatch[1].toLowerCase()] || parseInt(topLimitMatch[1], 10)) : 5;
    cLimit = Math.min(Math.max(cLimit || 5, 1), 10);

    const mockTopCusts = [
      { id: 101, rank: 1, name: 'Rahul Sharma', email: 'rahul.s@example.com', phone: '+1 555-0192', total_spent: 1485.50, orders_count: 32, aov: 46.42, tier: 'VIP Gold' },
      { id: 102, rank: 2, name: 'Priya Verma', email: 'priya.v@example.com', phone: '+1 555-0144', total_spent: 1240.00, orders_count: 24, aov: 51.67, tier: 'Platinum' },
      { id: 103, rank: 3, name: 'Elena Rostova', email: 'elena.r@example.com', phone: '+1 555-0188', total_spent: 980.20, orders_count: 18, aov: 54.45, tier: 'Gold' },
      { id: 104, rank: 4, name: 'Marcus Vance', email: 'marcus.v@example.com', phone: '+1 555-0123', total_spent: 810.00, orders_count: 15, aov: 54.00, tier: 'Silver' },
      { id: 105, rank: 5, name: 'Alex Rivera', email: 'alex.r@example.com', phone: '+1 555-0167', total_spent: 645.50, orders_count: 12, aov: 53.79, tier: 'Silver' },
      { id: 106, rank: 6, name: 'Dev Patel', email: 'dev.p@example.com', phone: '+1 555-0177', total_spent: 590.00, orders_count: 11, aov: 53.64, tier: 'Silver' },
      { id: 107, rank: 7, name: 'Anya Taylor', email: 'anya.t@example.com', phone: '+1 555-0199', total_spent: 510.50, orders_count: 9, aov: 56.72, tier: 'Club Member' },
      { id: 108, rank: 8, name: 'Siddharth Rao', email: 'sid.r@example.com', phone: '+1 555-0133', total_spent: 475.00, orders_count: 8, aov: 59.38, tier: 'Club Member' },
      { id: 109, rank: 9, name: 'Kavita Nair', email: 'kavita.n@example.com', phone: '+1 555-0155', total_spent: 420.00, orders_count: 7, aov: 60.00, tier: 'Club Member' },
      { id: 110, rank: 10, name: 'Neha Joshi', email: 'neha.j@example.com', phone: '+1 555-0111', total_spent: 380.00, orders_count: 6, aov: 63.33, tier: 'Club Member' },
    ];
    const selected = mockTopCusts.slice(0, cLimit);
    reply = `Top ${selected.length} highest-buying customers.`;
    actions = [{
      type: 'TOP_CUSTOMERS_CARD',
      customers: selected,
      count: selected.length,
    }];
    tools_used = [{ name: 'manage_customers_and_delivery', args: { query_type: 'top_buyers', limit: cLimit } }];
    follow_ups = ['Send offer to top buyers', 'Check sales analytics', 'View pending orders'];
  }
  // 1d. Dynamic Wallet Credit Fast-Path
  else if (
    /\b(?:credit|add|give)\s+\$?(\d+(?:\.\d+)?)\s*(?:credit)?\s*(?:to\s+(?:customer\s+)?([a-zA-Z]+))?/i.test(lower) &&
    (lower.includes('customer') || lower.includes('wallet') || Boolean(mem.last_customer_name)) &&
    persona === 'owner'
  ) {
    const creditMatch = lower.match(/\b(?:credit|add|give)\s+\$?(\d+(?:\.\d+)?)\s*(?:credit)?\s*(?:to\s+(?:customer\s+)?([a-zA-Z]+))?/i);
    const amt = creditMatch ? parseFloat(creditMatch[1]) : 10.0;
    const rawTarget = creditMatch && creditMatch[2] ? creditMatch[2] : (mem.last_customer_name || 'Rahul');
    const targetName = rawTarget.charAt(0).toUpperCase() + rawTarget.slice(1);
    const prevBal = mem.mock_customer_wallet ?? 45.00;
    const newBal = prevBal + amt;
    mem.mock_customer_wallet = newBal;
    reply = `Credited $${amt.toFixed(2)} to ${targetName}. New balance: $${newBal.toFixed(2)}.`;
    actions = [{
      type: 'CUSTOMER_PROFILE_CARD',
      customer: {
        id: 101,
        name: targetName.includes(' ') ? targetName : `${targetName} Sharma`,
        username: targetName.toLowerCase(),
        email: `${targetName.toLowerCase()}@example.com`,
        phone: '+1 555-0192',
        joined: 'March 2024',
        wallet_balance: newBal,
        total_spent: 1485.50 + amt,
        orders_count: 32,
        tier: 'VIP Gold',
        recent_orders: [
          { id: 'ORD202600005', created_at: 'Today, 2:30 PM', total: 46.80, status: 'READY', items_count: 3 },
          { id: 'ORD202600001', created_at: '2 days ago', total: 62.40, status: 'DELIVERED', items_count: 4 },
        ],
      },
      persona: 'owner',
    }];
    tools_used = [{ name: 'credit_customer_wallet', args: { amount: amt, customer: targetName } }];
    follow_ups = [`Send offer to ${targetName}`, 'View customer dossier', 'Check sales analytics'];
  }
  // 1e. Customer profile dossier
  else if (
    persona === 'owner' && (
      ['customer details', 'about customer', 'customer profile', 'details of customer', 'details for customer'].some((k) => lower.includes(k)) ||
      (/(?:details|info|profile)\s+(?:for|of)?\s*([A-Za-z]+)\s+customer/i.test(lower)) ||
      (/\bcustomer\s+([A-Za-z]+)\s*(?:details|info|profile)?\b/i.test(lower) && !['fleet', 'delivery', 'broadcast', 'push', 'highest', 'top', 'credit'].some((w) => lower.includes(w)))
    )
  ) {
    const nameMatch = lower.match(/(?:customer\s+details\s+(?:for|of)?|details\s+(?:for|of)?\s+customer|about\s+customer|customer\s+profile\s+(?:for|of)?)\s*([A-Za-z]+)/i) ||
                      lower.match(/([a-zA-Z]+)\s+customer\s+(?:details|info|profile)/i) ||
                      lower.match(/\bcustomer\s+([A-Za-z]+)\b/i);
    const reservedWords = ['details', 'info', 'profile', 'dossier', 'order', 'orders', 'fleet', 'broadcast', 'credit', 'highest', 'top'];
    let rawName = nameMatch && !reservedWords.includes(nameMatch[1].toLowerCase()) ? nameMatch[1] : (mem.last_customer_name || 'Rahul');
    const cName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    mem.last_customer_name = cName;

    const profile = {
      id: 101,
      name: cName.includes(' ') ? cName : `${cName} Sharma`,
      username: cName.toLowerCase(),
      email: `${cName.toLowerCase()}@example.com`,
      phone: '+1 555-0192',
      joined: 'March 2024',
      wallet_balance: mem.mock_customer_wallet ?? 45.00,
      total_spent: 1485.50,
      orders_count: 32,
      tier: 'VIP Gold',
      recent_orders: [
        { id: 'ORD202600005', created_at: 'Today, 2:30 PM', total: 46.80, status: 'READY', items_count: 3 },
        { id: 'ORD202600001', created_at: '2 days ago', total: 62.40, status: 'DELIVERED', items_count: 4 },
        { id: 'ORD202500892', created_at: 'Last week', total: 38.10, status: 'DELIVERED', items_count: 2 },
      ],
    };
    reply = `Customer profile for ${profile.name}.`;
    actions = [{
      type: 'CUSTOMER_PROFILE_CARD',
      customer: profile,
      persona: 'owner',
    }];
    tools_used = [{ name: 'manage_customers_and_delivery', args: { user_id: 101 } }];
    follow_ups = [`Credit $10 to customer ${cName}`, `Send offer to ${cName}`, 'View all orders'];
  }
  // 1f. Shopper persona account dossier
  else if (
    persona === 'shopper' &&
    ['my account', 'my profile', 'my dossier', 'account details', 'user profile'].some((k) => lower.includes(k))
  ) {
    reply = 'Your shopper profile and rewards.';
    actions = [{
      type: 'CUSTOMER_PROFILE_CARD',
      customer: {
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com',
        phone: '+1 555-0167',
        tier: 'VIP Gold',
        wallet_balance: 65.00,
        lifetime_savings: 142.50,
        referral_code: 'CARTREF2026',
        referral_earnings: 25.00,
        recent_orders: [
          { id: 'ORD202600005', created_at: 'Today, 2:30 PM', total: 46.80, status: 'READY', items_count: 3 },
          { id: 'ORD202600001', created_at: '2 days ago', total: 62.40, status: 'DELIVERED', items_count: 4 },
        ],
      },
      persona: 'shopper',
    }];
    tools_used = [{ name: 'get_shopper_profile', args: {} }];
    follow_ups = ['Check my wallet', 'View past orders', 'Share referral code'];
  } else if (persona === 'owner' && (lower.includes('fleet') || lower.includes('driver') || lower.includes('rider') || (lower.includes('delivery') && lower.includes('partner')) || lower.includes('customer'))) {
    const isFleet = !lower.includes('customer');
    reply = isFleet ? '3 delivery partners active • 2 available.' : '48 registered store customers.';
    actions = [{
      type: 'CUSTOMERS_FLEET_CARD',
      ...(isFleet
        ? {
            delivery_partners: [
              { id: 1, name: 'Rahul Sharma', phone: '+1 555-0192', vehicle: 'EV Bike', status: 'AVAILABLE' },
              { id: 2, name: 'Vikram Singh', phone: '+1 555-0144', vehicle: 'Van', status: 'AVAILABLE' },
              { id: 3, name: 'Amit Patel', phone: '+1 555-0188', vehicle: 'Motorcycle', status: 'ON_DELIVERY' },
            ],
          }
        : {
            customers: [
              { id: 101, name: 'Priya Verma', email: 'priya@example.com', orders_count: 8 },
              { id: 102, name: 'Rohan Gupta', email: 'rohan@example.com', orders_count: 14 },
              { id: 103, name: 'Sneha Rao', email: 'sneha@example.com', orders_count: 6 },
            ],
          }),
    }];
    tools_used = [{ name: 'manage_customers_and_delivery', args: { query_type: isFleet ? 'delivery_partners' : 'customers' } }];
    follow_ups = ['Open fleet console', 'Assign driver to latest order', 'Send customer broadcast'];
  }
  // 2. Orders query (Multi-order ledger or Single order details)
  else if (
    (lower.includes('recent order') || lower.includes('latest order') || lower.includes('last order') || lower.includes('order details') || lower.includes('order status') || lower.includes('order number') || lower.includes('past order') || lower.includes('show order') || lower.includes('display order') || /ord\d+/i.test(lower) || (lower.includes('orders') && !['pending', 'cancel', 'settle'].some((w) => lower.includes(w)))) &&
    !['reorder', 'repeat', 'cancel', 'place', 'settle'].some((w) => lower.includes(w))
  ) {
    if (persona === 'shopper') {
      const myOrder = mem.last_placed_order;
      if (myOrder) {
        reply = `Your recent Order #${myOrder.id} is ${myOrder.status}. Total: ₹${Number(myOrder.total_amount || myOrder.total || 0).toFixed(2)}.`;
        actions = [{
          type: 'ORDER_CARD',
          order: {
            ...myOrder,
            can_settle: false,
          },
        }];
        follow_ups = ['Track my order', 'Browse more products', 'View cart'];
      } else {
        reply = "You haven't placed any orders yet. Add items to your cart to get started!";
        actions = [];
        follow_ups = ['Browse catalog', 'What is your delivery timing?', 'View cart'];
      }
      tools_used = [{ name: 'query_orders', args: { persona: 'shopper' } }];
    } else {
      const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      const multiOrderMatch = lower.match(/\b(?:last|past|recent|show|display|get|list)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+orders?\b/i);
      let reqLimit = null;
      if (multiOrderMatch) {
        reqLimit = wordToNum[multiOrderMatch[1].toLowerCase()] || parseInt(multiOrderMatch[1], 10);
      } else if (lower.includes('orders') && !lower.includes('last order') && !lower.includes('latest order')) {
        reqLimit = 3;
      }

    if (reqLimit && reqLimit > 1) {
      const allOrdersList = [
        ...DEMO_ORDERS,
        {
          id: 'ORD202600001',
          status: 'DELIVERED',
          customer: 'Rahul Sharma',
          total_amount: 62.40,
          authorized_amount: 62.40,
          captured_amount: 62.40,
          released_amount: 0,
          items_count: 4,
          payment_method: 'PAYPAL',
          order_type: 'DELIVERY',
          delivery_address: '54 Elm St, Apt 2',
          created_at: '2 days ago',
          can_settle: false,
        },
        {
          id: 'ORD202500892',
          status: 'DELIVERED',
          customer: 'Priya Verma',
          total_amount: 38.10,
          authorized_amount: 38.10,
          captured_amount: 38.10,
          released_amount: 0,
          items_count: 2,
          payment_method: 'WALLET',
          order_type: 'PICKUP',
          delivery_address: 'In-Store Pickup',
          created_at: 'Last week',
          can_settle: false,
        },
        {
          id: 'ORD202500850',
          status: 'DELIVERED',
          customer: 'Elena Rostova',
          total_amount: 74.50,
          authorized_amount: 74.50,
          captured_amount: 74.50,
          released_amount: 0,
          items_count: 5,
          payment_method: 'PAYPAL',
          order_type: 'DELIVERY',
          delivery_address: '22 Elm St, Flat 3B',
          created_at: 'Last week',
          can_settle: false,
        },
        {
          id: 'ORD202500820',
          status: 'CANCELLED',
          customer: 'Marcus Vance',
          total_amount: 19.50,
          authorized_amount: 19.50,
          captured_amount: 0,
          released_amount: 19.50,
          items_count: 1,
          payment_method: 'COD',
          order_type: 'DELIVERY',
          delivery_address: '88 Oak Avenue, Doorstep',
          created_at: '2 weeks ago',
          can_settle: false,
          rejection_reason: 'Customer requested cancellation.',
        },
        {
          id: 'ORD202500790',
          status: 'DELIVERED',
          customer: 'Dev Patel',
          total_amount: 88.00,
          authorized_amount: 88.00,
          captured_amount: 88.00,
          released_amount: 0,
          items_count: 4,
          payment_method: 'PAYPAL',
          order_type: 'DELIVERY',
          delivery_address: '10 Park Avenue',
          created_at: '3 weeks ago',
          can_settle: false,
        },
        {
          id: 'ORD202500740',
          status: 'DELIVERED',
          customer: 'Anya Taylor',
          total_amount: 42.00,
          authorized_amount: 42.00,
          captured_amount: 42.00,
          released_amount: 0,
          items_count: 3,
          payment_method: 'WALLET',
          order_type: 'PICKUP',
          delivery_address: 'In-Store Pickup',
          created_at: 'Last month',
          can_settle: false,
        },
      ];
      const targetLimit = Math.min(reqLimit, 10);
      const ordersList = allOrdersList.slice(0, targetLimit).map((o) => ({
        id: o.id,
        order_id: o.id,
        customer: o.customer,
        status: o.status,
        total: Number(o.total_amount),
        total_amount: Number(o.total_amount),
        items_count: o.items_count || (o.items ? o.items.length : 1),
        can_settle: ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status),
        created_at: o.created_at,
        payment_method: o.payment_method,
        order_type: o.order_type,
      }));
      reply = `${ordersList.length} recent orders.`;
      actions = [{
        type: 'ORDERS_LIST_CARD',
        orders: ordersList,
        count: ordersList.length,
        persona,
      }];
      tools_used = [{ name: 'get_orders_list', args: { limit: targetLimit } }];
      follow_ups = [`Inspect order ${ordersList[0]?.id}`, 'Check pending orders', 'Sales analytics'];
    } else {
      const ordMatch = lower.match(/\b(ord\d+\w*)\b/i);
      const targetId = ordMatch ? ordMatch[1].toUpperCase() : (mem.last_order_id || 'ORD202600005');
      const top = DEMO_ORDERS.find((o) => o.id === targetId) || DEMO_ORDERS[0];
      mem.last_order_id = top.id;
      reply = `Order #${top.id} details.`;
      actions = [{
        type: 'ORDER_CARD',
        order: {
          ...top,
          customer_phone: '+1 555-0192',
          delivery_address: top.delivery_address || '142 Market Street, Suite 4',
          authorized_amount: top.authorized_amount || top.total_amount,
          captured_amount: top.captured_amount ?? top.total_amount,
          released_amount: top.released_amount ?? 0,
          rejection_reason: top.rejection_reason || (top.status === 'REJECTED' ? 'Item out of stock during picking.' : null),
        },
      }];
      tools_used = [{ name: 'get_latest_order', args: { order_id: top.id } }];
      follow_ups = [`Settle order ${top.id}`, 'Check pending orders', 'Check low stock'];
    }
  }
}
  // 2b. Wallet balance / amount
  else if (
    lower.includes('wallet') &&
    (lower.includes('balance') || lower.includes('amount') || lower.includes('money') || lower.includes('check') || lower.includes('how much') || lower.includes('my wallet') || lower.includes('current'))
  ) {
    const bal = 450.00;
    const cashbacks = 65.00;
    reply = `Wallet balance: $${bal.toFixed(2)}.`;
    actions = [{
      type: 'WALLET_CARD',
      wallet: {
        balance: bal,
        pending_cashback: cashbacks,
        currency: 'USD',
        usage_policy: '100% usable on store groceries',
      },
    }];
    tools_used = [{ name: 'get_wallet_balance', args: {} }];
    follow_ups = ['Add funds to wallet', 'Apply wallet to cart', 'View wallet ledger'];
  }
  // 2c. Referral status & rewards (self or named person)
  else if (
    lower.includes('referral') ||
    lower.includes('refer and earn') ||
    lower.includes('invite code')
  ) {
    const nameMatch = prompt.match(/\b(?:of|for|about|person)\s+([A-Za-z]+)\b/i);
    const personName = nameMatch ? nameMatch[1].trim() : (persona === 'owner' ? 'Store Referral Program' : 'Your Referral Hub');
    const isNamed = Boolean(nameMatch);
    const code = isNamed ? `${personName.toUpperCase().slice(0, 6)}2026` : 'CARTREF2026';
    const friends = isNamed ? 3 : 5;
    const rewards = isNamed ? 15.00 : 25.00;

    reply = `Referral status for ${personName}: ${friends} friends invited, ₹${rewards.toFixed(2)} earned.`;
    actions = [{
      type: 'REFERRAL_STATUS_CARD',
      referral: {
        name: personName,
        code,
        friends_invited: friends,
        rewards_earned: rewards,
        reward_per_invite: 5.00,
        link: `https://cartsettle.shop/ref/${code}`,
      },
    }];
    tools_used = [{ name: 'get_referral_status', args: { name: personName } }];
    follow_ups = ['Share referral code', 'View referral ledger', 'Check rewards earned'];
  }
  // 2d. Notifications / Alerts
  else if (
    lower.includes('notification') ||
    lower.includes('notifications') ||
    lower.includes('alerts') ||
    lower.includes('my alerts')
  ) {
    const notifs = [
      { id: 1, title: 'Order #ORD202600005 Dispatched', message: 'Delivery partner is en route with your fresh groceries.', time: '5m ago', unread: true },
      { id: 2, title: 'Flash 15% Off Promo', message: 'Use code SAVE15 on fresh produce and organic dairy.', time: '1h ago', unread: false },
      { id: 3, title: 'Cashback Credited', message: '$5.00 wallet cashback credited for your recent order.', time: 'Yesterday', unread: false },
    ];
    reply = '3 notifications (1 unread).';
    actions = [{ type: 'NOTIFICATIONS_CARD', notifications: notifs }];
    tools_used = [{ name: 'read_notifications', args: { count: notifs.length } }];
    follow_ups = ['Mark all as read', 'View order tracking', 'Check promo offers'];
  }
  // 3. Pending orders
  else if (
    persona === 'owner' &&
    lower.includes('pending') &&
    lower.includes('order') &&
    !['settle', 'capture', 'pack all', 'accept all'].some((w) => lower.includes(w))
  ) {
    const pending = DEMO_ORDERS.filter((o) => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status));
    reply = pending.length
      ? `${pending.length} orders pending packing, starting with #${pending[0].id} for ${pending[0].customer} at ₹${pending[0].total_amount.toFixed(2)}.`
      : 'No pending orders.';
    actions = [{ type: 'PENDING_ORDERS', orders: pending }];
    tools_used = [{ name: 'get_pending_packing_orders', args: {} }];
    follow_ups = ['Settle all pending orders', 'Review today sales', 'Check delivery fleet'];
  }
  // 4. Settle order (Single or Bulk All Pending)
  else if (lower.includes('settle') || lower.includes('capture') || lower.includes('pack all') || lower.includes('accept all pending')) {
    if (persona !== 'owner') {
      reply = 'Order settlement and packing are restricted to store operations. Would you like to view your cart or checkout?';
      actions = [];
      tools_used = [{ name: 'auto_settle_order_packing', args: { restricted: true, persona: 'shopper' } }];
      follow_ups = ['View cart', 'Checkout', 'Browse store'];
    } else {
      const isConfirmed = Boolean(body.confirmed) || lower.includes('confirmed') || lower.includes('proceed');
      if (isConfirmed) {
        const ordMatch = lower.match(/\b(ord\d+\w*)\b/i);
        const targetId = ordMatch ? ordMatch[1].toUpperCase() : (mem.last_order_id || 'ORD202600004');
        const order = DEMO_ORDERS.find((o) => o.id === targetId) || DEMO_ORDERS[0];
        const captured = Number(order.total_amount || 45.00);
        order.status = 'ACCEPTED';
        order.captured_amount = captured;
        reply = `Order #${order.id} settled for ₹${captured.toFixed(2)}.`;
        actions = [
          { type: 'ORDER_SETTLED', order_id: order.id, captured, released: 0 },
          { type: 'REFRESH_DATA' },
        ];
        tools_used = [{ name: 'auto_settle_order_packing', args: { order_id: order.id } }];
      } else {
        reply = 'Review the order and approve payment in Orders.';
        actions = [{ type: 'PAYMENT_REVIEW', message: reply }];
        tools_used = [{ name: 'payment_review_required', args: {} }];
      }
    }
  }

  // 5. Accept / Prepare / Dispatch / Deliver / Cancel order
  else if (
    ['accept', 'prepare', 'dispatch', 'deliver', 'reject', 'cancel'].some((w) => lower.includes(w)) &&
    (lower.includes('order') || /ord\d+/i.test(lower)) &&
    !(persona === 'shopper' && !lower.includes('cancel'))
  ) {
    const ordMatch = lower.match(/\b(ord\d+\w*)\b/i);
    const targetId = ordMatch ? ordMatch[1].toUpperCase() : (mem.last_order_id || 'ORD202600002');
    const found = DEMO_ORDERS.find((o) => o.id === targetId) || DEMO_ORDERS[3];
    if (persona === 'shopper' && lower.includes('cancel')) {
      found.status = 'CANCELLED';
      reply = `Cancelled Order #${found.id}.`;
      actions = [{ type: 'CANCEL_ORDER', order_id: found.id }, { type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'cancel_shopper_order', args: { order_id: found.id } }];
    } else {
      if (lower.includes('accept')) found.status = 'ACCEPTED';
      else if (lower.includes('prepare')) found.status = 'PREPARING';
      else if (lower.includes('dispatch')) found.status = 'OUT_FOR_DELIVERY';
      else if (lower.includes('deliver')) found.status = 'DELIVERED';
      else found.status = 'REJECTED';
      reply = `Order #${found.id} marked ${found.status}.`;
      actions = [{ type: 'ORDER_CARD', order: found }, { type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'update_order_status', args: { order_id: found.id, new_status: found.status } }];
    }
  }
  // 6. Update product stock or price (or Shopper Cart Quantity Update)
  else if (
    (
      ['update', 'set', 'change', 'make'].some((w) => lower.includes(w)) ||
      ['quantity', 'qty'].some((w) => lower.includes(w))
    ) && (
      lower.includes('stock') || lower.includes('price') || lower.includes('quantity') || lower.includes('qty') || lower.includes('cart') || lower.includes('bag') || /\b\d+\b/.test(lower)
    )
  ) {
    const prod = matchSingleProduct(prompt);
    if (!prod) {
      reply = 'Which product would you like to update? Please specify the item name.';
      return { reply, voice_reply: reply, mode, actions: [], tools_used: [], follow_ups: ['View cart', 'Explore categories'], latency_ms: 10 };
    }
    const numMatch = lower.match(/(\d+(?:\.\d+)?)/g);
    const val = numMatch ? Number(numMatch[numMatch.length - 1]) : 40;
    if (persona === 'shopper' || lower.includes('quantity') || lower.includes('qty') || lower.includes('cart') || lower.includes('bag') || lower.startsWith('make ')) {
      const targetQty = Math.max(0, Math.round(val));
      const cardItem = serializeCardItem(prod, Math.max(1, targetQty));
      reply = targetQty === 0 ? `Removed ${prod.name} from your cart.` : `Updated ${prod.name} quantity to ${targetQty} in your cart.`;
      actions = targetQty === 0
        ? [{ type: 'REMOVE_FROM_CART', product_id: prod.id, name: prod.name }]
        : [{ type: 'UPDATE_CART_QTY', product_id: prod.id, name: prod.name, quantity: targetQty, item: cardItem }];
      tools_used = [{ name: 'update_cart_quantity', args: { product_id: prod.id, quantity: targetQty } }];
      return { reply, voice_reply: reply, mode, actions, tools_used, follow_ups, latency_ms: 12 };
    }
    if (lower.includes('price')) {
      prod.price = val;
      prod.regular_price = val;
      prod.offer_price = val;
      reply = `${prod.name} price set to $${val.toFixed(2)}.`;
    } else {
      prod.stock_quantity = Math.round(val);
      prod.stock = prod.stock_quantity;
      reply = `${prod.name} stock set to ${prod.stock_quantity}.`;
    }
    actions = [{ type: 'PRODUCT_UPDATED', product: { id: prod.id, name: prod.name, price: prod.price, stock: prod.stock_quantity, stock_quantity: prod.stock_quantity, margin_pct: prod.margin_pct } }, { type: 'REFRESH_DATA' }];
    tools_used = [{ name: 'update_product_inventory', args: { product_name: prod.name } }];
  }
  // 7. Restock / PayPal Payout (Single or Bulk All Low-Stock)
  else if (lower.includes('restock') || lower.includes('payout') || lower.includes('supplier') || lower.includes('replenish all')) {
    const isConfirmed = Boolean(body.confirmed) || lower.includes('confirmed') || lower.includes('proceed');
    if (isConfirmed) {
      const prod = matchSingleProduct(prompt);
      if (!prod) {
        reply = 'Please specify which product inventory to restock or review.';
        return { reply, voice_reply: reply, mode, actions: [], tools_used: [], follow_ups: ['Inspect low stock items', 'Audit pending orders'], latency_ms: 10 };
      }
      const numMatch = lower.match(/(\d+)\s*(?:units?|pcs?|items?|pack|kg|bags?)?/i);
      const qty = numMatch ? Math.max(1, parseInt(numMatch[1], 10)) : 10;
      const unitCost = Number(prod.cost_price || 5.00);
      const amountPaid = Number((qty * unitCost).toFixed(2));
      prod.stock_quantity = (prod.stock_quantity || 0) + qty;
      prod.stock = prod.stock_quantity;
      const batchId = `PAYOUT_SBX_${Date.now().toString().slice(-8)}`;
      reply = `Paid $${amountPaid.toFixed(2)} to restock ${qty} ${prod.name}.`;
      actions = [
        {
          type: 'PAYOUT_RECEIPT',
          receipt: {
            status: 'SUCCESS',
            payout_batch_id: batchId,
            amount_paid: amountPaid,
            supplier: 'wholesale@kirana.com',
            product: prod.name,
            quantity: qty,
            new_stock: prod.stock_quantity,
          },
        },
        { type: 'REFRESH_DATA' },
      ];
      tools_used = [{ name: 'execute_supplier_restock_payout', args: { product: prod.name, quantity: qty } }];
    } else {
      reply = 'Supplier payments require verified payment details and manual approval.';
      actions = [{ type: 'PAYMENT_REVIEW', message: reply }];
      tools_used = [{ name: 'payment_review_required', args: {} }];
    }
  }

  // 8. Low stock check
  else if (lower.includes('low stock') || lower.includes('inventory health') || lower.includes('out of stock')) {
    const low = DEMO_PRODUCTS.filter((p) => p.stock_quantity <= 10).map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock_quantity,
      threshold: 10,
      recommended_reorder: 20,
      recommended_restock_qty: 20,
      unit_cost: p.cost_price,
      estimated_cost: Number((20 * p.cost_price).toFixed(2)),
      estimated_payout_usd: Number((20 * p.cost_price).toFixed(2)),
    }));
    const summary = low.slice(0, 3).map((i) => `${i.name} (${i.stock} left)`).join(', ');
    reply = low.length ? `${low.length} items low on stock: ${summary}.` : 'All store inventory is healthy.';
    actions = [{ type: 'LOW_STOCK_LIST', items: low }];
    tools_used = [{ name: 'get_inventory_health', args: {} }];
  }
  // 8b. Suite 1A: Zero-Click Order Placement ("place my order", "checkout now", "buy my cart", "pay with cod", "pay with wallet")
  else if (
    persona === 'shopper' &&
    ['place order', 'place my order', 'checkout now', 'complete order', 'complete checkout', 'buy my cart', 'order my cart', 'pay with cod', 'pay with cash', 'pay with wallet', 'instant checkout'].some((k) => lower.includes(k))
  ) {
    reply = 'Review checkout before placing your order.';
    actions = [{ type: 'PAYMENT_REVIEW', message: reply }];
    tools_used = [{ name: 'payment_review_required', args: {} }];
  }

  // 8c. Suite 1B: Zero-Click Apply Promo Code ("apply promo SAVE10", "apply best coupon", "use coupon FRESH15")
  else if (
    persona === 'shopper' &&
    ['apply ', 'use ', 'best '].some((w) => lower.includes(w)) &&
    ['promo', 'coupon', 'code', 'save10', 'fresh15', 'flash'].some((w) => lower.includes(w))
  ) {
    const codeMatch = prompt.toUpperCase().match(/\b(SAVE\d+|FRESH\d+|FLASH\d+|[A-Z0-9]{5,12})\b/);
    const ignored = new Set(['APPLY', 'PROMO', 'COUPON', 'CODES', 'BEST', 'DISCOUNT', 'PLEASE']);
    const codeStr = codeMatch && !ignored.has(codeMatch[1]) ? codeMatch[1] : 'SAVE10';
    reply = `Applied promo code ${codeStr} to your cart.`;
    actions = [{ type: 'APPLY_PROMO', code: codeStr, discount_pct: 10 }];
    tools_used = [{ name: 'apply_promo_code', args: { code: codeStr } }];
  }
  // 8d. Suite 1C: Zero-Click Reorder Last Order ("reorder my last order", "repeat last order", "buy again")
  else if (
    persona === 'shopper' &&
    ['reorder', 'repeat last order', 'repeat my order', 'repeat previous order', 'buy again', 'same order again'].some((k) => lower.includes(k))
  ) {
    const catalog = getLiveCatalog();
    const cards = catalog.slice(0, 3).map((p) => serializeCardItem(p, 1));
    const totalVal = cards.reduce((s, c) => s + c.price * c.quantity, 0);
    reply = `Reordered ${cards.length} items from your last order ($${totalVal.toFixed(2)} total).`;
    actions = cards.map((c) => ({ type: 'ADD_TO_CART', item: c }));
    tools_used = [{ name: 'reorder_last_order', args: { count: cards.length } }];
  }
  // 8e. Suite 2A: Smart Budget Cart Builder ("build a cart under $20", "grocery bag under $15", "weekly essentials")
  else if (
    persona === 'shopper' &&
    (['build a cart', 'build cart', 'cart under', 'bag under', 'fill my cart', 'budget cart', 'weekly essential', 'essential bag', 'grocery bag'].some((k) => lower.includes(k)) ||
      ((lower.includes('cart') || lower.includes('bag')) && /(?:under|for|within)\s*\$?\d+/.test(lower)))
  ) {
    const bMatch = lower.match(/\$?(\d+(?:\.\d+)?)/);
    let budget = bMatch ? Number(bMatch[1]) : 20.0;
    if (budget < 3) budget = 15.0;
    const catalog = [...getLiveCatalog()].sort((a, b) => a.price - b.price);
    const chosen = [];
    let runningTotal = 0;
    for (const p of catalog) {
      if (runningTotal + p.price <= budget && chosen.length < 6) {
        chosen.push(serializeCardItem(p, 1));
        runningTotal += p.price;
      }
    }
    if (chosen.length === 0 && catalog.length > 0) {
      chosen.push(serializeCardItem(catalog[0], 1));
      runningTotal = chosen[0].price;
    }
    reply = `Added ${chosen.length} essentials to your cart for ₹${runningTotal.toFixed(2)} (within ₹${budget} budget).`;
    actions = chosen.map((c) => ({ type: 'ADD_TO_CART', item: c }));
    tools_used = [{ name: 'build_budget_cart', args: { budget, items_added: chosen.length } }];
  }
  // 8f. Suite 2B: Cheaper Alternative Swap ("swap with cheaper alternative", "replace expensive item", "cheaper option")
  else if (
    persona === 'shopper' &&
    ['swap', 'cheaper alternative', 'cheaper option', 'replace with cheaper', 'lower cost alternative'].some((k) => lower.includes(k))
  ) {
    const catalog = getLiveCatalog();
    const clientCart = Array.isArray(body.cart_items) ? body.cart_items : [];
    const highestCartItem = clientCart.length
      ? [...clientCart].sort((a, b) => Number(b.price || 0) - Number(a.price || 0))[0]
      : null;
    const cartMatchedProd = highestCartItem
      ? catalog.find((p) => Number(p.id) === Number(highestCartItem.id)) || matchSingleProduct(highestCartItem.name || '')
      : null;
    const targetProd = matchSingleProduct(prompt) || cartMatchedProd || [...catalog].sort((a, b) => b.price - a.price)[0];
    const cheaperCandidates = catalog.filter((p) => p.id !== targetProd.id && p.price < targetProd.price);
    const cheaperProd = cheaperCandidates.length
      ? cheaperCandidates.sort((a, b) => a.price - b.price)[0]
      : [...catalog].sort((a, b) => a.price - b.price)[0];
    const oldCard = serializeCardItem(targetProd, 1);
    const newCard = serializeCardItem(cheaperProd, 1);
    const savings = Math.max(0.50, Number((oldCard.price - newCard.price).toFixed(2)));
    reply = `Swapped ${oldCard.name} for ${newCard.name} at ₹${newCard.price.toFixed(2)} (saved ₹${savings.toFixed(2)}).`;
    actions = [
      { type: 'REMOVE_FROM_CART', product_id: oldCard.id, name: oldCard.name },
      { type: 'ADD_TO_CART', item: newCard },
      { type: 'SWAP_SUMMARY', removed: oldCard, added: newCard, savings },
    ];
    tools_used = [{ name: 'swap_cheaper_alternative', args: { removed: oldCard.name, added: newCard.name } }];
  }
  // 8g. Suite 4A/4B/4C: Switch Address, Wishlist/Favorites, Filter Orders
  else if (
    persona === 'shopper' &&
    ['switch address', 'change address', 'deliver to home', 'deliver to work', 'deliver to office', 'use home address', 'use work address'].some((k) => lower.includes(k))
  ) {
    const label = lower.includes('work') ? 'Work' : (lower.includes('office') ? 'Office' : 'Home');
    reply = `Switched your active delivery address to ${label}.`;
    actions = [{ type: 'SWITCH_ADDRESS', label }];
    tools_used = [{ name: 'switch_delivery_address', args: { label } }];
  } else if (
    persona === 'shopper' &&
    ['favorites to cart', 'wishlist to cart', 'buy my favorites', 'add all favorites'].some((k) => lower.includes(k))
  ) {
    reply = 'Added your saved favorites to your cart.';
    actions = [{ type: 'MOVE_FAVORITES_TO_CART' }];
    tools_used = [{ name: 'move_favorites_to_cart', args: {} }];
  } else if (
    persona === 'shopper' &&
    ['to favorites', 'to wishlist', 'save to favorite', 'favorite ', 'wishlist '].some((k) => lower.includes(k))
  ) {
    const prod = matchSingleProduct(prompt);
    if (!prod) {
      reply = 'Which product would you like to save to your favorites?';
      return { reply, voice_reply: reply, mode, actions: [], tools_used: [], follow_ups: ['Explore categories', 'View cart'], latency_ms: 10 };
    }
    const card = serializeCardItem(prod, 1);
    reply = `Saved ${prod.name} to your favorites.`;
    actions = [{ type: 'TOGGLE_FAVORITE', product_id: prod.id, name: prod.name, item: card }];
    tools_used = [{ name: 'toggle_favorite_product', args: { product_id: prod.id } }];
  } else if (
    persona === 'shopper' &&
    lower.includes('order') &&
    ['delivered', 'cancelled', 'pending', 'processing', 'this month', 'filter'].some((k) => lower.includes(k))
  ) {
    const qTerm = lower.includes('delivered') ? 'DELIVERED' : (lower.includes('cancelled') ? 'CANCELLED' : (lower.includes('pending') ? 'PENDING' : ''));
    const path = qTerm ? `/profile/orders?q=${qTerm}` : '/profile/orders';
    reply = `Showing your ${qTerm.toLowerCase() || 'filtered'} orders.`;
    actions = [{ type: 'NAVIGATE', path }];
    tools_used = [{ name: 'filter_shopper_orders', args: { filter: qTerm } }];
  } else if (
    persona === 'owner' &&
    lower.includes('all ') &&
    ['dairy', 'bakery', 'produce', 'pantry'].some((c) => lower.includes(c)) &&
    ['discount', '% off', 'reduce price', 'stock', 'increase'].some((w) => lower.includes(w))
  ) {
    const catKw = ['dairy', 'bakery', 'produce', 'pantry'].find((c) => lower.includes(c)) || 'dairy';
    const pctMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
    const pctVal = pctMatch ? Number(pctMatch[1]) : 10;
    const catProds = DEMO_PRODUCTS.filter((p) => String(p.category || '').toLowerCase().includes(catKw));
    const targets = catProds.length ? catProds : DEMO_PRODUCTS.slice(0, 3);
    for (const p of targets) {
      if (lower.includes('stock')) {
        p.stock_quantity += Math.round(pctVal);
        p.stock = p.stock_quantity;
      } else {
        p.offer_price = Number((p.regular_price * (1 - Math.min(pctVal, 25) / 100)).toFixed(2));
        p.price = p.offer_price;
      }
    }
    reply = `Updated ${targets.length} ${catKw.charAt(0).toUpperCase() + catKw.slice(1)} products immediately.`;
    actions = [
      {
        type: 'BULK_INVENTORY_UPDATED',
        category: catKw.charAt(0).toUpperCase() + catKw.slice(1),
        count: targets.length,
        summary: `Updated ${targets.length} ${catKw} products`,
      },
      { type: 'REFRESH_DATA' },
    ];
    tools_used = [{ name: 'update_product_inventory', args: { category: catKw, count: targets.length } }];
  }
  // 9. Margin / Discount negotiation (bundle or single item)
  else if (
    ['bargain', 'discount', 'margin', '% off', 'round figure', 'best price', 'cheaper price', 'reduce price', 'lower price', 'can you do'].some((k) => lower.includes(k)) ||
    ((lower.includes('make it') || lower.includes('give it')) && (lower.includes('₹') || lower.includes('rs') || /\b\d{2,}\b/.test(lower)))
  ) {
    const clientCart = Array.isArray(body.cart_items) ? body.cart_items : [];
    const matchedProd = matchSingleProduct(prompt);
    const moneyMatch = lower.match(/(?:₹|\brs\.?|\binr)\s*(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:₹|\brs\b|\brupees|\/-)/);
    const targetAmt = moneyMatch ? Number((moneyMatch[1] || moneyMatch[2]).replace(/,/g, '')) : null;
    const pctMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
    const reqPct = pctMatch ? Number(pctMatch[1]) : null;

    if (clientCart.length > 0 && !matchedProd) {
      // Whole-cart bundle bargaining
      let originalTotal = 0;
      let minFloorTotal = 0;
      const lines = clientCart.map((item) => {
        const qty = Math.max(1, Number(item.quantity || 1));
        const price = Number(item.price || item.unit_price || 0);
        const floorUnit = Math.round(price * 0.91);
        originalTotal += price * qty;
        minFloorTotal += floorUnit * qty;
        return {
          product_id: Number(item.id || item.product_id),
          product_name: item.name || item.product_name || 'Item',
          quantity: qty,
          catalog_unit: price,
          floor_unit: floorUnit,
        };
      });

      let desiredTotal = targetAmt;
      if (desiredTotal === null && reqPct !== null) {
        desiredTotal = originalTotal * (1 - reqPct / 100);
      } else if (desiredTotal === null) {
        desiredTotal = originalTotal * 0.95;
      }

      const safeDealTotal = Math.max(minFloorTotal, Math.round(desiredTotal / 5) * 5);
      const isApproved = safeDealTotal <= desiredTotal + 2;
      const savings = Math.max(0, originalTotal - safeDealTotal);
      const savingsPct = originalTotal > 0 ? Number(((savings / originalTotal) * 100).toFixed(1)) : 0;

      const dealLines = lines.map((l) => {
        const ratio = originalTotal > 0 ? (l.catalog_unit * l.quantity) / originalTotal : 1 / lines.length;
        const lineTotal = Math.max(l.floor_unit, Math.round((safeDealTotal * ratio) / l.quantity));
        return {
          ...l,
          deal_unit: lineTotal,
          deal_line_total: lineTotal * l.quantity,
          savings_line: Math.max(0, (l.catalog_unit - lineTotal) * l.quantity),
        };
      });

      const decision = {
        status: isApproved ? 'APPROVED' : 'COUNTER_OFFER',
        product: `Your basket (${lines.length} items)`,
        original_total: originalTotal,
        deal_total: safeDealTotal,
        savings: savings,
        savings_pct: savingsPct,
        lines: dealLines,
        final_price: safeDealTotal,
        counter_price: safeDealTotal,
        counter_discount_pct: savingsPct,
        discount_approved_pct: savingsPct,
        message: isApproved
          ? `Approved! Your entire basket is discounted to ₹${safeDealTotal.toFixed(2)} with our 12% Margin Guard preserved.`
          : `Counter-offer: Store 12% safety margin floor protects store profitability. Best round figure is ₹${safeDealTotal.toFixed(2)} (saving ₹${savings.toFixed(2)}).`,
      };

      reply = isApproved
        ? `Approved! Locked in ₹${safeDealTotal.toFixed(2)} for your basket (you save ₹${savings.toFixed(2)}).`
        : `Counter-offer: Best safe price for your basket is ₹${safeDealTotal.toFixed(2)} to protect our 12% margin floor.`;
      actions = [{ type: 'MARGIN_DECISION', decision }];
      tools_used = [{ name: 'bargain_and_guard_margin', args: { target_total: safeDealTotal } }];
    } else if (lower.includes('%') || lower.includes('off') || lower.includes('discount') || lower.includes('bargain')) {
      const prod = matchedProd || DEMO_PRODUCTS[2];
      const parsedPct = reqPct || 15;
      const approved = parsedPct <= prod.max_safe_discount_pct;
      const dealPrice = approved ? Number((prod.price * (1 - parsedPct / 100)).toFixed(2)) : prod.best_deal_price;
      const cardItem = serializeCardItem(prod, 1, dealPrice);
      const savings = Math.max(0, prod.price - dealPrice);
      const savingsPct = prod.price > 0 ? Number(((savings / prod.price) * 100).toFixed(1)) : 0;
      const decision = {
        status: approved ? 'APPROVED' : 'COUNTER_OFFER',
        product: prod.name,
        original_price: prod.price,
        original_total: prod.price,
        deal_total: dealPrice,
        savings: savings,
        savings_pct: savingsPct,
        requested_discount_pct: parsedPct,
        discount_approved_pct: approved ? parsedPct : prod.max_safe_discount_pct,
        counter_discount_pct: prod.max_safe_discount_pct,
        final_price: dealPrice,
        counter_price: prod.best_deal_price,
        lines: [{
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          catalog_unit: prod.price,
          deal_unit: dealPrice,
          deal_line_total: dealPrice,
          savings_line: savings,
        }],
        item: cardItem,
      };
      reply = approved
        ? `Approved ${parsedPct}% off ${prod.name} at ₹${dealPrice.toFixed(2)}.`
        : `Max discount on ${prod.name} is ${prod.max_safe_discount_pct}% at ₹${prod.best_deal_price.toFixed(2)}.`;
      actions = [
        { type: 'MARGIN_DECISION', decision },
        ...(persona === 'shopper' ? [{ type: 'SEARCH_RESULTS', items: [cardItem] }] : []),
      ];
      tools_used = [{ name: 'bargain_and_guard_margin', args: { product_name: prod.name, requested_discount_pct: parsedPct } }];
    } else if (matchedProd) {
      reply = `${matchedProd.name} has a ${matchedProd.margin_pct.toFixed(1)}% margin, selling at ₹${matchedProd.price.toFixed(2)} with ₹${matchedProd.cost_price.toFixed(2)} cost and ${matchedProd.max_safe_discount_pct.toFixed(1)}% max safe discount.`;
      actions = [{ type: 'MARGIN_LIST', products: [{ ...matchedProd, selling_price: matchedProd.price }] }];
      tools_used = [{ name: 'inspect_margin', args: { query: matchedProd.name } }];
    } else {
      reply = 'Store margins average 23.2%, well above the 12% protected floor.';
      actions = [{ type: 'MARGIN_LIST', products: DEMO_PRODUCTS.slice(0, 4).map((p) => ({ ...p, selling_price: p.price })) }];
      tools_used = [{ name: 'inspect_margin', args: {} }];
    }
  }
  // 9b. Bulk Add All or Random In-Stock Items ("add 10 random items", "add 10 random products", "add all in stock to cart", "add all items into the part")
  else if (
    ['add ', 'put ', 'buy ', 'fill ', 'get '].some((w) => lower.includes(w)) &&
    (
      ['all items', 'all the items', 'all products', 'everything in stock', 'all in stock', 'all in-stock'].some((k) => lower.includes(k)) ||
      (['random', 'different', 'diverse', 'any'].some((w) => lower.includes(w)) && ['item', 'items', 'product', 'products', 'grocer', 'groceries'].some((w) => lower.includes(w))) ||
      /\b(?:add|put|buy|fill)\s+\d+\s+(?:random\s+)?(?:items|products|groceries)\b/.test(lower) ||
      (lower.includes('random') && ['cart', 'bag', 'basket', 'part'].some((w) => lower.includes(w)))
    )
  ) {
    const catalog = getLiveCatalog().filter((p) => (p.stock_quantity ?? p.stock ?? 1) > 0);
    if (catalog.length === 0) {
      reply = 'No in-stock products are available to add.';
      actions = [];
      tools_used = [];
    } else {
      const cntMatch = lower.match(/\b(\d+)\b/);
      let chosen = [];
      if (cntMatch && !['all', 'everything'].some((w) => lower.includes(w))) {
        const reqQty = Math.max(1, Math.min(Number(cntMatch[1]), catalog.length));
        if (lower.includes('random') || reqQty < catalog.length) {
          const shuffled = [...catalog].sort(() => 0.5 - Math.random());
          chosen = shuffled.slice(0, reqQty);
        } else {
          chosen = catalog.slice(0, reqQty);
        }
      } else if (['all', 'everything'].some((w) => lower.includes(w))) {
        chosen = [...catalog];
      } else {
        const targetCnt = Math.min(5, catalog.length);
        const shuffled = [...catalog].sort(() => 0.5 - Math.random());
        chosen = shuffled.slice(0, targetCnt);
      }

      actions = [];
      tools_used = [];
      let totalVal = 0;
      for (const p of chosen) {
        const card = serializeCardItem(p, 1);
        actions.push({ type: 'ADD_TO_CART', item: card });
        tools_used.push({ name: 'add_to_shopper_cart', args: { product_name: p.name, quantity: 1 } });
        totalVal += Number(card.price || 0);
      }

      if (lower.includes('random')) {
        reply = `Added ${chosen.length} random in-stock items to your cart for ₹${totalVal.toFixed(2)} total.`;
      } else if (['all', 'everything'].some((w) => lower.includes(w))) {
        reply = `Added all ${chosen.length} in-stock items to your cart for ₹${totalVal.toFixed(2)} total.`;
      } else {
        reply = `Added ${chosen.length} in-stock items to your cart for ₹${totalVal.toFixed(2)} total.`;
      }
    }
  }
  // 10. Clear cart ("clear", "clear my cart", "clear the cart", "remove all cart items", "remove all", "empty cart")
  else if (
    !matchSingleProduct(prompt) && (
      lower === 'clear' ||
      lower === 'clear it' ||
      lower === 'empty' ||
      [
        'clear cart', 'clear my cart', 'clear the cart', 'empty cart', 'empty my cart', 'empty the cart', 'empty bag',
        'remove the cart items', 'remove cart items', 'remove all cart items', 'remove all items',
        'remove all from cart', 'remove all from my cart', 'remove items from cart', 'remove everything',
        'delete all', 'delete cart items', 'delete all items', 'clean cart', 'reset cart',
      ].some((k) => lower.includes(k)) ||
      ((lower.includes('remove') || lower.includes('delete') || lower.includes('clear')) &&
        (lower.includes('all') || lower.includes('everything')) &&
        (lower.includes('cart') || lower.includes('bag') || lower.includes('items')))
    )
  ) {
    reply = 'Removed all items from your cart.';
    actions = [{ type: 'CLEAR_CART', removed_items: Array.isArray(body.cart_items) ? body.cart_items : [] }];
    tools_used = [{ name: 'clear_shopper_cart', args: {} }];
  }
  // 10b. Remove specific item(s) or reduce quantity from cart
  else if (
    (
      ['reduce ', 'decrease ', 'lower ', 'less ', 'drop ', 'take away', 'take out '].some((w) => lower.includes(w)) ||
      (['remove ', 'delete '].some((w) => lower.includes(w)) && /\b\d+\b/.test(lower)) ||
      (lower.includes('cancel') && !['order', 'checkout', 'sub'].some((w) => lower.includes(w))) ||
      ['remove ', 'delete ', 'take out '].some((w) => lower.includes(w))
    ) && (lower.includes('cart') || lower.includes('bag') || matchSingleProduct(prompt) || (Array.isArray(body.cart_items) && body.cart_items.length > 0))
  ) {
    const clientCart = Array.isArray(body.cart_items) ? body.cart_items : [];
    const isReduceQty = ['reduce ', 'decrease ', 'lower ', 'less ', 'drop ', 'take away'].some((w) => lower.includes(w)) ||
      /\btake\s+.*\baway\b/.test(lower) ||
      (['remove ', 'delete ', 'take out '].some((w) => lower.includes(w)) && /\b\d+\b/.test(lower));

    if (isReduceQty) {
      let matchedCi = null;
      for (const ci of clientCart) {
        const cName = String(ci.name || ci.product_name || '').toLowerCase();
        const tokens = cName.split(/\s+/).filter((t) => t.length >= 3);
        if ((cName && lower.includes(cName)) || tokens.some((tk) => lower.includes(tk))) {
          matchedCi = ci;
          break;
        }
      }
      if (!matchedCi) {
        const pMatch = matchSingleProduct(prompt);
        if (pMatch && clientCart.length > 0) {
          matchedCi = clientCart.find((ci) => Number(ci.id || ci.product_id) === pMatch.id);
        }
      }
      if (matchedCi) {
        const currentQty = Number(matchedCi.quantity || 1);
        const numM = lower.match(/\b(?:by\s+)?(\d+)\b/);
        const delta = numM ? Number(numM[1]) : 1;
        const newQty = currentQty - delta;
        const ciId = Number(matchedCi.id || matchedCi.product_id || 0);
        const ciName = matchedCi.name || matchedCi.product_name || 'Item';
        const ciPrice = Number(matchedCi.price || matchedCi.unit_price || 0);
        if (newQty > 0) {
          const cardItem = { id: ciId, name: ciName, price: ciPrice, quantity: newQty };
          reply = `Updated ${ciName} quantity to ${newQty}.`;
          actions = [{ type: 'UPDATE_CART_QTY', product_id: ciId, name: ciName, quantity: newQty, item: cardItem }];
          tools_used = [{ name: 'update_cart_quantity', args: { product_id: ciId, quantity: newQty } }];
        } else {
          reply = `Removed ${ciName} from your cart.`;
          actions = [{ type: 'REMOVE_FROM_CART', product_id: ciId, name: ciName, item: matchedCi, items: [matchedCi] }];
          tools_used = [{ name: 'remove_from_shopper_cart', args: { product_id: ciId } }];
        }
        return { reply, voice_reply: reply, mode, actions, tools_used, follow_ups, latency_ms: 12 };
      } else if (clientCart.length === 0) {
        reply = 'Your cart is currently empty.';
        actions = [];
        tools_used = [];
        return { reply, voice_reply: reply, mode, actions, tools_used, follow_ups, latency_ms: 12 };
      } else {
        reply = 'That item is not in your cart.';
        actions = [];
        tools_used = [];
        return { reply, voice_reply: reply, mode, actions, tools_used, follow_ups, latency_ms: 12 };
      }
    }

    const matchedFromClientCart = clientCart.filter((ci) => {
      const cName = String(ci.name || ci.product_name || '').toLowerCase();
      const tokens = cName.split(/\s+/).filter((t) => t.length >= 3);
      return (cName && lower.includes(cName)) || tokens.some((tk) => lower.includes(tk));
    });

    if (matchedFromClientCart.length > 0) {
      const serializedRemoved = matchedFromClientCart.map((ci) => ({
        id: Number(ci.id || ci.product_id || ci.product),
        name: ci.name || ci.product_name || 'Item',
        price: Number(ci.price || ci.unit_price || 0),
        quantity: Number(ci.quantity || 1),
      }));
      const namesStr = serializedRemoved.map((c) => c.name).join(', ');
      const firstCard = serializedRemoved[0];
      reply = `Removed ${namesStr} from your cart.`;
      actions = [
        {
          type: 'REMOVE_FROM_CART',
          product_id: firstCard.id,
          name: namesStr,
          item: firstCard,
          items: serializedRemoved,
        },
      ];
      tools_used = [{ name: 'remove_from_shopper_cart', args: { product_id: firstCard.id } }];
    } else {
      let itemsWithQty = extractItemsWithQuantities(prompt);
      if (itemsWithQty.length === 0) {
        const single = matchSingleProduct(prompt);
        if (single) {
          itemsWithQty = [{ prod: single, qty: 1 }];
        }
      }
      if (itemsWithQty.length === 0) {
        // User asked to remove from cart without a specific item -> clear the cart
        reply = 'Removed all items from your cart.';
        actions = [{ type: 'CLEAR_CART', removed_items: clientCart }];
        tools_used = [{ name: 'clear_shopper_cart', args: {} }];
      } else {
        const serializedRemoved = itemsWithQty.map(({ prod, qty }) => serializeCardItem(prod, qty));
        const namesStr = itemsWithQty.map(({ prod }) => prod.name).join(', ');
        const firstCard = serializedRemoved[0];
        reply = `Removed ${namesStr} from your cart.`;
        actions = [
          {
            type: 'REMOVE_FROM_CART',
            product_id: firstCard.id,
            name: namesStr,
            item: firstCard,
            items: serializedRemoved,
          },
        ];
        tools_used = [{ name: 'remove_from_shopper_cart', args: { product_id: firstCard.id } }];
      }
    }
  }
  // 11. Multi-Item or Single-Item Add to Cart (including contextual "add all of them" / "add these")
  else if (
    !['how much', 'what is', 'cost of', 'price of', 'do you', 'suggest'].some((q) => lower.startsWith(q)) &&
    !['making ', 'cooking ', 'suggest ', 'requirements', 'recipe', 'ingredients'].some((k) => lower.includes(k)) &&
    ['add ', 'put ', 'buy ', 'get me ', 'i want ', "i'll take ", 'to my cart', 'to cart'].some((w) => lower.includes(w)) &&
    !['i want you', 'i want to know', 'i want to see', 'i want to ask', 'who are you', 'what can you do', 'i need you', 'who r u', 'tell me about'].some((p) => lower.includes(p))
  ) {
    let itemsWithQty = extractItemsWithQuantities(prompt);
    if (
      itemsWithQty.length === 0 &&
      Array.isArray(mem.last_suggested_items) &&
      mem.last_suggested_items.length > 0 &&
      ['all', 'them', 'these', 'those', 'both', 'first', 'suggested', 'items', 'products'].some((w) => lower.includes(w))
    ) {
      const subset = lower.includes('first two') || lower.includes('first 2')
        ? mem.last_suggested_items.slice(0, 2)
        : lower.includes('first')
          ? mem.last_suggested_items.slice(0, 1)
          : mem.last_suggested_items;
      itemsWithQty = subset.map((it) => ({ prod: it, qty: Number(it.quantity || 1) }));
    }
    if (itemsWithQty.length === 0) {
      reply = 'Which product would you like to add? Tell me the grocery name or browse our categories.';
      actions = [];
      tools_used = [];
      return {
        reply,
        voice_reply: reply,
        mode,
        actions: [],
        tools_used: [],
        follow_ups: ['Explore categories', 'Show Dairy & Eggs', 'Show popular snacks'],
        latency_ms: 12,
      };
    }
    actions = [];
    tools_used = [];
    const parts = [];
    let grandTotal = 0;
    for (const { prod, qty } of itemsWithQty) {
      const cardItem = serializeCardItem(prod, qty);
      actions.push({ type: 'ADD_TO_CART', item: cardItem });
      tools_used.push({ name: 'add_to_shopper_cart', args: { product_name: prod.name, quantity: qty } });
      grandTotal += prod.price * qty;
      parts.push(`${qty} ${prod.name}`);
    }
    reply = parts.length === 1
      ? `Added ${parts[0]} for ₹${grandTotal.toFixed(2)}.`
      : `Added ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]} for ₹${grandTotal.toFixed(2)} total.`;
  }
  // 12. Universal Dish, Recipe & Occasion Ingredient Engine (25+ Indian & Global Dishes)
  else if (
    (
      !['show me ', 'find ', 'search ', 'do you have ', 'what ', 'browse '].some((p) => lower.startsWith(p)) ||
      ['recipe', 'ingredients', 'meal plan', 'basket', 'cook', 'making', 'prepare', 'dish requirements'].some((k) => lower.includes(k))
    ) &&
    [
      'biryani', 'biriyani', 'pulao', 'fried rice', 'paneer', 'butter chicken', 'curry', 'masala',
      'dal', 'tadka', 'chole', 'dosa', 'idli', 'roti', 'paratha',
      'chai', 'tea', 'coffee', 'dinner', 'breakfast', 'lunch',
      'smoothie', 'recipe', 'basket', 'meal', 'salad', 'ingredients',
      'requirements', 'making ', 'cooking ', 'prepare ', 'sandwich', 'burger', 'pizza', 'taco',
      'baking', 'cake', 'oatmeal', 'party', 'protein', 'keto',
    ].some((k) => lower.includes(k))
  ) {
    const catalog = getLiveCatalog();
    let recipe = 'Chef Special';
    let keywords = [];

    if (lower.includes('biryani') || lower.includes('biriyani') || lower.includes('pulao') || lower.includes('fried rice')) {
      recipe = 'Hyderabadi Biryani';
      keywords = ['rice', 'basmati', 'yogurt', 'curd', 'ghee', 'milk', 'spice', 'onion', 'tomato', 'sauce', 'atta', 'cheese'];
    } else if (lower.includes('butter chicken') || lower.includes('paneer') || lower.includes('curry') || lower.includes('masala')) {
      recipe = lower.includes('butter chicken') ? 'Butter Chicken Masala' : 'Paneer Butter Masala';
      keywords = ['paneer', 'cheese', 'tomato', 'sauce', 'milk', 'butter', 'yogurt', 'bread', 'atta'];
    } else if (lower.includes('dal') || lower.includes('tadka') || lower.includes('chole') || lower.includes('roti') || lower.includes('paratha')) {
      recipe = 'Dal Tadka & Roti';
      keywords = ['atta', 'rice', 'tomato', 'sauce', 'yogurt', 'milk', 'bread'];
    } else if (lower.includes('dosa') || lower.includes('idli')) {
      recipe = 'South Indian Tiffin';
      keywords = ['rice', 'yogurt', 'milk', 'tomato', 'sauce', 'cheese'];
    } else if (lower.includes('chai') || lower.includes('tea') || lower.includes('coffee')) {
      recipe = 'Masala Chai & Bakery';
      keywords = ['milk', 'tea', 'bread', 'sourdough', 'honey', 'yogurt'];
    } else if (lower.includes('breakfast') || lower.includes('sandwich') || lower.includes('toast') || lower.includes('oatmeal')) {
      recipe = 'Morning Breakfast';
      keywords = ['egg', 'bread', 'sourdough', 'milk', 'avocado', 'yogurt', 'strawberry'];
    } else if (lower.includes('salad') || lower.includes('healthy') || lower.includes('keto') || lower.includes('protein')) {
      recipe = lower.includes('protein') ? 'High-Protein Bowl' : 'Fresh Garden Salad';
      keywords = ['egg', 'yogurt', 'avocado', 'cheese', 'strawberry', 'milk'];
    } else if (lower.includes('smoothie') || lower.includes('berry')) {
      recipe = 'Berry Protein Smoothie';
      keywords = ['strawberry', 'yogurt', 'milk', 'avocado'];
    } else if (lower.includes('baking') || lower.includes('cake') || lower.includes('party')) {
      recipe = lower.includes('party') ? 'Party Snack Kit' : 'Fresh Baking Kit';
      keywords = ['egg', 'milk', 'strawberry', 'cheese', 'bread', 'yogurt'];
    } else {
      recipe = 'Pasta Dinner';
      keywords = ['pasta', 'marinara', 'sauce', 'cheese', 'parmigiano', 'bread'];
    }

    const picked = [];
    const seenIds = new Set();
    for (const kw of keywords) {
      for (const p of catalog) {
        if (!seenIds.has(p.id) && (p.name.toLowerCase().includes(kw) || (p.aliases || []).includes(kw) || String(p.category || '').toLowerCase().includes(kw))) {
          picked.push(p);
          seenIds.add(p.id);
          if (picked.length >= 4) break;
        }
      }
      if (picked.length >= 4) break;
    }
    for (const p of catalog) {
      if (picked.length >= 4) break;
      if (!seenIds.has(p.id)) {
        picked.push(p);
        seenIds.add(p.id);
      }
    }

    const items = picked.slice(0, 4).map((p) => serializeCardItem(p, 1));
    mem.last_suggested_items = items;
    const total = items.reduce((s, i) => s + i.price, 0);
    reply = `Here are ${items.length} essentials for ${recipe} at ₹${total.toFixed(2)}.`;
    actions = [{ type: 'RECOMMEND_BASKET', items, recipe }];
    tools_used = [{ name: 'recommend_recipe_basket', args: { recipe_name: recipe, budget: 25 } }];
  }
  // 13. Multi-Item Cost Calculation ("How much for 2 milk and 1 bread?")
  else if (['how much', 'total for', 'cost for', 'price for', 'cost of'].some((k) => lower.includes(k)) && extractItemsWithQuantities(prompt).length > 0 && (extractItemsWithQuantities(prompt).length > 1 || extractItemsWithQuantities(prompt)[0].qty > 1)) {
    const calcItems = extractItemsWithQuantities(prompt);
    let totalCost = 0;
    const parts = [];
    const cards = [];
    for (const { prod, qty } of calcItems) {
      const sub = prod.price * qty;
      totalCost += sub;
      parts.push(`${qty} ${prod.name} at ₹${sub.toFixed(2)}`);
      cards.push(serializeCardItem(prod, qty));
    }
    reply = `${parts.join(' plus ')} comes to $${totalCost.toFixed(2)} total.`;
    actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    tools_used = [{ name: 'search_products_and_stock', args: { query: prompt } }];
  }
  // 14. Specific Product Match Q&A (Price, Stock, Availability, Deals)
  else if (matchProductsFromText(prompt, 6).length > 0) {
    const matched = matchProductsFromText(prompt, 6);
    const cards = matched.map((p) => serializeCardItem(p, 1));
    if (matched.length === 1) {
      const p0 = matched[0];
      if (lower.includes('deal') || lower.includes('offer')) {
        reply = `${p0.name} is ₹${p0.price.toFixed(2)} per ${p0.unit} with ${p0.stock_quantity} in stock, and best deal is ₹${p0.best_deal_price.toFixed(2)} at ${p0.max_safe_discount_pct}% off.`;
      } else if (['how many', 'stock', 'available', 'have', 'left'].some((k) => lower.includes(k))) {
        reply = `${p0.name} has ${p0.stock_quantity} in stock at ₹${p0.price.toFixed(2)} per ${p0.unit}.`;
      } else {
        reply = `${p0.name} is $${p0.price.toFixed(2)} per ${p0.unit} with ${p0.stock_quantity} in stock.`;
      }
    } else {
      const summary = cards.slice(0, 3).map((c) => `${c.name} at ₹${c.price.toFixed(2)}`).join(', ');
      reply = `Found ${cards.length} matching items: ${summary}.`;
    }
    actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    tools_used = [{ name: 'search_products_and_stock', args: { query: matched[0].name } }];
  }
  // 15. Category & Budget Browse ("dairy", "bakery", "produce", "pantry", "snacks", "drinks")
  else if (['dairy', 'bakery', 'produce', 'pantry', 'find', 'search', 'deal', 'grocer', 'under $', 'snack', 'drink', 'beverage', 'colddrink', 'show me', 'browse'].some((k) => lower.includes(k))) {
    let filtered = [...DEMO_PRODUCTS];
    let label = 'store';
    if (lower.includes('dairy')) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes('dairy'));
      label = 'Dairy & Eggs';
    } else if (lower.includes('bakery')) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes('bakery'));
      label = 'Bakery';
    } else if (lower.includes('produce') || lower.includes('fruit') || lower.includes('vegetable')) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes('produce'));
      label = 'Produce';
    } else if (lower.includes('pantry') || lower.includes('pasta')) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes('pantry'));
      label = 'Pantry';
    } else if (lower.includes('beverage') || lower.includes('drink') || lower.includes('colddrink') || lower.includes('soda')) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes('beverage'));
      label = 'Beverages';
    } else if (lower.includes('snack')) {
      const snackMatch = filtered.filter((p) => p.category.toLowerCase().includes('snack'));
      if (snackMatch.length > 0) {
        filtered = snackMatch;
        label = 'Snacks';
      } else {
        filtered = filtered.filter((p) => /bakery|produce|beverage/i.test(p.category));
        label = 'Snacks & Refreshments';
      }
    }
    const items = filtered.slice(0, 6).map((p) => serializeCardItem(p, 1));
    const topNames = items.slice(0, 3).map((c) => `${c.name} ($${c.price.toFixed(2)})`).join(', ');
    reply = `${items.length} ${label} items available: ${topNames}.`;
    actions = [{ type: 'SEARCH_RESULTS', items }];
    tools_used = [{ name: 'search_products_and_stock', args: { query: label } }];
  }
  // 16. Universal Intelligence: Math, Coding, Analysis, Writing & Store Concierge
  else {
    const catalog = getLiveCatalog();
    const mathMatch = lower.match(/(?:calculate|solve|what is|compute)?\s*([0-9\.\s\+\-\*\/\(\)\^%]{3,}[0-9])/);
    if (['calculate', 'solve', 'what is', 'compute', 'math', 'sum', 'multiply', 'divide'].some((w) => lower.includes(w)) && mathMatch) {
      try {
        const sanitized = mathMatch[1].replace(/[^0-9\.\+\-\*\/\(\)\s%]/g, '');
        // Safe evaluation of basic math expressions
        const calcVal = Function(`'use strict'; return (${sanitized})`)();
        const formatted = Number.isFinite(calcVal) ? (Number.isInteger(calcVal) ? String(calcVal) : calcVal.toFixed(2)) : 'Calculation error';
        reply = `${mathMatch[1].trim()} = ${formatted}`;
        actions = [{ type: 'CALCULATION_RESULT', expression: mathMatch[1].trim(), result: calcVal }];
        tools_used = [{ name: 'calculate_expression', args: { expression: mathMatch[1].trim() } }];
      } catch {
        reply = 'Unable to compute expression.';
        actions = [];
        tools_used = [];
      }
    } else if (['python', 'javascript', 'typescript', 'django', 'react', 'docker', 'kubernetes', 'sql', 'database index', 'b-tree', 'rest api', 'microservices'].some((k) => lower.includes(k))) {
      reply = persona === 'owner'
        ? "I am CartSettle's store operations copilot. I focus exclusively on store analytics, orders, margins, settlements, and inventory. How can I assist with store operations?"
        : "I am CartSettle's grocery shopping assistant. I specialize strictly in store products, orders, pricing, and policies. What groceries can I help you find today?";
      actions = [];
      tools_used = [{ name: 'store_domain_guardrail', args: { restricted: true } }];
    } else if (['analyze', 'analysis', 'statistics', 'average', 'word count'].some((w) => lower.includes(w))) {
      const words = prompt.trim().split(/\s+/).filter(Boolean);
      const nums = (prompt.match(/-?\b\d+(?:\.\d+)?\b/g) || []).map(Number);
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        const avg = (sum / nums.length).toFixed(2);
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        reply = `Analysis complete: ${nums.length} data points, sum=${sum}, average=${avg}, min=${min}, max=${max}.`;
        actions = [{ type: 'DATA_ANALYSIS', summary: reply, stats: { count: nums.length, sum, avg: Number(avg), min, max } }];
      } else {
        reply = `Text analysis: ${words.length} words processed.`;
        actions = [{ type: 'DATA_ANALYSIS', summary: reply, stats: { word_count: words.length } }];
      }
      tools_used = [{ name: 'analyze_data_or_text', args: { content: prompt } }];
    } else if (['draft', 'write an email', 'apology letter', 'compose'].some((w) => lower.includes(w))) {
      reply = 'Subject: Important Update Regarding Your Request\n\nDear Customer,\n\nThank you for reaching out to us. We are currently addressing your request with high priority and will ensure all details are verified and delivered promptly.\n\nSincerely,\nCartSettle Operations Team';
      actions = [];
      tools_used = [];
    } else if (
      /\b(?:how\s+are\s+you(?:\s+today)?|how(?:'s|\s+is)\s+it\s+going|how\s+are\s+things|what(?:'s|\s+is)\s+up|kaise\s+ho|namaste)\b/i.test(lower) ||
      /^(?:hi|hello|hey|good\s+(?:morning|evening|afternoon)|namaste)[.!]?$/i.test(lower)
    ) {
      reply =
        persona === 'owner'
          ? 'Doing well, store is open and running smoothly. What would you like to review today?'
          : 'Doing great, thank you. What can I help you find or order today?';
      actions = [];
    } else if (/\b(?:thank\s+you(?:\s+so\s+much)?|thanks(?:\s+a\s+lot)?|appreciate\s+it|dhanyawad|shukriya)\b/i.test(lower)) {
      reply =
        persona === 'owner'
          ? 'Glad to help. Ready for the next operational task.'
          : "You're welcome. Let me know if you need anything else for your cart.";
      actions = [];
    } else if (/^(?:ok|okay|alright|got\s+it|understood|cool|theek\s+hai|achha)[.!]?$/i.test(lower)) {
      reply =
        persona === 'owner'
          ? 'Standing by for your next instruction.'
          : 'Ready whenever you are. What would you like to add next?';
      actions = [];
    } else if (/^(?:bye|goodbye|see\s+you(?:\s+later)?|good\s+night|exit|close)[.!]?$/i.test(lower)) {
      reply =
        persona === 'owner'
          ? 'Session paused. Store monitoring remains active.'
          : 'Have a wonderful day. Come back anytime.';
      actions = [];
    } else if (['what can you do', 'who are you', 'capabilities', 'help me', 'how can you help'].some((k) => lower.includes(k))) {
      reply =
        persona === 'owner'
          ? 'I am your CartSettle store operations assistant. I can audit orders, settle PayPal partial captures, track inventory, credit wallets, and review analytics.'
          : 'I am your CartSettle grocery co-pilot. I can find products, recommend recipes, manage your cart, and track your orders.';
      actions = [];
    } else if (/\b(?:store\s+hours|operating\s+hours|what\s+time\s+do\s+you\s+(?:open|close)|when\s+do\s+you\s+(?:open|close)|are\s+you\s+open|closing\s+time|opening\s+time|store\s+timings?)\b/i.test(lower)) {
      reply = 'We are open today from 8:00 AM to 10:00 PM for pickup and express delivery.';
      actions = [];
    } else if (/\b(?:where\s+are\s+you\s+located|store\s+address|where\s+is\s+the\s+(?:store|shop)|pickup\s+address|shop\s+location)\b/i.test(lower)) {
      reply = 'CartSettle Store is located at Main Street Market, Downtown.';
      actions = [];
    } else if (/\b(?:contact\s+(?:number|phone)|phone\s+number|customer\s+care|support\s+(?:phone|number|email)|how\s+to\s+reach)\b/i.test(lower)) {
      reply = 'You can reach CartSettle customer support at +1 (800) 555-CART.';
      actions = [];
    } else if (['delivery', 'shipping', 'deliver'].some((w) => lower.includes(w)) && ['speed', 'fast', 'how long', 'time', 'hours'].some((w) => lower.includes(w))) {
      reply = 'Express grocery delivery arrives in 15 to 25 minutes right to your door.';
      actions = [];
    } else if (['packaging fee', 'delivery fee', 'shipping fee', 'shipping cost'].some((k) => lower.includes(k))) {
      reply = 'Packaging and handling fee is $0.00, with free delivery on qualifying orders.';
      actions = [];
    } else if (/\b(?:any\s+coupons|show\s+coupons|discount\s+codes?|promo\s+codes?|promotions|today(?:'s)?\s+deals?|active\s+offers?)\b/i.test(lower)) {
      const coupons = [
        { code: 'SAVE15', discount: '15% OFF', description: 'Min order $35', valid_until: 'Today' },
        { code: 'WELCOME5', discount: '$5 OFF', description: 'First app purchase', valid_until: 'Active' },
        { code: 'FREESHIP', discount: 'Free Delivery', description: 'Orders above $25', valid_until: 'Active' },
      ];
      reply = 'Active promotions available. Tap to apply at checkout.';
      actions = [{ type: 'PROMOTIONS_CARD', coupons }];
      tools_used = [{ name: 'get_promotions', args: {} }];
    } else if (
      persona === 'owner' &&
      /\b(?:how\s+is\s+the\s+store\s+doing|operations?\s+pulse|system\s+status|health\s+check|store\s+health|how\s+are\s+sales\s+today|store\s+summary|operations?\s+summary|kpi\s+overview|kpis|operations?\s+dashboard)\b/i.test(lower)
    ) {
      reply = 'Store health nominal: 26 total orders, 4 pending packing, 100/100 products in stock.';
      actions = [
        {
          type: 'DYNAMIC_COMPOSITE_CARD',
          title: 'Operations Pulse',
          subtitle: 'Real-time Kirana metrics across orders and inventory',
          badge: 'HEALTH NOMINAL',
          kpis: [
            { label: 'Active Orders', value: '26', trend: 'Live', positive: true },
            { label: 'Pending Packing', value: '4', trend: 'Normal', positive: true },
            { label: 'Catalog In-Stock', value: '100/100', trend: '100%', positive: true },
          ],
          progress_bars: [
            { label: 'Catalog Stock Readiness', current: 100, max: 100, unit: 'items' },
          ],
          key_values: [
            { key: 'Catalog Health', value: '100 products active across 12 categories' },
            { key: 'Pending Fulfillment', value: '4 orders waiting to be packed' },
          ],
          actions: [
            { label: 'Audit Pending Orders', action_type: 'send', payload: 'Show pending orders' },
            { label: 'Inspect Low Stock', action_type: 'send', payload: 'Inspect low stock items' },
          ],
        },
      ];
      tools_used = [{ name: 'get_operations_pulse', args: {} }];
    } else if (/\b(?:what\s+can\s+i\s+(?:cook|make)\s+with|recipe\s+for|recipe\s+with|dinner\s+ideas?|breakfast\s+ideas?)\b/i.test(lower)) {
      const matched = catalog.slice(0, 3).map((p) => serializeCardItem(p, 1));
      const prodNames = matched.map((i) => i.name).join(', ');
      reply = `Quick dish idea: Fresh sauté combining ${prodNames}. Season to taste and serve warm.`;
      actions = [{ type: 'SEARCH_RESULTS', items: matched }];
      tools_used = [{ name: 'search_products_and_stock', args: { query: prodNames } }];
    } else if (lower.includes('payment') || lower.includes('pay') || lower.includes('cod') || lower.includes('wallet')) {
      reply = 'We support Cash on Delivery, Store Wallet, and PayPal with instant settlement.';
      actions = [];
    } else if (
      (
        ['why', 'reason', 'what happened', 'explain', 'who'].some((w) => lower.includes(w)) &&
        ['reject', 'rejected', 'cancel', 'cancelled', 'declined', 'failed'].some((w) => lower.includes(w))
      ) ||
      ['why rejected', 'why was it rejected', 'why it is rejected', 'why is it rejected', 'why was this rejected', 'why cancelled', 'rejection reason'].some((k) => lower.includes(k))
    ) {
      const ordMatch = lower.match(/\b(ord\d+\w*)\b/i);
      const targetOid = ordMatch ? ordMatch[1].toUpperCase() : mem.last_order_id || 'ORD202600009';
      reply = `Order #${targetOid} (REJECTED) \u2022 Declined by store operations due to stock unavailability or unserviceable pickup slot.`;
      actions = [
        {
          type: 'ORDER_CARD',
          order: {
            id: targetOid,
            status: 'REJECTED',
            total: 59.20,
            customer: 'shopper',
            payment_method: 'COD',
            order_type: 'PICKUP',
            delivery_address: 'In-Store Pickup',
            items: [
              { id: 1, name: 'Greek Honey Yogurt', quantity: 2, price: 3.8, total: 7.6 },
              { id: 2, name: 'Hass Avocados (Bag of 4)', quantity: 2, price: 4.8, total: 9.6 },
              { id: 3, name: 'Free-Range Farm Eggs', quantity: 10, price: 4.2, total: 42.0 },
            ],
            items_count: 3,
            created_at: 'Nov 05, 05:53 PM',
          },
        },
      ];
      tools_used = [{ name: 'audit_order_settlement', args: { order_id: targetOid } }];
    } else {
      if (persona === 'owner') {
        reply = `${catalog.length} products active in catalog. You can ask to audit orders, inspect margins, credit customer wallets, or review sales analytics.`;
        actions = [];
        tools_used = [{ name: 'get_sales_and_analytics', args: {} }];
      } else {
        reply = "I didn't quite catch that. You can ask me to find groceries, recommend recipes, check your cart, or track your orders.";
        actions = [];
        tools_used = [{ name: 'search_products_and_stock', args: { query: rawPrompt } }];
      }
    }
  }

  // Track last discussed product in session memory for follow-up pronouns
  for (const act of actions) {
    if (act.type === 'ADD_TO_CART' && act.item?.name) {
      mem.last_product = act.item.name;
      break;
    }
    if (act.type === 'MARGIN_DECISION' && act.decision?.product) {
      mem.last_product = act.decision.product;
      break;
    }
    if ((act.type === 'SEARCH_RESULTS' || act.type === 'LOW_STOCK_LIST') && act.items?.[0]?.name) {
      mem.last_product = act.items[0].name;
      break;
    }
    if (act.type === 'MARGIN_LIST' && act.products?.[0]?.name) {
      mem.last_product = act.products[0].name;
      break;
    }
  }

  if (mem.last_product && persona === 'shopper') {
    follow_ups = [`Add 1 ${mem.last_product} to my cart`, `Can I get 10% off ${mem.last_product}?`, 'What is the cheapest item?'];
  }

  const voiceReply = String(reply || 'Done.')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/(?:Order\s*)?#?ORD\d*0*(\d+)\b/gi, 'Order $1')
    .trim();

  mem.messages.push({ role: 'user', content: rawPrompt });
  mem.messages.push({ role: 'assistant', content: reply, voice_reply: voiceReply, mode, actions, tools_used, follow_ups, latency_ms: 14 });

  return {
    reply,
    voice_reply: voiceReply,
    mode,
    actions,
    tools_used,
    follow_ups,
    latency_ms: 14,
  };
}
