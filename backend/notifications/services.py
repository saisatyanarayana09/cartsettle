import logging
import threading
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _dispatch_expo_push(tokens_with_ids, title, body, data=None, channel_id='orders'):
    if not tokens_with_ids:
        return

    messages = []
    token_map = {}
    for token_id, token in tokens_with_ids:
        token_clean = str(token).strip()
        if not (token_clean.startswith('ExponentPushToken') or token_clean.startswith('ExpoPushToken')):
            continue

        token_map[token_clean] = token_id
        
        category_id = (data or {}).get('category_id')
        if not category_id:
            notif_status = (data or {}).get('status')
            if notif_status == 'RIDER_ARRIVING':
                category_id = 'RIDER_ARRIVING'
            elif notif_status == 'READY':
                category_id = 'ORDER_READY'
            else:
                category_id = 'ORDER_DELIVERY'

        msg_payload = {
            'to': token_clean,
            'sound': 'default',
            'title': title,
            'body': body,
            'data': data or {},
            'channelId': channel_id,
            'priority': 'high',
            'categoryId': category_id,
            '_displayInForeground': True
        }
        
        image_url = (data or {}).get('image_url') or (data or {}).get('image')
        if image_url:
            msg_payload['image'] = image_url

        messages.append(msg_payload)

    if not messages:
        return

    headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
    }

    try:
        response = requests.post(EXPO_PUSH_URL, json=messages, headers=headers, timeout=8)
        response_data = response.json()
        tickets = response_data.get('data', [])

        # Clean up unregistered device tokens
        from .models import DevicePushToken
        tokens_to_delete = []
        for idx, ticket in enumerate(tickets):
            if ticket.get('status') == 'error':
                error_code = ticket.get('details', {}).get('error')
                if error_code in ('DeviceNotRegistered', 'InvalidCredentials'):
                    token_sent = messages[idx]['to']
                    token_id = token_map.get(token_sent)
                    if token_id:
                        tokens_to_delete.append(token_id)

        if tokens_to_delete:
            DevicePushToken.objects.filter(id__in=tokens_to_delete).delete()
            logger.info("Cleaned up %d unregistered device push tokens.", len(tokens_to_delete))

    except Exception as e:
        logger.error("Failed to send Expo push notification: %s", e)


def send_push_notification(user, title, body, data=None, channel_id='orders', async_send=True):
    """
    Sends native push notification to all active devices registered to `user`.
    Runs asynchronously by default to prevent blocking database transactions.
    """
    if not user or not user.is_authenticated:
        return

    from .models import DevicePushToken
    tokens_with_ids = list(
        DevicePushToken.objects.filter(user=user).values_list('id', 'token')
    )

    if not tokens_with_ids:
        return

    if async_send:
        thread = threading.Thread(
            target=_dispatch_expo_push,
            args=(tokens_with_ids, title, body, data, channel_id),
            daemon=True
        )
        thread.start()
    else:
        _dispatch_expo_push(tokens_with_ids, title, body, data, channel_id)
