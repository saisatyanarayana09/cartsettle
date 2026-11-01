from rest_framework import serializers
from .models import Notification, DevicePushToken

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['created_at']


class DevicePushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DevicePushToken
        fields = ['id', 'token', 'platform', 'device_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

