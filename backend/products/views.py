import logging
logger = logging.getLogger(__name__)
from rest_framework import viewsets, filters, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle
from django.core.cache import cache
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Product, ProductImage, Favorite
from .serializers import CategorySerializer, ProductSerializer, FavoriteSerializer
from accounts.permissions import IsOwnerOrReadOnly, IsOwnerUser

CATEGORY_CACHE_KEY = 'active_categories_serialized'

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('display_order', 'name')
    serializer_class = CategorySerializer
    permission_classes = [IsOwnerOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Non-owners only see active categories
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_owner', False)):
            queryset = queryset.filter(is_active=True)
        return queryset

    def list(self, request, *args, **kwargs):
        is_owner = bool(request.user and request.user.is_authenticated and getattr(request.user, 'is_owner', False))
        if not is_owner and not request.query_params:
            cached_data = cache.get(CATEGORY_CACHE_KEY)
            if cached_data is not None:
                resp = Response(cached_data)
                resp['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
                return resp

        response = super().list(request, *args, **kwargs)
        if not is_owner and not request.query_params and response.status_code == status.HTTP_200_OK:
            cache.set(CATEGORY_CACHE_KEY, response.data, 600)
            response['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
        return response

    def perform_create(self, serializer):
        super().perform_create(serializer)
        cache.delete(CATEGORY_CACHE_KEY)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        cache.delete(CATEGORY_CACHE_KEY)

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        cache.delete(CATEGORY_CACHE_KEY)

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def reset_and_seed_catalog(self, request):
        from django.core.management import call_command
        try:
            call_command('seed_hackathon_catalog')
            self.clear_product_cache()
            return Response({
                'status': 'success',
                'message': 'Successfully reset and seeded 100 authentic products across 12 categories',
                'categories_count': Category.objects.count(),
                'products_count': Product.objects.count()
            })
        except Exception as e:
            logger.error(f"Error seeding hackathon catalog: {e}")
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def reorder(self, request):
        updates = request.data
        if not isinstance(updates, list):
            return Response({'error': 'Expected a list of updates'}, status=400)
            
        categories = []
        for update in updates:
            try:
                cat = Category(
                    id=int(update['id']), 
                    display_order=int(update.get('display_order', 0))
                )
                categories.append(cat)
            except (KeyError, ValueError, TypeError):
                continue
                
        if categories:
            Category.objects.bulk_update(categories, ['display_order'])
            cache.delete(CATEGORY_CACHE_KEY)
        return Response({'status': 'reordered'})


KIRANA_CURATED_GROCERIES = [
    {
        'name': 'Nutella Hazelnut Spread with Cocoa',
        'brand': 'Ferrero',
        'unit': '350 g',
        'sku': '3017620422003',
        'description': 'Rich hazelnut spread with skimmed milk and cocoa. Perfect on toast, pancakes, and breakfast crêpes.',
        'image_url': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Spreads & Breakfast'
    },
    {
        'name': 'Amul Pasteurized Salted Butter',
        'brand': 'Amul',
        'unit': '500 g',
        'sku': '8901262010053',
        'description': 'Pure rich creamy salted butter made from 100% fresh dairy cream. The beloved Taste of India.',
        'image_url': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Dairy & Breakfast'
    },
    {
        'name': 'Maggi 2-Minute Masala Noodles',
        'brand': 'Nestlé',
        'unit': '280 g (Pack of 4)',
        'sku': '8901058852438',
        'description': 'Iconic instant noodles with a signature blend of roasted Indian spices and fortified with Iron.',
        'image_url': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Instant Food & Noodles'
    },
    {
        'name': 'Aashirvaad Superior MP Sharbati Whole Wheat Atta',
        'brand': 'Aashirvaad (ITC)',
        'unit': '5 kg',
        'sku': '8901725181223',
        'description': '100% whole wheat grain chakki atta sourced from fertile Sehore fields of Madhya Pradesh for soft rotis.',
        'image_url': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Atta, Flours & Grains'
    },
    {
        'name': 'Tata Salt Vacuum Evaporated Iodized Salt',
        'brand': 'Tata Consumer',
        'unit': '1 kg',
        'sku': '8901030000007',
        'description': 'Desh Ka Namak. Pure vacuum evaporated iodized salt containing essential dietary iodine.',
        'image_url': 'https://images.unsplash.com/photo-1518110903415-46f903a55b6c?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Spices & Seasonings'
    },
    {
        'name': 'Fortune Sunlite Refined Sunflower Oil',
        'brand': 'Fortune',
        'unit': '1 L',
        'sku': '8906007280016',
        'description': 'Light, digestible refined sunflower cooking oil rich in natural Vitamin E and low in absorbable fats.',
        'image_url': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Edible Oils & Ghee'
    },
    {
        'name': 'India Gate Basmati Rice Feast Rozzana',
        'brand': 'India Gate',
        'unit': '5 kg',
        'sku': '8901415003017',
        'description': 'Aged aromatic long grain basmati rice ideal for everyday pulao, biryani, and family dining.',
        'image_url': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Rice & Pulses'
    },
    {
        'name': 'Dettol Original Germ Protection Bathing Soap',
        'brand': 'Dettol (Reckitt)',
        'unit': '125 g (Pack of 3)',
        'sku': '8901396001018',
        'description': 'Antibacterial bar soap enriched with trusted pine fragrance for 99.9% germ protection.',
        'image_url': 'https://images.unsplash.com/photo-1607006314644-8cbbe7135e69?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Personal Care & Hygiene'
    },
    {
        'name': 'Parle-G Original Gluco Biscuits',
        'brand': 'Parle',
        'unit': '250 g',
        'sku': '8901719101018',
        'description': 'World famous crispy glucose tea biscuits baked with the goodness of wheat and natural milk.',
        'image_url': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Biscuits & Snacks'
    },
    {
        'name': 'Tata Tea Gold Leaf & Dust Black Tea',
        'brand': 'Tata Consumer',
        'unit': '500 g',
        'sku': '8901052003010',
        'description': 'Fine blend of gently rolled Assam CTC tea granules with 15% long aroma tea leaves.',
        'image_url': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Beverages & Tea'
    },
    {
        'name': 'Surf Excel Easy Wash Detergent Powder',
        'brand': 'Hindustan Unilever',
        'unit': '1 kg',
        'sku': '8901030383017',
        'description': 'Super-fine washing powder that dissolves rapidly and eliminates tough stains with ease.',
        'image_url': 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Household Cleaning'
    },
    {
        'name': 'Cadbury Dairy Milk Silk Chocolate',
        'brand': 'Cadbury / Mondelez',
        'unit': '150 g',
        'sku': '7622201140024',
        'description': 'Indulgent smooth milk chocolate bar crafted with creamy milk solids and fine cocoa.',
        'image_url': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Chocolates & Confectionery'
    },
    {
        'name': "Haldiram's Nagpur Bhujia Sev",
        'brand': "Haldiram's",
        'unit': '400 g',
        'sku': '8904063200018',
        'description': 'Crispy spicy fried gram flour and tepary bean noodles spiced with black pepper and cardamom.',
        'image_url': 'https://images.unsplash.com/photo-1621996346565-e3d5d6281081?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Snacks & Namkeen'
    },
    {
        'name': 'Nescafe Classic 100% Pure Instant Coffee',
        'brand': 'Nestlé',
        'unit': '100 g Glass Jar',
        'sku': '8901058863014',
        'description': 'Made from medium-dark roasted Robusta coffee beans for a signature bold morning aroma.',
        'image_url': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Beverages & Tea'
    },
    {
        'name': 'Lipton Pure & Light Green Tea Bags',
        'brand': 'Lipton',
        'unit': '25 Bags (50 g)',
        'sku': '8901030012017',
        'description': 'Zero calorie soothing green tea blend rich in protective antioxidant catechins.',
        'image_url': 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Beverages & Tea'
    },
    {
        'name': 'Colgate Total Active Fresh Gel Toothpaste',
        'brand': 'Colgate-Palmolive',
        'unit': '150 g',
        'sku': '8901314010207',
        'description': 'Whole mouth 12-hour antibacterial defense combating plaque, cavities, and tartar.',
        'image_url': 'https://images.unsplash.com/photo-1559591937-e1032b85e054?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Personal Care & Hygiene'
    },
    {
        'name': 'Dabur 100% Pure Natural Squeezy Honey',
        'brand': 'Dabur',
        'unit': '500 g',
        'sku': '8901207010018',
        'description': 'Raw unadulterated pure honey harvested from mountain bee-farms, rich in pollen antioxidants.',
        'image_url': 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Spreads & Breakfast'
    },
    {
        'name': "Kellogg's Corn Flakes Original Crispy Cereal",
        'brand': "Kellogg's",
        'unit': '475 g',
        'sku': '8901499008018',
        'description': 'Crispy toasted golden corn flakes naturally sweetened and enriched with 8 essential B vitamins.',
        'image_url': 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Spreads & Breakfast'
    },
    {
        'name': 'Saffola Gold Pro Healthy Lifestyle Blended Oil',
        'brand': 'Marico',
        'unit': '1 L',
        'sku': '8901088012014',
        'description': 'Blended edible vegetable oil with dual seed technology and high natural gamma oryzanol.',
        'image_url': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Edible Oils & Ghee'
    },
    {
        'name': 'Vim Anti-Bacterial Dishwash Gel Lemon',
        'brand': 'Hindustan Unilever',
        'unit': '750 ml Bottle',
        'sku': '8901030580010',
        'description': 'Concentrated dishwashing liquid with real lemon juice that cuts stubborn oil and burnt residue.',
        'image_url': 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Household Cleaning'
    },
    {
        'name': 'Britannia Good Day Butter Cookies',
        'brand': 'Britannia',
        'unit': '200 g',
        'sku': '8901063012018',
        'description': 'Rich buttery baked cookies featuring delightful smiling ridges and crunchy bites.',
        'image_url': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Biscuits & Snacks'
    },
    {
        'name': 'Amul Taaza Homogenised Toned Milk',
        'brand': 'Amul',
        'unit': '1 L Tetra Pak',
        'sku': '8901262015010',
        'description': 'UHT treated fresh toned milk in aseptic hygienic packaging. No refrigeration needed till opened.',
        'image_url': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Dairy & Breakfast'
    }
]

class ProductPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 250

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('gallery_images').all().order_by('display_order', '-created_at')
    serializer_class = ProductSerializer
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active', 'is_in_stock']
    search_fields = ['name', 'brand', 'description']
    ordering_fields = ['offer_price', 'regular_price', 'created_at', 'name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'barcode_lookup', 'online_search']:
            return [AllowAny()]
        return [IsOwnerUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Non-owners only see active products
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_owner', False)):
            queryset = queryset.filter(is_active=True)

        section_id = self.request.query_params.get('section')
        if section_id:
            try:
                from store.models import HomepageSectionProduct
                product_ids = HomepageSectionProduct.objects.filter(section_id=section_id).values_list('product_id', flat=True)
                queryset = queryset.filter(id__in=product_ids)
            except Exception as e:
                pass

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            response['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
        return response

    def _handle_gallery_images(self, product, request):
        images = request.FILES.getlist('gallery_images')
        for img in images:
            ProductImage.objects.create(product=product, image=img)

    def _handle_remote_image(self, product, request):
        image_url = request.data.get('image_url')
        if not product.image and image_url and isinstance(image_url, str):
            image_url = image_url.strip()
            if image_url.startswith(('http://', 'https://')):
                try:
                    import requests
                    import os, time
                    from django.core.files.base import ContentFile
                    from urllib.parse import urlparse
                    
                    r = requests.get(image_url, headers={'User-Agent': 'CartSettle/2.4 (contact@cartsettle.store)'}, timeout=7)
                    if r.status_code == 200 and r.content:
                        path_part = urlparse(image_url).path
                        ext = os.path.splitext(path_part)[1] or '.jpg'
                        if ext.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
                            ext = '.jpg'
                        filename = f"prod_{product.id}_{int(time.time())}{ext}"
                        product.image.save(filename, ContentFile(r.content), save=True)
                except Exception as e:
                    print('Failed to download remote product image:', e)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201 and 'id' in response.data:
            product = Product.objects.select_related('category').prefetch_related('gallery_images').get(id=response.data['id'])
            self._handle_gallery_images(product, request)
            self._handle_remote_image(product, request)
            response.data = self.get_serializer(product).data
            cache.delete('active_homepage_sections_serialized')
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        product = self.get_object()
        self._handle_gallery_images(product, request)
        self._handle_remote_image(product, request)
        # Re-fetch with prefetch_related to include newly uploaded gallery images
        product = Product.objects.select_related('category').prefetch_related('gallery_images').get(id=product.id)
        response.data = self.get_serializer(product).data
        cache.delete('active_homepage_sections_serialized')
        return response

    @action(detail=True, methods=['delete'], permission_classes=[IsOwnerUser])
    def delete_gallery_image(self, request, pk=None):
        product = self.get_object()
        image_id = request.data.get('image_id') or request.query_params.get('image_id') or request.query_params.get('image_id')
        if not image_id:
            return Response({'error': 'image_id is required'}, status=400)
        try:
            image = ProductImage.objects.get(id=image_id, product=product)
            image.delete()
            return Response({'success': True})
        except ProductImage.DoesNotExist:
            return Response({'error': 'Image not found'}, status=404)

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerUser])
    def vision_lookup(self, request):
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'Image file is required'}, status=400)
        # Return recognized product details via Gemini Vision (if configured) or smart filename/catalog fallback
        import os, base64, json, re
        raw_bytes = image.read()
        mime_type = getattr(image, 'content_type', None) or 'image/jpeg'
        raw_filename = os.path.splitext(getattr(image, 'name', '') or '')[0]
        cleaned_hint = re.sub(r'[_-]+', ' ', raw_filename).strip()
        if cleaned_hint.lower() in ('image', 'photo', 'packaging', 'product', 'upload', 'scan', 'camera'):
            cleaned_hint = ''
        product_info = {
            'name': cleaned_hint.title() if cleaned_hint else 'Scanned Grocery Item',
            'brand': '',
            'unit': '1 pack',
            'category': '',
            'price': '',
            'description': 'Product recognized via vision scan',
            'tags': ['scanned'],
        }
        from services.agent_service import agent_service
        gemini_key = agent_service.get_api_key() or os.environ.get('GEMINI_API_KEY', '').strip()
        if gemini_key and raw_bytes:
            try:
                import requests
                b64_img = base64.b64encode(raw_bytes).decode('utf-8')
                prompt_text = (
                    'Analyze this grocery product image and return ONLY a raw JSON object with keys: '
                    '{"name": "...", "brand": "...", "unit": "...", "description": "..."}'
                )
                g_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}"
                g_resp = requests.post(
                    g_url,
                    json={
                        'contents': [{
                            'parts': [
                                {'text': prompt_text},
                                {'inline_data': {'mime_type': mime_type, 'data': b64_img}},
                            ]
                        }]
                    },
                    timeout=10,
                )
                if g_resp.status_code == 200:
                    candidates = g_resp.json().get('candidates') or []
                    if candidates:
                        parts = candidates[0].get('content', {}).get('parts') or []
                        txt = (parts[0].get('text') or '').strip() if parts else ''
                        txt = re.sub(r'^```(?:json)?|```$', '', txt.strip(), flags=re.MULTILINE).strip()
                        parsed = json.loads(txt)
                        if isinstance(parsed, dict) and not parsed.get('error'):
                            for k in ('name', 'brand', 'unit', 'category', 'price', 'description'):
                                if parsed.get(k):
                                    product_info[k] = str(parsed[k]).strip()
            except Exception:
                pass
        return Response({
            'success': True,
            'product': product_info,
            **product_info,
        })
        if False:
            pass
        return Response({
            'name': '',
            'brand': '',
            'category': '',
            'price': '',
            'description': 'Product recognized via vision scan',
            'tags': ['scanned']
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def barcode_lookup(self, request):
        # Throttle manually for this specific action to prevent abuse
        if not request.user.is_authenticated:
            throttle = AnonRateThrottle()
            if not throttle.allow_request(request, self):
                return Response({'error': 'Rate limit exceeded. Please wait.'}, status=429)
        barcode = (request.query_params.get('barcode') or '').strip()
        if not barcode:
            return Response({'error': 'Barcode is required'}, status=400)
        import re
        if not re.match(r'^[A-Za-z0-9_-]{3,64}$', barcode):
            return Response({'error': 'Invalid barcode format'}, status=400)
            
        # 1. Check local database inventory
        local_product = Product.objects.select_related('category').prefetch_related('gallery_images').filter(sku=barcode).first()
        if local_product:
            return Response({
                'source': 'local',
                'product': ProductSerializer(local_product, context={'request': request}).data
            })
            
        # 2. Check Curated Kirana Grocery Index (Instant response)
        for item in KIRANA_CURATED_GROCERIES:
            if item.get('sku') == barcode:
                return Response({
                    'source': 'external',
                    'provider': 'kirana_verified_catalog',
                    'product': item
                })
            
        import requests
        headers = {'User-Agent': 'CartSettle/2.4 (contact@cartsettle.store) GroceryApp/1.0'}
        
        def _build_description(generic_name, ingredients, categories):
            parts = []
            if generic_name:
                parts.append(str(generic_name).strip())
            if ingredients:
                parts.append(f"Ingredients: {str(ingredients).strip()[:150]}")
            elif categories:
                parts.append(f"Category: {str(categories).strip()}")
            return " • ".join(parts) if parts else ""

        # 3. Check Open Food Facts API (Primary web index with short 2s timeout)
        for domain in ['world.openfoodfacts.org', 'in.openfoodfacts.org']:
            try:
                url_off = f"https://{domain}/api/v2/product/{barcode}.json"
                response_off = requests.get(url_off, headers=headers, timeout=2.0)
                if response_off.status_code == 200:
                    data_off = response_off.json()
                    if data_off.get('status') == 1:
                        p = data_off.get('product', {})
                        name = p.get('product_name') or p.get('product_name_en') or ''
                        if name:
                            desc = _build_description(
                                p.get('generic_name') or p.get('generic_name_en'),
                                p.get('ingredients_text') or p.get('ingredients_text_en'),
                                p.get('categories')
                            )
                            img = p.get('image_front_url') or p.get('image_url') or p.get('image_small_url') or ''
                            cat_sug = ''
                            if p.get('categories'):
                                cat_sug = p.get('categories').split(',')[0].strip()
                            return Response({
                                'source': 'external',
                                'provider': 'open_food_facts',
                                'product': {
                                    'name': name,
                                    'brand': p.get('brands', ''),
                                    'unit': p.get('quantity', ''),
                                    'description': desc,
                                    'image_url': img,
                                    'sku': barcode,
                                    'category_suggestion': cat_sug
                                }
                            })
            except Exception:
                pass
            
        # 4. Check UPCitemdb API (Fallback 1)
        try:
            url_upc = f"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}"
            response_upc = requests.get(url_upc, headers=headers, timeout=2.0)
            if response_upc.status_code == 200:
                data_upc = response_upc.json()
                if data_upc.get('items'):
                    item = data_upc['items'][0]
                    img = item.get('images', [''])[0] if item.get('images') else ''
                    return Response({
                        'source': 'external',
                        'provider': 'upcitemdb',
                        'product': {
                            'name': item.get('title', ''),
                            'brand': item.get('brand', ''),
                            'unit': item.get('size', ''),
                            'description': item.get('description', ''),
                            'image_url': img,
                            'sku': barcode,
                            'category_suggestion': item.get('category', '')
                        }
                    })
        except Exception:
            pass

        # 5. Check DummyJSON products by SKU / query (Fallback 2)
        try:
            url_dj = f"https://dummyjson.com/products/search?q={barcode}"
            res_dj = requests.get(url_dj, timeout=2.0)
            if res_dj.status_code == 200:
                data_dj = res_dj.json()
                for p in data_dj.get('products', []):
                    if p.get('sku') == barcode or barcode.lower() in p.get('title', '').lower():
                        return Response({
                            'source': 'external',
                            'provider': 'dummyjson',
                            'product': {
                                'name': p.get('title', ''),
                                'brand': p.get('brand') or 'Pantry Essential',
                                'unit': f"{p.get('weight', 500)} g",
                                'description': p.get('description', ''),
                                'image_url': p.get('thumbnail') or (p.get('images')[0] if p.get('images') else ''),
                                'sku': barcode,
                                'category_suggestion': p.get('category', 'Groceries').capitalize()
                            }
                        })
        except Exception:
            pass

        return Response({
            'source': 'none',
            'message': 'Product not found in local inventory or connected grocery registries'
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def online_search(self, request):
        query = (request.query_params.get('query') or '').strip()
        if not query or len(query) < 2:
            return Response({'error': 'Search query must be at least 2 characters'}, status=400)
            
        import requests
        from urllib.parse import quote
        q_lower = query.lower()
        results = []
        seen_skus = set()

        # 1. Search Curated Kirana Catalog (Instant tokenized multi-word search)
        q_words = [w for w in q_lower.split() if len(w) > 1]
        
        # Pass 1: Match all search tokens
        for item in KIRANA_CURATED_GROCERIES:
            corpus = f"{item['name']} {item.get('brand', '')} {item.get('description', '')} {item.get('category_suggestion', '')} {item.get('sku', '')}".lower()
            if (q_words and all(w in corpus for w in q_words)) or (q_lower in corpus):
                results.append(item)
                seen_skus.add(item.get('sku'))
                
        # Pass 2: If no strict matches, match any prominent token
        if not results and q_words:
            for item in KIRANA_CURATED_GROCERIES:
                corpus = f"{item['name']} {item.get('brand', '')}".lower()
                if any(w in corpus for w in q_words) and item.get('sku') not in seen_skus:
                    results.append(item)
                    seen_skus.add(item.get('sku'))

        # 2. Search DummyJSON Grocery & Food Catalog (Always fast Cloudflare CDN)
        try:
            url_dj = f"https://dummyjson.com/products/search?q={quote(query)}"
            res_dj = requests.get(url_dj, timeout=2.5)
            if res_dj.status_code == 200:
                data_dj = res_dj.json()
                ALLOWED_CATS = {'groceries', 'beauty', 'skin-care', 'fragrances'}
                for p in data_dj.get('products', []):
                    if p.get('category') not in ALLOWED_CATS:
                        continue
                    sku = p.get('sku') or f"DJ-{p.get('id')}"
                    if sku not in seen_skus:
                        seen_skus.add(sku)
                        results.append({
                            'name': p.get('title', ''),
                            'brand': p.get('brand') or 'Grocery Item',
                            'unit': f"{p.get('weight', 500)} g",
                            'description': p.get('description', ''),
                            'image_url': p.get('thumbnail') or (p.get('images')[0] if p.get('images') else ''),
                            'sku': sku,
                            'category_suggestion': p.get('category', 'Groceries').capitalize()
                        })
        except Exception as e:
            logger.warning(f"DummyJSON online search error: {e}")

        if len(results) >= 2:
            return Response({'results': results[:20], 'count': len(results[:20])})

        # 3. Search Open Food Facts API (With 1.5s timeout to enrich results when network permits)
        try:
            headers = {'User-Agent': 'CartSettle/2.4 (contact@cartsettle.store) GroceryApp/1.0'}
            url_off = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={quote(query)}&search_simple=1&action=process&json=1&page_size=10"
            res_off = requests.get(url_off, headers=headers, timeout=2.0)
            if res_off.status_code == 200:
                data_off = res_off.json()
                for p in data_off.get('products', []):
                    code = p.get('code') or ''
                    if code and code in seen_skus:
                        continue
                    name = p.get('product_name') or p.get('product_name_en') or ''
                    if not name:
                        continue
                    desc_parts = []
                    if p.get('generic_name'):
                        desc_parts.append(p.get('generic_name'))
                    if p.get('ingredients_text'):
                        desc_parts.append(f"Ingredients: {p.get('ingredients_text')[:120]}...")
                    
                    if code:
                        seen_skus.add(code)
                    results.append({
                        'name': name,
                        'brand': p.get('brands', ''),
                        'unit': p.get('quantity', ''),
                        'description': ' • '.join(desc_parts) if desc_parts else (p.get('categories') or ''),
                        'image_url': p.get('image_front_url') or p.get('image_url') or p.get('image_small_url') or '',
                        'sku': code,
                        'category_suggestion': p.get('categories', '').split(',')[0].strip() if p.get('categories') else ''
                    })
        except Exception as e:
            logger.info(f"Open Food Facts search skipped/timed out: {e}")

        return Response({'results': results[:20], 'count': len(results[:20])})

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def reorder(self, request):
        updates = request.data
        if not isinstance(updates, list):
            return Response({'error': 'Expected a list of updates'}, status=400)
            
        categories = []
        for update in updates:
            try:
                cat = Category(
                    id=int(update['id']), 
                    display_order=int(update.get('display_order', 0))
                )
                categories.append(cat)
            except (KeyError, ValueError, TypeError):
                continue
                
        if categories:
            Category.objects.bulk_update(categories, ['display_order'])
            cache.delete(CATEGORY_CACHE_KEY)
        return Response({'status': 'reordered'})


KIRANA_CURATED_GROCERIES = [
    {
        'name': 'Nutella Hazelnut Spread with Cocoa',
        'brand': 'Ferrero',
        'unit': '350 g',
        'sku': '3017620422003',
        'description': 'Rich hazelnut spread with skimmed milk and cocoa. Perfect on toast, pancakes, and breakfast crêpes.',
        'image_url': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Spreads & Breakfast'
    },
    {
        'name': 'Amul Pasteurized Salted Butter',
        'brand': 'Amul',
        'unit': '500 g',
        'sku': '8901262010053',
        'description': 'Pure rich creamy salted butter made from 100% fresh dairy cream. The beloved Taste of India.',
        'image_url': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Dairy & Breakfast'
    },
    {
        'name': 'Maggi 2-Minute Masala Noodles',
        'brand': 'Nestlé',
        'unit': '280 g (Pack of 4)',
        'sku': '8901058852438',
        'description': 'Iconic instant noodles with a signature blend of roasted Indian spices and fortified with Iron.',
        'image_url': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Instant Food & Noodles'
    },
    {
        'name': 'Aashirvaad Superior MP Sharbati Whole Wheat Atta',
        'brand': 'Aashirvaad (ITC)',
        'unit': '5 kg',
        'sku': '8901725181223',
        'description': '100% whole wheat grain chakki atta sourced from fertile Sehore fields of Madhya Pradesh for soft rotis.',
        'image_url': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Atta, Flours & Grains'
    },
    {
        'name': 'Tata Salt Vacuum Evaporated Iodized Salt',
        'brand': 'Tata Consumer',
        'unit': '1 kg',
        'sku': '8901030000007',
        'description': 'Desh Ka Namak. Pure vacuum evaporated iodized salt containing essential dietary iodine.',
        'image_url': 'https://images.unsplash.com/photo-1518110903415-46f903a55b6c?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Spices & Seasonings'
    },
    {
        'name': 'Fortune Sunlite Refined Sunflower Oil',
        'brand': 'Fortune',
        'unit': '1 L',
        'sku': '8906007280016',
        'description': 'Light, digestible refined sunflower cooking oil rich in natural Vitamin E and low in absorbable fats.',
        'image_url': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Edible Oils & Ghee'
    },
    {
        'name': 'India Gate Basmati Rice Feast Rozzana',
        'brand': 'India Gate',
        'unit': '5 kg',
        'sku': '8901415003017',
        'description': 'Aged aromatic long grain basmati rice ideal for everyday pulao, biryani, and family dining.',
        'image_url': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Rice & Pulses'
    },
    {
        'name': 'Dettol Original Germ Protection Bathing Soap',
        'brand': 'Dettol (Reckitt)',
        'unit': '125 g (Pack of 3)',
        'sku': '8901396001018',
        'description': 'Antibacterial bar soap enriched with trusted pine fragrance for 99.9% germ protection.',
        'image_url': 'https://images.unsplash.com/photo-1607006314644-8cbbe7135e69?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Personal Care & Hygiene'
    },
    {
        'name': 'Parle-G Original Gluco Biscuits',
        'brand': 'Parle',
        'unit': '250 g',
        'sku': '8901719101018',
        'description': 'World famous crispy glucose tea biscuits baked with the goodness of wheat and natural milk.',
        'image_url': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Biscuits & Snacks'
    },
    {
        'name': 'Tata Tea Gold Leaf & Dust Black Tea',
        'brand': 'Tata Consumer',
        'unit': '500 g',
        'sku': '8901052003010',
        'description': 'Fine blend of gently rolled Assam CTC tea granules with 15% long aroma tea leaves.',
        'image_url': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Beverages & Tea'
    },
    {
        'name': 'Surf Excel Easy Wash Detergent Powder',
        'brand': 'Hindustan Unilever',
        'unit': '1 kg',
        'sku': '8901030383017',
        'description': 'Super-fine washing powder that dissolves rapidly and eliminates tough stains with ease.',
        'image_url': 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Household Cleaning'
    },
    {
        'name': 'Cadbury Dairy Milk Silk Chocolate',
        'brand': 'Cadbury / Mondelez',
        'unit': '150 g',
        'sku': '7622201140024',
        'description': 'Indulgent smooth milk chocolate bar crafted with creamy milk solids and fine cocoa.',
        'image_url': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Chocolates & Confectionery'
    },
    {
        'name': "Haldiram's Nagpur Bhujia Sev",
        'brand': "Haldiram's",
        'unit': '400 g',
        'sku': '8904063200018',
        'description': 'Crispy spicy fried gram flour and tepary bean noodles spiced with black pepper and cardamom.',
        'image_url': 'https://images.unsplash.com/photo-1621996346565-e3d5d6281081?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Snacks & Namkeen'
    },
    {
        'name': 'Nescafe Classic 100% Pure Instant Coffee',
        'brand': 'Nestlé',
        'unit': '100 g Glass Jar',
        'sku': '8901058863014',
        'description': 'Made from medium-dark roasted Robusta coffee beans for a signature bold morning aroma.',
        'image_url': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Beverages & Tea'
    },
    {
        'name': 'Lipton Pure & Light Green Tea Bags',
        'brand': 'Lipton',
        'unit': '25 Bags (50 g)',
        'sku': '8901030012017',
        'description': 'Zero calorie soothing green tea blend rich in protective antioxidant catechins.',
        'image_url': 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Beverages & Tea'
    },
    {
        'name': 'Colgate Total Active Fresh Gel Toothpaste',
        'brand': 'Colgate-Palmolive',
        'unit': '150 g',
        'sku': '8901314010207',
        'description': 'Whole mouth 12-hour antibacterial defense combating plaque, cavities, and tartar.',
        'image_url': 'https://images.unsplash.com/photo-1559591937-e1032b85e054?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Personal Care & Hygiene'
    },
    {
        'name': 'Dabur 100% Pure Natural Squeezy Honey',
        'brand': 'Dabur',
        'unit': '500 g',
        'sku': '8901207010018',
        'description': 'Raw unadulterated pure honey harvested from mountain bee-farms, rich in pollen antioxidants.',
        'image_url': 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Spreads & Breakfast'
    },
    {
        'name': "Kellogg's Corn Flakes Original Crispy Cereal",
        'brand': "Kellogg's",
        'unit': '475 g',
        'sku': '8901499008018',
        'description': 'Crispy toasted golden corn flakes naturally sweetened and enriched with 8 essential B vitamins.',
        'image_url': 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Spreads & Breakfast'
    },
    {
        'name': 'Saffola Gold Pro Healthy Lifestyle Blended Oil',
        'brand': 'Marico',
        'unit': '1 L',
        'sku': '8901088012014',
        'description': 'Blended edible vegetable oil with dual seed technology and high natural gamma oryzanol.',
        'image_url': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Edible Oils & Ghee'
    },
    {
        'name': 'Vim Anti-Bacterial Dishwash Gel Lemon',
        'brand': 'Hindustan Unilever',
        'unit': '750 ml Bottle',
        'sku': '8901030580010',
        'description': 'Concentrated dishwashing liquid with real lemon juice that cuts stubborn oil and burnt residue.',
        'image_url': 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Household Cleaning'
    },
    {
        'name': 'Britannia Good Day Butter Cookies',
        'brand': 'Britannia',
        'unit': '200 g',
        'sku': '8901063012018',
        'description': 'Rich buttery baked cookies featuring delightful smiling ridges and crunchy bites.',
        'image_url': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Biscuits & Snacks'
    },
    {
        'name': 'Amul Taaza Homogenised Toned Milk',
        'brand': 'Amul',
        'unit': '1 L Tetra Pak',
        'sku': '8901262015010',
        'description': 'UHT treated fresh toned milk in aseptic hygienic packaging. No refrigeration needed till opened.',
        'image_url': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
        'category_suggestion': 'Dairy & Breakfast'
    }
]

class FavoriteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteSerializer
    pagination_class = None

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False) or not getattr(self.request, 'user', None) or not self.request.user.is_authenticated:
            return Favorite.objects.none()
        return Favorite.objects.select_related(
            'product',
            'product__category'
        ).prefetch_related(
            'product__gallery_images'
        ).filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product') or request.data.get('product_id')
        if not product_id:
            return Response({'error': 'product is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            product = Product.objects.get(id=product_id)
        except (Product.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        favorite, created = Favorite.objects.get_or_create(user=request.user, product=product)
        favorite = Favorite.objects.select_related('product', 'product__category').prefetch_related('product__gallery_images').get(id=favorite.id)
        serializer = self.get_serializer(favorite)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception:
            return Response({'status': 'already removed'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        product_id = request.data.get('product') or request.data.get('product_id')
        if not product_id:
            return Response({'error': 'product is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            product = Product.objects.get(id=product_id)
        except (Product.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        fav = Favorite.objects.filter(user=request.user, product=product).first()
        if fav:
            fav.delete()
            return Response({
                'status': 'removed',
                'is_favorite': False,
                'product_id': product.id
            }, status=status.HTTP_200_OK)
        else:
            fav, _ = Favorite.objects.get_or_create(user=request.user, product=product)
            fav = Favorite.objects.select_related('product', 'product__category').prefetch_related('product__gallery_images').get(id=fav.id)
            serializer = self.get_serializer(fav)
            return Response({
                'status': 'added',
                'is_favorite': True,
                'id': fav.id,
                'product_id': product.id,
                'favorite': serializer.data
            }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'])
    def remove(self, request):
        product_id = request.data.get('product') or request.data.get('product_id') or request.query_params.get('product')
        if not product_id:
            return Response({'error': 'product is required'}, status=status.HTTP_400_BAD_REQUEST)
        Favorite.objects.filter(user=request.user, product_id=product_id).delete()
        return Response({'status': 'removed', 'is_favorite': False}, status=status.HTTP_200_OK)
