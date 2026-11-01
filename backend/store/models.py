from decimal import Decimal
from django.db import models

class StoreSettings(models.Model):
    # General Info
    store_name = models.CharField(max_length=100, default="Narendra Kirana")
    store_address = models.TextField(blank=True, default="123 Market Street, City Center")
    store_phone = models.CharField(max_length=20, blank=True, default="+91 98765 43210")
    store_email = models.EmailField(blank=True, default="support@narendrakirana.in")
    
    # Operations
    is_open = models.BooleanField(default=True, help_text="Turn off to temporarily stop accepting orders")
    
    # Invoicing
    invoice_signature = models.ImageField(upload_to='signatures/', null=True, blank=True, help_text="Upload a signature image with a white or transparent background.")
    
    # Order Constraints
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    packaging_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Inventory
    low_stock_threshold = models.IntegerField(default=5, help_text="Alert when stock falls below this number")
    
    # Delivery (For future use or V1)
    delivery_mode = models.CharField(max_length=20, choices=[('PICKUP', 'Store Pickup Only'), ('DELIVERY', 'Delivery Only'), ('BOTH', 'Both')], default='PICKUP')
    is_home_delivery_active = models.BooleanField(default=False)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    free_delivery_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    min_delivery_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('150.00'))
    allowed_pincodes = models.TextField(blank=True, default="", help_text="Comma-separated list of allowed pincodes")
    store_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, default=17.385044, help_text="Store latitude for GPS & maps")
    store_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, default=78.486671, help_text="Store longitude for GPS & maps")
    delivery_radius_km = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('5.00'), help_text="Maximum home delivery radius in kilometers")
    enforce_delivery_radius = models.BooleanField(default=False, help_text="Block checkout if customer address is beyond delivery radius")
    
    # Automation
    auto_accept_orders = models.BooleanField(default=False, help_text="Automatically accept new orders")

    # Homepage Customization
    show_popular_picks = models.BooleanField(default=True)
    popular_picks_title = models.CharField(max_length=50, default="Popular picks")
    
    show_great_deals = models.BooleanField(default=True)
    great_deals_title = models.CharField(max_length=50, default="Great Deals")
    
    show_new_arrivals = models.BooleanField(default=True)
    new_arrivals_title = models.CharField(max_length=50, default="New Arrivals")

    # Homepage section display order (comma-separated section keys)
    homepage_section_order = models.CharField(
        max_length=200,
        default="popular_picks,great_deals,new_arrivals"
    )

    # Flash Announcement Theme
    announcement_bg_color = models.CharField(max_length=20, default="#ef4444")
    announcement_text_color = models.CharField(max_length=20, default="#ffffff")

    # Storefront Branding & Theme Preset
    brand_theme_preset = models.CharField(
        max_length=50,
        default="vacation",
        help_text="Active storefront visual theme preset ('vacation', 'emerald', 'indigo', 'warm_sun', 'custom')"
    )
    palette_mode = models.IntegerField(default=5, help_text="Active color palette mode complexity (2, 3, 4, or 5)")
    custom_primary_color = models.CharField(max_length=20, default="#5ba8a6", blank=True)
    custom_secondary_color = models.CharField(max_length=20, default="#4d69a5", blank=True)
    custom_accent_color = models.CharField(max_length=20, default="#ecd386", blank=True)
    custom_canvas_color = models.CharField(max_length=20, default="#eae6dd", blank=True)
    custom_text_color = models.CharField(max_length=20, default="#323232", blank=True)
    apply_theme_to_owner_app = models.BooleanField(default=False, help_text="Sync theme to store owner app as well")

    # UPI
    upi_id = models.CharField(max_length=100, blank=True, default="")
    upi_payee_name = models.CharField(max_length=100, blank=True, default="Narendra Kirana")
    upi_qr_image = models.ImageField(upload_to='upi_qr/', null=True, blank=True)
    enable_dynamic_upi_qr = models.BooleanField(default=True)

    # Compliance
    fssai_license_number = models.CharField(max_length=14, blank=True, default="")
    gstin = models.CharField(max_length=15, blank=True, default="")
    enable_itemized_tax_invoice = models.BooleanField(default=True)
    invoice_terms_and_conditions = models.TextField(
        blank=True,
        default="1. Goods once sold will not be taken back without original bill.\n2. In case of any dispute, local jurisdiction applies.\n3. Perishable goods must be reported within 24 hours."
    )

    # Store Timings & Emergency Pause
    store_timings_json = models.JSONField(default=dict, blank=True)
    auto_cutoff_orders = models.BooleanField(default=True)
    is_emergency_paused = models.BooleanField(default=False)
    emergency_pause_message = models.CharField(
        max_length=255,
        blank=True,
        default="We are currently experiencing high order volume and will resume shortly. Thank you for your patience!"
    )

    # Delivery & Pickup Time Slots
    enable_time_slots = models.BooleanField(default=True)
    preparation_buffer_minutes = models.IntegerField(default=30)
    max_orders_per_slot = models.IntegerField(default=15)
    time_slots_json = models.JSONField(default=list, blank=True)

    # WhatsApp Support
    enable_whatsapp_support = models.BooleanField(default=True)
    whatsapp_number = models.CharField(max_length=20, blank=True, default="+919876543210")
    whatsapp_default_message = models.CharField(
        max_length=255,
        default="Hi Narendra Kirana, I need help with my grocery order."
    )
    whatsapp_order_help_template = models.CharField(
        max_length=255,
        default="Hi Narendra Kirana, I need help with Order #{order_id}"
    )

    # Search Ticker
    popular_searches = models.TextField(
        blank=True,
        default="Aashirvaad Shudh Chakki Atta\nFresh Paneer & Milk\nFortune Sunflower Oil\nBasmati Rice & Dals\nTata Salt & Spices",
        help_text="One search term per line to show in the search bar ticker."
    )

    # Loyalty Wallet & Referral Rules
    referral_bonus_referrer = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))
    referral_bonus_referee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))
    referral_min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('200.00'))
    max_wallet_usage_percentage = models.IntegerField(default=50)
    order_cashback_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('2.00'))

    # Announcement Marquee & Festive Popup
    enable_announcement_bar = models.BooleanField(default=True)
    announcement_text = models.TextField(
        blank=True,
        default="🎉 Free Home Delivery on orders above ₹499! Use code FIRST50 for ₹50 off on first order."
    )
    announcement_start_date = models.DateTimeField(null=True, blank=True)
    announcement_end_date = models.DateTimeField(null=True, blank=True)
    enable_festive_popup = models.BooleanField(default=False)
    festive_popup_title = models.CharField(max_length=100, blank=True, default="Special Festive Offer! 🪔")
    festive_popup_content = models.TextField(
        blank=True,
        default="Enjoy huge festive discounts on all grocery essentials. Shop today!"
    )
    festive_popup_image = models.ImageField(upload_to='festive/', null=True, blank=True)

    # Mobile Version & Maintenance
    min_mobile_version = models.CharField(max_length=20, default="1.0.0")
    latest_mobile_version = models.CharField(max_length=20, default="1.0.0")
    force_app_update = models.BooleanField(default=False)
    app_update_url = models.URLField(
        blank=True,
        default="https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/narendra-kirana.apk"
    )
    app_update_message = models.CharField(
        max_length=255,
        default="A new and improved version of Narendra Kirana is available. Please update to continue shopping."
    )
    is_maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(
        blank=True,
        default="We are currently performing scheduled maintenance to serve you better. We will be back online shortly!"
    )
    maintenance_estimated_end = models.DateTimeField(null=True, blank=True)

    # Mobile App Downloads Hub Customization
    app_name = models.CharField(max_length=100, blank=True, default="Narendra Kirana")
    app_icon = models.ImageField(upload_to='app_icon/', null=True, blank=True)
    app_download_btn_text = models.CharField(max_length=50, blank=True, default="Download APK")
    owner_app_update_url = models.URLField(
        blank=True,
        default="https://github.com/saisatyanarayana09/narendra-kirana/releases/download/owner-latest/narendra-kirana-owner.apk"
    )
    delivery_app_update_url = models.URLField(
        blank=True,
        default="https://github.com/saisatyanarayana09/narendra-kirana/releases/download/delivery-latest/narendra-kirana-delivery.apk"
    )

    
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete('store_settings')
        cache.delete('store_settings_serialized')
        cache.delete('store_public_settings_serialized')

    @classmethod
    def load(cls):
        from django.core.cache import cache
        obj = cache.get('store_settings')
        if not obj:
            obj, created = cls.objects.get_or_create(pk=1)
            cache.set('store_settings', obj, timeout=3600)
        return obj

    def __str__(self):
        return f"{self.store_name} Settings"


class HomepageSection(models.Model):
    SECTION_TYPES = (
        ('products', 'Product Grid'),
        ('banner', 'Mid-Page Banner'),
    )
    section_type = models.CharField(max_length=20, choices=SECTION_TYPES, default='products')
    banner_image = models.ImageField(upload_to='banners/', null=True, blank=True)
    banner_link = models.CharField(max_length=500, null=True, blank=True, help_text="Optional URL to navigate to when clicked")

    title = models.CharField(max_length=100, default='New Section')
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    products = models.ManyToManyField(
        'products.Product',
        through='HomepageSectionProduct',
        blank=True
    )

    class Meta:
        ordering = ['display_order']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete('active_homepage_sections_serialized')

    def delete(self, *args, **kwargs):
        from django.core.cache import cache
        cache.delete('active_homepage_sections_serialized')
        return super().delete(*args, **kwargs)

    def __str__(self):
        return self.title


class HomepageSectionProduct(models.Model):
    section = models.ForeignKey(HomepageSection, on_delete=models.CASCADE, related_name='section_products')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='homepage_sections')
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position']
        unique_together = [['section', 'product']]
        indexes = [
            models.Index(fields=['section', 'position'], name='hsp_section_pos_idx'),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete('active_homepage_sections_serialized')

    def delete(self, *args, **kwargs):
        from django.core.cache import cache
        cache.delete('active_homepage_sections_serialized')
        return super().delete(*args, **kwargs)

    def __str__(self):
        return f"{getattr(self.section, 'title', '')} - {self.product.name} (pos {self.position})"


class Feedback(models.Model):
    customer = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at'], name='feedback_created_at_idx'),
        ]

    def __str__(self):
        return f"{self.rating} Star - {self.customer if self.customer else 'Anonymous'}"


class StoreEmailSettings(models.Model):
    PROVIDER_CHOICES = (
        ('gmail', 'Gmail / Google Workspace'),
        ('outlook', 'Outlook / Office 365'),
        ('custom', 'Custom SMTP'),
    )

    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='gmail')
    sender_email = models.EmailField(blank=True, default="", help_text="Email address used to send emails (e.g., your store Gmail)")
    sender_name = models.CharField(max_length=100, default="Narendra Kirana", help_text="Display name on outgoing emails")
    smtp_host = models.CharField(max_length=100, default="smtp.gmail.com")
    smtp_port = models.IntegerField(default=587)
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    encrypted_app_password = models.CharField(max_length=500, blank=True, default="")
    is_active = models.BooleanField(default=False, help_text="Enable custom store email sending. If disabled, fallback to server settings.")
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_test_status = models.CharField(max_length=255, blank=True, default="")

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete('store_email_settings')

    @classmethod
    def load(cls):
        from django.core.cache import cache
        obj = cache.get('store_email_settings')
        if not obj:
            obj, created = cls.objects.get_or_create(pk=1)
            if not obj.sender_email:
                try:
                    from .models import StoreSettings
                    s = StoreSettings.load()
                    if s.store_email:
                        obj.sender_email = s.store_email
                        obj.save()
                except Exception:
                    pass
            cache.set('store_email_settings', obj, timeout=3600)
        return obj

    def get_decrypted_password(self) -> str:
        from .email_service import decrypt_secret
        return decrypt_secret(self.encrypted_app_password)

    def set_app_password(self, raw_password: str):
        from .email_service import encrypt_secret
        if raw_password:
            self.encrypted_app_password = encrypt_secret(raw_password)

    def get_from_email_string(self) -> str:
        name = self.sender_name.strip() if self.sender_name else "Narendra Kirana"
        email = self.sender_email.strip()
        if name and email:
            return f"{name} <{email}>"
        return email or "noreply@narendra-kirana.com"

    def __str__(self):
        return f"Store Email Settings ({self.sender_email or 'Unconfigured'})"

