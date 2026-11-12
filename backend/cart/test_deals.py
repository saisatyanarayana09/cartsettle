from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import signing
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cart.models import Cart, CartItem
from cart.pricing import (
    catalog_price,
    clamp_to_deal_range,
    floor_price,
    negotiate_lines,
    sign_deal,
)
from orders.models import Order
from products.models import Category, Product
from store.models import StoreSettings


class DealTestBase(APITestCase):
    def setUp(self):
        cache.clear()
        User = get_user_model()
        self.user = User.objects.create_user(username='9000000001', password='pw', is_customer=True)
        self.other = User.objects.create_user(username='9000000002', password='pw', is_customer=True)
        cat = Category.objects.create(name='Deals')
        # Healthy margin (cost 60 on 100 => floor 68.19) and a thin one (cost 95 on 100 => no room).
        self.fat = Product.objects.create(category=cat, name='Fat Margin Ghee', unit='1 L', regular_price=Decimal('100.00'),
                                          offer_price=Decimal('100.00'), cost_price=Decimal('60.00'), stock_quantity=50, is_in_stock=True)
        self.fat2 = Product.objects.create(category=cat, name='Fat Margin Dahi', unit='400 g', regular_price=Decimal('50.00'),
                                           offer_price=Decimal('50.00'), cost_price=Decimal('30.00'), stock_quantity=50, is_in_stock=True)
        self.thin = Product.objects.create(category=cat, name='Thin Margin Butter', unit='500 g', regular_price=Decimal('100.00'),
                                           offer_price=Decimal('100.00'), cost_price=Decimal('95.00'), stock_quantity=50, is_in_stock=True)
        self.cart = Cart.objects.create(customer=self.user)
        self.i_fat = CartItem.objects.create(cart=self.cart, product=self.fat, quantity=2)
        self.i_fat2 = CartItem.objects.create(cart=self.cart, product=self.fat2, quantity=1)
        self.i_thin = CartItem.objects.create(cart=self.cart, product=self.thin, quantity=1)
        self.client.force_authenticate(self.user)

    def lines(self):
        return [{'product': self.fat, 'quantity': 2}, {'product': self.fat2, 'quantity': 1}, {'product': self.thin, 'quantity': 1}]


class NegotiationRulesTests(DealTestBase):
    def test_floor_protects_twelve_percent_margin(self):
        for p in (self.fat, self.fat2):
            margin = (floor_price(p) - p.cost_price) / floor_price(p)
            self.assertGreaterEqual(margin, Decimal('0.12'))
        # Thin item cannot be discounted at all.
        self.assertEqual(floor_price(self.thin), catalog_price(self.thin))

    def test_bundle_deal_never_goes_below_any_line_floor(self):
        d = negotiate_lines(self.lines(), target_total=1)  # absurd ask
        self.assertEqual(d['status'], 'COUNTER_OFFER')
        by_id = {ln['id']: ln for ln in d['lines']}
        for p in (self.fat, self.fat2, self.thin):
            self.assertGreaterEqual(Decimal(str(by_id[p.id]['deal_unit'])), floor_price(p))
        self.assertAlmostEqual(sum(l['deal_unit'] * l['quantity'] for l in d['lines']), d['deal_total'], places=2)
        self.assertLessEqual(d['deal_total'], d['original_total'])

    def test_reasonable_round_figure_is_approved_exactly(self):
        original = Decimal('350.00')  # 2*100 + 50 + 100
        self.assertEqual(Decimal(str(negotiate_lines(self.lines())['original_total'])), original)
        d = negotiate_lines(self.lines(), target_total=340)
        self.assertEqual(d['status'], 'APPROVED')
        self.assertEqual(d['deal_total'], 340.0)
        self.assertEqual(d['savings'], 10.0)
        # The thin-margin line keeps its catalog price.
        thin_line = next(l for l in d['lines'] if l['id'] == self.thin.id)
        self.assertEqual(thin_line['deal_unit'], 100.0)

    def test_percentage_ask_and_ask_above_price(self):
        d = negotiate_lines(self.lines(), target_pct=2)
        self.assertEqual(d['status'], 'APPROVED')
        self.assertAlmostEqual(d['savings_pct'], 2.0, places=0)
        d = negotiate_lines(self.lines(), target_total=999)
        self.assertEqual(d['status'], 'ALREADY_BEST')
        self.assertEqual(d['deal_total'], d['original_total'])

    def test_only_thin_margin_items_means_no_discount(self):
        d = negotiate_lines([{'product': self.thin, 'quantity': 3}], target_pct=10)
        self.assertEqual(d['status'], 'ALREADY_BEST')

    def test_clamp_pulls_a_too_low_price_up_to_the_floor(self):
        self.assertEqual(clamp_to_deal_range(self.fat, Decimal('1.00')), floor_price(self.fat))
        self.assertEqual(clamp_to_deal_range(self.fat, Decimal('500.00')), catalog_price(self.fat))


class ApplyDealEndpointTests(DealTestBase):
    def offer(self, target_total=340, user_id=None):
        d = negotiate_lines(self.lines(), target_total=target_total)
        d['deal_token'] = sign_deal(d, user_id=self.user.id if user_id is None else user_id)
        return d

    def test_applying_a_deal_changes_cart_prices_and_total(self):
        before = self.client.get('/api/v1/cart/').data
        offer = self.offer()
        res = self.client.post('/api/v1/cart/apply-deal/', {'deal_token': offer['deal_token']}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertLess(Decimal(str(res.data['items_total'])), Decimal(str(before['items_total'])))
        self.assertEqual(Decimal(str(res.data['items_total'])), Decimal('340.00'))
        self.assertTrue(any(i['negotiated'] for i in res.data['items']))

    def test_tampered_or_missing_token_is_rejected(self):
        offer = self.offer()
        bad = offer['deal_token'][:-3] + 'abc'
        self.assertEqual(self.client.post('/api/v1/cart/apply-deal/', {'deal_token': bad}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/v1/cart/apply-deal/', {}, format='json').status_code, 400)

    def test_token_for_another_customer_is_rejected(self):
        offer = self.offer(user_id=self.other.id)
        res = self.client.post('/api/v1/cart/apply-deal/', {'deal_token': offer['deal_token']}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_expired_token_returns_410(self):
        offer = self.offer()
        with mock.patch('cart.pricing.DEAL_HOLD_SECONDS', -1):
            res = self.client.post('/api/v1/cart/apply-deal/', {'deal_token': offer['deal_token']}, format='json')
        self.assertEqual(res.status_code, status.HTTP_410_GONE)

    def test_expired_hold_reverts_to_catalog_price(self):
        offer = self.offer()
        self.client.post('/api/v1/cart/apply-deal/', {'deal_token': offer['deal_token']}, format='json')
        CartItem.objects.filter(cart=self.cart).update(negotiated_until=timezone.now() - timedelta(seconds=1))
        data = self.client.get('/api/v1/cart/').data
        self.assertEqual(Decimal(str(data['items_total'])), Decimal('350.00'))
        self.assertFalse(any(i['negotiated'] for i in data['items']))


class DealHonouredAtCheckoutTests(DealTestBase):
    def test_order_uses_the_negotiated_price(self):
        s = StoreSettings.load()
        s.is_emergency_paused = False
        s.auto_cutoff_orders = False
        s.save()
        offer = negotiate_lines(self.lines(), target_total=340)
        token = sign_deal(offer, user_id=self.user.id)
        self.assertEqual(self.client.post('/api/v1/cart/apply-deal/', {'deal_token': token}, format='json').status_code, 200)

        res = self.client.post('/api/v1/orders/', {
            'order_type': 'PICKUP', 'payment_method': 'COD',
            'delivery_slot_date': '2026-09-06', 'delivery_slot_label': '2:00 PM - 4:00 PM',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        order = Order.objects.get(id=res.data['id'])
        items_sum = sum((i.price_snapshot * i.quantity for i in order.items.all()), Decimal('0'))
        self.assertEqual(items_sum, Decimal('340.00'))
        self.assertEqual(sum((i.subtotal for i in order.items.all()), Decimal('0')), Decimal('340.00'))
