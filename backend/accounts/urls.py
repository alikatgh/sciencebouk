from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import me, register, update_profile, upload_avatar, user_settings

urlpatterns = [
    path('register/', register, name='auth-register'),
    path('login/', TokenObtainPairView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('me/', me, name='auth-me'),
    path('me/profile/', update_profile, name='auth-profile'),
    path('me/avatar/', upload_avatar, name='auth-avatar'),
    path('settings/', user_settings, name='auth-settings'),
]
