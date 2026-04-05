from django.urls import path
from .views import create_checkout_session, create_portal_session, subscription_status, stripe_webhook

urlpatterns = [
    path('checkout/', create_checkout_session, name='payments-checkout'),
    path('portal/', create_portal_session, name='payments-portal'),
    path('status/', subscription_status, name='payments-status'),
    path('webhook/', stripe_webhook, name='payments-webhook'),
]
