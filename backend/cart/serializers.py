from decimal import Decimal
from rest_framework import serializers
from .models import Cart, CartItem
from products.models import Product
from store.models import StoreSettings


def current_price(product):
    return product.offer_price if product.offer_price is not None else product.regular_price


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    is_in_stock = serializers.BooleanField(source='product.is_in_stock', read_only=True)
    stock_quantity = serializers.IntegerField(source='product.stock_quantity', read_only=True)
    max_order_quantity = serializers.IntegerField(source='product.max_order_quantity', read_only=True)
    quantity = serializers.IntegerField(min_value=1, required=False)
    regular_price = serializers.DecimalField(source='product.regular_price', max_digits=10, decimal_places=2, read_only=True)
    unit_price = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_unit', 'product_image', 'is_in_stock', 'stock_quantity', 'max_order_quantity', 'quantity', 'regular_price', 'unit_price', 'subtotal']
        read_only_fields = ['id']

    def get_unit_price(self, item):
        return current_price(item.product)

    def get_subtotal(self, item):
        return current_price(item.product) * item.quantity

    def validate_product(self, product):
        if not product.is_active or not product.is_in_stock:
            raise serializers.ValidationError('This product is not currently available.')
        return product


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    promo_code = serializers.CharField(source='promo_code.code', read_only=True)
    promo_discount = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    items_total = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    packaging_fee = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'promo_code', 'promo_discount', 'subtotal', 'items_total', 'discount', 'packaging_fee', 'total', 'updated_at']

    def _items(self, cart):
        if not hasattr(cart, '_prefetched_items'):
            cart._prefetched_items = list(cart.items.all())
        return cart._prefetched_items

    def _calculate_totals(self, cart):
        if not hasattr(cart, '_totals_calculated'):
            items = self._items(cart)
            subtotal = Decimal('0.00')
            items_total = Decimal('0.00')
            discount = Decimal('0.00')
            promo_eligible_total = Decimal('0.00')

            promo_category_id = None
            if cart.promo_code and getattr(cart.promo_code, 'applicable_category_id', None):
                promo_category_id = cart.promo_code.applicable_category_id

            for item in items:
                qty = Decimal(item.quantity)
                reg_price = item.product.regular_price
                cur_price = current_price(item.product)
                
                subtotal += reg_price * qty
                items_total += cur_price * qty
                discount += (reg_price - cur_price) * qty
                
                if promo_category_id is None or item.product.category_id == promo_category_id:
                    promo_eligible_total += cur_price * qty

            promo_discount = Decimal('0.00')
            from django.utils import timezone
            is_promo_valid = bool(
                cart.promo_code and
                cart.promo_code.is_active and
                not (cart.promo_code.expiration_date and cart.promo_code.expiration_date < timezone.now()) and
                items_total >= cart.promo_code.min_order_amount
            )
            if is_promo_valid and getattr(cart.promo_code, 'max_uses_per_user', 0) > 0 and cart.customer_id:
                from offers.models import PromoUsage
                if PromoUsage.objects.filter(promo_code=cart.promo_code, user_id=cart.customer_id).count() >= cart.promo_code.max_uses_per_user:
                    is_promo_valid = False
            if is_promo_valid:
                if promo_eligible_total > Decimal('0.00'):
                    if cart.promo_code.discount_type == 'PERCENTAGE':
                        promo_discount = (promo_eligible_total * cart.promo_code.discount_value / Decimal('100.00')).quantize(Decimal('0.01'))
                    else:
                        promo_discount = min(cart.promo_code.discount_value, promo_eligible_total)

            packaging_fee = Decimal('0.00') if not items else Decimal(str(StoreSettings.load().packaging_fee or 0))
            total = max(Decimal('0.00'), items_total - promo_discount) + packaging_fee

            cart._totals = {
                'subtotal': subtotal,
                'items_total': items_total,
                'discount': discount,
                'promo_discount': promo_discount,
                'packaging_fee': packaging_fee,
                'total': total
            }
            cart._totals_calculated = True

        return cart._totals

    def get_subtotal(self, cart):
        return self._calculate_totals(cart)['subtotal']

    def get_items_total(self, cart):
        return self._calculate_totals(cart)['items_total']

    def get_discount(self, cart):
        return self._calculate_totals(cart)['discount']

    def get_promo_discount(self, cart):
        return self._calculate_totals(cart)['promo_discount']

    def get_packaging_fee(self, cart):
        return self._calculate_totals(cart)['packaging_fee']

    def get_total(self, cart):
        return self._calculate_totals(cart)['total']
