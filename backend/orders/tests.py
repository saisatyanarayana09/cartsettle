from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from store.models import StoreSettings
from store.serializers import StoreSettingsSerializer
from products.models import Category, Product
from cart.models import Cart, CartItem
from accounts.models import Wallet, WalletTransaction
from orders.models import Order
from orders.serializers import OrderSerializer, CheckoutSerializer
from orders.views import OrderViewSet

User = get_user_model()


class StoreSettingsAndOrderFeaturesTest(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username='9876543210',
            email='customer@example.com',
            first_name='John',
            last_name='Doe',
            is_customer=True,
            is_owner=False
        )
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            first_name='Owner',
            last_name='Kirana',
            is_customer=False,
            is_owner=True
        )
        self.category = Category.objects.create(name="Groceries")
        self.product = Product.objects.create(
            category=self.category,
            name="Basmati Rice",
            unit="1 kg",
            regular_price=Decimal("100.00"),
            offer_price=Decimal("90.00"),
            stock_quantity=50,
            is_in_stock=True
        )
        self.cart = Cart.objects.create(customer=self.user)
        self.cart_item = CartItem.objects.create(cart=self.cart, product=self.product, quantity=2)

    def test_store_settings_all_fields_exist(self):
        settings = StoreSettings.load()
        # UPI
        self.assertEqual(settings.upi_id, "")
        self.assertEqual(settings.upi_payee_name, "Narendra Kirana")
        self.assertTrue(settings.enable_dynamic_upi_qr)
        # Compliance
        self.assertEqual(settings.fssai_license_number, "")
        self.assertEqual(settings.gstin, "")
        self.assertTrue(settings.enable_itemized_tax_invoice)
        self.assertIn("Goods once sold", settings.invoice_terms_and_conditions)
        # Store Timings & Emergency Pause
        self.assertEqual(settings.store_timings_json, {})
        self.assertTrue(settings.auto_cutoff_orders)
        self.assertFalse(settings.is_emergency_paused)
        self.assertIn("high order volume", settings.emergency_pause_message)
        # Delivery & Pickup Time Slots
        self.assertTrue(settings.enable_time_slots)
        self.assertEqual(settings.preparation_buffer_minutes, 30)
        self.assertEqual(settings.max_orders_per_slot, 15)
        self.assertEqual(settings.time_slots_json, [])
        # WhatsApp Support
        self.assertTrue(settings.enable_whatsapp_support)
        self.assertEqual(settings.whatsapp_number, "+919876543210")
        # Loyalty Wallet & Referral Rules
        self.assertEqual(settings.referral_bonus_referrer, Decimal("50.00"))
        self.assertEqual(settings.referral_bonus_referee, Decimal("50.00"))
        self.assertEqual(settings.referral_min_order_amount, Decimal("200.00"))
        self.assertEqual(settings.max_wallet_usage_percentage, 50)
        self.assertEqual(settings.order_cashback_percentage, Decimal("2.00"))
        # Announcement & Festive Popup
        self.assertTrue(settings.enable_announcement_bar)
        self.assertFalse(settings.enable_festive_popup)
        # Mobile Version & Maintenance
        self.assertEqual(settings.min_mobile_version, "1.0.0")
        self.assertEqual(settings.latest_mobile_version, "1.0.0")
        self.assertFalse(settings.is_maintenance_mode)

    def test_store_settings_serializer_image_sanitization(self):
        serializer = StoreSettingsSerializer()
        data = {
            'store_name': 'Test Store',
            'upi_qr_image': 'http://example.com/media/upi_qr/old.jpg',
            'festive_popup_image': None,
            'invoice_signature': 'http://example.com/media/signatures/sig.png',
        }
        cleaned = serializer.to_internal_value(data)
        self.assertNotIn('upi_qr_image', cleaned)
        self.assertNotIn('festive_popup_image', cleaned)
        self.assertNotIn('invoice_signature', cleaned)

    def test_order_model_and_serializers_have_new_fields(self):
        order = Order.objects.create(
            customer=self.user,
            total_amount=Decimal("180.00"),
            delivery_slot_date=date(2026, 9, 5),
            delivery_slot_label="10:00 AM - 12:00 PM",
            payment_method="UPI",
            upi_transaction_id="UPI1234567890"
        )
        self.assertEqual(order.delivery_slot_label, "10:00 AM - 12:00 PM")
        self.assertEqual(order.payment_method, "UPI")
        self.assertEqual(order.upi_transaction_id, "UPI1234567890")

        serializer = OrderSerializer(order)
        for f in ['delivery_slot_date', 'delivery_slot_label', 'payment_method', 'upi_transaction_id']:
            self.assertIn(f, serializer.data)
            self.assertIn(f, OrderSerializer.Meta.read_only_fields)

        checkout_s = CheckoutSerializer(data={
            'delivery_slot_date': '2026-09-05',
            'delivery_slot_label': '10:00 AM - 12:00 PM',
            'payment_method': 'UPI',
            'upi_transaction_id': 'UPI1234567890'
        })
        self.assertTrue(checkout_s.is_valid(), checkout_s.errors)

    def test_emergency_pause_blocks_order_creation(self):
        settings = StoreSettings.load()
        settings.is_emergency_paused = True
        settings.emergency_pause_message = "Currently overloaded. Back in 30 mins!"
        settings.save()

        view = OrderViewSet.as_view({'post': 'create'})
        request = self.factory.post('/api/orders/', {'order_type': 'PICKUP'}, format='json')
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("Currently overloaded", response.data['detail'])

    def test_store_timings_cutoff_blocks_when_closed(self):
        settings = StoreSettings.load()
        settings.is_emergency_paused = False
        settings.auto_cutoff_orders = True
        # Set today as closed
        now = timezone.localtime(timezone.now())
        day_name = now.strftime('%A').lower()
        settings.store_timings_json = {
            day_name: {"is_open": False}
        }
        settings.save()

        view = OrderViewSet.as_view({'post': 'create'})
        request = self.factory.post('/api/orders/', {'order_type': 'PICKUP'}, format='json')
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("closed", response.data['detail'].lower())

    def test_max_wallet_usage_percentage_cap(self):
        settings = StoreSettings.load()
        settings.is_emergency_paused = False
        settings.auto_cutoff_orders = False
        settings.max_wallet_usage_percentage = 40  # 40% cap
        settings.save()

        # 2 items * 90 = 180 total
        wallet = Wallet.objects.create(user=self.user, balance=Decimal("150.00"))

        view = OrderViewSet.as_view({'post': 'create'})
        request = self.factory.post('/api/orders/', {
            'order_type': 'PICKUP',
            'use_wallet': True,
            'delivery_slot_date': '2026-09-06',
            'delivery_slot_label': '2:00 PM - 4:00 PM',
            'payment_method': 'COD'
        }, format='json')
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 201)
        created_order = Order.objects.get(id=response.data['id'])
        # 40% of 180 = 72.00 max wallet usage
        self.assertEqual(created_order.wallet_discount, Decimal("72.00"))
        self.assertEqual(created_order.total_amount, Decimal("108.00"))
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal("78.00"))
        self.assertEqual(created_order.delivery_slot_label, "2:00 PM - 4:00 PM")

    def test_cashback_credited_on_completed_status(self):
        settings = StoreSettings.load()
        settings.order_cashback_percentage = Decimal("5.00")  # 5%
        settings.save()

        wallet = Wallet.objects.create(user=self.user, balance=Decimal("10.00"))
        order = Order.objects.create(
            customer=self.user,
            total_amount=Decimal("200.00"),
            status=Order.Status.READY
        )

        view = OrderViewSet.as_view({'patch': 'status'})
        request = self.factory.patch(f'/api/orders/{order.id}/status/', {'status': Order.Status.COMPLETED}, format='json')
        force_authenticate(request, user=self.owner)
        response = view(request, pk=order.id)

        self.assertEqual(response.status_code, 200)
        wallet.refresh_from_db()
        # 5% of 200 = 10.00 cashback; 10 + 10 = 20.00
        self.assertEqual(wallet.balance, Decimal("20.00"))
        tx = WalletTransaction.objects.filter(wallet=wallet, transaction_type='PURCHASE_CASHBACK').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal("10.00"))

    def test_invoice_templates_render_fssai_gstin_and_terms(self):
        settings = StoreSettings.load()
        settings.fssai_license_number = "12345678901234"
        settings.gstin = "29ABCDE1234F1Z5"
        settings.invoice_terms_and_conditions = "Custom terms line 1.\nCustom terms line 2."
        settings.save()

        order = Order.objects.create(
            customer=self.user,
            total_amount=Decimal("180.00"),
            status=Order.Status.COMPLETED
        )

        pdf_html = render_to_string('store/invoice_pdf.html', {
            'order': order,
            'items': [],
            'subtotal': Decimal("180.00"),
            'discount_applied': Decimal("0.00"),
            'settings': settings,
            'store_settings': settings,
        })
        self.assertIn("12345678901234", pdf_html)
        self.assertIn("29ABCDE1234F1Z5", pdf_html)
        self.assertIn("Custom terms line 1.", pdf_html)

        email_html = render_to_string('store/invoice_email.html', {
            'order': order,
            'items': [],
            'subtotal': Decimal("180.00"),
            'discount_applied': Decimal("0.00"),
            'settings': settings,
            'store_settings': settings,
            'invoice_link': 'http://localhost:5173/orders/test/invoice',
        })
        self.assertIn("12345678901234", email_html)
        self.assertIn("29ABCDE1234F1Z5", email_html)
        self.assertIn("Custom terms line 1.", email_html)

    def test_order_invoice_action(self):
        settings = StoreSettings.load()
        settings.fssai_license_number = "12345678901234"
        settings.gstin = "29ABCDE1234F1Z5"
        settings.invoice_terms_and_conditions = "Official terms line."
        settings.save()

        order = Order.objects.create(
            customer=self.user,
            total_amount=Decimal("250.00"),
            payment_method="UPI",
            upi_transaction_id="UPI98765",
            status=Order.Status.COMPLETED
        )

        view = OrderViewSet.as_view({'get': 'invoice'})
        
        # 1. Owner can access JSON response
        req = self.factory.get(f'/api/orders/{order.id}/invoice/')
        force_authenticate(req, user=self.owner)
        resp = view(req, pk=order.id)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('html', resp.data)
        self.assertIn('invoice_number', resp.data)
        self.assertIn('TAX INVOICE', resp.data['html'])
        self.assertIn('12345678901234', resp.data['html'])
        self.assertIn('29ABCDE1234F1Z5', resp.data['html'])

        # 2. HTML format query param returns raw HTML
        req_html = self.factory.get(f'/api/orders/{order.id}/invoice/?html=1')
        force_authenticate(req_html, user=self.owner)
        resp_html = view(req_html, pk=order.id)
        self.assertEqual(resp_html.status_code, 200)
        self.assertIn('text/html', resp_html['Content-Type'])
        self.assertIn(b'TAX INVOICE', resp_html.content)

        # 3. Order customer can access
        req_cust = self.factory.get(f'/api/orders/{order.id}/invoice/')
        force_authenticate(req_cust, user=self.user)
        resp_cust = view(req_cust, pk=order.id)
        self.assertEqual(resp_cust.status_code, 200)

        # 4. Another unrelated customer gets 404 or 403
        other_user = User.objects.create_user(username='other_customer', password='password123', email='other@example.com')
        req_other = self.factory.get(f'/api/orders/{order.id}/invoice/')
        force_authenticate(req_other, user=other_user)
        resp_other = view(req_other, pk=order.id)
        self.assertIn(resp_other.status_code, [403, 404])

    def test_delivery_otp_brute_force_lockout(self):
        from orders.delivery_views import DeliveryVerifyAndCompleteView
        from django.core.cache import cache

        rider = User.objects.create_user(
            username='rider_test',
            password='password123',
            email='rider_test@example.com',
            is_delivery_partner=True
        )
        order = Order.objects.create(
            customer=self.user,
            delivery_partner=rider,
            total_amount=Decimal("150.00"),
            order_type="DELIVERY",
            delivery_otp="9876",
            status=Order.Status.OUT_FOR_DELIVERY
        )
        cache.delete(f"delivery_otp_attempts:{order.id}")
        view = DeliveryVerifyAndCompleteView.as_view()

        # 5 wrong attempts return 400
        for _ in range(5):
            req = self.factory.post(f'/api/v1/delivery/orders/{order.id}/complete/', {'otp': '0000'}, format='json')
            force_authenticate(req, user=rider)
            resp = view(req, pk=order.id)
            self.assertEqual(resp.status_code, 400)

        # 6th attempt even with right or wrong OTP is locked out with 429
        req_locked = self.factory.post(f'/api/v1/delivery/orders/{order.id}/complete/', {'otp': '9876'}, format='json')
        force_authenticate(req_locked, user=rider)
        resp_locked = view(req_locked, pk=order.id)
        self.assertEqual(resp_locked.status_code, 429)

    def test_reject_item_with_wallet_discount_records_refund_transaction(self):
        from orders.models import OrderItem
        wallet = Wallet.objects.create(user=self.user, balance=Decimal("50.00"))
        order = Order.objects.create(
            customer=self.user,
            total_amount=Decimal("130.00"),
            wallet_discount=Decimal("50.00"),
            status=Order.Status.NEW
        )
        item1 = OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name_snapshot=self.product.name,
            unit_snapshot="1 kg",
            price_snapshot=Decimal("90.00"),
            quantity=1,
            subtotal=Decimal("90.00")
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name_snapshot="Second Item",
            unit_snapshot="1 kg",
            price_snapshot=Decimal("90.00"),
            quantity=1,
            subtotal=Decimal("90.00")
        )
        view = OrderViewSet.as_view({'post': 'reject_item'})
        req = self.factory.post(f'/api/orders/{order.id}/reject_item/', {'item_id': item1.id}, format='json')
        force_authenticate(req, user=self.owner)
        resp = view(req, pk=order.id)
        self.assertEqual(resp.status_code, 200)
        wallet.refresh_from_db()
        # 50% of 50.00 wallet discount = 25.00 refunded to wallet
        self.assertEqual(wallet.balance, Decimal("75.00"))
        tx = WalletTransaction.objects.filter(
            wallet=wallet,
            transaction_type=WalletTransaction.TransactionType.REFUND
        ).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal("25.00"))

    def test_referral_approve_creates_wallet_if_referrer_has_no_wallet(self):
        from offers.models import Referral, ReferralSettings
        from offers.views import ReferralHistoryViewSet
        referrer = User.objects.create_user(
            username='referrer_no_wallet',
            password='password123',
            email='referrer_nw@example.com'
        )
        referred = User.objects.create_user(
            username='referred_user_test',
            password='password123',
            email='referred_nw@example.com'
        )
        # Ensure referrer has no Wallet row initially
        Wallet.objects.filter(user=referrer).delete()
        ref_settings = ReferralSettings.load()
        ref_settings.referrer_reward = Decimal("40.00")
        ref_settings.save()
        referral = Referral.objects.create(
            referrer=referrer,
            referred_user=referred,
            status=Referral.Status.AWAITING_APPROVAL
        )
        view = ReferralHistoryViewSet.as_view({'post': 'approve'})
        req = self.factory.post(f'/api/offers/referrals/{referral.id}/approve/', format='json')
        force_authenticate(req, user=self.owner)
        resp = view(req, pk=referral.id)
        self.assertEqual(resp.status_code, 200)
        referrer_wallet = Wallet.objects.get(user=referrer)
        self.assertEqual(referrer_wallet.balance, Decimal("40.00"))

    def test_homepage_section_set_products_action(self):
        from store.models import HomepageSection
        from store.views import HomepageSectionViewSet
        section = HomepageSection.objects.create(title="Featured Deals", display_order=0, is_active=True)
        view = HomepageSectionViewSet.as_view({'post': 'set_products'})
        req = self.factory.post(
            f'/api/v1/store/homepage-sections/{section.id}/set-products/',
            {'products': [{'product_id': self.product.id, 'position': 0}]},
            format='json'
        )
        force_authenticate(req, user=self.owner)
        resp = view(req, pk=section.id)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(section.section_products.count(), 1)
        self.assertEqual(section.section_products.first().product_id, self.product.id)

    def test_openapi_schema_generation_succeeds_without_errors(self):
        from drf_spectacular.generators import SchemaGenerator
        generator = SchemaGenerator()
        schema = generator.get_schema(request=None, public=True)
        self.assertIsNotNone(schema)
        self.assertIn('paths', schema)

    def test_store_email_settings_preserves_password_with_masked_bullets(self):
        from store.views import StoreEmailSettingsView
        from store.models import StoreEmailSettings

        view = StoreEmailSettingsView.as_view()
        req1 = self.factory.patch(
            '/api/v1/store/email-settings/',
            {'sender_email': 'store@example.com', 'app_password': 'abcd efgh ijkl mnop', 'is_active': True},
            format='json'
        )
        force_authenticate(req1, user=self.owner)
        resp1 = view(req1)
        self.assertEqual(resp1.status_code, 200)
        self.assertTrue(resp1.data['has_password'])
        self.assertEqual(resp1.data['masked_password'], '••••••••••••••••')

        # Subsequent PATCH with masked bullets must preserve the stored password
        req2 = self.factory.patch(
            '/api/v1/store/email-settings/',
            {'sender_email': 'store@example.com', 'app_password': resp1.data['masked_password'], 'sender_name': 'Updated Name'},
            format='json'
        )
        force_authenticate(req2, user=self.owner)
        resp2 = view(req2)
        self.assertEqual(resp2.status_code, 200)
        self.assertTrue(resp2.data['has_password'])
        cfg = StoreEmailSettings.load()
        self.assertEqual(cfg.get_decrypted_password(), 'abcd efgh ijkl mnop')

    def test_owner_domain_origin_returns_all_store_orders(self):
        Order.objects.create(
            customer=self.user,
            total_amount=Decimal("180.00"),
            payment_method="COD",
            status=Order.Status.NEW
        )
        view = OrderViewSet.as_view({'get': 'list'})
        req = self.factory.get('/api/v1/orders/', HTTP_ORIGIN='https://narendra-kirana-owner.vercel.app')
        force_authenticate(req, user=self.owner)
        resp = view(req)
        self.assertEqual(resp.status_code, 200)
        results = resp.data.get('results', resp.data)
        self.assertGreaterEqual(len(results), 1)

    def test_vision_lookup_returns_expected_success_and_product_structure(self):
        from products.views import ProductViewSet
        from django.core.files.uploadedfile import SimpleUploadedFile

        view = ProductViewSet.as_view({'post': 'vision_lookup'})
        img_file = SimpleUploadedFile('aashirvaad_atta.jpg', b'fake-image-bytes', content_type='image/jpeg')
        req = self.factory.post('/api/v1/products/vision_lookup/', {'image': img_file}, format='multipart')
        force_authenticate(req, user=self.owner)
        resp = view(req)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data.get('success'))
        self.assertIn('product', resp.data)
        self.assertEqual(resp.data['product']['name'], 'Aashirvaad Atta')

    def test_agent_management_filters_deactivated_and_exposes_phone_and_is_staff(self):
        from accounts.views import AgentManagementView

        view = AgentManagementView.as_view()
        req_add = self.factory.post(
            '/api/v1/auth/agents/',
            {'first_name': 'Ravi', 'last_name': 'Kumar', 'email': 'ravi.agent@example.com', 'phone_number': '9876543210', 'role': 'delivery'},
            format='json'
        )
        force_authenticate(req_add, user=self.owner)
        resp_add = view(req_add)
        self.assertEqual(resp_add.status_code, 201)
        agent_id = resp_add.data['id']
        self.assertEqual(resp_add.data['phone_number'], '9876543210')
        self.assertIn('is_staff', resp_add.data)

        # Deactivate agent
        req_del = self.factory.delete(f'/api/v1/auth/agents/{agent_id}/')
        force_authenticate(req_del, user=self.owner)
        resp_del = view(req_del, user_id=agent_id)
        self.assertEqual(resp_del.status_code, 200)

        # Verify deactivated agent is excluded from GET /auth/agents/
        req_list = self.factory.get('/api/v1/auth/agents/')
        force_authenticate(req_list, user=self.owner)
        resp_list = view(req_list)
        self.assertEqual(resp_list.status_code, 200)
        ids = [a['id'] for a in resp_list.data]
        self.assertNotIn(agent_id, ids)

        # Re-adding the same email reactivates the agent cleanly
        req_readd = self.factory.post(
            '/api/v1/auth/agents/',
            {'first_name': 'Ravi', 'last_name': 'Kumar', 'email': 'ravi.agent@example.com', 'phone_number': '9876543210', 'role': 'delivery'},
            format='json'
        )
        force_authenticate(req_readd, user=self.owner)
        resp_readd = view(req_readd)
        self.assertEqual(resp_readd.status_code, 201)
        self.assertEqual(resp_readd.data['id'], agent_id)


