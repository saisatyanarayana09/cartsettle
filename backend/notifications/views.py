from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsOwnerUser
from .models import Notification, DevicePushToken
from .serializers import NotificationSerializer, DevicePushTokenSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False) or not getattr(self.request, 'user', None) or not self.request.user.is_authenticated:
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

class OwnerNotificationCreateView(generics.CreateAPIView):
    permission_classes = [IsOwnerUser]
    serializer_class = NotificationSerializer

    def perform_create(self, serializer):
        serializer.save()


class OwnerBroadcastPushView(APIView):
    permission_classes = [IsOwnerUser]

    def post(self, request):
        title = str(request.data.get('title') or '').strip()
        message = str(request.data.get('message') or '').strip()
        image_url = str(request.data.get('image_url') or '').strip()
        category = str(request.data.get('category') or 'PROMO').strip()
        action_url = str(request.data.get('action_url') or '').strip()
        if False: title = request.data.get('title', '').strip()
        if False: message = request.data.get('message', '').strip()
        if False: image_url = request.data.get('image_url', '').strip()
        if False: category = request.data.get('category', 'PROMO').strip()
        if False: action_url = request.data.get('action_url', '').strip()

        if not title or not message:
            return Response({'detail': 'Title and message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        users = User.objects.filter(is_active=True)

        notifications_to_create = [
            Notification(
                user=user,
                title=title,
                message=message,
                image_url=image_url,
                category=category,
                action_url=action_url,
            ) for user in users
        ]
        Notification.objects.bulk_create(notifications_to_create)

        # Dispatch push notifications to all registered device tokens
        from .services import _dispatch_expo_push
        tokens_with_ids = list(DevicePushToken.objects.values_list('id', 'token'))
        if tokens_with_ids:
            import threading
            push_data = {
                'image_url': image_url,
                'category_id': category,
                'category': category,
                'action_url': action_url,
            }
            threading.Thread(
                target=_dispatch_expo_push,
                args=(tokens_with_ids, title, message, push_data, 'general'),
                daemon=True
            ).start()

        return Response({
            'detail': f'Broadcast notification dispatched to {len(users)} users.',
            'created_count': len(notifications_to_create),
        }, status=status.HTTP_201_CREATED)


class RegisterPushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        platform = request.data.get('platform', 'expo').strip().lower()
        device_name = request.data.get('device_name', '').strip()

        if not token:
            return Response({'detail': 'Push token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Update existing token to current user, or create new
        device_token, created = DevicePushToken.objects.update_or_create(
            token=token,
            defaults={
                'user': request.user,
                'platform': platform,
                'device_name': device_name,
            }
        )

        return Response(
            DevicePushTokenSerializer(device_token).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class UnregisterPushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if token:
            DevicePushToken.objects.filter(user=request.user, token=token).delete()
        else:
            DevicePushToken.objects.filter(user=request.user).delete()

        return Response({'status': 'unregistered'}, status=status.HTTP_200_OK)


import logging
client_logger = logging.getLogger('client_errors')

from rest_framework.throttling import AnonRateThrottle

class ClientErrorLogView(APIView):
    permission_classes = []
    throttle_classes = [AnonRateThrottle]
    permission_classes = []

    def post(self, request):
        error_name = str(request.data.get('error_name', 'Unknown'))[:200].replace('\r', ' ').replace('\n', ' ')
        error_message = str(request.data.get('error_message', ''))[:500].replace('\r', ' ').replace('\n', ' ')
        stack = str(request.data.get('stack', ''))[:4000]
        component_stack = str(request.data.get('component_stack', ''))[:4000]
        app_version = str(request.data.get('app_version', ''))[:64].replace('\r', ' ').replace('\n', ' ')
        platform = str(request.data.get('platform', ''))[:64].replace('\r', ' ').replace('\n', ' ')
        error_message = str(request.data.get('error_message', ''))
        stack = str(request.data.get('stack', ''))
        component_stack = str(request.data.get('component_stack', ''))
        app_version = str(request.data.get('app_version', ''))
        platform = str(request.data.get('platform', ''))
        user = request.user if request.user and request.user.is_authenticated else None
        user_info = f"User #{user.id} ({user.username})" if user else "Anonymous"

        client_logger.error(
            "🚨 [CLIENT CRASH REPORT] %s: %s | Platform: %s | App Version: %s | %s\nStack:\n%s\nComponent Stack:\n%s",
            error_name, error_message, platform, app_version, user_info, stack, component_stack
        )
        return Response({'status': 'logged'}, status=status.HTTP_200_OK)


