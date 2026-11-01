from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from offers.models import ReferralSettings
from notifications.models import Notification
from store.models import StoreEmailSettings
from store.email_service import test_smtp_connection


class SecondPassSecurityAuditTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='owner_sec',
            email='owner_sec@example.com',
            password='Password123!',
            is_owner=True,
            is_staff=True,
            is_active=True,
        )
        self.customer = User.objects.create_user(
            username='cust_sec',
            email='cust_sec@example.com',
            password='Password123!',
            is_customer=True,
            is_active=True,
        )

    def test_sk07_referral_settings_write_blocked_for_customers(self):
        """SK-07: Customers can read ReferralSettings but cannot modify reward amounts."""
        self.client.force_authenticate(user=self.customer)
        get_res = self.client.get('/api/v1/offers/referral-settings/')
        self.assertEqual(get_res.status_code, 200)

        patch_res = self.client.patch(
            '/api/v1/offers/referral-settings/',
            {'is_active': True, 'referee_reward': '999999.00'},
            format='json',
        )
        self.assertEqual(patch_res.status_code, 403)
        self.assertEqual(ReferralSettings.load().referee_reward, Decimal('50.00'))

        self.client.force_authenticate(user=self.owner)
        owner_res = self.client.patch(
            '/api/v1/offers/referral-settings/',
            {'referee_reward': '75.00'},
            format='json',
        )
        self.assertEqual(owner_res.status_code, 200)
        self.assertEqual(ReferralSettings.load().referee_reward, Decimal('75.00'))

    @patch('accounts.views._verify_google_credential')
    def test_sk09_locked_or_inactive_owner_blocked_on_google_login(self, mock_verify):
        """SK-09: Locked or deactivated owner cannot obtain JWT via GoogleOwnerLoginView."""
        mock_verify.return_value = {
            'email': 'owner_sec@example.com',
            'first_name': 'Owner',
            'last_name': 'Sec',
            'picture': '',
        }
        self.owner.is_locked = True
        self.owner.save(update_fields=['is_locked'])

        res = self.client.post(
            '/api/v1/auth/google-login/',
            {'credential': 'fake-google-token'},
            format='json',
        )
        self.assertEqual(res.status_code, 403)

    def test_sk10_smtp_password_not_leaked_to_overridden_host(self):
        """SK-10: Saved SMTP app password is not sent when smtp_host is overridden without a new password."""
        cfg = StoreEmailSettings.load()
        cfg.sender_email = 'store@gmail.com'
        cfg.smtp_host = 'smtp.gmail.com'
        cfg.set_app_password('abcd efgh ijkl mnop')
        cfg.save()

        ok, msg = test_smtp_connection(
            'test@example.com',
            config_override={
                'sender_email': 'store@gmail.com',
                'smtp_host': 'attacker.example.com',
                'smtp_port': 587,
                'app_password': '',
            },
        )
        self.assertFalse(ok)
        self.assertIn('App Password', msg)

    def test_sk11_agent_delete_prevents_self_deactivation_and_notification_hijack(self):
        """SK-11: Owner cannot deactivate their own account; customer cannot reassign notification user."""
        self.client.force_authenticate(user=self.owner)
        res = self.client.delete(f'/api/v1/auth/agents/{self.owner.id}/')
        self.assertEqual(res.status_code, 400)
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.is_active)

        notif = Notification.objects.create(
            user=self.customer,
            title='Hello',
            message='World',
        )
        self.client.force_authenticate(user=self.customer)
        patch_res = self.client.patch(
            f'/api/v1/notifications/{notif.id}/',
            {'user': self.owner.id, 'is_read': True},
            format='json',
        )
        self.assertEqual(patch_res.status_code, 200)
        notif.refresh_from_db()
        self.assertEqual(notif.user_id, self.customer.id)

    def test_sk12_barcode_lookup_rejects_invalid_characters(self):
        """SK-12: barcode_lookup rejects path traversal or malformed barcode strings."""
        self.client.force_authenticate(user=self.customer)
        res = self.client.get('/api/v1/products/barcode_lookup/?barcode=../../etc/passwd')
        self.assertEqual(res.status_code, 400)

    def test_sk15_api_dashboard_data_view_requires_staff_or_owner(self):
        """SK-15: APIDashboardDataView rejects anonymous/customer requests and allows owner/staff."""
        from django.test import RequestFactory
        from store.dashboard_views import APIDashboardDataView

        rf = RequestFactory()
        req_customer = rf.get('/admin/dashboard-data/')
        req_customer.user = self.customer
        resp_customer = APIDashboardDataView.as_view()(req_customer)
        self.assertEqual(resp_customer.status_code, 403)

        req_owner = rf.get('/admin/dashboard-data/')
        req_owner.user = self.owner
        resp_owner = APIDashboardDataView.as_view()(req_owner)
        self.assertEqual(resp_owner.status_code, 200)
