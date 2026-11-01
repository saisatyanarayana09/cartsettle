from django.db import transaction
from rest_framework import generics, status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsCustomerUser
from products.models import Product
from .models import Cart, CartItem
from .serializers import CartItemSerializer, CartSerializer
from .ws_broadcast import broadcast_cart_updated


def customer_cart(user):
    cart, _ = Cart.objects.get_or_create(customer=user)
    return cart


class CartDetailView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated, IsCustomerUser]

    def get_object(self):
        try:
            return Cart.objects.prefetch_related('items__product').select_related('promo_code').get(customer=self.request.user)
        except Cart.DoesNotExist:
            cart = Cart.objects.create(customer=self.request.user)
            return Cart.objects.prefetch_related('items__product').select_related('promo_code').get(id=cart.id)


class CartItemCreateView(generics.CreateAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated, IsCustomerUser]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data['product']
        try:
            cart = Cart.objects.select_for_update().get(customer=request.user)
        except Cart.DoesNotExist:
            Cart.objects.create(customer=request.user)
            cart = Cart.objects.select_for_update().get(customer=request.user)
        
        item = CartItem.objects.select_for_update().filter(cart=cart, product=product).first()
        current_qty = item.quantity if item else 0
        qty_to_add = serializer.validated_data.get('quantity', 1)
        new_qty = current_qty + qty_to_add
        
        if product.max_order_quantity and product.max_order_quantity > 0 and new_qty > product.max_order_quantity:
            return Response({'detail': f'You can only order up to {product.max_order_quantity} of this item.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if product.stock_quantity is not None and new_qty > product.stock_quantity:
            return Response({'detail': f'Only {product.stock_quantity} left in stock.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not product.is_in_stock:
            return Response({'detail': 'This product is out of stock.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not item:
            item = CartItem.objects.create(cart=cart, product=product, quantity=qty_to_add)
        else:
            item.quantity = new_qty
            item.save(update_fields=['quantity'])

        # Return the FULL cart so the frontend can update totals in one shot
        cart = Cart.objects.prefetch_related('items__product').select_related('promo_code').get(id=cart.id)
        data = CartSerializer(cart, context=self.get_serializer_context()).data
        broadcast_cart_updated(request.user.id, data)
        return Response(data, status=status.HTTP_201_CREATED)

class CartItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated, IsCustomerUser]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False) or not getattr(self.request, 'user', None) or not self.request.user.is_authenticated:
            return CartItem.objects.none()
        return CartItem.objects.filter(cart__customer=self.request.user).select_related('product')

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        item = self.get_object()
        Cart.objects.select_for_update().get(id=item.cart_id)
        item = CartItem.objects.select_for_update().select_related('product').get(id=item.id)
        serializer = self.get_serializer(item, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        new_qty = serializer.validated_data.get('quantity', item.quantity)
        product = item.product

        if product.max_order_quantity and product.max_order_quantity > 0 and new_qty > product.max_order_quantity:
            return Response({'detail': f'You can only order up to {product.max_order_quantity} of this item.'}, status=status.HTTP_400_BAD_REQUEST)

        if product.stock_quantity is not None and new_qty > product.stock_quantity:
            return Response({'detail': f'Only {product.stock_quantity} left in stock.'}, status=status.HTTP_400_BAD_REQUEST)

        if not product.is_in_stock:
            return Response({'detail': 'This product is out of stock.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()

        # Return the FULL cart so the frontend can update all totals in one round-trip
        cart = Cart.objects.prefetch_related('items__product').select_related('promo_code').get(id=item.cart_id)
        data = CartSerializer(cart, context=self.get_serializer_context()).data
        broadcast_cart_updated(request.user.id, data)
        return Response(data)

    def perform_update(self, serializer):
        # Validation is already done in update(); just save here
        serializer.save()

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        item = self.get_object()
        cart_id = item.cart_id
        Cart.objects.select_for_update().get(id=cart_id)
        item = CartItem.objects.select_for_update().get(id=item.id)
        item.delete()
        # Return the full cart after deletion too
        cart = Cart.objects.prefetch_related('items__product').select_related('promo_code').get(id=cart_id)
        data = CartSerializer(cart, context=self.get_serializer_context()).data
        broadcast_cart_updated(request.user.id, data)
        return Response(data)


from rest_framework.views import APIView
from django.utils import timezone
from offers.models import PromoCode

class ApplyPromoView(APIView):
    permission_classes = [IsAuthenticated, IsCustomerUser]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        code = request.data.get('code', '').strip()
        cart = customer_cart(request.user)
        cart = Cart.objects.select_for_update().get(id=cart.id)
        
        if not code:
            cart.promo_code = None
            cart.save(update_fields=['promo_code'])
            cart = Cart.objects.prefetch_related('items__product').select_related('promo_code').get(id=cart.id)
            return Response(CartSerializer(cart, context={'request': request}).data)

        try:
            promo = PromoCode.objects.get(code__iexact=code, is_active=True)
        except PromoCode.DoesNotExist:
            return Response({'detail': 'Invalid or inactive promo code.'}, status=status.HTTP_400_BAD_REQUEST)

        if promo.expiration_date and promo.expiration_date < timezone.now():
            return Response({'detail': 'This promo code has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check usage limits
        if getattr(promo, 'max_uses_per_user', 0) > 0:
            from offers.models import PromoUsage
            usage_count = PromoUsage.objects.filter(promo_code=promo, user=request.user).count()
            if usage_count >= promo.max_uses_per_user:
                return Response({'detail': f'You have reached the maximum usage limit ({promo.max_uses_per_user}) for this promo code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate minimum order amount and eligible category against cart items
        from cart.serializers import current_price
        from decimal import Decimal
        items = list(cart.items.select_related('product').all())
        if not items:
            return Response({'detail': 'Your cart is empty. Add products before applying a promo code.'}, status=status.HTTP_400_BAD_REQUEST)

        base_total = sum((current_price(item.product) * item.quantity for item in items), Decimal('0.00'))
        if promo.min_order_amount and base_total < promo.min_order_amount:
            shortfall = promo.min_order_amount - base_total
            return Response({'detail': f'This promo code requires a minimum order amount of ₹{promo.min_order_amount}. Add ₹{shortfall:.2f} more to apply.'}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(promo, 'applicable_category') and promo.applicable_category:
            eligible_total = sum((current_price(item.product) * item.quantity for item in items if item.product.category_id == promo.applicable_category_id), Decimal('0.00'))
            if eligible_total == Decimal('0.00'):
                return Response({'detail': f'This promo code is only applicable to products in "{promo.applicable_category.name}".'}, status=status.HTTP_400_BAD_REQUEST)

        cart.promo_code = promo
        cart.save(update_fields=['promo_code'])
        cart = Cart.objects.prefetch_related('items__product').select_related('promo_code').get(id=cart.id)
        data = CartSerializer(cart, context={'request': request}).data
        broadcast_cart_updated(request.user.id, data)
        return Response(data)


class CartClearView(APIView):
    permission_classes = [IsAuthenticated, IsCustomerUser]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        cart = customer_cart(request.user)
        cart = Cart.objects.select_for_update().get(id=cart.id)
        cart.items.all().delete()
        cart.promo_code = None
        cart.save(update_fields=['promo_code'])
        cart = Cart.objects.prefetch_related('items__product').select_related('promo_code').get(id=cart.id)
        data = CartSerializer(cart, context={'request': request}).data
        broadcast_cart_updated(request.user.id, data)
        return Response(data, status=status.HTTP_200_OK)


class CartMergeView(APIView):
    permission_classes = [IsAuthenticated, IsCustomerUser]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        items = request.data.get('items', [])
        if not isinstance(items, list):
            return Response({'detail': 'Items must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        cart = customer_cart(request.user)
        cart = Cart.objects.select_for_update().get(id=cart.id)

        for item in items:
            if not isinstance(item, dict):
                continue
            product_id = item.get('product')
            try:
                qty = int(item.get('quantity', 1))
            except (ValueError, TypeError):
                continue

            if not product_id or qty <= 0:
                continue

            product = Product.objects.select_for_update().filter(id=product_id, is_active=True).first()
            if not product or not product.is_in_stock:
                continue

            if product.stock_quantity is not None and product.stock_quantity <= 0:
                continue

            existing = CartItem.objects.select_for_update().filter(cart=cart, product=product).first()

            if existing:
                existing.quantity = min(existing.quantity + qty, product.stock_quantity or (existing.quantity + qty))
                if product.max_order_quantity and product.max_order_quantity > 0:
                    existing.quantity = min(existing.quantity, product.max_order_quantity)
                existing.save(update_fields=['quantity'])
            else:
                initial_qty = min(qty, product.stock_quantity or qty)
                if product.max_order_quantity and product.max_order_quantity > 0:
                    initial_qty = min(initial_qty, product.max_order_quantity)
                if initial_qty > 0:
                    CartItem.objects.create(cart=cart, product=product, quantity=initial_qty)

        cart = Cart.objects.prefetch_related('items__product').select_related('promo_code').get(id=cart.id)
        data = CartSerializer(cart, context={'request': request}).data
        broadcast_cart_updated(request.user.id, data)
        return Response(data, status=status.HTTP_200_OK)


