from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name_snapshot', 'unit_snapshot', 'price_snapshot', 'quantity', 'subtotal', 'status', 'product_image', 'is_packed', 'packed_quantity', 'item_cost_price']

    def get_product_image(self, obj):
        if obj.product and obj.product.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.product.image.url)
            return obj.product.image.url
        return None


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_phone = serializers.SerializerMethodField()
    delivery_partner_name = serializers.SerializerMethodField()
    delivery_partner_phone = serializers.SerializerMethodField()
    delivery_otp = serializers.SerializerMethodField()

    def get_customer_phone(self, obj):
        if obj.customer:
            if hasattr(obj.customer, 'customer_profile') and obj.customer.customer_profile and obj.customer.customer_profile.mobile_number:
                return obj.customer.customer_profile.mobile_number
            if obj.customer.username and obj.customer.username.isdigit():
                return obj.customer.username
        return ""

    def get_delivery_partner_name(self, obj):
        if obj.delivery_partner:
            return obj.delivery_partner.get_full_name() or obj.delivery_partner.username
        return ""

    def get_delivery_partner_phone(self, obj):
        if obj.delivery_partner:
            try:
                profile = obj.delivery_partner.delivery_profile
                if profile and profile.phone_number:
                    return profile.phone_number
            except Exception:
                pass
            if obj.delivery_partner.username and obj.delivery_partner.username.isdigit():
                return obj.delivery_partner.username
        return ""

    delivery_partner_lat = serializers.SerializerMethodField()
    delivery_partner_lng = serializers.SerializerMethodField()
    delivery_partner_vehicle = serializers.SerializerMethodField()

    def get_delivery_partner_lat(self, obj):
        try:
            if obj.delivery_partner and hasattr(obj.delivery_partner, 'delivery_profile'):
                profile = obj.delivery_partner.delivery_profile
                if profile and profile.current_lat is not None:
                    return float(profile.current_lat)
        except Exception:
            pass
        return None

    def get_delivery_partner_lng(self, obj):
        try:
            if obj.delivery_partner and hasattr(obj.delivery_partner, 'delivery_profile'):
                profile = obj.delivery_partner.delivery_profile
                if profile and profile.current_lng is not None:
                    return float(profile.current_lng)
        except Exception:
            pass
        return None

    def get_delivery_partner_vehicle(self, obj):
        if obj.delivery_partner:
            try:
                profile = obj.delivery_partner.delivery_profile
                if profile:
                    parts = [p for p in [profile.vehicle_type, profile.vehicle_number] if p]
                    return " • ".join(parts) if parts else ""
            except Exception:
                pass
        return ""

    def get_delivery_otp(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return ""
        # Customer who ordered or store owner/staff can see the OTP
        if request.user == obj.customer or getattr(request.user, 'is_owner', False) or request.user.is_staff or request.user.is_superuser:
            return obj.delivery_otp
        # Delivery partner cannot see OTP directly (must ask customer)
        return ""

    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_name', 'customer_email', 'customer_phone', 'status', 'total_amount',
            'discount_applied', 'promo_discount', 'wallet_discount',
            'packaging_fee', 'pickup_time', 'customer_note', 'owner_note',
            'items', 'created_at', 'updated_at', 'order_type',
            'delivery_address', 'delivery_pincode', 'delivery_latitude',
            'delivery_longitude', 'delivery_fee',
            'delivery_slot_date', 'delivery_slot_label', 'payment_method', 'upi_transaction_id',
            'cashback_credited',
            'delivery_partner', 'delivery_partner_name', 'delivery_partner_phone',
            'delivery_partner_vehicle',
            'delivery_partner_lat', 'delivery_partner_lng',
            'delivery_otp', 'assigned_at', 'dispatched_at', 'delivered_at',
            'paypal_order_id', 'paypal_authorization_id', 'paypal_capture_id',
            'authorized_amount', 'captured_amount', 'released_amount',
            'margin_guarded', 'ai_settlement_notes', 'paypal_invoice_id', 'paypal_invoice_url', 'paypal_tracking_number', 'shipping_carrier', 'dispute_id', 'dispute_status', 'packing_photo'
        ]
        read_only_fields = [
            'id', 'customer', 'customer_name', 'customer_email', 'customer_phone', 'status', 'total_amount',
            'discount_applied', 'promo_discount', 'wallet_discount',
            'packaging_fee', 'owner_note', 'items', 'created_at', 'updated_at',
            'order_type', 'delivery_address', 'delivery_pincode',
            'delivery_latitude', 'delivery_longitude', 'delivery_fee',
            'delivery_slot_date', 'delivery_slot_label', 'payment_method', 'upi_transaction_id',
            'cashback_credited',
            'delivery_partner', 'delivery_partner_name', 'delivery_partner_phone',
            'delivery_partner_vehicle',
            'delivery_partner_lat', 'delivery_partner_lng',
            'delivery_otp', 'assigned_at', 'dispatched_at', 'delivered_at',
            'paypal_order_id', 'paypal_authorization_id', 'paypal_capture_id',
            'authorized_amount', 'captured_amount', 'released_amount',
            'margin_guarded', 'ai_settlement_notes', 'paypal_invoice_id', 'paypal_invoice_url', 'paypal_tracking_number', 'shipping_carrier', 'dispute_id', 'dispute_status', 'packing_photo'
        ]


class OptionalDateField(serializers.DateField):
    def to_internal_value(self, value):
        if value in (None, '', 'null', 'undefined'):
            return None
        return super().to_internal_value(value)


class OptionalDecimalField(serializers.DecimalField):
    def to_internal_value(self, value):
        if value in (None, '', 'null', 'undefined'):
            return None
        return super().to_internal_value(value)


class CheckoutSerializer(serializers.Serializer):
    pickup_time = serializers.CharField(max_length=80, required=False, allow_blank=True)
    customer_note = serializers.CharField(required=False, allow_blank=True)
    use_wallet = serializers.BooleanField(default=False)
    order_type = serializers.CharField(max_length=20, required=False, allow_blank=True)
    delivery_address = serializers.CharField(required=False, allow_blank=True)
    delivery_pincode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    delivery_latitude = OptionalDecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    delivery_longitude = OptionalDecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    delivery_slot_date = OptionalDateField(required=False, allow_null=True)
    delivery_slot_label = serializers.CharField(max_length=100, required=False, allow_blank=True)
    payment_method = serializers.CharField(max_length=20, required=False, default="COD")
    upi_transaction_id = serializers.CharField(max_length=100, required=False, allow_blank=True)


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
