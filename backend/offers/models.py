from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator

class Banner(models.Model):
    title = models.CharField(max_length=100)
    image = models.ImageField(upload_to='banners/')
    link = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-created_at']
        indexes = [
            models.Index(fields=['is_active', 'display_order', '-created_at'], name='banner_act_ord_date_idx'),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete('active_banners_serialized')

    def delete(self, *args, **kwargs):
        from django.core.cache import cache
        cache.delete('active_banners_serialized')
        return super().delete(*args, **kwargs)

    def __str__(self):
        return self.title

class PromoCode(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', 'Percentage'
        FLAT = 'FLAT', 'Flat Amount'

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    applicable_category = models.ForeignKey('products.Category', null=True, blank=True, on_delete=models.CASCADE, help_text="If set, discount only applies to items in this category")
    is_active = models.BooleanField(default=True)
    expiration_date = models.DateTimeField(blank=True, null=True)
    max_uses_per_user = models.IntegerField(default=1, help_text="0 means unlimited uses per user")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', '-created_at'], name='promo_act_created_idx'),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete('active_promos_serialized')

    def delete(self, *args, **kwargs):
        from django.core.cache import cache
        cache.delete('active_promos_serialized')
        return super().delete(*args, **kwargs)

    def __str__(self):
        return self.code

class ReferralSettings(models.Model):
    is_active = models.BooleanField(default=False)
    referrer_reward = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'), help_text="Amount given to the person whose code was used")
    referee_reward = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'), help_text="Amount given to the new user who signs up")
    share_text_template = models.TextField(
        default="I buy my groceries from Narendra Kirana! Use my referral code {code} to get ₹{reward} instantly in your wallet! Shop now: {link}"
    )
    require_min_spend = models.BooleanField(default=False, help_text="Require referrer to meet a minimum spend before they can earn rewards")
    min_spend_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    class SpendPeriod(models.TextChoices):
        WEEK = 'WEEK', 'Past 7 Days'
        MONTH = 'MONTH', 'Past 30 Days'
        YEAR = 'YEAR', 'Past 365 Days'
        
    min_spend_period = models.CharField(max_length=10, choices=SpendPeriod.choices, default=SpendPeriod.MONTH)
    
    referrer_reward_product = models.ForeignKey('products.Product', null=True, blank=True, on_delete=models.SET_NULL, help_text="Specific product to give as an additional reward")

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Referral Settings"

class ReferralMilestone(models.Model):
    required_referrals = models.PositiveIntegerField(unique=True, help_text="Number of successful referrals needed to unlock this bonus")
    bonus_reward = models.DecimalField(max_digits=10, decimal_places=2, help_text="Bonus amount credited to the wallet")

    class Meta:
        ordering = ['required_referrals']

    def __str__(self):
        return f"Refer {self.required_referrals} friends -> Bonus ₹{self.bonus_reward}"

class Referral(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending First Order'
        READY_TO_CLAIM = 'READY_TO_CLAIM', 'Ready to Claim'
        AWAITING_APPROVAL = 'AWAITING_APPROVAL', 'Awaiting Owner Approval'
        COMPLETED = 'COMPLETED', 'Completed & Rewarded'

    referrer = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='referrals_made')
    referred_user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='referred_by')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['referrer', '-created_at'], name='referral_ref_created_idx'),
            models.Index(fields=['referred_user', '-created_at'], name='referral_refu_created_idx'),
        ]

    def __str__(self):
        return f"{self.referrer.username} referred {self.referred_user.username} ({self.status})"

class PromoUsage(models.Model):
    promo_code = models.ForeignKey(PromoCode, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='promo_usages')
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-used_at']
        indexes = [
            models.Index(fields=['promo_code', 'user'], name='promo_usage_pu_idx'),
        ]
