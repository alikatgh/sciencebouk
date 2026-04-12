from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from .views import backend_home

urlpatterns = [
    path("", backend_home, name="backend-home"),
    path(settings.ADMIN_URL_PATH, admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("courses.urls")),
    path("api/payments/", include("payments.urls")),
]

if settings.SERVE_MEDIA_FROM_DJANGO:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
