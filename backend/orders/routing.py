from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/orders/(?P<order_id>[^/]+)/tracking/?$', consumers.OrderTrackingConsumer.as_asgi()),
    re_path(r'^ws/owner/orders/?$', consumers.OwnerOrdersConsumer.as_asgi()),
    re_path(r'^ws/delivery/dispatch/?$', consumers.DeliveryDispatchConsumer.as_asgi()),
]
