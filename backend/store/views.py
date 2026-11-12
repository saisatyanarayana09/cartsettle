import time
import io
import wave

from django.db import connection
from django.db.models import Prefetch
from django.http import JsonResponse
from django.utils import timezone
from django.views import View
from django.views.generic import TemplateView
from rest_framework import views, response, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from accounts.permissions import IsOwnerUser, IsOwnerOrReadOnly
from .models import StoreSettings, Feedback, HomepageSection, StoreEmailSettings, HomepageSectionProduct
from .serializers import (
    StoreSettingsSerializer, 
    FeedbackSerializer, 
    HomepageSectionSerializer,
    StoreEmailSettingsSerializer
)


from django.shortcuts import redirect
from services.agent_service import agent_service, AgentTools

class RootDashboardView(TemplateView):
    """Secure dashboard shown at the service root for authenticated admins."""
    template_name = 'admin/dashboard.html'
    
    def get(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_staff:
            return redirect('/admin/login/')
            
        # Extremely lightweight query to prevent Neon database from auto-suspending (Scale to Zero)
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception:
            pass
        return super().get(request, *args, **kwargs)


class BackendHealthView(View):
    """Small public health endpoint consumed by the root monitor page."""

    def get(self, request):
        started = time.perf_counter()
        database_status = 'connected'
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
        except Exception:
            database_status = 'unavailable'

        latency_ms = round((time.perf_counter() - started) * 1000, 1)
        is_healthy = database_status == 'connected'
        return JsonResponse({
            'status': 'operational' if is_healthy else 'degraded',
            'database': database_status,
            'latency_ms': latency_ms,
            'timestamp': timezone.now().isoformat(),
            'api_base': '/api/v1/',
        }, status=200 if is_healthy else 503)


class StorePublicSettingsView(views.APIView):
    """
    Public storefront settings endpoint accessible without authentication.
    Consumed by customer web storefront and customer mobile app.
    Guarantees theme colors, branding presets, and customer-facing operational flags.
    """
    def get_authenticators(self):
        return []

    def get_permissions(self):
        return [AllowAny()]

    def get(self, request):
        from django.core.cache import cache
        cached_data = cache.get('store_public_settings_serialized')
        if cached_data is not None:
            resp = response.Response(cached_data)
            resp['Cache-Control'] = 'no-cache, must-revalidate, max-age=0'
            return resp

        settings = StoreSettings.load()
        serializer = StoreSettingsSerializer(settings, context={'request': request})
        data = dict(serializer.data)

        # Explicitly ensure all theme fields are present with safe defaults
        theme_defaults = [
            ('brand_theme_preset', settings.brand_theme_preset or 'vacation'),
            ('palette_mode', settings.palette_mode or 5),
            ('custom_primary_color', settings.custom_primary_color or '#5ba8a6'),
            ('custom_secondary_color', settings.custom_secondary_color or '#4d69a5'),
            ('custom_accent_color', settings.custom_accent_color or '#ecd386'),
            ('custom_canvas_color', settings.custom_canvas_color or '#eae6dd'),
            ('custom_text_color', settings.custom_text_color or '#323232'),
            ('apply_theme_to_owner_app', settings.apply_theme_to_owner_app),
        ]
        for key, val in theme_defaults:
            if not data.get(key) and data.get(key) != False:
                data[key] = val

        cache.set('store_public_settings_serialized', data, 300)
        resp = response.Response(data)
        resp['Cache-Control'] = 'no-cache, must-revalidate, max-age=0'
        return resp


class StoreSettingsView(views.APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_authenticators(self):
        if getattr(self, 'request', None) and self.request.method in ['GET', 'OPTIONS', 'HEAD']:
            return []
        return super().get_authenticators()

    def get_permissions(self):
        if getattr(self, 'request', None) and self.request.method in ['GET', 'OPTIONS', 'HEAD']:
            return [AllowAny()]
        return [IsOwnerUser()]

    def get(self, request):
        from django.core.cache import cache
        cached_data = cache.get('store_settings_serialized')
        if cached_data is not None:
            resp = response.Response(cached_data)
            resp['Cache-Control'] = 'no-cache, must-revalidate, max-age=0'
            return resp
        settings = StoreSettings.load()
        serializer = StoreSettingsSerializer(settings, context={'request': request})
        data = dict(serializer.data)
        theme_defaults = [
            ('brand_theme_preset', settings.brand_theme_preset or 'vacation'),
            ('palette_mode', settings.palette_mode or 5),
            ('custom_primary_color', settings.custom_primary_color or '#5ba8a6'),
            ('custom_secondary_color', settings.custom_secondary_color or '#4d69a5'),
            ('custom_accent_color', settings.custom_accent_color or '#ecd386'),
            ('custom_canvas_color', settings.custom_canvas_color or '#eae6dd'),
            ('custom_text_color', settings.custom_text_color or '#323232'),
            ('apply_theme_to_owner_app', settings.apply_theme_to_owner_app),
        ]
        for key, val in theme_defaults:
            if not data.get(key) and data.get(key) != False:
                data[key] = val
        cache.set('store_settings_serialized', data, 300)
        resp = response.Response(data)
        resp['Cache-Control'] = 'no-cache, must-revalidate, max-age=0'
        return resp

    def patch(self, request):
        from django.core.cache import cache
        settings = StoreSettings.load()
        serializer = StoreSettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            cache.delete('store_settings_serialized')
            cache.delete('store_public_settings_serialized')
            cache.delete('store_settings')
            return response.Response(serializer.data)
        return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)


class StoreEmailSettingsView(views.APIView):
    permission_classes = [IsOwnerUser]

    def get(self, request):
        email_settings = StoreEmailSettings.load()
        serializer = StoreEmailSettingsSerializer(email_settings, context={'request': request})
        return response.Response(serializer.data)

    def patch(self, request):
        email_settings = StoreEmailSettings.load()
        serializer = StoreEmailSettingsSerializer(email_settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        return self.patch(request)


class TestStoreEmailView(views.APIView):
    permission_classes = [IsOwnerUser]

    def post(self, request):
        from .email_service import test_smtp_connection
        from django.utils import timezone

        test_email = request.data.get('test_email')
        if not test_email or '@' not in test_email:
            return response.Response(
                {'error': 'Please provide a valid recipient email address.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        config_override = request.data.get('config_override') or None
        success, detail = test_smtp_connection(test_email, config_override=config_override)

        # Update last tested timestamp and status on StoreEmailSettings
        try:
            email_settings = StoreEmailSettings.load()
            email_settings.last_tested_at = timezone.now()
            email_settings.last_test_status = "SUCCESS" if success else f"FAILED: {detail[:200]}"
            email_settings.save()
        except Exception:
            pass

        if success:
            return response.Response({'success': True, 'message': detail})
        else:
            return response.Response({'success': False, 'error': detail}, status=status.HTTP_400_BAD_REQUEST)



import re

def strip_emojis(text):
    if not text:
        return text
    p = re.compile(r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50\u2b55\u200d\ufe0f]', flags=re.UNICODE)
    cleaned = p.sub('', text)
    return re.sub(r'\s+', ' ', cleaned).strip()

HOMEPAGE_SECTIONS_CACHE_KEY = 'active_homepage_sections_serialized'

class HomepageSectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for dynamic homepage sections with fast serialization & memory caching.
    """
    serializer_class = HomepageSectionSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsOwnerUser()]

    def get_queryset(self):
        is_owner = bool(self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_owner', False))
        
        sp_qs = HomepageSectionProduct.objects.select_related('product', 'product__category')
        if not is_owner:
            sp_qs = sp_qs.filter(product__is_active=True)
        sp_qs = sp_qs.order_by('position')

        queryset = HomepageSection.objects.prefetch_related(
            Prefetch('section_products', queryset=sp_qs)
        ).all().order_by('display_order')

        if not is_owner:
            queryset = queryset.filter(is_active=True)
        return queryset

    def list(self, request, *args, **kwargs):
        from django.core.cache import cache
        is_owner = bool(request.user and request.user.is_authenticated and getattr(request.user, 'is_owner', False))
        if not is_owner and not request.query_params:
            cached_data = cache.get(HOMEPAGE_SECTIONS_CACHE_KEY)
            if cached_data is not None:
                resp = response.Response(cached_data)
                resp['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
                return resp

        res = super().list(request, *args, **kwargs)
        if not is_owner and not request.query_params and res.status_code == status.HTTP_200_OK:
            cache.set(HOMEPAGE_SECTIONS_CACHE_KEY, res.data, 600)
            res['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
        return res

    def perform_create(self, serializer):
        from django.core.cache import cache
        title = serializer.validated_data.get('title', '')
        if title:
            title = strip_emojis(title)
        section = serializer.save(title=title)
        self._sync_products(section)
        cache.delete(HOMEPAGE_SECTIONS_CACHE_KEY)

    def perform_update(self, serializer):
        from django.core.cache import cache
        title = serializer.validated_data.get('title', '')
        if title:
            title = strip_emojis(title)
            section = serializer.save(title=title)
        else:
            section = serializer.save()
        self._sync_products(section)
        cache.delete(HOMEPAGE_SECTIONS_CACHE_KEY)

    def perform_destroy(self, instance):
        from django.core.cache import cache
        super().perform_destroy(instance)
        cache.delete(HOMEPAGE_SECTIONS_CACHE_KEY)

    def _sync_products(self, section):
        from django.core.cache import cache
        if 'product_ids' in self.request.data or 'products' in self.request.data:
            product_ids = self.request.data.get('product_ids') if 'product_ids' in self.request.data else [p.get('product_id') for p in sorted([p for p in (self.request.data.get('products') or []) if isinstance(p, dict) and 'product_id' in p], key=lambda x: x.get('position', 0))]
            if isinstance(product_ids, list):
                from .models import HomepageSectionProduct
                from products.models import Product

                section.section_products.all().delete()
                valid_ids = [int(pid) for pid in product_ids if str(pid).isdigit()]
                if valid_ids:
                    products_map = {p.id: p for p in Product.objects.filter(id__in=valid_ids)}
                    to_create = []
                    for idx, pid in enumerate(product_ids):
                        try:
                            p_int = int(pid)
                            if p_int in products_map:
                                to_create.append(HomepageSectionProduct(
                                    section=section,
                                    product=products_map[p_int],
                                    position=idx
                                ))
                        except (ValueError, TypeError):
                            continue
                    if to_create:
                        HomepageSectionProduct.objects.bulk_create(to_create)
                cache.delete(HOMEPAGE_SECTIONS_CACHE_KEY)

    @action(detail=True, methods=['post'], url_path='set-products')
    def set_products(self, request, pk=None):
        section = self.get_object()
        self._sync_products(section)
        return response.Response(self.get_serializer(section).data)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Expects a list of dicts: [{'id': 1, 'display_order': 0}, ...]
        """
        from django.core.cache import cache
        updates = request.data
        if not isinstance(updates, list):
            return response.Response({'error': 'Expected a list of updates'}, status=400)
            
        for item in updates:
            try:
                section_id = int(item.get('id'))
                display_order = int(item.get('display_order', 0))
                HomepageSection.objects.filter(id=section_id).update(display_order=display_order)
            except (ValueError, TypeError):
                continue
        cache.delete(HOMEPAGE_SECTIONS_CACHE_KEY)
        return response.Response({'status': 'order updated'})



class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.select_related('customer').all().order_by('-created_at')
    serializer_class = FeedbackSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsOwnerUser()]

    def perform_create(self, serializer):
        customer = self.request.user if self.request.user.is_authenticated and not getattr(self.request.user, 'is_owner', False) else None
        serializer.save(customer=customer)


class VoiceSearchView(views.APIView):
    """
    Decodes uploaded audio (m4a/aac/wav/3gp/mp3) from mobile/web clients,
    resamples to 16kHz mono WAV in-memory via PyAV, and transcribes via speech recognition.
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        audio_file = request.FILES.get('audio')
        language = request.data.get('language', 'en-IN')
        if not audio_file:
            return response.Response({'error': 'No audio file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if getattr(audio_file, 'size', 0) > 5 * 1024 * 1024:
            return response.Response({'error': 'Audio file exceeds 5 MB limit.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            try:
                import av
            except ImportError:
                av = None
            import speech_recognition as sr
        except ImportError:
            return response.Response(
                {'error': 'Audio processing libraries (av, SpeechRecognition) not installed on server.', 'query': '', 'text': ''},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )

        try:
            input_bytes = audio_file.read()
            if input_bytes[:4] == b'RIFF' and av is None:
                out_buf = io.BytesIO(input_bytes)
                recognizer = sr.Recognizer()
                with sr.AudioFile(out_buf) as source:
                    audio_data = recognizer.record(source)
                query = recognizer.recognize_google(audio_data, language=language)
                return response.Response({'query': query, 'text': query})
            if av is None:
                return response.Response(
                    {'error': 'Audio processing library (av) not installed on server.', 'query': '', 'text': ''},
                    status=status.HTTP_501_NOT_IMPLEMENTED
                )
            in_buf = io.BytesIO(input_bytes)
            container = av.open(in_buf)
            resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)

            out_buf = io.BytesIO()
            with wave.open(out_buf, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(16000)

                for frame in container.decode(audio=0):
                    for r in resampler.resample(frame):
                        wav_file.writeframes(r.to_ndarray().tobytes())
                        if out_buf.tell() > 10 * 1024 * 1024:
                            raise ValueError("Decoded audio exceeds maximum permitted duration.")
            out_buf.seek(0)

            recognizer = sr.Recognizer()
            with sr.AudioFile(out_buf) as source:
                audio_data = recognizer.record(source)

            # Recognize using Google Speech Recognition
            query = recognizer.recognize_google(audio_data, language=language)
            return response.Response({'query': query, 'text': query})
        except sr.UnknownValueError:
            return response.Response({'query': '', 'text': '', 'detail': 'Could not understand audio.'}, status=status.HTTP_200_OK)
        except sr.RequestError as e:
            return response.Response({'error': f'Speech recognition service unavailable: {e}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return response.Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StoreBackupStatsView(views.APIView):
    """Returns real-time database record counts for backup preview."""
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def get(self, request):
        from products.models import Product, Category
        from orders.models import Order
        from accounts.models import User
        from django.conf import settings

        db_engine = settings.DATABASES.get('default', {}).get('ENGINE', '')
        db_type = 'Neon Serverless PostgreSQL (AWS)' if 'postgres' in db_engine else 'Local SQLite'

        return response.Response({
            'database': db_type,
            'products_count': Product.objects.count(),
            'categories_count': Category.objects.count(),
            'orders_count': Order.objects.count(),
            'users_count': User.objects.count(),
            'timestamp': timezone.now().isoformat(),
        })


class StoreBackupExportView(views.APIView):
    """Exports a complete offline JSON backup of all store entities."""
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def get(self, request):
        from django.core.management import call_command
        from django.http import HttpResponse

        buf = io.StringIO()
        call_command(
            'dumpdata',
            'products',
            'store',
            'orders',
            'offers',
            'accounts.user',
            'accounts.customerprofile',
            'accounts.address',
            'accounts.wallet',
            'accounts.wallettransaction',
            'accounts.deliverypartnerprofile',
            natural_foreign=True,
            natural_primary=True,
            indent=2,
            stdout=buf
        )
        data = buf.getvalue()
        filename = f"cartsettle_backup_{timezone.now().strftime('%Y_%m_%d_%H%M%S')}.json"
        res = HttpResponse(data, content_type='application/json')
        res['Content-Disposition'] = f'attachment; filename="{filename}"'
        return res

class AgentChatView(views.APIView):
    """
    CartSettle AI Co-Pilot endpoint with persistent session memory.
    """
    permission_classes = [AllowAny]

    def _resolve_persona(self, request):
        raw_p = request.data.get('persona') or request.data.get('role') or request.query_params.get('persona') or request.query_params.get('role')
        if raw_p:
            p_val = str(raw_p).strip().lower()
            if p_val in ('shopper', 'customer'):
                return 'shopper'
            if p_val in ('owner', 'admin', 'manager'):
                return 'owner'
            return p_val
        portal = str(request.headers.get('X-Portal-Context', '')).lower()
        if portal == 'owner':
            return 'owner'
        if portal == 'shopper':
            return 'shopper'
        referer = str(request.headers.get('Referer', '')).lower()
        if '/owner' in referer:
            return 'owner'
        return 'shopper'

    def get(self, request):
        from services.agent_service import agent_service
        persona = self._resolve_persona(request)
        default_sid = 'owner_copilot_session' if persona == 'owner' else 'shopper_session'
        session_id = request.query_params.get('session_id') or default_sid
        mem = agent_service.get_session_memory(session_id=session_id, persona=persona)
        return response.Response(mem, status=status.HTTP_200_OK)

    def delete(self, request):
        from services.agent_service import agent_service
        persona = self._resolve_persona(request)
        default_sid = 'owner_copilot_session' if persona == 'owner' else 'shopper_session'
        session_id = request.query_params.get('session_id') or request.data.get('session_id') or default_sid
        agent_service.clear_session_memory(session_id=session_id, persona=persona)
        return response.Response({'status': 'cleared'}, status=status.HTTP_200_OK)

    def post(self, request):
        prompt = (request.data.get('prompt') or request.data.get('message') or '').strip()
        image = request.data.get('image') or request.data.get('image_base64')
        persona = self._resolve_persona(request)
        default_sid = 'owner_copilot_session' if persona == 'owner' else 'shopper_session'
        session_id = request.data.get('session_id') or request.query_params.get('session_id') or default_sid
        history = request.data.get('history', [])
        mode = str(request.data.get('mode') or request.query_params.get('mode') or 'chat').strip().lower()

        if not prompt and not image:
            return response.Response({'detail': 'Prompt or image is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not prompt and image:
            prompt = 'Analyze this grocery item or shopping list photo and recommend available store items.'

        cart_items = request.data.get('cart_items', [])
        from services.agent_service import agent_service
        result = agent_service.chat(
            prompt=prompt,
            session_id=session_id,
            history=history,
            persona=persona,
            mode=mode,
            cart_items=cart_items,
            image=image,
            user=request.user if (request.user and request.user.is_authenticated) else None
        )
        return response.Response(result, status=status.HTTP_200_OK)


class AgentToolsView(views.APIView):
    """
    Lists available Agentic Commerce tools and allows executing tools directly.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from services.agent_service import AgentTools
        return response.Response({
            'tools': AgentTools.get_tool_definitions()
        })

    def post(self, request):
        tool_name = request.data.get('tool')
        args = request.data.get('arguments', {})
        session_id = request.data.get('session_id', 'agent_tool_exec')
        if not tool_name:
            return response.Response({'detail': 'tool is required.'}, status=status.HTTP_400_BAD_REQUEST)
        from services.agent_service import AgentTools
        try:
            result = AgentTools.execute_tool(tool_name, args, session_id=session_id)
            return response.Response({'status': 'SUCCESS', 'result': result})
        except Exception as e:
            return response.Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SupplierPayoutView(views.APIView):
    """
    Autonomous B2B wholesale restock payout endpoint powered by PayPal Payouts v1.
    """
    permission_classes = [IsOwnerUser]

    def post(self, request):
        supplier_email = request.data.get('supplier_email')
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'USD')
        note = request.data.get('note', 'CartSettle Supplier Restock Payout')

        if not supplier_email or not amount:
            return response.Response({'detail': 'supplier_email and amount are required.'}, status=status.HTTP_400_BAD_REQUEST)

        from services.paypal_service import paypal_service
        try:
            res = paypal_service.create_payout(
                recipient_email=supplier_email,
                amount=amount,
                currency=currency,
                note=note
            )
            return response.Response(res, status=status.HTTP_201_CREATED)
        except Exception as e:
            return response.Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return res


class RAGStatusView(views.APIView):
    """
    Returns current health, total vectors, manifest entries, and embedding model for the RAG knowledge index.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from services.rag import get_ingestion_service
        try:
            status_data = get_ingestion_service().get_status()
            return response.Response({
                'status': 'OPERATIONAL',
                'rag': status_data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return response.Response({
                'status': 'ERROR',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RAGSyncView(views.APIView):
    """
    Triggers an on-demand synchronization or full rebuild of the ChromaDB RAG knowledge index.
    Protected for Store Owner users.
    """
    permission_classes = [IsOwnerUser]

    def post(self, request):
        rebuild = bool(request.data.get('rebuild', False))
        from services.rag import sync_knowledge_index
        try:
            result = sync_knowledge_index(force_rebuild=rebuild)
            return response.Response({
                'status': 'SUCCESS',
                'result': result
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return response.Response({
                'status': 'ERROR',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



