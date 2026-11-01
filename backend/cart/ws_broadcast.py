import logging
import asyncio
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def _send_group(group_name: str, message: dict):
    """
    Safely delivers message to a channel layer group across both synchronous
    contexts (standard Django views) and asynchronous event loops (async tests/views).
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
    else:
        async_to_sync(channel_layer.group_send)(group_name, message)


def broadcast_cart_updated(user_id: int, cart_data: dict):
    """Broadcasts updated cart state to all active client connections of this user."""
    try:
        _send_group(
            f"user_cart_{user_id}",
            {
                "type": "cart_broadcast",
                "payload": {
                    "type": "CART_UPDATED",
                    "cart": cart_data,
                    "timestamp": timezone.now().isoformat(),
                }
            }
        )
    except Exception as e:
        logger.debug("broadcast_cart_updated WS error: %s", e)


def broadcast_cart_stock_alert(user_id: int, product_id: int, available_quantity: int = 0, message: str = ""):
    """Broadcasts that a product in user's cart has become unavailable or depleted."""
    try:
        _send_group(
            f"user_cart_{user_id}",
            {
                "type": "cart_stock_alert",
                "product_id": product_id,
                "available_quantity": available_quantity,
                "message": message or "An item in your cart is no longer available in the requested quantity.",
            }
        )
    except Exception as e:
        logger.debug("broadcast_cart_stock_alert WS error: %s", e)
