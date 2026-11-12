from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from store.models import StoreSettings

User = get_user_model()

class StoreThemeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='owner_test',
            password='Password123!',
            is_owner=True
        )
        self.customer = User.objects.create_user(
            username='customer_test',
            password='Password123!',
            is_customer=True
        )
        # Ensure initial settings exist
        self.settings = StoreSettings.load()

    def test_public_settings_unauthenticated(self):
        """Unauthenticated customer can retrieve public store settings including all theme fields."""
        response = self.client.get('/api/v1/store/public-settings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify all theme fields are present
        self.assertIn('brand_theme_preset', data)
        self.assertIn('palette_mode', data)
        self.assertIn('custom_primary_color', data)
        self.assertIn('custom_secondary_color', data)
        self.assertIn('custom_accent_color', data)
        self.assertIn('custom_canvas_color', data)
        self.assertIn('custom_text_color', data)
        self.assertIn('apply_theme_to_owner_app', data)
        self.assertIn('store_name', data)

    def test_settings_unauthenticated_get(self):
        """Unauthenticated user can read /store/settings/."""
        response = self.client.get('/api/v1/store/settings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('brand_theme_preset', data)
        self.assertIn('palette_mode', data)

    def test_patch_settings_permissions(self):
        """Only owner can patch store settings."""
        # Unauthenticated patch
        res = self.client.patch('/api/v1/store/settings/', {'brand_theme_preset': 'emerald'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer patch
        self.client.force_authenticate(user=self.customer)
        res = self.client.patch('/api/v1/store/settings/', {'brand_theme_preset': 'emerald'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_theme_update_and_cache_invalidation(self):
        """Owner patches theme and verifies both /settings/ and /public-settings/ reflect immediately."""
        self.client.force_authenticate(user=self.owner)
        payload = {
            'brand_theme_preset': 'custom',
            'palette_mode': 4,
            'custom_primary_color': '#e11d48',
            'custom_secondary_color': '#7c3aed',
            'custom_accent_color': '#f59e0b',
            'custom_canvas_color': '#f8fafc',
            'custom_text_color': '#0f172a',
            'apply_theme_to_owner_app': True,
        }
        res = self.client.patch('/api/v1/store/settings/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['brand_theme_preset'], 'custom')
        self.assertEqual(data['palette_mode'], 4)
        self.assertEqual(data['custom_primary_color'], '#e11d48')
        self.assertEqual(data['custom_secondary_color'], '#7c3aed')
        self.assertEqual(data['custom_accent_color'], '#f59e0b')
        self.assertEqual(data['custom_canvas_color'], '#f8fafc')
        self.assertEqual(data['custom_text_color'], '#0f172a')
        self.assertTrue(data['apply_theme_to_owner_app'])

        # Now test unauthenticated /public-settings/ immediately gets updated data (not stale cache)
        self.client.force_authenticate(user=None)
        pub_res = self.client.get('/api/v1/store/public-settings/')
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        pub_data = pub_res.json()
        self.assertEqual(pub_data['brand_theme_preset'], 'custom')
        self.assertEqual(pub_data['palette_mode'], 4)
        self.assertEqual(pub_data['custom_primary_color'], '#e11d48')
        self.assertEqual(pub_data['custom_secondary_color'], '#7c3aed')
        self.assertEqual(pub_data['custom_accent_color'], '#f59e0b')
        self.assertEqual(pub_data['custom_canvas_color'], '#f8fafc')
        self.assertEqual(pub_data['custom_text_color'], '#0f172a')
        self.assertTrue(pub_data['apply_theme_to_owner_app'])

    def test_theme_presets_and_color_sanitization(self):
        """Owner patches preset theme and hex strings without leading #."""
        self.client.force_authenticate(user=self.owner)
        payload = {
            'brand_theme_preset': 'warm_sun',
            'palette_mode': 3,
            'custom_primary_color': 'f59e0b',  # without #
            'apply_theme_to_owner_app': 'true',  # string boolean
        }
        res = self.client.patch('/api/v1/store/settings/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['brand_theme_preset'], 'warm_sun')
        self.assertEqual(data['palette_mode'], 3)
        self.assertEqual(data['custom_primary_color'], '#f59e0b')
        self.assertTrue(data['apply_theme_to_owner_app'])


class AgentFastPathTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='owner_agent_test',
            password='Password123!',
            is_owner=True
        )
        self.customer = User.objects.create_user(
            username='customer_agent_test',
            first_name='Rahul',
            last_name='Sharma',
            email='rahul@cartsettle.shop',
            password='Password123!',
            is_customer=True
        )
        from orders.models import Order
        from decimal import Decimal
        # Create test orders
        self.o1 = Order.objects.create(
            id='ORD2026TEST01',
            customer=self.customer,
            status='ACCEPTED',
            total_amount=Decimal('45.00'),
            authorized_amount=Decimal('45.00'),
            captured_amount=Decimal('45.00')
        )
        self.o2 = Order.objects.create(
            id='ORD2026TEST02',
            customer=self.customer,
            status='READY',
            total_amount=Decimal('85.50'),
            authorized_amount=Decimal('85.50'),
            captured_amount=Decimal('85.50')
        )
        self.o3 = Order.objects.create(
            id='ORD2026TEST03',
            customer=self.customer,
            status='DELIVERED',
            total_amount=Decimal('120.00'),
            authorized_amount=Decimal('120.00'),
            captured_amount=Decimal('120.00')
        )

    def test_multi_order_fast_path(self):
        """Dynamic multi-order ledger returned when asking for last 3 orders."""
        res = self.client.post('/api/v1/store/agent/chat/', {
            'prompt': 'show last 3 orders',
            'persona': 'owner',
            'session_id': 'test_owner_multi_orders'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        actions = data.get('actions', [])
        action_types = [a.get('type') for a in actions]
        self.assertIn('ORDERS_LIST_CARD', action_types)
        orders_card = next(a for a in actions if a.get('type') == 'ORDERS_LIST_CARD')
        self.assertGreaterEqual(len(orders_card.get('orders', [])), 1)

    def test_top_customers_fast_path(self):
        """Top customers leaderboard returned when asking for highest buying customers."""
        res = self.client.post('/api/v1/store/agent/chat/', {
            'prompt': 'highest buying customers',
            'persona': 'owner',
            'session_id': 'test_owner_top_cust'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        actions = data.get('actions', [])
        action_types = [a.get('type') for a in actions]
        self.assertIn('TOP_CUSTOMERS_CARD', action_types)
        top_card = next(a for a in actions if a.get('type') == 'TOP_CUSTOMERS_CARD')
        self.assertGreaterEqual(len(top_card.get('customers', [])), 1)

    def test_customer_profile_fast_path(self):
        """In-depth customer profile dossier returned when asking for customer details."""
        res = self.client.post('/api/v1/store/agent/chat/', {
            'prompt': 'customer details Rahul',
            'persona': 'owner',
            'session_id': 'test_owner_profile'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        actions = data.get('actions', [])
        action_types = [a.get('type') for a in actions]
        self.assertIn('CUSTOMER_PROFILE_CARD', action_types)
        prof_card = next(a for a in actions if a.get('type') == 'CUSTOMER_PROFILE_CARD')
        self.assertEqual(prof_card.get('customer', {}).get('name'), 'Rahul Sharma')

    def test_wallet_credit_fast_path(self):
        """Dynamic wallet crediting updates balance and returns confirmation."""
        res = self.client.post('/api/v1/store/agent/chat/', {
            'prompt': 'credit $10 to customer Rahul',
            'persona': 'owner',
            'session_id': 'test_owner_credit'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        actions = data.get('actions', [])
        action_types = [a.get('type') for a in actions]
        self.assertIn('CUSTOMER_PROFILE_CARD', action_types)
        from accounts.models import Wallet
        w = Wallet.objects.get(user=self.customer)
        self.assertGreaterEqual(float(w.balance), 10.0)

    def test_shopper_account_dossier_fast_path(self):
        """Shopper account dossier returned when asking my account."""
        res = self.client.post('/api/v1/store/agent/chat/', {
            'prompt': 'my account',
            'persona': 'shopper',
            'session_id': 'test_shopper_account'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        actions = data.get('actions', [])
        action_types = [a.get('type') for a in actions]
        self.assertIn('CUSTOMER_PROFILE_CARD', action_types)

