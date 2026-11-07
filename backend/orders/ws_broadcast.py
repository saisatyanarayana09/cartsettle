import logging
import asyncio
import threading
from django.conf import settings
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def _send_group(group_name: str, message: dict):
    """
    Safely delivers message to a channel layer group across both synchronous
    contexts (standard Django views) and asynchronous event loops (async tests/views)
    without blocking or hanging Daphne ASGI HTTP teardown.
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        loop.create_task(channel_layer.group_send(group_name, message))
    elif getattr(settings, "IS_TESTING", False):
        async_to_sync(channel_layer.group_send)(group_name, message)
    else:
        def _bg_send():
            try:
                async_to_sync(channel_layer.group_send)(group_name, message)
            except Exception as exc:
                logger.debug("WS background group_send error: %s", exc)

        threading.Thread(target=_bg_send, daemon=True).start()


def broadcast_order_created(order, customer_name, customer_phone="", items_count=0):
    """Broadcasts newly created order to the store owner live feed."""
    try:
        _send_group(
            "store_owner",
            {
                "type": "owner_order_created",
                "order": {
                    "id": str(order.id),
                    "total_amount": str(order.total_amount),
                    "customer_name": customer_name,
                    "customer_phone": customer_phone,
                    "order_type": order.order_type,
                    "status": order.status,
                    "created_at": order.created_at.isoformat(),
                    "items_count": items_count,
                }
            }
        )
    except Exception as e:
        logger.debug("broadcast_order_created WS error: %s", e)


def broadcast_order_status(order_id, next_status, delivery_otp=""):
    """Broadcasts status change to tracking customer and store owner."""
    try:
        # Broadcast to specific order tracking room
        _send_group(
            f"order_{order_id}",
            {
                "type": "order_status_broadcast",
                "order_id": str(order_id),
                "status": next_status,
                "delivery_otp": delivery_otp,
                "updated_at": timezone.now().isoformat(),
            }
        )
        # Broadcast to store owner dashboard
        _send_group(
            "store_owner",
            {
                "type": "owner_order_status",
                "order_id": str(order_id),
                "status": next_status,
            }
        )
    except Exception as e:
        logger.debug("broadcast_order_status WS error: %s", e)


def broadcast_rider_location(order_id, latitude, longitude, heading=None, speed=None):
    """Broadcasts rider live GPS coordinates to tracking customer."""
    try:
        _send_group(
            f"order_{order_id}",
            {
                "type": "rider_location_broadcast",
                "order_id": str(order_id),
                "latitude": float(latitude),
                "longitude": float(longitude),
                "heading": float(heading) if heading is not None else None,
                "speed": float(speed) if speed is not None else None,
                "timestamp": timezone.now().isoformat(),
            }
        )
    except Exception as e:
        logger.debug("broadcast_rider_location WS error: %s", e)


def broadcast_order_ready_dispatch(order):
    """Broadcasts READY order to online delivery partners."""
    try:
        _send_group(
            "delivery_dispatch",
            {
                "type": "dispatch_order_ready",
                "order": {
                    "id": str(order.id),
                    "total_amount": str(order.total_amount),
                    "delivery_address": order.delivery_address,
                    "order_type": order.order_type,
                }
            }
        )
    except Exception as e:
        logger.debug("broadcast_order_ready_dispatch WS error: %s", e)


def broadcast_settlement_update(order_id, settlement_data: dict):
    """
    Broadcasts CartSettle dynamic packing settlement event:
    Shows live authorization, final captured amount, and automatically released refund.
    """
    try:
        payload = {
            "type": "settlement_update_broadcast",
            "order_id": str(order_id),
            "settlement": settlement_data,
            "timestamp": timezone.now().isoformat()
        }
        _send_group(f"order_{order_id}", payload)
        _send_group("store_owner", payload)
    except Exception as e:
        logger.debug("broadcast_settlement_update WS error: %s", e)


def broadcast_agent_thought(session_id: str, thought_data: dict):
    """
    Streams live AI Agent reasoning, margin calculation, and tool executions
    to the frontend split-screen terminal or Co-Pilot drawer.
    """
    try:
        payload = {
            "type": "agent_thought_stream",
            "session_id": str(session_id),
            "thought": thought_data,
            "timestamp": timezone.now().isoformat()
        }
        _send_group(f"agent_{session_id}", payload)
        if "owner" in str(session_id).lower() or (isinstance(thought_data, dict) and thought_data.get("persona") == "owner"):
            _send_group("store_owner", payload)
    except Exception as e:
        logger.debug("broadcast_agent_thought WS error: %s", e)

