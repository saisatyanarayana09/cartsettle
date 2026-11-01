from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from cart.models import Cart, CartItem
from products.models import Product


class CartItemMutationTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='cart-customer',
            password='secure-password',
            is_customer=True,
        )
        self.product = Product.objects.create(
            name='Rice',
            unit='1 kg',
            regular_price=Decimal('100.00'),
            stock_quantity=10,
            max_order_quantity=10,
        )
        self.cart = Cart.objects.create(customer=self.user)
        self.item = CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)
        self.client.force_authenticate(self.user)

    def test_update_returns_the_current_full_cart(self):
        response = self.client.patch(
            f'/api/v1/cart/items/{self.item.id}/',
            {'quantity': 2},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['items'][0]['id'], self.item.id)
        self.assertEqual(response.data['items'][0]['quantity'], 2)

    def test_delete_returns_an_empty_full_cart(self):
        response = self.client.delete(f'/api/v1/cart/items/{self.item.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['items'], [])
