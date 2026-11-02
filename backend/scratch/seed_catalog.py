import os, sys, django
from decimal import Decimal
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r'S:\Hackathon\cartsettle\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from products.models import Product, Category
from django.core.cache import cache

cat_dairy, _ = Category.objects.get_or_create(name='Dairy & Eggs', defaults={'slug': 'dairy-eggs', 'is_active': True})
cat_bakery, _ = Category.objects.get_or_create(name='Bakery & Bread', defaults={'slug': 'bakery-bread', 'is_active': True})
cat_pantry, _ = Category.objects.get_or_create(name='Pantry & Pasta', defaults={'slug': 'pantry-pasta', 'is_active': True})
cat_produce, _ = Category.objects.get_or_create(name='Fresh Produce', defaults={'slug': 'fresh-produce', 'is_active': True})

catalog = [
    {
        'name': 'Organic Farm Whole Milk',
        'category': cat_dairy,
        'brand': 'GreenValley',
        'unit': '1 Gallon',
        'regular_price': Decimal('5.00'),
        'offer_price': Decimal('4.50'),
        'cost_price': Decimal('3.60'),
        'stock_quantity': 45,
        'description': 'Fresh organic pasture-raised whole milk.'
    },
    {
        'name': 'Artisan Sourdough Bread',
        'category': cat_bakery,
        'brand': 'Bodega Bakehouse',
        'unit': '1 Loaf (500g)',
        'regular_price': Decimal('5.50'),
        'offer_price': Decimal('5.00'),
        'cost_price': Decimal('3.80'),
        'stock_quantity': 30,
        'description': 'Crusty freshly baked sourdough bread.'
    },
    {
        'name': 'Italian Durum Wheat Pasta',
        'category': cat_pantry,
        'brand': 'Bella Italia',
        'unit': '500g Pack',
        'regular_price': Decimal('4.00'),
        'offer_price': Decimal('3.50'),
        'cost_price': Decimal('2.60'),
        'stock_quantity': 60,
        'description': 'Authentic bronze-die extruded penne pasta.'
    },
    {
        'name': 'Organic Basil Marinara Sauce',
        'category': cat_pantry,
        'brand': 'Bella Italia',
        'unit': '24 oz Jar',
        'regular_price': Decimal('4.50'),
        'offer_price': Decimal('4.00'),
        'cost_price': Decimal('3.10'),
        'stock_quantity': 40,
        'description': 'Slow-simmered vine-ripened tomato & sweet basil sauce.'
    },
    {
        'name': 'Aged Parmesan Cheese',
        'category': cat_dairy,
        'brand': 'GreenValley',
        'unit': '8 oz Block',
        'regular_price': Decimal('7.00'),
        'offer_price': Decimal('6.50'),
        'cost_price': Decimal('5.10'),
        'stock_quantity': 25,
        'description': 'Rich 12-month aged grated & block parmesan.'
    },
    {
        'name': 'Fresh California Strawberries',
        'category': cat_produce,
        'brand': 'SunBerry Farms',
        'unit': '1 lb Clamshell',
        'regular_price': Decimal('6.00'),
        'offer_price': Decimal('5.50'),
        'cost_price': Decimal('4.30'),
        'stock_quantity': 6,
        'description': 'Sweet hand-picked organic strawberries.'
    },
    {
        'name': 'Free-Range Farm Eggs',
        'category': cat_dairy,
        'brand': 'SunnySide',
        'unit': '12 Large Eggs',
        'regular_price': Decimal('4.80'),
        'offer_price': Decimal('4.20'),
        'cost_price': Decimal('3.30'),
        'stock_quantity': 50,
        'description': 'Grade A large brown cage-free eggs.'
    },
    {
        'name': 'Hass Avocados (Bag of 4)',
        'category': cat_produce,
        'brand': 'GreenValley',
        'unit': '4 Count Bag',
        'regular_price': Decimal('5.50'),
        'offer_price': Decimal('4.80'),
        'cost_price': Decimal('3.80'),
        'stock_quantity': 5,
        'description': 'Creamy ripe Hass avocados ready for salads or toast.'
    },
    {
        'name': 'Greek Honey Yogurt',
        'category': cat_dairy,
        'brand': 'Olympus',
        'unit': '32 oz Tub',
        'regular_price': Decimal('4.50'),
        'offer_price': Decimal('3.80'),
        'cost_price': Decimal('3.00'),
        'stock_quantity': 35,
        'description': 'Thick strained Greek yogurt with wildflower honey.'
    }
]

for item in catalog:
    obj, created = Product.objects.update_or_create(
        name=item['name'],
        defaults={
            **item,
            'is_active': True,
            'is_in_stock': True
        }
    )
    status_str = "Created" if created else "Updated"
    print(f"{status_str}: {obj.name} (${obj.offer_price}, Stock: {obj.stock_quantity})")

atta = Product.objects.filter(name__icontains='Atta').first()
if atta:
    atta.cost_price = Decimal('58.00')
    atta.regular_price = Decimal('75.00')
    atta.offer_price = Decimal('70.00')
    atta.stock_quantity = 35
    atta.save()
    print(f"Updated Ashirvad Atta: Offer=${atta.offer_price}, Cost=${atta.cost_price} (Margin: 17.1%)")

# Ensure older test items have healthy stock so low-stock audit focuses on real produce
for p in Product.objects.filter(name__in=['1pro', 'product1', 'product2']):
    p.stock_quantity = 30
    p.is_in_stock = True
    p.save(update_fields=['stock_quantity', 'is_in_stock'])

cache.clear()
print("Catalog seed & cache clear complete!")
