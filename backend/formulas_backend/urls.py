from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from .views import backend_home, serve_media

urlpatterns = [
    path("", backend_home, name="backend-home"),
    path(settings.ADMIN_URL_PATH, admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("courses.urls")),
    path("api/payments/", include("payments.urls")),
]

if settings.SERVE_MEDIA_FROM_DJANGO:
    urlpatterns += [
        path(
            f"{settings.MEDIA_URL.lstrip('/')}<path:path>",
            serve_media,
            name="serve-media",
        ),
    ]
