from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.utils import timezone
from accounts.permissions import IsOwnerUser, IsOwnerOrReadOnly
from .models import Banner, PromoCode
from .serializers import BannerSerializer, PromoCodeSerializer

BANNER_CACHE_KEY = 'active_banners_serialized'

class BannerViewSet(viewsets.ModelViewSet):
    serializer_class = BannerSerializer
    
    def get_queryset(self):
        qs = Banner.objects.all().order_by('display_order', '-created_at')
        if getattr(self.request.user, 'is_owner', False):
            return qs
        return qs.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        from django.core.cache import cache
        is_owner = bool(request.user and request.user.is_authenticated and getattr(request.user, 'is_owner', False))
        if not is_owner and not request.query_params:
            cached_data = cache.get(BANNER_CACHE_KEY)
            if cached_data is not None:
                resp = Response(cached_data)
                resp['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
                return resp

        response = super().list(request, *args, **kwargs)
        if not is_owner and not request.query_params and response.status_code == 200:
            cache.set(BANNER_CACHE_KEY, response.data, 600)
            response['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
        return response

    def perform_create(self, serializer):
        from django.core.cache import cache
        super().perform_create(serializer)
        cache.delete(BANNER_CACHE_KEY)

    def perform_update(self, serializer):
        from django.core.cache import cache
        super().perform_update(serializer)
        cache.delete(BANNER_CACHE_KEY)

    def perform_destroy(self, instance):
        from django.core.cache import cache
        super().perform_destroy(instance)
        cache.delete(BANNER_CACHE_KEY)

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerUser])
    def reorder(self, request):
        from django.core.cache import cache
        updates = request.data
        banners = []
        for update in updates:
            b = Banner(id=update['id'], display_order=update['display_order'])
            banners.append(b)
        Banner.objects.bulk_update(banners, ['display_order'])
        cache.delete(BANNER_CACHE_KEY)
        return Response({'status': 'reordered'})

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsOwnerUser()]

PROMO_CACHE_KEY = 'active_promos_serialized'

class PromoCodeViewSet(viewsets.ModelViewSet):
    serializer_class = PromoCodeSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsOwnerUser()]

    def get_queryset(self):
        user = getattr(self.request, 'user', None)
        qs = PromoCode.objects.select_related('applicable_category')
        if user and user.is_authenticated and getattr(user, 'is_owner', False):
            return qs.all().order_by('-created_at')
        return qs.filter(is_active=True).filter(
            models.Q(expiration_date__isnull=True) | models.Q(expiration_date__gte=timezone.now())
        ).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        from django.core.cache import cache
        is_owner = bool(request.user and request.user.is_authenticated and getattr(request.user, 'is_owner', False))
        if not is_owner and not request.query_params:
            cached_data = cache.get(PROMO_CACHE_KEY)
            if cached_data is not None:
                resp = Response(cached_data)
                resp['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
                return resp

        response = super().list(request, *args, **kwargs)
        if not is_owner and not request.query_params and response.status_code == 200:
            cache.set(PROMO_CACHE_KEY, response.data, 300)
            response['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
        return response

    def perform_create(self, serializer):
        from django.core.cache import cache
        super().perform_create(serializer)
        cache.delete(PROMO_CACHE_KEY)

    def perform_update(self, serializer):
        from django.core.cache import cache
        super().perform_update(serializer)
        cache.delete(PROMO_CACHE_KEY)

    def perform_destroy(self, instance):
        from django.core.cache import cache
        super().perform_destroy(instance)
        cache.delete(PROMO_CACHE_KEY)

from .models import ReferralSettings, ReferralMilestone, Referral
from .serializers import ReferralSettingsSerializer, ReferralMilestoneSerializer, ReferralSerializer
from rest_framework import generics

class ReferralSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = ReferralSettingsSerializer
    def get_permissions(self):
        if getattr(self, 'request', None) and self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsOwnerUser()]
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj, created = ReferralSettings.objects.select_related('referrer_reward_product').get_or_create(pk=1)
        return obj

class ReferralMilestoneViewSet(viewsets.ModelViewSet):
    queryset = ReferralMilestone.objects.all().order_by('required_referrals')
    serializer_class = ReferralMilestoneSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsOwnerUser()]

class ReferralHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReferralSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Referral.objects.none()
        qs = Referral.objects.select_related('referrer', 'referred_user')
        if getattr(user, 'is_owner', False) or user.is_staff or user.is_superuser:
            return qs.all()
        return qs.filter(models.Q(referrer=user) | models.Q(referred_user=user))

    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        try:
            referral = self.get_object()
        except Exception:
            return Response({'detail': 'Referral record not found or inaccessible.'}, status=404)

        user = request.user
        is_owner = getattr(user, 'is_owner', False) or user.is_staff or user.is_superuser
        if referral.referrer != user and referral.referred_user != user and not is_owner:
            return Response({'detail': 'Not authorized to view QR code for this referral.'}, status=403)
            
        from django.core.signing import TimestampSigner
        signer = TimestampSigner()
        token = signer.sign(str(referral.id))
        qr_data = f"secure_qr:{token}"
        
        img_str = ""
        try:
            import qrcode
            import base64
            from io import BytesIO
            
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(qr_data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode()
        except Exception:
            # Fallback gracefully so frontend can still render qr_data via SVG
            pass
        
        return Response({
            'qr_code_base64': img_str,
            'token': token,
            'qr_data': qr_data
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def claim(self, request, pk=None):
        try:
            referral = self.get_object()
        except Exception:
            return Response({'detail': 'Referral record not found or inaccessible.'}, status=404)

        user = request.user
        is_owner = getattr(user, 'is_owner', False) or user.is_staff or user.is_superuser
        if referral.referrer != user and referral.referred_user != user and not is_owner:
            return Response({'detail': 'Not authorized to claim this referral.'}, status=403)
        if referral.status != Referral.Status.READY_TO_CLAIM:
            return Response({'detail': 'Referral not ready to claim.'}, status=400)
            
        referral.status = Referral.Status.AWAITING_APPROVAL
        referral.save()
        return Response({'status': 'claimed'})

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def approve(self, request, pk=None):
        token = request.data.get('token')
        is_owner = request.user and request.user.is_authenticated and getattr(request.user, 'is_owner', False)
        if not token and not is_owner:
            return Response({'detail': 'Security token is missing from the request!'}, status=400)
            
        if token:
            from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
            signer = TimestampSigner()
            try:
                # Valid for exactly 5 minutes (300 seconds)
                verified_id = signer.unsign(token, max_age=300)
                if str(verified_id) != str(pk):
                    return Response({'detail': 'Token mismatch error!'}, status=400)
            except SignatureExpired:
                return Response({'detail': 'QR Code has expired! Please ask the customer to refresh their screen.'}, status=400)
            except BadSignature:
                return Response({'detail': 'Invalid or tampered QR Code!'}, status=400)

        from django.utils import timezone
        from decimal import Decimal
        from orders.models import Order, OrderItem
        from accounts.models import Wallet, WalletTransaction
        from notifications.models import Notification

        settings = ReferralSettings.load()
        with transaction.atomic():
            try:
                referral = Referral.objects.select_for_update().get(id=pk)
            except Referral.DoesNotExist:
                return Response({'detail': 'Referral not found.'}, status=404)

            if referral.status != Referral.Status.AWAITING_APPROVAL:
                return Response({'detail': 'Referral not awaiting approval.'}, status=400)

            referral.status = Referral.Status.COMPLETED
            referral.completed_at = timezone.now()
            referral.save()
            
            referrer_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=referral.referrer)

            if settings.referrer_reward > 0:
                referrer_wallet.balance += settings.referrer_reward
                referrer_wallet.save()
                WalletTransaction.objects.create(
                    wallet=referrer_wallet,
                    amount=settings.referrer_reward,
                    transaction_type=WalletTransaction.TransactionType.REFERRAL_REWARD,
                    description=f"Reward for successful referral of {referral.referred_user.username}"
                )
                
            if settings.referrer_reward_product:
                from products.models import Product
                product = Product.objects.select_for_update().get(id=settings.referrer_reward_product_id)
                product_price = product.offer_price if product.offer_price else product.regular_price
                free_order = Order.objects.create(
                    customer=referral.referrer,
                    total_amount=Decimal('0.00'),
                    discount_applied=product_price,
                    promo_discount=Decimal('0.00'),
                    wallet_discount=Decimal('0.00'),
                    packaging_fee=Decimal('0.00'),
                    status=Order.Status.ACCEPTED,
                    customer_note=f"Free gift for referring {referral.referred_user.username}!"
                )
                OrderItem.objects.create(
                    order=free_order,
                    product=product,
                    product_name_snapshot=product.name,
                    unit_snapshot=product.unit,
                    price_snapshot=Decimal('0.00'),
                    quantity=1,
                    subtotal=Decimal('0.00')
                )
                product.stock_quantity -= 1
                if product.stock_quantity <= 0:
                    product.stock_quantity = 0
                    product.is_in_stock = False
                product.save(update_fields=['stock_quantity', 'is_in_stock'])
                
            successful_referrals = Referral.objects.filter(referrer=referral.referrer, status=Referral.Status.COMPLETED).count()
            milestone = ReferralMilestone.objects.filter(required_referrals=successful_referrals).first()
            if milestone and milestone.bonus_reward > 0:
                referrer_wallet.balance += milestone.bonus_reward
                referrer_wallet.save()
                WalletTransaction.objects.create(
                    wallet=referrer_wallet,
                    amount=milestone.bonus_reward,
                    transaction_type=WalletTransaction.TransactionType.MILESTONE_BONUS,
                    description=f"Bonus for reaching {successful_referrals} referrals!"
                )
                
            Notification.objects.create(
                user=referral.referrer,
                title="Referral Reward Approved! 🎉",
                message="Your referral reward has been approved by the store owner and issued to you!"
            )
            
        return Response({'status': 'approved'})
