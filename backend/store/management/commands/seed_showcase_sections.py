from django.core.management.base import BaseCommand
from django.core.cache import cache
from store.models import HomepageSection, HomepageSectionProduct
from products.models import Product

SHOWCASE_SECTIONS_DATA = [
    {
        'title': 'Daily Staples & Kirana Essentials',
        'display_order': 0,
        'products': [
            'Aashirvaad Atta',
            'Daawat Basmati Rice',
            'Tata Sampann Toor Dal',
            'Fortune Sunflower Oil',
            'Tata Salt',
            'Madhur Pure Sugar',
            'Amul Pure Ghee',
            'Fortune Rajma Chitra',
        ]
    },
    {
        'title': 'Dairy, Breakfast & Morning Sips',
        'display_order': 1,
        'products': [
            'Amul Taaza Milk',
            'Amul Butter',
            'Farm Fresh Eggs',
            'Tata Tea Gold',
            'Nescafe Classic',
            'Kelloggs Corn Flakes',
            'Kissan Mixed Jam',
            'Amul Malai Paneer',
        ]
    },
    {
        'title': 'Chai-Time Snacks, Biscuits & Munchies',
        'display_order': 2,
        'products': [
            'Britannia Good Day',
            'Parle-G Biscuits',
            'Haldiram Aloo Bhujia',
            'Lays Classic Salted',
            'Kurkure Masala Munch',
            'Maggi Masala Noodles',
            'Cadbury Dairy Milk',
            'Act II Popcorn Butter',
        ]
    },
    {
        'title': 'Dry Fruits, Healthy Bites & Refreshments',
        'display_order': 3,
        'products': [
            'Happilo Almonds',
            'Happilo Cashews',
            'Happilo Kishmish',
            'Dabur Honey',
            'Real Mixed Fruit',
            'Frooti Mango Drink',
            'Lipton Green Tea',
            'Pintola Peanut Butter',
        ]
    },
    {
        'title': 'Home Cleaning & Personal Hygiene',
        'display_order': 4,
        'products': [
            'Surf Excel Matic',
            'Vim Dishwash Gel',
            'Lizol Floor Cleaner',
            'Harpic Power Plus',
            'Dettol Original Soap',
            'Colgate Total Toothpaste',
            'Lifebuoy Handwash',
            'Colin Glass Cleaner',
        ]
    }
]


class Command(BaseCommand):
    help = "Seeds 5 curated, meaningful showcase sections with sufficient relevant products."

    def handle(self, *args, **options):
        self.stdout.write("Starting Showcase Sections seeding...")

        # 1. Clean up existing empty or dummy sections
        HomepageSectionProduct.objects.all().delete()
        HomepageSection.objects.all().delete()

        created_sections = 0
        total_products_linked = 0

        for sec_data in SHOWCASE_SECTIONS_DATA:
            section = HomepageSection.objects.create(
                title=sec_data['title'],
                section_type='products',
                display_order=sec_data['display_order'],
                is_active=True
            )
            created_sections += 1
            self.stdout.write(f"\n[Section {sec_data['display_order'] + 1}] {section.title}")

            for pos, query in enumerate(sec_data['products']):
                prod = Product.objects.filter(name__icontains=query, is_active=True).first()
                if prod:
                    HomepageSectionProduct.objects.create(
                        section=section,
                        product=prod,
                        position=pos
                    )
                    total_products_linked += 1
                    self.stdout.write(f"   Pos {pos}: #{prod.id} {prod.name} (₹{prod.offer_price or prod.regular_price})")
                else:
                    self.stdout.write(self.style.WARNING(f"   Warning: Product '{query}' not found"))

        # Invalidate caches
        cache.delete('active_homepage_sections_serialized')
        cache.delete('homepage_sections_all')

        self.stdout.write(self.style.SUCCESS(
            f"\nShowcase seeding complete! Created {created_sections} sections with {total_products_linked} products."
        ))
