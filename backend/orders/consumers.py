import json
import logging
from decimal import Decimal
from django.utils import timezone
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Order
from accounts.models import DeliveryPartnerProfile

logger = logging.getLogger(__name__)


# ─── Database Helpers ───

@database_sync_to_async
def get_order_for_tracking(order_id: str, user):
    """
    Fetches the order and validates whether the requesting user is allowed
    to connect to this order's tracking channel.
    Allowed:
      - The customer who placed the order
      - The assigned delivery partner
      - Any store owner / admin
    """
    try:
        order = Order.objects.select_related(
            'customer',
            'delivery_partner',
            'delivery_partner__delivery_profile'
        ).get(id=order_id)
    except Order.DoesNotExist:
        return None, False, "Order not found"

    is_owner = getattr(user, 'is_owner', False) or user.is_staff or user.is_superuser
    is_customer = (order.customer_id == user.id)
    is_rider = (order.delivery_partner_id == user.id)

    if not (is_owner or is_customer or is_rider):
        return None, False, "Permission denied for this order"

    # Build initial payload
    partner_name = ""
    partner_phone = ""
    partner_vehicle = ""
    partner_lat = None
    partner_lng = None
    partner_data = None

    if order.delivery_partner:
        profile = getattr(order.delivery_partner, 'delivery_profile', None)
        partner_name = order.delivery_partner.get_full_name() or order.delivery_partner.username
        if profile:
            partner_phone = profile.phone_number or (order.delivery_partner.username if order.delivery_partner.username.isdigit() else "")
            parts = [p for p in [profile.vehicle_type, profile.vehicle_number] if p]
            partner_vehicle = " • ".join(parts) if parts else (profile.vehicle_type or "Bike")
            if profile.current_lat is not None:
                partner_lat = float(profile.current_lat)
            if profile.current_lng is not None:
                partner_lng = float(profile.current_lng)

        partner_data = {
            'id': order.delivery_partner.id,
            'name': partner_name,
            'phone': partner_phone,
            'vehicle_type': profile.vehicle_type if profile else 'Bike',
            'vehicle_number': profile.vehicle_number if profile else '',
            'current_lat': partner_lat,
            'current_lng': partner_lng,
        }

    # Hide OTP from delivery partner until delivered
    delivery_otp = order.delivery_otp if (is_customer or is_owner) else ""

    snapshot = {
        'id': str(order.id),
        'status': order.status,
        'order_type': order.order_type,
        'total_amount': str(order.total_amount),
        'delivery_otp': delivery_otp,
        'delivery_address': order.delivery_address,
        'delivery_pincode': order.delivery_pincode,
        'delivery_latitude': float(order.delivery_latitude) if order.delivery_latitude else None,
        'delivery_longitude': float(order.delivery_longitude) if order.delivery_longitude else None,
        'delivery_partner': partner_data,
        'delivery_partner_name': partner_name,
        'delivery_partner_phone': partner_phone,
        'delivery_partner_vehicle': partner_vehicle,
        'delivery_partner_lat': partner_lat,
        'delivery_partner_lng': partner_lng,
        'created_at': order.created_at.isoformat(),
        'updated_at': order.updated_at.isoformat(),
        'paypal_authorization_id': order.paypal_authorization_id,
        'authorized_amount': str(order.authorized_amount) if order.authorized_amount else None,
        'captured_amount': str(order.captured_amount) if order.captured_amount else None,
        'released_amount': str(order.released_amount) if order.released_amount else "0.00",
    }
    return snapshot, True, ""


@database_sync_to_async
def update_rider_position(user_id: int, lat: float, lng: float):
    """Persists rider's latest coordinates into DeliveryPartnerProfile."""
    try:
        profile = DeliveryPartnerProfile.objects.filter(user_id=user_id).first()
        if profile:
            profile.current_lat = Decimal(str(lat))
            profile.current_lng = Decimal(str(lng))
            profile.last_active_at = timezone.now()
            profile.save(update_fields=['current_lat', 'current_lng', 'last_active_at', 'updated_at'])
            return True
    except Exception as e:
        logger.error("Failed to update rider position in DB: %s", e)
    return False


# ─── 1. Order Tracking Consumer ───

class OrderTrackingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket endpoint: /ws/orders/<order_id>/tracking/
    
    Powers live real-time order tracking:
      - Delivers initial order snapshot on connection.
      - Streams delivery partner live GPS movements (lat, lng, heading, speed).
      - Pushes instant status transitions (ACCEPTED, PREPARING, OUT_FOR_DELIVERY, COMPLETED).
      - Pushes dynamic packing settlement receipts (Authorized, Captured, Auto-Released).
    """

    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.group_name = f"order_{self.order_id}"
        self.user = self.scope.get('user')

        # 1. Require Authenticated User
        if not self.user or not self.user.is_authenticated:
            logger.warning("Unauthenticated WebSocket connection rejected for order %s", self.order_id)
            await self.close(code=4003)
            return

        # 2. Check Order Authorization
        snapshot, allowed, reason = await get_order_for_tracking(self.order_id, self.user)
        if not allowed:
            logger.warning("WebSocket access denied for user %s on order %s: %s", self.user.id, self.order_id, reason)
            await self.close(code=4003)
            return

        # 3. Join Order Channel Layer Group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # 4. Deliver Initial Snapshot
        await self.send(text_data=json.dumps({
            'type': 'INITIAL_STATE',
            'order': snapshot,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Receives messages from client (e.g. rider GPS heartbeat or client keep-alive).
        """
        try:
            payload = json.loads(text_data)
        except Exception:
            return

        msg_type = payload.get('type')

        if msg_type == 'PING':
            await self.send(text_data=json.dumps({'type': 'PONG', 'timestamp': timezone.now().isoformat()}))
            return

        # Rider streams their live GPS position
        if msg_type == 'RIDER_LOCATION_UPDATE':
            is_authorized_rider = bool(
                getattr(self.user, 'is_delivery_partner', False) or
                getattr(self.user, 'is_owner', False) or
                self.user.is_staff or
                self.user.is_superuser
            )
            if not is_authorized_rider:
                return
            lat = payload.get('latitude')
            lng = payload.get('longitude')
            heading = payload.get('heading', 0)
            speed = payload.get('speed', 0)

            if lat is not None and lng is not None:
                # Update DB asynchronously in background
                await update_rider_position(self.user.id, lat, lng)

                # Broadcast to customer and owner listening to this order
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'rider_location_broadcast',
                        'order_id': self.order_id,
                        'latitude': float(lat),
                        'longitude': float(lng),
                        'heading': float(heading) if heading is not None else None,
                        'speed': float(speed) if speed is not None else None,
                        'timestamp': timezone.now().isoformat(),
                    }
                )

    # ─── Group Broadcast Handlers ───

    async def order_status_broadcast(self, event):
        """Sent when store owner or delivery partner updates order status."""
        await self.send(text_data=json.dumps({
            'type': 'ORDER_STATUS_UPDATE',
            'order_id': event['order_id'],
            'status': event['status'],
            'delivery_otp': event.get('delivery_otp', ''),
            'updated_at': event.get('updated_at', timezone.now().isoformat()),
        }))

    async def rider_location_broadcast(self, event):
        """Sent when delivery partner GPS coordinates update."""
        await self.send(text_data=json.dumps({
            'type': 'RIDER_LOCATION_UPDATE',
            'order_id': event['order_id'],
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'heading': event.get('heading'),
            'speed': event.get('speed'),
            'timestamp': event.get('timestamp'),
        }))

    async def settlement_update_broadcast(self, event):
        """Broadcasts dynamic packing settlement receipt to customer."""
        await self.send(text_data=json.dumps({
            'type': 'SETTLEMENT_UPDATE',
            'order_id': event['order_id'],
            'settlement': event.get('settlement', {}),
            'timestamp': event.get('timestamp', timezone.now().isoformat()),
        }))


# ─── 2. Store Owner Orders Consumer ───

class OwnerOrdersConsumer(AsyncWebsocketConsumer):
    """
    WebSocket endpoint: /ws/owner/orders/
    
    Powers store owner dashboard:
      - Instantly pushes "Ding! New Order" alerts without polling.
      - Pushes status change confirmations and customer notes.
      - Pushes packing settlement receipts and AI agent reasoning.
    """

    async def connect(self):
        self.user = self.scope.get('user')
        self.group_name = "store_owner"

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4003)
            return

        is_owner = getattr(self.user, 'is_owner', False) or self.user.is_staff or self.user.is_superuser
        if not is_owner:
            logger.warning("Non-owner user %s attempted to connect to /ws/owner/orders/", self.user.id)
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'CONNECTION_ESTABLISHED',
            'message': 'Connected to CartSettle Store Owner Live Feed',
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            payload = json.loads(text_data)
            if payload.get('type') == 'PING':
                await self.send(text_data=json.dumps({'type': 'PONG'}))
        except Exception:
            pass

    async def owner_order_created(self, event):
        """Broadcasts newly placed orders to owner dashboard."""
        await self.send(text_data=json.dumps({
            'type': 'NEW_ORDER',
            'order': event['order'],
        }))

    async def owner_order_status(self, event):
        """Broadcasts order status changes to owner dashboard."""
        await self.send(text_data=json.dumps({
            'type': 'ORDER_STATUS_CHANGED',
            'order_id': event['order_id'],
            'status': event['status'],
        }))

    async def settlement_update_broadcast(self, event):
        """Broadcasts dynamic packing settlement receipt to owner."""
        await self.send(text_data=json.dumps({
            'type': 'SETTLEMENT_UPDATE',
            'order_id': event['order_id'],
            'settlement': event.get('settlement', {}),
            'timestamp': event.get('timestamp', timezone.now().isoformat()),
        }))

    async def agent_thought_stream(self, event):
        """Broadcasts live AI agent thought and tool events to owner portal."""
        await self.send(text_data=json.dumps({
            'type': 'AGENT_THOUGHT_STREAM',
            'session_id': event.get('session_id', ''),
            'thought': event.get('thought', {}),
            'timestamp': event.get('timestamp', timezone.now().isoformat()),
        }))


# ─── 3. Delivery Partner Dispatch Consumer ───

@database_sync_to_async
def is_dispatch_authorized(user):
    """Verifies user has permission to connect to delivery dispatch stream."""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_owner', False) or user.is_staff or getattr(user, 'is_delivery_partner', False):
        return True
    return DeliveryPartnerProfile.objects.filter(user=user).exists()


class DeliveryDispatchConsumer(AsyncWebsocketConsumer):
    """
    WebSocket endpoint: /ws/delivery/dispatch/
    
    Powers delivery rider dispatch:
      - Broadcasts newly READY orders to online riders simultaneously.
      - Broadcasts task claim lock events so other riders know it was taken.
    """

    async def connect(self):
        self.user = self.scope.get('user')
        self.group_name = "delivery_dispatch"

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4003)
            return

        has_profile = await is_dispatch_authorized(self.user)
        if not has_profile:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            payload = json.loads(text_data)
            if payload.get('type') == 'PING':
                await self.send(text_data=json.dumps({'type': 'PONG'}))
        except Exception:
            pass

    async def dispatch_order_ready(self, event):
        """Broadcast when an order is ready for delivery pickup."""
        await self.send(text_data=json.dumps({
            'type': 'ORDER_READY_FOR_PICKUP',
            'order': event['order'],
        }))

    async def dispatch_order_claimed(self, event):
        """Broadcast when a delivery task has been accepted by a rider."""
        await self.send(text_data=json.dumps({
            'type': 'ORDER_CLAIMED',
            'order_id': event['order_id'],
            'claimed_by': event.get('claimed_by', 'Another rider'),
        }))
