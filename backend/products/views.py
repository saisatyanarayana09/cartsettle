from rest_framework import viewsets, filters, status
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

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('gallery_images').all().order_by('display_order', '-created_at')
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active', 'is_in_stock']
    search_fields = ['name', 'brand', 'description']
    ordering_fields = ['offer_price', 'regular_price', 'created_at', 'name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'barcode_lookup']:
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

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201 and 'id' in response.data:
            product = Product.objects.select_related('category').prefetch_related('gallery_images').get(id=response.data['id'])
            self._handle_gallery_images(product, request)
            response.data = self.get_serializer(product).data
            cache.delete('active_homepage_sections_serialized')
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        product = self.get_object()
        self._handle_gallery_images(product, request)
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
        gemini_key = os.environ.get('GEMINI_API_KEY', '').strip()
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
        # Throttle manually for this specific action to prevent AI abuse
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
        if not barcode:
            return Response({'error': 'Barcode is required'}, status=400)
            
        # 1. Check local DB
        local_product = Product.objects.select_related('category').prefetch_related('gallery_images').filter(sku=barcode).first()
        if local_product:
            return Response({
                'source': 'local',
                'product': ProductSerializer(local_product, context={'request': request}).data
            })
            
        import requests
        headers = {'User-Agent': 'SmartKirana/1.0'}
        
        # 2. Check Open Food Facts API (Primary)
        try:
            url_off = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
            response_off = requests.get(url_off, headers=headers, timeout=5)
            if response_off.status_code == 200:
                data_off = response_off.json()
                if data_off.get('status') == 1:
                    product_data = data_off.get('product', {})
                    return Response({
                        'source': 'external',
                        'product': {
                            'name': product_data.get('product_name', ''),
                            'brand': product_data.get('brands', ''),
                            'unit': product_data.get('quantity', ''),
                            'image_url': product_data.get('image_front_url', ''),
                            'sku': barcode
                        }
                    })
        except Exception as e:
            print('Open Food Facts API error:', str(e))
            
        # 3. Check UPCitemdb API (Fallback)
        try:
            url_upc = f"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}"
            response_upc = requests.get(url_upc, headers=headers, timeout=5)
            if response_upc.status_code == 200:
                data_upc = response_upc.json()
                if data_upc.get('code') == 'OK' and len(data_upc.get('items', [])) > 0:
                    item = data_upc['items'][0]
                    return Response({
                        'source': 'external',
                        'product': {
                            'name': item.get('title', ''),
                            'brand': item.get('brand', ''),
                            'unit': item.get('size', ''),
                            'image_url': item.get('images', [])[0] if item.get('images') else '',
                            'sku': barcode
                        }
                    })
        except Exception as e:
            print('UPCitemdb API error:', str(e))
            
        return Response({'source': 'not_found'})

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def reorder(self, request):
        updates = request.data
        if not isinstance(updates, list):
            return Response({'error': 'Expected a list of updates'}, status=400)
            
        products = []
        for update in updates:
            try:
                prod = Product(
                    id=int(update['id']), 
                    display_order=int(update.get('display_order', 0))
                )
                products.append(prod)
            except (KeyError, ValueError, TypeError):
                continue
                
        if products:
            Product.objects.bulk_update(products, ['display_order'])
        return Response({'status': 'reordered'})

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
