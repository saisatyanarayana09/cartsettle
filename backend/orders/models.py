from django.db import models
from django.conf import settings
from django.utils.crypto import get_random_string
from products.models import Product


def order_id():
    from django.utils import timezone
    from orders.models import Order
    import uuid
    now = timezone.now()
    # Format: ORDYYYYNNNNN (e.g. ORD202600001)
    prefix = f"ORD{now.year}"
    try:
        last_order = Order.objects.filter(id__startswith=prefix).order_by('id').last()
        if not last_order:
            return f"{prefix}00001"
        # Extract the sequence digits after prefix
        seq_str = last_order.id[len(prefix):]
        if seq_str.isdigit():
            last_num = int(seq_str)
            return f"{prefix}{last_num + 1:05d}"
    except Exception:
        pass
    return f"{prefix}{uuid.uuid4().hex[:6].upper()}"


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = 'NEW', 'New'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        PREPARING = 'PREPARING', 'Preparing'
        READY = 'READY', 'Ready for pickup'
        OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', 'Out for delivery'
        COMPLETED = 'COMPLETED', 'Completed'
        REJECTED = 'REJECTED', 'Rejected'

    id = models.CharField(primary_key=True, max_length=20, default=order_id, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    
    # Delivery Info
    order_type = models.CharField(max_length=15, choices=[('PICKUP', 'Store Pickup'), ('DELIVERY', 'Home Delivery')], default='PICKUP')
    delivery_address = models.TextField(blank=True)
    delivery_pincode = models.CharField(max_length=20, blank=True)
    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_slot_date = models.DateField(null=True, blank=True)
    delivery_slot_label = models.CharField(max_length=100, blank=True, default="")
    payment_method = models.CharField(max_length=20, default="COD")
    upi_transaction_id = models.CharField(max_length=100, blank=True, default="")
    paypal_order_id = models.CharField(max_length=100, blank=True, default="")
    paypal_authorization_id = models.CharField(max_length=100, blank=True, default="", db_index=True)
    paypal_capture_id = models.CharField(max_length=100, blank=True, default="")
    authorized_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    captured_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    released_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    margin_guarded = models.BooleanField(default=False)
    ai_settlement_notes = models.TextField(blank=True, default="")
    cashback_credited = models.BooleanField(default=False)
    
    # Delivery Partner & Dispatch Tracking
    delivery_partner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='partner_deliveries'
    )
    delivery_otp = models.CharField(max_length=6, blank=True, default="")
    assigned_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    promo_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    wallet_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    packaging_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pickup_time = models.CharField(max_length=80, blank=True)
    customer_note = models.TextField(blank=True)
    owner_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at'], name='order_created_at_idx'),
            models.Index(fields=['customer', '-created_at'], name='order_cust_created_idx'),
            models.Index(fields=['delivery_slot_date', 'delivery_slot_label'], name='order_slot_booking_idx'),
            models.Index(fields=['delivery_partner', 'status', '-assigned_at'], name='order_partner_act_idx'),
        ]


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    product_name_snapshot = models.CharField(max_length=200)
    unit_snapshot = models.CharField(max_length=50)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    is_packed = models.BooleanField(default=True)
    packed_quantity = models.PositiveIntegerField(default=1)
    item_cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(
        max_length=10,
        choices=[('ACCEPTED', 'Accepted'), ('REJECTED', 'Rejected')],
        default='ACCEPTED'
    )
