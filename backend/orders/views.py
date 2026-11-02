from datetime import datetime
from decimal import Decimal
import logging
import threading
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from accounts.permissions import IsCustomerUser, IsOwnerUser
from cart.models import Cart
from products.models import Product
from store.models import StoreSettings
from notifications.models import Notification
from notifications.services import send_push_notification
from .models import Order, OrderItem
from .serializers import CheckoutSerializer, OrderSerializer, OrderStatusSerializer
from .utils import send_order_confirmation_email, send_final_invoice_email, build_order_tax_invoice_html, format_invoice_number
from services.paypal_service import paypal_service
from .ws_broadcast import broadcast_settlement_update, broadcast_agent_thought


logger = logging.getLogger(__name__)


def parse_time_str(val):
    if not val or not isinstance(val, str):
        return None
    val = val.strip().lower()
    for fmt in ('%H:%M', '%H:%M:%S', '%I:%M %p', '%I:%M%p'):
        try:
            return datetime.strptime(val, fmt).time()
        except ValueError:
            pass
    return None


def check_store_operating_hours(timings_json):
    """
    Checks whether store is open based on store_timings_json.
    Returns (is_open: bool, message: str)
    """
    if not timings_json:
        return True, ""

    if isinstance(timings_json, str):
        import json, ast
        timings_str = timings_json.strip()
        if not timings_str or timings_str in ('[]', '{}', 'null'):
            return True, ""
        try:
            timings_json = json.loads(timings_str)
        except Exception:
            try:
                timings_json = ast.literal_eval(timings_str)
            except Exception:
                return True, ""

    now = timezone.localtime(timezone.now())
    day_name_full = now.strftime('%A').lower()   # e.g. "friday"
    day_name_short = now.strftime('%a').lower()  # e.g. "fri"
    weekday_idx_mon = str(now.weekday())         # 0=Monday .. 6=Sunday
    weekday_idx_sun = str((now.weekday() + 1) % 7) # 0=Sunday .. 6=Saturday

    target_keys = {day_name_full, day_name_short, weekday_idx_mon, weekday_idx_sun}

    day_config = None
    if isinstance(timings_json, dict):
        for k, v in timings_json.items():
            if str(k).strip().lower() in target_keys:
                day_config = v
                break
    elif isinstance(timings_json, list):
        for item in timings_json:
            if isinstance(item, dict):
                item_day = str(item.get('day') or item.get('day_name') or item.get('name') or item.get('id', '')).strip().lower()
                if item_day in target_keys:
                    day_config = item
                    break

    if day_config is None:
        return True, ""

    if isinstance(day_config, bool):
        if not day_config:
            return False, f"The store is closed on {now.strftime('%A')}s."
        return True, ""

    if isinstance(day_config, str):
        if day_config.strip().lower() in ('closed', 'off'):
            return False, f"The store is closed on {now.strftime('%A')}s."
        return True, ""

    if isinstance(day_config, dict):
        if day_config.get('is_closed') is True or day_config.get('closed') is True:
            return False, f"The store is closed on {now.strftime('%A')}s."
        if day_config.get('is_open') is False or day_config.get('open') is False:
            return False, f"The store is closed on {now.strftime('%A')}s."

        open_str = (
            day_config.get('open_time')
            or day_config.get('open')
            or day_config.get('opening_time')
            or day_config.get('from')
            or day_config.get('start_time')
        )
        close_str = (
            day_config.get('close_time')
            or day_config.get('close')
            or day_config.get('closing_time')
            or day_config.get('to')
            or day_config.get('end_time')
        )

        if open_str and close_str:
            t_open = parse_time_str(str(open_str))
            t_close = parse_time_str(str(close_str))
            if t_open and t_close:
                curr_t = now.time()
                if t_open <= t_close:
                    if not (t_open <= curr_t <= t_close):
                        return False, f"Store is currently closed. Today's operating hours are {open_str} - {close_str}."
                else: # Overnight hours
                    if not (curr_t >= t_open or curr_t <= t_close):
                        return False, f"Store is currently closed. Today's operating hours are {open_str} - {close_str}."

    return True, ""


class OrderPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

class OrderViewSet(ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    pagination_class = OrderPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['id']

    def get_permissions(self):
        if self.action in ['status', 'update', 'partial_update']:
            return [IsOwnerUser()]
        if self.action == 'create':
            return [IsAuthenticated(), IsCustomerUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        from django.db.models import Prefetch
        from .models import OrderItem
        
        queryset = Order.objects.select_related(
            'customer',
            'customer__customer_profile',
            'delivery_partner',
            'delivery_partner__delivery_profile'
        ).prefetch_related(
            Prefetch('items', queryset=OrderItem.objects.select_related('product'))
        ).order_by('-created_at')

        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()

        # Delivery partner: only view assigned orders
        if getattr(user, 'is_delivery_partner', False) and not (
            getattr(user, 'is_owner', False) or getattr(user, 'is_superuser', False)
        ):
            return queryset.filter(delivery_partner=user)

        is_owner_or_staff = (
            getattr(user, 'is_owner', False) or
            getattr(user, 'is_staff', False) or
            getattr(user, 'is_superuser', False)
        )

        if is_owner_or_staff:
            headers = getattr(self.request, 'headers', {})
            portal_header = str(headers.get('X-Portal-Context') or self.request.META.get('HTTP_X_PORTAL_CONTEXT', '')).strip().lower()
            params = getattr(self.request, 'query_params', getattr(self.request, 'GET', {}))
            as_owner_param = str(params.get('as_owner', '')).strip().lower() in ('true', '1')
            scope_param = str(params.get('scope', '')).strip().lower()
            referer = str(self.request.META.get('HTTP_REFERER', ''))

            # Owner management endpoints or explicit owner portal context
            if (
                portal_header == 'owner' or 
                as_owner_param or 
                scope_param in ('all', 'store', 'owner') or 
                '/owner' in referer or
                'owner' in referer.lower() or
                'owner' in str(self.request.META.get('HTTP_ORIGIN', '')).lower() or
                self.action in ['status', 'assign_partner', 'reject_item', 'owner_note', 'sales_summary', 'dispatch', 'invoice']
            ):
                return queryset

        # In customer portal / customer mobile app, strictly scope to current user's orders
        return queryset.filter(customer=user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Prevent order spamming
        from rest_framework.throttling import UserRateThrottle
        throttle = UserRateThrottle()
        if not throttle.allow_request(request, self):
            return Response({'detail': 'You are creating orders too quickly. Please wait a minute.'}, status=429)
            
        checkout = CheckoutSerializer(data=request.data)
        if not checkout.is_valid():
            errors = checkout.errors
            first_val = next(iter(errors.values())) if errors else 'Invalid checkout data.'
            first_err = first_val[0] if isinstance(first_val, list) and first_val else str(first_val)
            return Response({'detail': first_err, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Pre-lock validations (Store status, timings, and slot limits)
        settings = StoreSettings.load()
        if not settings.is_open:
            return Response({'detail': 'Sorry, the store is currently closed and not accepting new orders.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check Emergency Pause
        if getattr(settings, 'is_emergency_paused', False):
            pause_message = getattr(settings, 'emergency_pause_message', '') or "We are currently experiencing high order volume and will resume shortly. Thank you for your patience!"
            return Response({'detail': pause_message}, status=status.HTTP_400_BAD_REQUEST)

        # Check Store Timings & Operating Hours Cutoff
        if getattr(settings, 'auto_cutoff_orders', False) and getattr(settings, 'store_timings_json', None):
            is_open_schedule, schedule_msg = check_store_operating_hours(settings.store_timings_json)
            if not is_open_schedule:
                return Response({'detail': schedule_msg or 'The store is currently closed outside of operating hours.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check Delivery / Pickup Time Slot Capacity
        chosen_slot_date = checkout.validated_data.get('delivery_slot_date')
        chosen_slot_label = (checkout.validated_data.get('delivery_slot_label') or '').strip()
        if getattr(settings, 'enable_time_slots', False) and chosen_slot_date and chosen_slot_label:
            max_slot_cap = getattr(settings, 'max_orders_per_slot', 15) or 15
            active_slot_orders = Order.objects.filter(
                delivery_slot_date=chosen_slot_date,
                delivery_slot_label=chosen_slot_label
            ).exclude(status__in=[Order.Status.REJECTED]).count()
            if active_slot_orders >= max_slot_cap:
                return Response({
                    'detail': f'The selected time slot "{chosen_slot_label}" on {chosen_slot_date} is fully booked ({active_slot_orders}/{max_slot_cap} orders). Please choose another slot.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Acquire locks deterministically
        try:
            cart = Cart.objects.select_for_update().get(customer=request.user)
        except Cart.DoesNotExist:
            return Response({'detail': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
        items = list(cart.items.select_for_update().select_related('product'))
        if not items:
            return Response({'detail': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
            
        product_ids = sorted([item.product_id for item in items if item.product_id])
        locked_products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids).order_by('id')}
        for item in items:
            product = locked_products.get(item.product_id)
            if not product or not product.is_in_stock or (product.stock_quantity is not None and item.quantity > product.stock_quantity):
                return Response({'detail': f'Insufficient stock for {item.product_name_snapshot or getattr(product, "name", "product")}.'}, status=400)
            if product.max_order_quantity and product.max_order_quantity > 0 and item.quantity > product.max_order_quantity:
                return Response({'detail': f'Order exceeds maximum order limit of {product.max_order_quantity} for {item.product_name_snapshot or getattr(product, "name", "product")}.'}, status=400)

        from cart.serializers import CartSerializer
        cart_data = CartSerializer(cart).data
            
        items_total = Decimal(str(cart_data.get('items_total', cart_data['subtotal'])))
        subtotal = items_total
        if subtotal < settings.min_order_amount:
            return Response({'detail': f'Minimum order amount is Rs. {settings.min_order_amount}.'}, status=status.HTTP_400_BAD_REQUEST)

        # Delivery Validation & Fees
        order_type = checkout.validated_data.get('order_type', 'PICKUP')
        delivery_address = checkout.validated_data.get('delivery_address', '')
        delivery_pincode = checkout.validated_data.get('delivery_pincode', '').strip()
        delivery_latitude = checkout.validated_data.get('delivery_latitude')
        delivery_longitude = checkout.validated_data.get('delivery_longitude')
        delivery_fee = Decimal('0.00')
        
        if order_type == 'DELIVERY':
            if not getattr(settings, 'is_home_delivery_active', False):
                return Response({'detail': 'Home delivery is currently unavailable.'}, status=status.HTTP_400_BAD_REQUEST)
                
            if not delivery_address:
                return Response({'detail': 'Delivery address is required.'}, status=status.HTTP_400_BAD_REQUEST)
                
            min_delivery = getattr(settings, 'min_delivery_order_amount', 0)
            if min_delivery > 0 and subtotal < min_delivery:
                return Response({'detail': f'Minimum order amount for delivery is ₹{min_delivery}.'}, status=status.HTTP_400_BAD_REQUEST)
                
            allowed_pincodes_str = getattr(settings, 'allowed_pincodes', '')
            if allowed_pincodes_str:
                allowed_pincodes = [p.strip() for p in allowed_pincodes_str.split(',') if p.strip()]
                if allowed_pincodes and delivery_pincode not in allowed_pincodes:
                    return Response({'detail': f'Sorry, we do not deliver to pincode {delivery_pincode}.'}, status=status.HTTP_400_BAD_REQUEST)

            # Geofence Delivery Radius Enforcement
            if getattr(settings, 'enforce_delivery_radius', False):
                if delivery_latitude is not None and delivery_longitude is not None:
                    store_lat = getattr(settings, 'store_latitude', None)
                    store_lng = getattr(settings, 'store_longitude', None)
                    max_radius = getattr(settings, 'delivery_radius_km', None)
                    if store_lat and store_lng and max_radius:
                        from math import radians, cos, sin, asin, sqrt
                        try:
                            lat1, lon1 = radians(float(store_lat)), radians(float(store_lng))
                            lat2, lon2 = radians(float(delivery_latitude)), radians(float(delivery_longitude))
                            dlon = lon2 - lon1
                            dlat = lat2 - lat1
                            a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
                            c = 2 * asin(sqrt(a))
                            distance_km = 6371 * c
                            if distance_km > float(max_radius):
                                return Response({
                                    'detail': f'Selected address is {distance_km:.1f} km away, which exceeds our maximum delivery radius of {float(max_radius):.1f} km.'
                                }, status=status.HTTP_400_BAD_REQUEST)
                        except Exception as e:
                            logger.warning(f"Error calculating delivery distance: {e}")
                    
            free_threshold = getattr(settings, 'free_delivery_threshold', 0)
            if free_threshold > 0 and subtotal >= free_threshold:
                delivery_fee = Decimal('0.00')
            else:
                delivery_fee = Decimal(str(getattr(settings, 'delivery_fee', '0.00')))

        # Calculate total precisely
        total = Decimal(str(cart_data['total'])) + delivery_fee
        
        # Base discount is from product offer prices
        product_discount = Decimal(str(cart_data['discount']))
        promo_discount = Decimal(str(cart_data.get('promo_discount', 0)))
        packaging_fee = Decimal(str(cart_data['packaging_fee']))
        
        wallet_discount = Decimal('0.00')
        if checkout.validated_data.get('use_wallet', False):
            from accounts.models import Wallet, WalletTransaction
            wallet, _ = Wallet.objects.select_for_update().get_or_create(user=request.user)
            if wallet.balance > 0 and total > 0:
                max_pct = getattr(settings, 'max_wallet_usage_percentage', 100)
                if max_pct is not None and max_pct >= 0:
                    max_allowable_wallet = ((total * Decimal(str(max_pct))) / Decimal('100')).quantize(Decimal('0.01'))
                else:
                    max_allowable_wallet = total

                spendable_amount = min(wallet.balance, total, max_allowable_wallet).quantize(Decimal('0.01'))
                if spendable_amount > Decimal('0.00'):
                    wallet_discount = spendable_amount
                    total -= wallet_discount
                    wallet.balance -= wallet_discount
                    wallet.save(update_fields=['balance', 'updated_at'])
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        amount=-wallet_discount,
                        transaction_type=WalletTransaction.TransactionType.PURCHASE_DEDUCTION,
                        description="Used for order checkout"
                    )

        initial_status = Order.Status.ACCEPTED if settings.auto_accept_orders else Order.Status.NEW

        delivery_otp = ""
        if order_type == 'DELIVERY':
            from django.utils.crypto import get_random_string
            delivery_otp = get_random_string(4, allowed_chars='0123456789')

        from django.db import IntegrityError
        from django.utils import timezone
        import uuid

        order = None
        order_kwargs = {
            'customer': request.user,
            'total_amount': total,
            'discount_applied': product_discount,
            'promo_discount': promo_discount,
            'wallet_discount': wallet_discount,
            'packaging_fee': packaging_fee,
            'pickup_time': checkout.validated_data.get('pickup_time', ''),
            'customer_note': checkout.validated_data.get('customer_note', ''),
            'status': initial_status,
            'order_type': order_type,
            'delivery_address': delivery_address,
            'delivery_pincode': delivery_pincode,
            'delivery_latitude': delivery_latitude,
            'delivery_longitude': delivery_longitude,
            'delivery_fee': delivery_fee,
            'delivery_slot_date': checkout.validated_data.get('delivery_slot_date'),
            'delivery_slot_label': checkout.validated_data.get('delivery_slot_label', ''),
            'payment_method': checkout.validated_data.get('payment_method', 'COD'),
            'upi_transaction_id': checkout.validated_data.get('upi_transaction_id', ''),
            'delivery_otp': delivery_otp,
        }

        for attempt in range(3):
            try:
                order = Order.objects.create(**order_kwargs)
                break
            except IntegrityError as ie:
                if attempt < 2:
                    now = timezone.now()
                    fallback_id = f"ORD{now.year}{uuid.uuid4().hex[:7].upper()}"
                    try:
                        order = Order.objects.create(id=fallback_id, **order_kwargs)
                        break
                    except Exception:
                        pass
                else:
                    raise
        
        # Record Promo Usage
        if cart.promo_code:
            try:
                from offers.models import PromoUsage
                PromoUsage.objects.create(promo_code=cart.promo_code, user=request.user)
            except Exception as e:
                logger.error("Error recording promo usage: %s", e)
                
        # Clear cart promo code after successful checkout
        cart.promo_code = None
        cart.save(update_fields=['promo_code'])
        
        from cart.serializers import current_price
        order_items_to_create = []
        products_to_update = []
        
        for item in items:
            order_items_to_create.append(OrderItem(
                order=order, 
                product=item.product, 
                product_name_snapshot=item.product.name, 
                unit_snapshot=item.product.unit, 
                price_snapshot=current_price(item.product), 
                quantity=item.quantity, 
                subtotal=current_price(item.product) * item.quantity
            ))
            
            # Deduct stock
            item.product.stock_quantity -= item.quantity
            if item.product.stock_quantity <= 0:
                item.product.stock_quantity = 0
                item.product.is_in_stock = False
            products_to_update.append(item.product)
            
        OrderItem.objects.bulk_create(order_items_to_create)
        Product.objects.bulk_update(products_to_update, ['stock_quantity', 'is_in_stock'])

        cart.items.all().delete()
        cart.promo_code = None
        cart.save(update_fields=['promo_code'])
        
        # Dispatch notifications and email asynchronously post-commit to minimize lock hold time
        def on_commit_tasks():
            try:
                Notification.objects.create(
                    user=request.user,
                    title=created_title,
                    message=created_msg
                )
                send_push_notification(
                    user=request.user,
                    title=created_title,
                    body=created_msg,
                    data={'order_id': str(order.id), 'status': order.status, 'type': 'ORDER_PLACED'}
                )
                from accounts.models import User
                from django.db.models import Q
                cust_name = request.user.get_full_name() or request.user.username
                owner_users = list(User.objects.filter(
                    Q(is_owner=True) | Q(is_staff=True) | Q(is_superuser=True),
                    is_active=True
                ).distinct())

                owner_title = f"New Order #{order.id} Received! 🛒"
                owner_body = f"₹{order.total_amount} ({order.payment_method}) placed by {cust_name}."

                notifications = [
                    Notification(
                        user=owner,
                        title=owner_title,
                        message=owner_body,
                        category='ORDER',
                        action_url=f"/orders/{order.id}"
                    )
                    for owner in owner_users
                ]
                Notification.objects.bulk_create(notifications)

                for owner in owner_users:

                    send_push_notification(
                        user=owner,
                        title=owner_title,
                        body=owner_body,
                        data={
                            'order_id': str(order.id),
                            'type': 'NEW_ORDER',
                            'total_amount': str(order.total_amount),
                            'status': order.status,
                            'payment_method': order.payment_method
                        },
                        channel_id='orders'
                    )
            except Exception as e:
                logger.error("Error dispatching post-order notifications: %s", e)

            threading.Thread(target=send_order_confirmation_email, args=(order,), daemon=True).start()

            # Real-time WebSocket push alert to store owner live feed
            try:
                from .ws_broadcast import broadcast_order_created
                cust_name = request.user.get_full_name() or request.user.username
                cust_profile = getattr(request.user, 'customer_profile', None)
                cust_phone = getattr(cust_profile, 'mobile_number', None) or getattr(cust_profile, 'phone_number', '') or ''
                broadcast_order_created(order, cust_name, cust_phone, order.items.count())
            except Exception as ws_err:
                logger.debug("WS order creation broadcast error: %s", ws_err)

        created_title = "Narendra Kirana"
        created_msg = "Order placed successfully."
        transaction.on_commit(on_commit_tasks)
        
        # Refetch order with prefetches to avoid N+1 queries during serialization
        order = self.get_queryset().get(id=order.id)
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], permission_classes=[IsOwnerUser])
    def status(self, request, pk=None):
        order = self.get_object()
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        allowed = {
            Order.Status.NEW: {Order.Status.ACCEPTED, Order.Status.REJECTED},
            Order.Status.ACCEPTED: {Order.Status.PREPARING, Order.Status.REJECTED},
            Order.Status.PREPARING: {Order.Status.READY, Order.Status.REJECTED},
            Order.Status.READY: {Order.Status.OUT_FOR_DELIVERY, Order.Status.COMPLETED, Order.Status.REJECTED},
            Order.Status.OUT_FOR_DELIVERY: {Order.Status.COMPLETED, Order.Status.REJECTED},
        }
        next_status = serializer.validated_data['status']
        if next_status == order.status:
            return Response(OrderSerializer(order).data) # Silently succeed if already in this state
            
        if next_status not in allowed.get(order.status, set()):
            return Response({'detail': f'Cannot change {order.status} to {next_status}.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            order.status = next_status
            order.save(update_fields=['status', 'updated_at'])

            if next_status == Order.Status.ACCEPTED:
                accept_title = "Narendra Kirana"
                accept_body = "Your order has been accepted and is being processed."
                Notification.objects.create(
                    user=order.customer,
                    title=accept_title,
                    message=accept_body
                )
                send_push_notification(
                    user=order.customer,
                    title=accept_title,
                    body=accept_body,
                    data={'order_id': str(order.id), 'status': 'ACCEPTED'}
                )

            elif next_status == Order.Status.PREPARING:
                prep_title = "Narendra Kirana"
                prep_body = "Your grocery items are currently being packed fresh and carefully."
                Notification.objects.create(
                    user=order.customer,
                    title=prep_title,
                    message=prep_body
                )
                send_push_notification(
                    user=order.customer,
                    title=prep_title,
                    body=prep_body,
                    data={'order_id': str(order.id), 'status': 'PREPARING'}
                )

            elif next_status == Order.Status.READY:
                ready_title = "Narendra Kirana"
                if order.order_type == 'DELIVERY':
                    ready_body = "Your order is packed and waiting for delivery pickup."
                else:
                    ready_body = "Your order is ready for pickup at Narendra Kirana Store!"
                Notification.objects.create(
                    user=order.customer,
                    title=ready_title,
                    message=ready_body
                )
                send_push_notification(
                    user=order.customer,
                    title=ready_title,
                    body=ready_body,
                    data={'order_id': str(order.id), 'status': 'READY'}
                )

            elif next_status == Order.Status.OUT_FOR_DELIVERY:
                order.dispatched_at = timezone.now()
                order.save(update_fields=['dispatched_at', 'updated_at'])
                out_title = "Narendra Kirana"
                out_body = f"Your order is on the way! Your delivery verification OTP is {order.delivery_otp}."
                Notification.objects.create(
                    user=order.customer,
                    title=out_title,
                    message=out_body
                )
                send_push_notification(
                    user=order.customer,
                    title=out_title,
                    body=out_body,
                    data={'order_id': str(order.id), 'status': 'OUT_FOR_DELIVERY', 'otp': order.delivery_otp or ''}
                )

            elif next_status == Order.Status.COMPLETED:
                order.delivered_at = timezone.now()
                order.save(update_fields=['delivered_at', 'updated_at'])
                if order.delivery_partner and hasattr(order.delivery_partner, 'delivery_profile'):
                    try:
                        order.delivery_partner.delivery_profile.total_deliveries += 1
                        order.delivery_partner.delivery_profile.save(update_fields=['total_deliveries'])
                    except Exception:
                        pass

                comp_title = "Narendra Kirana"
                comp_body = "Your order has been successfully delivered/picked up. Thank you for shopping with us!"
                Notification.objects.create(
                    user=order.customer,
                    title=comp_title,
                    message=comp_body
                )
                send_push_notification(
                    user=order.customer,
                    title=comp_title,
                    body=comp_body,
                    data={'order_id': str(order.id), 'status': 'COMPLETED'}
                )
                
                # Order Cashback Processing (Strictly Idempotent)
                store_settings = StoreSettings.load()
                cashback_pct = getattr(store_settings, 'order_cashback_percentage', Decimal('0.00'))
                if not getattr(order, 'cashback_credited', False) and cashback_pct and Decimal(str(cashback_pct)) > Decimal('0.00') and order.total_amount > Decimal('0.00'):
                    cashback = ((order.total_amount * Decimal(str(cashback_pct))) / Decimal('100')).quantize(Decimal('0.01'))
                    if cashback > Decimal('0.00'):
                        try:
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

                # Referral Processing
                try:
                    from offers.models import Referral, ReferralSettings, ReferralMilestone
                    from accounts.models import WalletTransaction
                    settings = ReferralSettings.load()
                    if settings.is_active:
                        pending_referral = Referral.objects.filter(referred_user=order.customer, status=Referral.Status.PENDING).first()
                        if pending_referral:
                            pending_referral.status = Referral.Status.READY_TO_CLAIM
                            pending_referral.save()
                            
                            Notification.objects.create(
                                user=pending_referral.referrer,
                                title="Referral Reward Ready! 🎁",
                                message=f"Your friend {order.customer.first_name} completed their first order. Click here to claim your reward!"
                            )
                except Exception as e:
                    logger.error("Error processing referral reward: %s", str(e))
                
                # Send final PDF invoice asynchronously
                threading.Thread(target=send_final_invoice_email, args=(order,), daemon=True).start()
                
            elif next_status == Order.Status.REJECTED:
                # Restore inventory
                for item in order.items.exclude(status='REJECTED').select_related('product'):
                    if item.product:
                        item.product.stock_quantity += item.quantity
                        if item.product.stock_quantity > 0:
                            item.product.is_in_stock = True
                        item.product.save(update_fields=['stock_quantity', 'is_in_stock'])
                    
                if order.wallet_discount > 0:
                    from accounts.models import Wallet, WalletTransaction
                    wallet, _ = Wallet.objects.select_for_update().get_or_create(user=order.customer)
                    Wallet.objects.filter(id=wallet.id).update(balance=F('balance') + order.wallet_discount)
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        amount=order.wallet_discount,
                        transaction_type=WalletTransaction.TransactionType.REFUND,
                        description=f"Refund for cancelled order #{order.id}"
                    )
                        
                rej_title = "Narendra Kirana"
                rej_body = "Unfortunately, we had to cancel your order. Please contact the store for more details."
                Notification.objects.create(
                    user=order.customer,
                    title=rej_title,
                    message=rej_body
                )
                send_push_notification(
                    user=order.customer,
                    title=rej_title,
                    body=rej_body,
                    data={'order_id': str(order.id), 'status': 'REJECTED'}
                )

        # Real-time WebSocket status broadcast to customer and store owner
        try:
            from .ws_broadcast import broadcast_order_status, broadcast_order_ready_dispatch
            broadcast_order_status(order.id, next_status, order.delivery_otp)
            if next_status == Order.Status.READY:
                broadcast_order_ready_dispatch(order)
        except Exception as ws_err:
            logger.debug("WS status broadcast error: %s", ws_err)
                
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['patch', 'post'], permission_classes=[IsOwnerUser])
    def owner_note(self, request, pk=None):
        order = self.get_object()
        note = request.data.get('owner_note', '')
        order.owner_note = note
        order.save(update_fields=['owner_note', 'updated_at'])
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def assign_partner(self, request, pk=None):
        order = self.get_object()
        partner_id = request.data.get('delivery_partner_id') or request.data.get('partner_id')

        if not partner_id:
            order.delivery_partner = None
            order.assigned_at = None
            order.save(update_fields=['delivery_partner', 'assigned_at', 'updated_at'])
            return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

        from accounts.models import User
        partner = User.objects.filter(id=partner_id, is_delivery_partner=True, is_active=True).first()
        if not partner:
            return Response({'detail': 'Selected delivery partner was not found or is inactive.'}, status=status.HTTP_400_BAD_REQUEST)

        order.delivery_partner = partner
        order.assigned_at = timezone.now()
        if not order.delivery_otp:
            from django.utils.crypto import get_random_string
            order.delivery_otp = get_random_string(4, allowed_chars='0123456789')

        if order.status in [Order.Status.ACCEPTED, Order.Status.PREPARING]:
            order.status = Order.Status.READY

        order.save(update_fields=['delivery_partner', 'assigned_at', 'delivery_otp', 'status', 'updated_at'])

        try:
            partner_title = f"New Delivery Assigned! 🛵 Order #{order.id}"
            partner_msg = f"You have been assigned to deliver order #{order.id} to {order.delivery_address or 'Customer'}."
            Notification.objects.create(
                user=partner,
                title=partner_title,
                message=partner_msg
            )
            send_push_notification(
                user=partner,
                title=partner_title,
                body=partner_msg,
                data={'order_id': str(order.id), 'type': 'DELIVERY_ASSIGNED'}
            )

            # Notify customer that delivery partner is assigned
            cust_title = "Narendra Kirana"
            cust_msg = f"{partner.get_full_name() or partner.username} has been assigned to deliver your order."
            Notification.objects.create(
                user=order.customer,
                title=cust_title,
                message=cust_msg
            )
            send_push_notification(
                user=order.customer,
                title=cust_title,
                body=cust_msg,
                data={'order_id': str(order.id), 'status': 'PARTNER_ASSIGNED', 'type': 'DELIVERY_UPDATE'}
            )
        except Exception as e:
            logger.error("Failed to notify delivery partner/customer: %s", e)

        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)


    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def reject_item(self, request, pk=None):
        order = self.get_object()
        item_id = request.data.get('item_id')
        if not item_id:
            return Response({'detail': 'item_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if order.status not in [Order.Status.NEW, Order.Status.ACCEPTED, Order.Status.PREPARING]:
            return Response({'detail': f'Cannot reject items on order with status {order.status}.'}, status=400)
            
        try:
            item = order.items.get(id=item_id)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found in this order.'}, status=status.HTTP_404_NOT_FOUND)
            
        if item.status == 'REJECTED':
            return Response({'detail': 'Item is already rejected.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            item.status = 'REJECTED'
            item.save(update_fields=['status'])
            
            from accounts.models import Wallet, WalletTransaction
            gross_subtotal = sum(i.subtotal for i in order.items.all())
            wallet_ratio = (order.wallet_discount / gross_subtotal) if gross_subtotal > 0 else Decimal('0.00')
            item_wallet_refund = (item.subtotal * wallet_ratio).quantize(Decimal('0.01'))
            if item_wallet_refund > 0:
                order.wallet_discount -= item_wallet_refund
                wallet, _ = Wallet.objects.select_for_update().get_or_create(user=order.customer)
                Wallet.objects.filter(id=wallet.id).update(balance=F('balance') + item_wallet_refund)
                WalletTransaction.objects.create(
                    wallet=wallet,
                    amount=item_wallet_refund,
                    transaction_type=WalletTransaction.TransactionType.REFUND,
                    description=f"Refund for rejected {item.product_name_snapshot} in order #{order.id}"
                )

            payable_deduction = item.subtotal - item_wallet_refund
            order.total_amount = max(Decimal('0.00'), order.total_amount - payable_deduction)
            
            # Restore inventory for the rejected item
            if item.product:
                item.product.stock_quantity += item.quantity
                if item.product.stock_quantity > 0:
                    item.product.is_in_stock = True
                item.product.save(update_fields=['stock_quantity', 'is_in_stock'])
            
            # If ALL items are now rejected, reject the entire order
            all_rejected = not order.items.exclude(status='REJECTED').exists()
            if all_rejected:
                order.status = Order.Status.REJECTED
                order.total_amount = Decimal('0.00')
                order.delivery_fee = Decimal('0.00')
                order.packaging_fee = Decimal('0.00')
                
                # Refund any remaining wallet discount
                if order.wallet_discount > 0:
                    wallet, _ = Wallet.objects.select_for_update().get_or_create(user=order.customer)
                    Wallet.objects.filter(id=wallet.id).update(balance=F('balance') + order.wallet_discount)
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        amount=order.wallet_discount,
                        transaction_type=WalletTransaction.TransactionType.REFUND,
                        description=f"Refund for fully rejected order #{order.id}"
                    )
                    order.wallet_discount = Decimal('0.00')
                
                order.save(update_fields=['status', 'total_amount', 'delivery_fee', 'packaging_fee', 'wallet_discount', 'updated_at'])
                
                Notification.objects.create(
                    user=order.customer,
                    title=f"Order #{order.id} Cancelled",
                    message=f"Hi {order.customer.first_name}, all items in your order were unavailable so the order has been cancelled. Any wallet balance used has been refunded."
                )
            else:
                order.save(update_fields=['total_amount', 'wallet_discount', 'updated_at'])
                
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=False, methods=['post'], permission_classes=[])
    def create_paypal_order(self, request):
        """
        Initializes a PayPal Orders v2 with intent="AUTHORIZE".
        Allows customer to authorize maximum expected total before packing.
        """
        import time
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'USD')
        description = request.data.get('description', 'CartSettle Grocery Order')
        
        if not amount:
            if request.user.is_authenticated:
                try:
                    cart = Cart.objects.get(customer=request.user)
                    amount = cart.total_price
                except Cart.DoesNotExist:
                    pass
        if not amount:
            return Response({'detail': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_val = Decimal(str(amount))
            user_part = f"USER_{request.user.id}" if request.user.is_authenticated else "GUEST"
            paypal_data = paypal_service.create_order(
                amount=amount_val,
                currency=currency,
                custom_id=f"{user_part}_{int(time.time())}",
                description=description
            )
            return Response(paypal_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error("Failed to create PayPal order: %s", e)
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def authorize_paypal(self, request, pk=None):
        """
        Completes authorization after buyer approves on PayPal modal.
        Saves authorization ID and sets order status to ACCEPTED.
        """
        order = self.get_object()
        paypal_order_id = request.data.get('paypal_order_id')
        if not paypal_order_id:
            return Response({'detail': 'paypal_order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            auth_res = paypal_service.authorize_order(paypal_order_id)
            auth_id = auth_res.get('extracted_authorization_id')
            if not auth_id:
                return Response({'detail': 'Could not extract PayPal authorization ID from response.'}, status=status.HTTP_400_BAD_REQUEST)

            order.paypal_order_id = paypal_order_id
            order.paypal_authorization_id = auth_id
            order.authorized_amount = order.total_amount
            order.payment_method = 'PAYPAL'
            order.status = Order.Status.ACCEPTED
            order.ai_settlement_notes = f"Pre-authorized ${order.authorized_amount} via PayPal (Auth: {auth_id}). Awaiting packing."
            order.save(update_fields=[
                'paypal_order_id', 'paypal_authorization_id', 'authorized_amount',
                'payment_method', 'status', 'ai_settlement_notes', 'updated_at'
            ])

            from .ws_broadcast import broadcast_order_status
            broadcast_order_status(order.id, order.status, order.delivery_otp)

            return Response({
                'order': OrderSerializer(order, context=self.get_serializer_context()).data,
                'paypal': auth_res
            })
        except Exception as e:
            logger.error("Failed to authorize PayPal order: %s", e)
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def settle_packing(self, request, pk=None):
        """
        The CartSettle Core Engine:
        Store packer confirms packed items & quantities.
        Executes dynamic partial capture on PayPal (final_capture=True),
        automatically releasing the uncaptured difference back to buyer!
        """
        order = self.get_object()
        if order.status not in [Order.Status.ACCEPTED, Order.Status.PREPARING, Order.Status.NEW]:
            return Response({'detail': f'Cannot settle order with status {order.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        items_payload = request.data.get('items', [])
        with transaction.atomic():
            for item_update in items_payload:
                item_id = item_update.get('id')
                item_status = item_update.get('status')
                packed_qty = item_update.get('packed_quantity')

                try:
                    order_item = order.items.get(id=item_id)
                except OrderItem.DoesNotExist:
                    continue

                if item_status in ['ACCEPTED', 'REJECTED']:
                    order_item.status = item_status
                if packed_qty is not None:
                    order_item.packed_quantity = max(0, int(packed_qty))
                    if order_item.packed_quantity == 0:
                        order_item.status = 'REJECTED'
                
                if order_item.status == 'REJECTED':
                    order_item.is_packed = False
                    order_item.subtotal = Decimal('0.00')
                else:
                    order_item.is_packed = True
                    order_item.subtotal = order_item.price_snapshot * order_item.packed_quantity

                order_item.save(update_fields=['status', 'packed_quantity', 'is_packed', 'subtotal'])

            # Recalculate payable total
            active_items = order.items.filter(status='ACCEPTED')
            if not active_items.exists():
                order.status = Order.Status.REJECTED
                order.total_amount = Decimal('0.00')
                if order.paypal_authorization_id:
                    try:
                        paypal_service.void_authorization(order.paypal_authorization_id)
                    except Exception as ve:
                        logger.error("Error voiding authorization on settle_packing: %s", ve)
                order.released_amount = order.authorized_amount or Decimal('0.00')
                order.ai_settlement_notes = f"All items rejected at packing. PayPal auth {order.paypal_authorization_id} voided. 100% released."
                order.save()
                return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

            new_subtotal = sum(i.subtotal for i in active_items)
            new_total = new_subtotal + order.delivery_fee + order.packaging_fee - order.discount_applied - order.promo_discount - order.wallet_discount
            new_total = max(Decimal('0.00'), new_total)
            order.total_amount = new_total

            # Dynamic PayPal Settlement
            capture_receipt = None
            if order.paypal_authorization_id and not order.paypal_capture_id:
                try:
                    auth_amount = order.authorized_amount or order.total_amount
                    settle_amount = order.total_amount
                    
                    # Capture the packed total with final_capture=True
                    capture_res = paypal_service.capture_authorization(
                        authorization_id=order.paypal_authorization_id,
                        amount=settle_amount,
                        currency='USD',
                        final_capture=True,
                        note=f"CartSettle packing: settled ${settle_amount} of authorized ${auth_amount}"
                    )
                    order.paypal_capture_id = capture_res.get('id', '')
                    order.captured_amount = settle_amount
                    order.released_amount = max(Decimal('0.00'), auth_amount - settle_amount)
                    order.ai_settlement_notes = (
                        f"Dynamic Packing Settlement: Authorized ${auth_amount:.2f} -> "
                        f"Captured ${settle_amount:.2f} -> Auto-Released ${order.released_amount:.2f} back to buyer."
                    )
                    capture_receipt = capture_res
                except Exception as ce:
                    logger.error("PayPal capture error during settle_packing: %s", ce)
                    return Response({'detail': f'PayPal capture error: {ce}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            order.status = Order.Status.READY
            order.save()

            settlement_info = {
                'authorized_amount': str(order.authorized_amount or order.total_amount),
                'captured_amount': str(order.captured_amount or order.total_amount),
                'released_amount': str(order.released_amount),
                'paypal_capture_id': order.paypal_capture_id,
                'status': order.status,
                'notes': order.ai_settlement_notes,
            }
            broadcast_settlement_update(order.id, settlement_info)

            Notification.objects.create(
                user=order.customer,
                title=f"Order #{order.id} Packed & Settled! 🛍️",
                message=(
                    f"Your groceries are packed! Final amount charged: ${order.captured_amount or order.total_amount}. "
                    + (f"${order.released_amount} was instantly released back to your PayPal balance." if order.released_amount > 0 else "")
                )
            )

        # Auto-generate PayPal Invoicing v2 receipt if captured
        invoice_receipt = None
        if order.paypal_capture_id:
            try:
                invoice_receipt = paypal_service.create_and_send_invoice(order)
                order.refresh_from_db()
            except Exception as ie:
                logger.warning("PayPal invoice auto-creation notice: %s", ie)

        return Response({
            'order': OrderSerializer(order, context=self.get_serializer_context()).data,
            'settlement': settlement_info,
            'capture_receipt': capture_receipt,
            'invoice_receipt': invoice_receipt
        })

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def generate_invoice(self, request, pk=None):
        """
        Creates and sends an official PayPal Tax Invoice (Invoicing v2 API)
        for this order, returning the live payer-view invoice URL.
        """
        order = self.get_object()
        try:
            invoice_res = paypal_service.create_and_send_invoice(order)
            order.refresh_from_db()
            broadcast_settlement_update(order.id, {
                'paypal_invoice_id': order.paypal_invoice_id,
                'paypal_invoice_url': order.paypal_invoice_url
            })
            return Response({
                'invoice': invoice_res,
                'order': OrderSerializer(order, context=self.get_serializer_context()).data
            })
        except Exception as e:
            logger.error("Failed to generate PayPal invoice: %s", e)
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def dispatch_tracking(self, request, pk=None):
        """
        Attaches shipment tracking info directly to the PayPal transaction (Shipping v1 API)
        and transitions the order to OUT_FOR_DELIVERY.
        """
        order = self.get_object()
        tracking_number = request.data.get('tracking_number')
        carrier = request.data.get('carrier', 'LOCAL_EXPRESS')
        
        try:
            track_res = paypal_service.add_tracking_info(order, tracking_number=tracking_number, carrier_name=carrier)
            if order.status in [Order.Status.READY, Order.Status.ACCEPTED, Order.Status.PREPARING]:
                order.status = Order.Status.OUT_FOR_DELIVERY
                order.dispatched_at = timezone.now()
                order.save(update_fields=['status', 'dispatched_at', 'paypal_tracking_number', 'shipping_carrier'])
                
                from .ws_broadcast import broadcast_order_status
                broadcast_order_status(order.id, order.status, order.delivery_otp)

            return Response({
                'tracking': track_res,
                'order': OrderSerializer(order, context=self.get_serializer_context()).data
            })
        except Exception as e:
            logger.error("Failed to add tracking info: %s", e)
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def vision_pack(self, request, pk=None):
        """
        Multimodal Gemini Vision Scanner:
        Store packer uploads or snaps a photo of the packed grocery tote/bag.
        Gemini 3.5 Flash identifies all items, detects missing/damaged goods,
        and returns auto-checked packing recommendations.
        """
        import base64
        order = self.get_object()
        
        image_b64 = ""
        mime_type = "image/jpeg"

        if 'image' in request.FILES:
            uploaded = request.FILES['image']
            image_bytes = uploaded.read()
            image_b64 = base64.b64encode(image_bytes).decode('utf-8')
            mime_type = uploaded.content_type or "image/jpeg"
            try:
                order.packing_photo = uploaded
                order.save(update_fields=['packing_photo'])
            except Exception:
                pass
        elif 'image' in request.data:
            raw_data = request.data.get('image', '')
            if ',' in raw_data:
                header, raw_data = raw_data.split(',', 1)
                if 'image/png' in header:
                    mime_type = 'image/png'
                elif 'image/webp' in header:
                    mime_type = 'image/webp'
            image_b64 = raw_data

        if not image_b64:
            return Response({'detail': 'No image provided for vision verification.'}, status=status.HTTP_400_BAD_REQUEST)

        expected_items = [
            {
                "id": it.id,
                "name": it.product_name_snapshot,
                "quantity": it.quantity,
                "unit": it.unit_snapshot,
                "price": float(it.price_snapshot)
            }
            for it in order.items.all()
        ]

        from services.agent_service import agent_service
        vision_result = agent_service.verify_packing_photo(
            image_base64=image_b64,
            mime_type=mime_type,
            expected_items=expected_items,
            session_id=str(order.id)
        )

        return Response({
            'order_id': order.id,
            'vision_result': vision_result
        })

    @action(detail=False, methods=['get'], permission_classes=[IsOwnerUser])
    def disputes(self, request):
        """
        Lists customer disputes from PayPal Disputes API v1 for store management.
        """
        try:
            disputes_res = paypal_service.list_disputes(page_size=15)
            return Response(disputes_res)
        except Exception as e:
            return Response({'items': [], 'notice': str(e)})

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerUser])
    def provide_dispute_evidence(self, request):
        """
        Submits packing audit proof and settlement logs to PayPal for dispute resolution.
        """
        dispute_id = request.data.get('dispute_id')
        notes = request.data.get('notes', 'CartSettle packing verified via dynamic settlement audit.')
        if not dispute_id:
            return Response({'detail': 'dispute_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            res = paypal_service.provide_dispute_evidence(dispute_id, notes)
            return Response(res)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[])
    def paypal_webhook(self, request):
        """
        Ingests real-time PayPal Webhook Events:
        - CHECKOUT.ORDER.APPROVED
        - PAYMENT.AUTHORIZATION.CREATED
        - PAYMENT.CAPTURE.COMPLETED
        - INVOICING.INVOICE.PAID
        - CUSTOMER.DISPUTE.CREATED
        """
        event = request.data
        event_type = event.get('event_type', '')
        resource = event.get('resource', {})
        logger.info("Received PayPal Webhook Event: %s", event_type)

        try:
            # Handle Payment Capture Completed
            if event_type == 'PAYMENT.CAPTURE.COMPLETED':
                capture_id = resource.get('id')
                custom_id = resource.get('custom_id')
                amount = resource.get('amount', {}).get('value')
                
                order = None
                if custom_id:
                    order = Order.objects.filter(id=custom_id).first()
                if not order and capture_id:
                    order = Order.objects.filter(paypal_capture_id=capture_id).first()
                
                if order:
                    order.status = Order.Status.READY
                    broadcast_settlement_update(order.id, {
                        'status': order.status,
                        'paypal_capture_id': capture_id,
                        'captured_amount': amount
                    })

            # Handle Customer Dispute
            elif event_type in ['CUSTOMER.DISPUTE.CREATED', 'CUSTOMER.DISPUTE.UPDATED']:
                dispute_id = resource.get('dispute_id')
                dispute_status = resource.get('status')
                disputed_transactions = resource.get('disputed_transactions', [])
                
                for dt in disputed_transactions:
                    seller_txn_id = dt.get('seller_transaction_id')
                    order = Order.objects.filter(paypal_capture_id=seller_txn_id).first() or Order.objects.filter(paypal_authorization_id=seller_txn_id).first()
                    if order:
                        order.dispute_id = dispute_id
                        order.dispute_status = dispute_status
                        order.save(update_fields=['dispute_id', 'dispute_status'])
                        broadcast_settlement_update(order.id, {
                            'dispute_id': dispute_id,
                            'dispute_status': dispute_status
                        })

            return Response({'status': 'SUCCESS', 'event_type': event_type}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("Error processing PayPal webhook: %s", e)
            return Response({'status': 'ERROR', 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def analytics(self, request):
        from django.core.cache import cache
        cached = cache.get('owner_analytics')
        if cached:
            return Response(cached)

        from django.utils import timezone
        from django.db.models import Sum, Q
        from datetime import timedelta

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate start dates
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)
        year_start = today_start.replace(month=1, day=1)

        qs = Order.objects.exclude(status=Order.Status.REJECTED)

        # Daily sales for the chart (last 7 days)
        last_7_days = [(today_start - timedelta(days=i)) for i in range(7)]
        last_7_days.reverse()

        agg_kwargs = {
            'today_sales': Sum('total_amount', filter=Q(created_at__gte=today_start)),
            'weekly_sales': Sum('total_amount', filter=Q(created_at__gte=week_start)),
            'monthly_sales': Sum('total_amount', filter=Q(created_at__gte=month_start)),
            'yearly_sales': Sum('total_amount', filter=Q(created_at__gte=year_start)),
        }
        for i, d in enumerate(last_7_days):
            day_end = d + timedelta(days=1)
            agg_kwargs[f'day_{i}'] = Sum('total_amount', filter=Q(created_at__gte=d, created_at__lt=day_end))

        totals = qs.aggregate(**agg_kwargs)

        today_sales = totals.get('today_sales') or 0
        weekly_sales = totals.get('weekly_sales') or 0
        monthly_sales = totals.get('monthly_sales') or 0
        yearly_sales = totals.get('yearly_sales') or 0

        chart_data = []
        for i, d in enumerate(last_7_days):
            chart_data.append({
                'name': f"{d.day} {d.strftime('%b')}",
                'Sales': totals.get(f'day_{i}') or 0
            })

        data = {
            'today_sales': today_sales,
            'weekly_sales': weekly_sales,
            'monthly_sales': monthly_sales,
            'yearly_sales': yearly_sales,
            'chart_data': chart_data
        }
        cache.set('owner_analytics', data, timeout=60)
        return Response(data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def invoice(self, request, pk=None):
        order = self.get_object()

        # Authorization: owner, staff, or the customer who placed the order
        is_owner_or_staff = bool(
            getattr(request.user, 'is_owner', False) or
            getattr(request.user, 'is_staff', False) or
            getattr(request.user, 'is_superuser', False)
        )
        if not is_owner_or_staff and order.customer_id != request.user.id:
            return Response(
                {'detail': 'You do not have permission to view this invoice.'},
                status=status.HTTP_403_FORBIDDEN
            )

        html_content = build_order_tax_invoice_html(order)
        invoice_num = format_invoice_number(order)

        # Direct HTML rendering when requested via ?html=1, ?type=html, or Accept: text/html
        wants_html = (
            request.query_params.get('html') in ('1', 'true', 'yes') or
            request.query_params.get('type') == 'html' or
            'text/html' in request.headers.get('Accept', '')
        )
        if wants_html:
            from django.http import HttpResponse
            return HttpResponse(html_content, content_type='text/html; charset=utf-8')

        return Response({
            'order_id': order.id,
            'invoice_number': invoice_num,
            'html': html_content,
        })
