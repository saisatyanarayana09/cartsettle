from decimal import Decimal
import logging
import secrets
from django.core.cache import cache
from rest_framework.throttling import UserRateThrottle
import threading
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.models import User, DeliveryPartnerProfile
from accounts.permissions import IsDeliveryPartnerUser, IsOwnerUser
from notifications.models import Notification
from notifications.services import send_push_notification
from store.models import StoreSettings
from .models import Order
from .serializers import OrderSerializer
from .utils import send_final_invoice_email

logger = logging.getLogger(__name__)


class DeliveryDashboardView(APIView):
    permission_classes = [IsDeliveryPartnerUser]

    def get(self, request):
        user = request.user
        profile, _ = DeliveryPartnerProfile.objects.get_or_create(user=user)

        today_start = timezone.localtime(timezone.now()).replace(hour=0, minute=0, second=0, microsecond=0)

        # Eager load customer, delivery_partner and line items to eliminate N+1 queries
        base_order_qs = (
            Order.objects
            .select_related(
                'customer',
                'customer__customer_profile',
                'delivery_partner',
                'delivery_partner__delivery_profile'
            )
            .prefetch_related('items', 'items__product')
        )

        # Active assigned orders (Ready for pickup or currently Out for delivery)
        active_orders = base_order_qs.filter(
            delivery_partner=user,
            status__in=[Order.Status.READY, Order.Status.OUT_FOR_DELIVERY]
        ).order_by('-assigned_at', '-created_at')

        # Orders completed today by this partner
        completed_today_qs = base_order_qs.filter(
            delivery_partner=user,
            status=Order.Status.COMPLETED,
            delivered_at__gte=today_start
        ).order_by('-delivered_at')

        serializer_context = {'request': request}
        active_data = OrderSerializer(active_orders, many=True, context=serializer_context).data
        completed_data = OrderSerializer(completed_today_qs, many=True, context=serializer_context).data

        return Response({
            'profile': {
                'id': user.id,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'phone': profile.phone_number or (user.username if user.username.isdigit() else ""),
                'vehicle_type': profile.vehicle_type,
                'vehicle_number': profile.vehicle_number,
                'is_online': profile.is_online,
                'total_deliveries': profile.total_deliveries,
            },
            'active_orders': active_data,
            'completed_today_count': len(completed_data),
            'completed_today': completed_data,
        })


class DeliveryToggleDutyView(APIView):
    permission_classes = [IsDeliveryPartnerUser]

    def post(self, request):
        user = request.user
        profile, _ = DeliveryPartnerProfile.objects.get_or_create(user=user)

        requested_status = request.data.get('is_online')
        if requested_status is not None:
            profile.is_online = bool(requested_status)
        else:
            profile.is_online = not profile.is_online

        profile.last_active_at = timezone.now()
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        if lat is not None and lng is not None:
            try:
                profile.current_lat = Decimal(str(lat))
                profile.current_lng = Decimal(str(lng))
            except Exception:
                pass

        profile.save(update_fields=['is_online', 'last_active_at', 'current_lat', 'current_lng', 'updated_at'])

        return Response({
            'is_online': profile.is_online,
            'message': 'You are now online and ready for deliveries!' if profile.is_online else 'You are now offline.'
        })


class DeliveryPickupOrderView(APIView):
    permission_classes = [IsDeliveryPartnerUser]

    def post(self, request, pk):
        user = request.user
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Verify assignment or staff override
        if order.delivery_partner != user and not (getattr(user, 'is_owner', False) or user.is_staff):
            return Response({'detail': 'This order is not assigned to you.'}, status=status.HTTP_403_FORBIDDEN)

        if order.status != Order.Status.READY:
            return Response({
                'detail': f'Order must be in READY status to pickup. Current status is {order.status}.'
            }, status=status.HTTP_400_BAD_REQUEST)

        order.status = Order.Status.OUT_FOR_DELIVERY
        order.dispatched_at = timezone.now()
        order.save(update_fields=['status', 'dispatched_at', 'updated_at'])

        # Notify Customer
        try:
            pickup_title = f"Order #{order.id} is Out for Delivery! 🛵"
            pickup_body = f"Your delivery partner has picked up your order and is heading your way. Your delivery OTP is {order.delivery_otp}."
            Notification.objects.create(
                user=order.customer,
                title=pickup_title,
                message=pickup_body
            )
            send_push_notification(
                user=order.customer,
                title=pickup_title,
                body=pickup_body,
                data={'order_id': str(order.id), 'status': 'OUT_FOR_DELIVERY', 'otp': order.delivery_otp or ''}
            )
        except Exception as e:
            logger.error("Error notifying customer on pickup: %s", e)

        # Real-time WebSocket status broadcast
        try:
            from .ws_broadcast import broadcast_order_status
            broadcast_order_status(order.id, Order.Status.OUT_FOR_DELIVERY, order.delivery_otp)
        except Exception as ws_err:
            logger.debug("WS pickup broadcast error: %s", ws_err)

        return Response(OrderSerializer(order, context={'request': request}).data)


class DeliveryNotifyArrivalView(APIView):
    permission_classes = [IsDeliveryPartnerUser]

    def post(self, request, pk):
        user = request.user
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Verify assignment or staff override
        if order.delivery_partner != user and not (getattr(user, 'is_owner', False) or user.is_staff):
            return Response({'detail': 'This order is not assigned to you.'}, status=status.HTTP_403_FORBIDDEN)

        if order.status not in [Order.Status.READY, Order.Status.OUT_FOR_DELIVERY]:
            return Response({
                'detail': f'Cannot notify arrival for order with status {order.status}.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Notify Customer
        title = "Rider is 2 minutes away! 🛵"
        otp_text = f" Your delivery verification OTP is {order.delivery_otp}." if order.delivery_otp else ""
        partner_name = user.get_full_name() or user.username
        body = f"Your delivery partner {partner_name} is arriving shortly at your address.{otp_text} Please keep OTP ready!"

        try:
            Notification.objects.create(
                user=order.customer,
                title=title,
                message=body
            )
            send_push_notification(
                user=order.customer,
                title=title,
                body=body,
                data={
                    'order_id': str(order.id),
                    'status': 'RIDER_ARRIVING',
                    'otp': order.delivery_otp or '',
                    'type': 'ARRIVAL_ALERT'
                }
            )
        except Exception as e:
            logger.error("Error sending arrival notification: %s", e)

        return Response({
            'detail': 'Customer notified that you are 2 minutes away!',
            'order_id': order.id,
            'notified': True
        })


class DeliveryVerifyAndCompleteView(APIView):
    throttle_classes = [UserRateThrottle]
    permission_classes = [IsDeliveryPartnerUser]

    def post(self, request, pk):
        user = request.user
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Verify assignment or staff override
        if order.delivery_partner != user and not (getattr(user, 'is_owner', False) or user.is_staff):
            return Response({'detail': 'This order is not assigned to you.'}, status=status.HTTP_403_FORBIDDEN)

        if order.status not in [Order.Status.READY, Order.Status.OUT_FOR_DELIVERY]:
            return Response({
                'detail': f'Order cannot be completed from current status {order.status}.'
            }, status=status.HTTP_400_BAD_REQUEST)

        entered_otp = str(request.data.get('otp', '')).strip()
        is_owner_or_staff = getattr(user, 'is_owner', False) or user.is_staff or user.is_superuser

        # Verify OTP if order has delivery_otp and not overridden by owner
        if order.delivery_otp and not is_owner_or_staff:
            attempt_cache_key = f"delivery_otp_attempts:{order.id}"
            failed_attempts = cache.get(attempt_cache_key, 0)
            if failed_attempts >= 5:
                return Response(
                    {'detail': 'Too many failed OTP attempts. Please wait 15 minutes or ask the store owner to verify.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            expected_otp = order.delivery_otp.strip()
            if not entered_otp or not secrets.compare_digest(entered_otp, expected_otp):
                failed_attempts += 1
                cache.set(attempt_cache_key, failed_attempts, timeout=900)
                return Response({'detail': 'Invalid delivery OTP. Please verify with customer.'}, status=status.HTTP_400_BAD_REQUEST)
            cache.delete(attempt_cache_key)

        with transaction.atomic():
            order.status = Order.Status.COMPLETED
            order.delivered_at = timezone.now()
            order.save(update_fields=['status', 'delivered_at', 'updated_at'])

            # Increment partner delivery count
            if order.delivery_partner and hasattr(order.delivery_partner, 'delivery_profile'):
                try:
                    order.delivery_partner.delivery_profile.total_deliveries += 1
                    order.delivery_partner.delivery_profile.save(update_fields=['total_deliveries'])
                except Exception:
                    pass

            # Notify Customer
            delivery_title = f"Order #{order.id} Delivered Successfully! 🎉"
            delivery_msg = f"Hi {order.customer.first_name or 'there'}, your Narendra Kirana order #{order.id} has been delivered. Thank you for shopping with us!"
            Notification.objects.create(
                user=order.customer,
                title=delivery_title,
                message=delivery_msg
            )
            send_push_notification(
                user=order.customer,
                title=delivery_title,
                body=delivery_msg,
                data={'order_id': order.id, 'status': 'COMPLETED'}
            )

            # Order Cashback Processing (Strictly Idempotent)
            try:
                store_settings = StoreSettings.load()
                cashback_pct = getattr(store_settings, 'order_cashback_percentage', Decimal('0.00'))
                if not getattr(order, 'cashback_credited', False) and cashback_pct and Decimal(str(cashback_pct)) > Decimal('0.00') and order.total_amount > Decimal('0.00'):
                    cashback = ((order.total_amount * Decimal(str(cashback_pct))) / Decimal('100')).quantize(Decimal('0.01'))
                    if cashback > Decimal('0.00'):
                        from accounts.models import Wallet, WalletTransaction
                        customer_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=order.customer)
                        customer_wallet.balance += cashback
                        customer_wallet.save(update_fields=['balance', 'updated_at'])

                        WalletTransaction.objects.create(
                            wallet=customer_wallet,
                            amount=cashback,
                            transaction_type='PURCHASE_CASHBACK',
                            description=f"Cashback for completed order #{order.id} ({cashback_pct}%)"
                        )

                        order.cashback_credited = True
                        order.save(update_fields=['cashback_credited', 'updated_at'])

                        Notification.objects.create(
                            user=order.customer,
                            title="Cashback Earned! 💰",
                            message=f"You earned ₹{cashback} cashback on your Order #{order.id}! Added to your wallet."
                        )
            except Exception as e:
                logger.error("Error crediting cashback for order %s: %s", order.id, str(e))

            # Send final PDF invoice asynchronously
            threading.Thread(target=send_final_invoice_email, args=(order,), daemon=True).start()

        # Real-time WebSocket status broadcast
        try:
            from .ws_broadcast import broadcast_order_status
            broadcast_order_status(order.id, Order.Status.COMPLETED)
        except Exception as ws_err:
            logger.debug("WS complete broadcast error: %s", ws_err)

        return Response(OrderSerializer(order, context={'request': request}).data)


class DeliveryHistoryView(APIView):
    permission_classes = [IsDeliveryPartnerUser]

    def get(self, request):
        orders = Order.objects.filter(
            delivery_partner=request.user,
            status=Order.Status.COMPLETED
        ).order_by('-delivered_at', '-created_at')[:50]

        return Response(OrderSerializer(orders, many=True, context={'request': request}).data)


class OwnerDeliveryPartnersView(APIView):
    permission_classes = [IsOwnerUser]

    def get(self, request):
        partners = User.objects.filter(is_delivery_partner=True).select_related('delivery_profile').order_by('-date_joined')
        data = []
        for p in partners:
            profile, _ = DeliveryPartnerProfile.objects.get_or_create(user=p)
            active_count = Order.objects.filter(
                delivery_partner=p,
                status__in=[Order.Status.READY, Order.Status.OUT_FOR_DELIVERY]
            ).count()

            data.append({
                'id': p.id,
                'username': p.username,
                'first_name': p.first_name,
                'last_name': p.last_name,
                'name': p.get_full_name() or p.username,
                'email': p.email,
                'phone': profile.phone_number or (p.username if p.username.isdigit() else ""),
                'vehicle_type': profile.vehicle_type,
                'vehicle_number': profile.vehicle_number,
                'is_active': p.is_active and profile.is_active,
                'is_online': profile.is_online,
                'total_deliveries': profile.total_deliveries,
                'active_orders_count': active_count,
                'last_active_at': profile.last_active_at,
            })
        return Response(data)

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        phone_number = request.data.get('phone_number', '').strip()
        vehicle_type = request.data.get('vehicle_type', 'Bike')
        vehicle_number = request.data.get('vehicle_number', '').strip()

        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'detail': f'User with username "{username}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_customer=False,
                is_owner=False,
                is_delivery_partner=True,
                is_active=True
            )
            profile = DeliveryPartnerProfile.objects.create(
                user=user,
                phone_number=phone_number or username,
                vehicle_type=vehicle_type,
                vehicle_number=vehicle_number,
                is_active=True,
                is_online=False
            )

        return Response({
            'id': user.id,
            'username': user.username,
            'name': user.get_full_name() or user.username,
            'phone': profile.phone_number,
            'vehicle_type': profile.vehicle_type,
            'vehicle_number': profile.vehicle_number,
            'message': 'Delivery partner created successfully.'
        }, status=status.HTTP_201_CREATED)


class DeliveryUpdateLocationView(APIView):
    permission_classes = [IsDeliveryPartnerUser]

    def post(self, request):
        user = request.user
        profile, _ = DeliveryPartnerProfile.objects.get_or_create(user=user)
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        if lat is None or lng is None:
            return Response({'detail': 'latitude and longitude are required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            profile.current_lat = Decimal(str(lat))
            profile.current_lng = Decimal(str(lng))
            profile.last_active_at = timezone.now()
            profile.save(update_fields=['current_lat', 'current_lng', 'last_active_at', 'updated_at'])

            # Real-time WebSocket broadcast to all active orders assigned to this rider
            try:
                from .ws_broadcast import broadcast_rider_location
                active_order_ids = list(Order.objects.filter(
                    delivery_partner=user,
                    status__in=[Order.Status.OUT_FOR_DELIVERY, Order.Status.READY]
                ).values_list('id', flat=True))

                heading_val = None
                speed_val = None
                try:
                    if request.data.get('heading') is not None:
                        heading_val = float(request.data.get('heading'))
                except (ValueError, TypeError):
                    pass
                try:
                    if request.data.get('speed') is not None:
                        speed_val = float(request.data.get('speed'))
                except (ValueError, TypeError):
                    pass

                for active_id in active_order_ids:
                    broadcast_rider_location(
                        order_id=active_id,
                        latitude=float(profile.current_lat),
                        longitude=float(profile.current_lng),
                        heading=heading_val,
                        speed=speed_val
                    )
            except Exception as ws_err:
                logger.debug("WS rider location broadcast error: %s", ws_err)

            return Response({
                'status': 'ok',
                'current_lat': str(profile.current_lat),
                'current_lng': str(profile.current_lng),
                'last_active_at': profile.last_active_at.isoformat()
            })
        except Exception as e:
            return Response({'detail': f'Invalid coordinates: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
