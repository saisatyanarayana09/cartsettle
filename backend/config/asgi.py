"""
ASGI config for Narendra Kirana project.

Exposes the ASGI callable as a module-level variable named ``application``,
routing standard HTTP requests through Django and WebSocket requests through
Django Channels with JWT Authentication.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is fully populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from accounts.ws_auth import JwtAuthMiddlewareStack
import orders.routing
import cart.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JwtAuthMiddlewareStack(
        URLRouter(
            orders.routing.websocket_urlpatterns + cart.routing.websocket_urlpatterns
        )
    ),
})
