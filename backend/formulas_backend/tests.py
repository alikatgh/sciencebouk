from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings

from .settings import normalize_route_fragment


class SettingsHelpersTests(SimpleTestCase):
    def test_normalize_route_fragment_strips_outer_slashes(self) -> None:
        self.assertEqual(
            normalize_route_fragment("/private-admin-123/", "DJANGO_ADMIN_PATH"),
            "private-admin-123/",
        )

    def test_normalize_route_fragment_rejects_blank_value(self) -> None:
        with self.assertRaises(ImproperlyConfigured):
            normalize_route_fragment("///", "DJANGO_ADMIN_PATH")

    def test_normalize_route_fragment_rejects_invalid_characters(self) -> None:
        with self.assertRaises(ImproperlyConfigured):
            normalize_route_fragment("admin?debug=1", "DJANGO_ADMIN_PATH")


class BackendHomeTests(SimpleTestCase):
    @override_settings(
        FRONTEND_URL="https://sciencebo.uk",
        DEBUG=False,
        ADMIN_URL_ABSOLUTE_PATH="/private-admin-123/",
    )
    def test_backend_home_hides_admin_path_in_production(self) -> None:
        response = self.client.get("/")

        self.assertContains(response, "Sciencebouk API Server")
        self.assertContains(response, "https://sciencebo.uk")
        self.assertNotContains(response, "/private-admin-123/")
        self.assertNotContains(response, "/admin/")

    @override_settings(
        FRONTEND_URL="http://localhost:5173",
        DEBUG=True,
        ADMIN_URL_ABSOLUTE_PATH="/private-admin-123/",
    )
    def test_backend_home_shows_admin_path_in_debug(self) -> None:
        response = self.client.get("/")

        self.assertContains(response, "/private-admin-123/")
