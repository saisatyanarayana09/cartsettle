from django.db import models
from django.conf import settings

class Notification(models.Model):
    CATEGORY_CHOICES = (
        ('ORDER', 'Order Update'),
        ('PROMO', 'Offer / Promotion'),
        ('WALLET', 'Wallet & Payments'),
        ('SYSTEM', 'System Alert'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    image_url = models.URLField(blank=True, default='', max_length=500)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='SYSTEM')
    action_url = models.CharField(max_length=300, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='notif_user_created_idx'),
            models.Index(fields=['user', 'is_read', '-created_at'], name='notif_user_read_created_idx'),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class DevicePushToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_tokens')
    token = models.CharField(max_length=255, unique=True, db_index=True)
    platform = models.CharField(max_length=20, default='expo')  # expo, android, ios, web
    device_name = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username} - {self.platform} ({self.token[:15]}...)"

