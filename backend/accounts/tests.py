from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Profile, UserSettings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(email='test@example.com', password='securepass123'):
    """Create a minimal valid User (username mirrors email, as register does)."""
    return User.objects.create_user(username=email, email=email, password=password)


# ---------------------------------------------------------------------------
# Profile Model Tests
# ---------------------------------------------------------------------------

class ProfileModelTests(TestCase):
    def test_profile_created_automatically_on_user_creation(self):
        user = make_user()
        self.assertTrue(hasattr(user, 'profile'))
        self.assertIsInstance(user.profile, Profile)

    def test_profile_default_tier_is_free(self):
        user = make_user()
        self.assertEqual(user.profile.tier, 'free')

    def test_profile_is_pro_returns_false_for_free_tier(self):
        user = make_user()
        self.assertFalse(user.profile.is_pro)

    def test_profile_is_pro_returns_true_for_pro_tier(self):
        user = make_user()
        user.profile.tier = 'pro'
        user.profile.save()
        self.assertTrue(user.profile.is_pro)

    def test_profile_str_includes_username_and_tier(self):
        user = make_user(email='alice@example.com')
        self.assertIn('alice@example.com', str(user.profile))
        self.assertIn('free', str(user.profile))

    def test_profile_default_daily_goal_is_10(self):
        user = make_user()
        self.assertEqual(user.profile.daily_goal_minutes, 10)

    def test_profile_default_difficulty_is_beginner(self):
        user = make_user()
        self.assertEqual(user.profile.preferred_difficulty, 'beginner')

    def test_profile_onboarding_completed_defaults_to_false(self):
        user = make_user()
        self.assertFalse(user.profile.onboarding_completed)

    def test_profile_cascades_with_user_deletion(self):
        user = make_user()
        profile_id = user.profile.pk
        user.delete()
        self.assertFalse(Profile.objects.filter(pk=profile_id).exists())


# ---------------------------------------------------------------------------
# Register Endpoint
# ---------------------------------------------------------------------------

class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_returns_201(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'new@example.com',
            'password': 'strongpass1',
        }, format='json')
        self.assertEqual(response.status_code, 201)

    def test_register_creates_user(self):
        self.client.post('/api/auth/register/', {
            'email': 'new@example.com',
            'password': 'strongpass1',
        }, format='json')
        self.assertTrue(User.objects.filter(email='new@example.com').exists())

    def test_register_response_contains_user_and_tokens(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'new@example.com',
            'password': 'strongpass1',
        }, format='json')
        data = response.json()
        self.assertIn('user', data)
        self.assertIn('tokens', data)

    def test_register_tokens_contain_access_and_refresh(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'new@example.com',
            'password': 'strongpass1',
        }, format='json')
        tokens = response.json()['tokens']
        self.assertIn('access', tokens)
        self.assertIn('refresh', tokens)

    def test_register_user_payload_contains_expected_fields(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'new@example.com',
            'password': 'strongpass1',
        }, format='json')
        user = response.json()['user']
        for field in ['id', 'email', 'username', 'profile']:
            self.assertIn(field, user)

    def test_register_user_profile_has_expected_fields(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'new@example.com',
            'password': 'strongpass1',
        }, format='json')
        profile = response.json()['user']['profile']
        for field in ['tier', 'daily_goal_minutes', 'preferred_difficulty', 'onboarding_completed']:
            self.assertIn(field, profile)

    def test_register_duplicate_email_returns_400(self):
        make_user(email='existing@example.com')
        response = self.client.post('/api/auth/register/', {
            'email': 'existing@example.com',
            'password': 'strongpass1',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_register_short_password_returns_400(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'new@example.com',
            'password': 'short',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_register_missing_email_returns_400(self):
        response = self.client.post('/api/auth/register/', {
            'password': 'strongpass1',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_register_invalid_email_returns_400(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'not-an-email',
            'password': 'strongpass1',
        }, format='json')
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# Login Endpoint
# ---------------------------------------------------------------------------

class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(email='login@example.com', password='correctpass1')

    def test_login_with_valid_credentials_returns_200(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'login@example.com',
            'password': 'correctpass1',
        }, format='json')
        self.assertEqual(response.status_code, 200)

    def test_login_response_contains_access_and_refresh_tokens(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'login@example.com',
            'password': 'correctpass1',
        }, format='json')
        data = response.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    def test_login_with_wrong_password_returns_401(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'login@example.com',
            'password': 'wrongpassword',
        }, format='json')
        self.assertEqual(response.status_code, 401)

    def test_login_with_nonexistent_user_returns_401(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'nobody@example.com',
            'password': 'anypass123',
        }, format='json')
        self.assertEqual(response.status_code, 401)


# ---------------------------------------------------------------------------
# Token Refresh Endpoint
# ---------------------------------------------------------------------------

class TokenRefreshTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        login_response = self.client.post('/api/auth/login/', {
            'username': self.user.username,
            'password': 'securepass123',
        }, format='json')
        self.refresh_token = login_response.json()['refresh']

    def test_refresh_with_valid_token_returns_200(self):
        response = self.client.post('/api/auth/refresh/', {
            'refresh': self.refresh_token,
        }, format='json')
        self.assertEqual(response.status_code, 200)

    def test_refresh_response_contains_access_token(self):
        response = self.client.post('/api/auth/refresh/', {
            'refresh': self.refresh_token,
        }, format='json')
        self.assertIn('access', response.json())

    def test_refresh_with_invalid_token_returns_401(self):
        response = self.client.post('/api/auth/refresh/', {
            'refresh': 'completely-invalid-token',
        }, format='json')
        self.assertEqual(response.status_code, 401)


# ---------------------------------------------------------------------------
# Me Endpoint
# ---------------------------------------------------------------------------

class MeEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(email='me@example.com')
        login_response = self.client.post('/api/auth/login/', {
            'username': self.user.username,
            'password': 'securepass123',
        }, format='json')
        self.access_token = login_response.json()['access']

    def test_me_with_valid_token_returns_200(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 200)

    def test_me_returns_correct_user_email(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.json()['email'], 'me@example.com')

    def test_me_response_includes_profile(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get('/api/auth/me/')
        self.assertIn('profile', response.json())

    def test_me_without_token_returns_401(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)

    def test_me_with_invalid_token_returns_401(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid.token.here')
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)


# ---------------------------------------------------------------------------
# Profile Update Endpoint
# ---------------------------------------------------------------------------

class ProfileUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(email='profile@example.com')
        login_response = self.client.post('/api/auth/login/', {
            'username': self.user.username,
            'password': 'securepass123',
        }, format='json')
        self.access_token = login_response.json()['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def test_update_daily_goal_returns_200(self):
        response = self.client.patch('/api/auth/me/profile/', {
            'daily_goal_minutes': 20,
        }, format='json')
        self.assertEqual(response.status_code, 200)

    def test_update_daily_goal_persists(self):
        self.client.patch('/api/auth/me/profile/', {
            'daily_goal_minutes': 30,
        }, format='json')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.daily_goal_minutes, 30)

    def test_update_preferred_difficulty_persists(self):
        self.client.patch('/api/auth/me/profile/', {
            'preferred_difficulty': 'advanced',
        }, format='json')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.preferred_difficulty, 'advanced')

    def test_update_onboarding_completed_persists(self):
        self.client.patch('/api/auth/me/profile/', {
            'onboarding_completed': True,
        }, format='json')
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.onboarding_completed)

    def test_update_response_contains_full_user_payload(self):
        response = self.client.patch('/api/auth/me/profile/', {
            'daily_goal_minutes': 15,
        }, format='json')
        data = response.json()
        for field in ['id', 'email', 'username', 'profile']:
            self.assertIn(field, data)

    def test_tier_is_read_only_and_not_updated(self):
        self.client.patch('/api/auth/me/profile/', {
            'tier': 'pro',
        }, format='json')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.tier, 'free')

    def test_update_without_token_returns_401(self):
        self.client.credentials()
        response = self.client.patch('/api/auth/me/profile/', {
            'daily_goal_minutes': 20,
        }, format='json')
        self.assertEqual(response.status_code, 401)


# ---------------------------------------------------------------------------
# UserSettings Model Tests
# ---------------------------------------------------------------------------

class UserSettingsModelTests(TestCase):
    def test_settings_created_automatically_on_user_creation(self):
        user = make_user()
        self.assertTrue(hasattr(user, 'settings'))
        self.assertIsInstance(user.settings, UserSettings)

    def test_settings_data_defaults_to_empty_dict(self):
        user = make_user()
        self.assertEqual(user.settings.data, {})

    def test_settings_str_includes_username(self):
        user = make_user(email='settings@example.com')
        self.assertIn('settings@example.com', str(user.settings))

    def test_settings_cascade_deletes_with_user(self):
        user = make_user()
        settings_id = user.settings.pk
        user.delete()
        self.assertFalse(UserSettings.objects.filter(pk=settings_id).exists())

    def test_settings_stores_arbitrary_json(self):
        user = make_user()
        user.settings.data = {'theme': 'dark', 'fontSize': 16, 'notifications': True}
        user.settings.save()
        user.settings.refresh_from_db()
        self.assertEqual(user.settings.data['theme'], 'dark')
        self.assertEqual(user.settings.data['fontSize'], 16)


# ---------------------------------------------------------------------------
# Settings API Endpoint Tests — shared base
# ---------------------------------------------------------------------------

class SettingsAPIBase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _make_pro_user(self, email='pro@example.com'):
        user = make_user(email=email)
        user.profile.tier = 'pro'
        user.profile.save()
        return user

    def _make_free_user(self, email='free@example.com'):
        return make_user(email=email)

    def _get_token(self, user, password='securepass123'):
        response = self.client.post('/api/auth/login/', {
            'username': user.username,
            'password': password,
        }, format='json')
        return response.json()['access']

    def _auth(self, user):
        token = self._get_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class SettingsGetTests(SettingsAPIBase):
    def test_get_settings_pro_user_returns_200(self):
        user = self._make_pro_user()
        self._auth(user)
        response = self.client.get('/api/auth/settings/')
        self.assertEqual(response.status_code, 200)

    def test_get_settings_returns_data_and_updated_at(self):
        user = self._make_pro_user()
        self._auth(user)
        response = self.client.get('/api/auth/settings/')
        data = response.json()
        self.assertIn('data', data)
        self.assertIn('updated_at', data)

    def test_get_settings_default_data_is_empty_dict(self):
        user = self._make_pro_user()
        self._auth(user)
        response = self.client.get('/api/auth/settings/')
        self.assertEqual(response.json()['data'], {})

    def test_get_settings_free_user_returns_403(self):
        user = self._make_free_user()
        self._auth(user)
        response = self.client.get('/api/auth/settings/')
        self.assertEqual(response.status_code, 403)

    def test_get_settings_unauthenticated_returns_401(self):
        response = self.client.get('/api/auth/settings/')
        self.assertEqual(response.status_code, 401)

    def test_get_settings_free_user_error_message(self):
        user = self._make_free_user()
        self._auth(user)
        response = self.client.get('/api/auth/settings/')
        self.assertIn('error', response.json())


class SettingsPutTests(SettingsAPIBase):
    def test_put_settings_replaces_blob(self):
        user = self._make_pro_user()
        self._auth(user)
        payload = {'data': {'theme': 'dark', 'lang': 'en'}}
        response = self.client.put('/api/auth/settings/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data'], {'theme': 'dark', 'lang': 'en'})

    def test_put_settings_persists_to_db(self):
        user = self._make_pro_user()
        self._auth(user)
        self.client.put('/api/auth/settings/', {'data': {'x': 1}}, format='json')
        user.settings.refresh_from_db()
        self.assertEqual(user.settings.data, {'x': 1})

    def test_put_settings_full_replacement_removes_old_keys(self):
        user = self._make_pro_user()
        user.settings.data = {'old_key': 'old_value'}
        user.settings.save()
        self._auth(user)
        self.client.put('/api/auth/settings/', {'data': {'new_key': 'new_value'}}, format='json')
        user.settings.refresh_from_db()
        self.assertNotIn('old_key', user.settings.data)
        self.assertIn('new_key', user.settings.data)

    def test_put_settings_free_user_returns_403(self):
        user = self._make_free_user()
        self._auth(user)
        response = self.client.put('/api/auth/settings/', {'data': {}}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_put_settings_unauthenticated_returns_401(self):
        response = self.client.put('/api/auth/settings/', {'data': {}}, format='json')
        self.assertEqual(response.status_code, 401)


class SettingsPatchTests(SettingsAPIBase):
    def test_patch_settings_merges_new_keys(self):
        user = self._make_pro_user()
        user.settings.data = {'existing': 'value'}
        user.settings.save()
        self._auth(user)
        response = self.client.patch('/api/auth/settings/', {'data': {'new_key': 'new_value'}}, format='json')
        self.assertEqual(response.status_code, 200)
        result = response.json()['data']
        self.assertEqual(result['existing'], 'value')
        self.assertEqual(result['new_key'], 'new_value')

    def test_patch_settings_overwrites_existing_key(self):
        user = self._make_pro_user()
        user.settings.data = {'theme': 'light'}
        user.settings.save()
        self._auth(user)
        self.client.patch('/api/auth/settings/', {'data': {'theme': 'dark'}}, format='json')
        user.settings.refresh_from_db()
        self.assertEqual(user.settings.data['theme'], 'dark')

    def test_patch_settings_preserves_unmentioned_keys(self):
        user = self._make_pro_user()
        user.settings.data = {'a': 1, 'b': 2}
        user.settings.save()
        self._auth(user)
        self.client.patch('/api/auth/settings/', {'data': {'b': 99}}, format='json')
        user.settings.refresh_from_db()
        self.assertEqual(user.settings.data['a'], 1)
        self.assertEqual(user.settings.data['b'], 99)

    def test_patch_settings_free_user_returns_403(self):
        user = self._make_free_user()
        self._auth(user)
        response = self.client.patch('/api/auth/settings/', {'data': {'x': 1}}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_patch_settings_unauthenticated_returns_401(self):
        response = self.client.patch('/api/auth/settings/', {'data': {}}, format='json')
        self.assertEqual(response.status_code, 401)
