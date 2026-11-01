from django.db import models
from decimal import Decimal
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    is_customer = models.BooleanField(default=True, db_index=True)
    is_owner = models.BooleanField(default=False)
    is_delivery_partner = models.BooleanField(default=False)
    
    # Account Security & Brute-force lockout fields
    failed_login_attempts = models.PositiveIntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)
    lockout_until = models.DateTimeField(null=True, blank=True)
    lockout_reason = models.CharField(max_length=255, blank=True, default='')
    last_failed_login_at = models.DateTimeField(null=True, blank=True)
    last_failed_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # We use Django's default 'username' for login, which can store a mobile number or email
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username

    class Meta:
        indexes = [
            models.Index(fields=['is_customer', '-date_joined'], name='user_cust_date_idx'),
            models.Index(fields=['-date_joined'], name='user_date_joined_idx'),
            models.Index(fields=['is_active'], name='user_is_active_idx'),
        ]

class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    mobile_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    avatar_url = models.URLField(max_length=500, null=True, blank=True)
    pickup_preference = models.CharField(max_length=50, blank=True, null=True, help_text="e.g., ASAP, 30 minutes, 1 hour")
    referral_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    delete_requested = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.referral_code:
            from django.utils.crypto import get_random_string
            while True:
                code = get_random_string(8).upper()
                if not CustomerProfile.objects.filter(referral_code=code).exists():
                    self.referral_code = code
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Profile: {self.user.username}"

class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    title = models.CharField(max_length=50, default="Home")
    street = models.CharField(max_length=255)
    landmark = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="India")
    zip_code = models.CharField(max_length=20, verbose_name="Pincode")
    is_default = models.BooleanField(default=False)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', '-created_at']
        indexes = [
            models.Index(fields=['user', '-is_default', '-created_at'], name='addr_user_def_created_idx'),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.username}"

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet ({self.user.username}): Rs. {self.balance}"

class WalletTransaction(models.Model):
    class TransactionType(models.TextChoices):
        REFERRAL_REWARD = 'REFERRAL_REWARD', 'Referral Reward'
        MILESTONE_BONUS = 'MILESTONE_BONUS', 'Milestone Bonus'
        PURCHASE_DEDUCTION = 'PURCHASE_DEDUCTION', 'Purchase Deduction'
        REFUND = 'REFUND', 'Refund'
        ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT', 'Admin Adjustment'
        PURCHASE_CASHBACK = 'PURCHASE_CASHBACK', 'Purchase Cashback'

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Positive for credit, negative for debit")
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet', '-created_at'], name='wallet_tx_created_idx'),
        ]

    def __str__(self):
        return f"{self.transaction_type}: {self.amount} for {self.wallet.user.username}"


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_otps')
    otp_code = models.CharField(max_length=6)
    portal = models.CharField(max_length=20, default='customer') # 'customer' or 'owner'
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and self.attempts < 5 and timezone.now() < self.expires_at

    def __str__(self):
        return f"OTP for {self.user.username} ({self.portal}): {self.otp_code}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token_hash = models.CharField(max_length=64, db_index=True)
    portal = models.CharField(max_length=20, default='customer') # 'customer' or 'owner'
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False, db_index=True)
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        from django.utils import timezone
        return (not self.is_used) and (timezone.now() < self.expires_at)

    def __str__(self):
        status_str = "USED" if self.is_used else ("EXPIRED" if not self.is_valid() else "ACTIVE")
        return f"ResetToken for {self.user.username} ({self.portal}) [{status_str}]"


class DeliveryPartnerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='delivery_profile')
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    vehicle_type = models.CharField(max_length=50, default='Bike', choices=[
        ('Bike', 'Motorcycle / Bike'),
        ('Scooter', 'Scooter'),
        ('Bicycle', 'Bicycle'),
        ('Van', 'Delivery Van / Auto')
    ])
    vehicle_number = models.CharField(max_length=50, blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_online = models.BooleanField(default=False)
    current_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_active_at = models.DateTimeField(null=True, blank=True)
    total_deliveries = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        status = "Online" if self.is_online else "Offline"
        return f"DeliveryPartner: {self.user.get_full_name() or self.user.username} ({status})"


class PendingApkReferral(models.Model):
    ip_address = models.GenericIPAddressField(db_index=True)
    referral_code = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['ip_address', '-created_at'], name='pending_apk_ip_created_idx'),
        ]

    def __str__(self):
        return f"PendingReferral: {self.referral_code} ({self.ip_address})"

