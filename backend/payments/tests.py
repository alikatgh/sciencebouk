import json
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def get_jwt_header(user):
    """Return an Authorization header dict for the given user."""
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {str(refresh.access_token)}'}


class CheckoutAuthTest(TestCase):
    """checkout endpoint requires authentication."""

    def test_checkout_requires_auth(self):
        client = APIClient()
        response = client.post('/api/payments/checkout/')
        self.assertEqual(response.status_code, 401)

    def test_checkout_authenticated_without_stripe_key_returns_503(self):
        user = User.objects.create_user(username='alice', password='pass', email='alice@test.com')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(user).access_token))
        with self.settings(STRIPE_SECRET_KEY=''):
            response = client.post('/api/payments/checkout/')
        self.assertEqual(response.status_code, 503)


class PortalAuthTest(TestCase):
    """portal endpoint requires authentication."""

    def test_portal_requires_auth(self):
        client = APIClient()
        response = client.post('/api/payments/portal/')
        self.assertEqual(response.status_code, 401)

    def test_portal_authenticated_without_customer_id_returns_400(self):
        user = User.objects.create_user(username='bob', password='pass', email='bob@test.com')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(user).access_token))
        # Profile has no stripe_customer_id by default
        response = client.post('/api/payments/portal/')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'No billing account')


class SubscriptionStatusTest(TestCase):
    """status endpoint returns tier information for authenticated users."""

    def test_status_requires_auth(self):
        client = APIClient()
        response = client.get('/api/payments/status/')
        self.assertEqual(response.status_code, 401)

    def test_status_returns_tier_for_free_user(self):
        user = User.objects.create_user(username='carol', password='pass', email='carol@test.com')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(user).access_token))
        response = client.get('/api/payments/status/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['tier'], 'free')
        self.assertFalse(response.data['is_pro'])

    def test_status_returns_pro_for_pro_user(self):
        user = User.objects.create_user(username='dave', password='pass', email='dave@test.com')
        user.profile.tier = 'pro'
        user.profile.save()
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(user).access_token))
        response = client.get('/api/payments/status/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['tier'], 'pro')
        self.assertTrue(response.data['is_pro'])


class WebhookTest(TestCase):
    """webhook endpoint accepts POST requests."""

    def test_webhook_accepts_post_without_secret_returns_503(self):
        client = APIClient()
        with self.settings(STRIPE_WEBHOOK_SECRET=''):
            response = client.post(
                '/api/payments/webhook/',
                data=json.dumps({}),
                content_type='application/json',
            )
        self.assertEqual(response.status_code, 503)

    def test_webhook_rejects_invalid_signature(self):
        client = APIClient()
        with self.settings(STRIPE_WEBHOOK_SECRET='whsec_test'):
            response = client.post(
                '/api/payments/webhook/',
                data=json.dumps({'type': 'checkout.session.completed'}),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='invalid',
            )
        self.assertEqual(response.status_code, 400)

    @patch('stripe.Webhook.construct_event')
    def test_webhook_checkout_session_completed_upgrades_tier(self, mock_construct):
        user = User.objects.create_user(username='eve', password='pass', email='eve@test.com')
        user.profile.stripe_customer_id = 'cus_test123'
        user.profile.save()

        mock_event = MagicMock()
        mock_event.type = 'checkout.session.completed'
        mock_event.data.object.get = lambda key, default=None: {
            'customer': 'cus_test123',
            'subscription': 'sub_test456',
        }.get(key, default)
        mock_construct.return_value = mock_event

        client = APIClient()
        with self.settings(STRIPE_WEBHOOK_SECRET='whsec_test'):
            response = client.post(
                '/api/payments/webhook/',
                data=json.dumps({}),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='t=1,v1=sig',
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['received'])
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.tier, 'pro')
        self.assertEqual(user.profile.stripe_subscription_id, 'sub_test456')

    @patch('stripe.Webhook.construct_event')
    def test_webhook_subscription_deleted_downgrades_tier(self, mock_construct):
        user = User.objects.create_user(username='frank', password='pass', email='frank@test.com')
        user.profile.tier = 'pro'
        user.profile.stripe_subscription_id = 'sub_del789'
        user.profile.save()

        mock_event = MagicMock()
        mock_event.type = 'customer.subscription.deleted'
        mock_event.data.object.get = lambda key, default=None: {
            'id': 'sub_del789',
        }.get(key, default)
        mock_construct.return_value = mock_event

        client = APIClient()
        with self.settings(STRIPE_WEBHOOK_SECRET='whsec_test'):
            response = client.post(
                '/api/payments/webhook/',
                data=json.dumps({}),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='t=1,v1=sig',
            )

        self.assertEqual(response.status_code, 200)
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.tier, 'free')
        self.assertEqual(user.profile.stripe_subscription_id, '')
