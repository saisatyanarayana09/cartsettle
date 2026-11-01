from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationViewSet,
    OwnerNotificationCreateView,
    OwnerBroadcastPushView,
    RegisterPushTokenView,
    UnregisterPushTokenView,
    ClientErrorLogView,
)

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notification')

urlpatterns = [
    path('client-error/', ClientErrorLogView.as_view(), name='client-error-log'),
    path('push-token/', RegisterPushTokenView.as_view(), name='register-push-token'),
    path('push-token/delete/', UnregisterPushTokenView.as_view(), name='unregister-push-token'),
    path('owner/send/', OwnerNotificationCreateView.as_view(), name='owner-send-notification'),
    path('owner/broadcast/', OwnerBroadcastPushView.as_view(), name='owner-broadcast-notification'),
    path('', include(router.urls)),
]

