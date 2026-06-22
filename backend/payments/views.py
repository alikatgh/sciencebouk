import os

import stripe
from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import ProcessedStripeEvent

stripe.api_key = settings.STRIPE_SECRET_KEY


def billing_disabled_response():
    return Response(
        {'detail': 'Billing is paused during the free beta'},
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def downgrade_profile(profile):
    profile.tier = 'free'
    profile.stripe_subscription_id = ''
    profile.save(update_fields=['tier', 'stripe_subscription_id'])


def upgrade_profile(profile, subscription_id: str = ''):
    profile.tier = 'pro'
    profile.stripe_subscription_id = subscription_id or profile.stripe_subscription_id
    profile.save(update_fields=['tier', 'stripe_subscription_id'])


def configured_pro_price_ids():
    return {
        price_id
        for price_id in (
            settings.STRIPE_PRO_MONTHLY_PRICE_ID,
            settings.STRIPE_PRO_YEARLY_PRICE_ID,
            settings.STRIPE_PRO_PRICE_ID,
        )
        if price_id
    }


def subscription_has_pro_price(subscription) -> bool:
    pro_prices = configured_pro_price_ids()
    if not pro_prices:
        return True

    items = subscription.get('items', {}).get('data', [])
    return any(item.get('price', {}).get('id') in pro_prices for item in items)


def checkout_session_has_pro_price(session) -> bool:
    pro_prices = configured_pro_price_ids()
    if not pro_prices:
        return True

    subscription_id = session.get('subscription')
    if not subscription_id:
        return False

    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
    except stripe.error.StripeError:
        return False

    return subscription_has_pro_price(subscription)


def get_profile_by_customer_id(customer_id):
    from accounts.models import Profile

    if not customer_id:
        return None

    try:
        return Profile.objects.get(stripe_customer_id=customer_id)
    except Profile.DoesNotExist:
        return None


def should_downgrade_on_deleted(profile, subscription_id: str) -> bool:
    """Decide whether a subscription.deleted event should downgrade the profile.

    Caller has already matched the profile by stripe customer id. When the stored
    subscription id is blank or matches the deleted subscription, downgrade.
    When the stored id is stale (does not match the deleted subscription id),
    still downgrade so cancellation is not blocked by an outdated id.
    """
    stored_subscription_id = profile.stripe_subscription_id or ''
    if not stored_subscription_id:
        return True
    if stored_subscription_id == subscription_id:
        return True
    return True


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Create a Stripe Checkout session for the Pro subscription."""
    if not settings.BILLING_ENABLED:
        return billing_disabled_response()

    if not hasattr(request.user, 'profile'):
        return Response({'error': 'Profile not found'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    profile = request.user.profile

    if not settings.STRIPE_SECRET_KEY:
        return Response({'error': 'Payments not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if not profile.stripe_customer_id:
        customer = stripe.Customer.create(email=request.user.email)
        profile.stripe_customer_id = customer.id
        profile.save(update_fields=['stripe_customer_id'])

    price_type = request.data.get("price_type", "monthly")
    if price_type not in {"monthly", "yearly"}:
        return Response({'error': 'Invalid price type'}, status=status.HTTP_400_BAD_REQUEST)

    if price_type == "yearly":
        price_id = settings.STRIPE_PRO_YEARLY_PRICE_ID
    else:
        price_id = settings.STRIPE_PRO_MONTHLY_PRICE_ID

    if not price_id:
        return Response({'error': 'Payments not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    session = stripe.checkout.Session.create(
        customer=profile.stripe_customer_id,
        payment_method_types=['card'],
        line_items=[{'price': price_id, 'quantity': 1}],
        mode='subscription',
        success_url=settings.FRONTEND_URL + '/pro/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url=settings.FRONTEND_URL + '/pro/cancel',
    )
    return Response({'url': session.url})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_portal_session(request):
    """Create a Stripe Billing Portal session for subscription management."""
    if not settings.BILLING_ENABLED:
        return billing_disabled_response()

    if not hasattr(request.user, 'profile'):
        return Response({'error': 'Profile not found'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    profile = request.user.profile

    if not profile.is_pro:
        return Response({'error': 'Active Pro required'}, status=status.HTTP_403_FORBIDDEN)

    if not profile.stripe_customer_id:
        return Response({'error': 'No billing account'}, status=status.HTTP_400_BAD_REQUEST)

    session = stripe.billing_portal.Session.create(
        customer=profile.stripe_customer_id,
        return_url=settings.FRONTEND_URL,
    )
    return Response({'url': session.url})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """Return the current user's subscription tier and pro status."""
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'Profile not found'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    profile = request.user.profile
    return Response({
        'tier': profile.tier,
        'is_pro': profile.is_pro,
        'billing_enabled': settings.BILLING_ENABLED,
    })


@csrf_exempt
def stripe_webhook(request):
    """Handle incoming Stripe webhook events to keep subscription state in sync.

    Implemented as a plain Django view (not @api_view) so that request.body is
    read before any DRF middleware can consume it, preserving the raw payload
    required for Stripe signature verification.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not settings.BILLING_ENABLED:
        return JsonResponse({'received': True, 'billing_enabled': False})

    sig = request.META.get('HTTP_STRIPE_SIGNATURE', '')

    if not settings.STRIPE_WEBHOOK_SECRET:
        return JsonResponse({'error': 'Webhooks not configured'}, status=503)

    try:
        event = stripe.Webhook.construct_event(
            request.body, sig, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return JsonResponse({'error': 'Invalid signature'}, status=400)

    event_id = getattr(event, 'id', None) or event.get('id')
    if not event_id:
        return JsonResponse({'error': 'Missing event id'}, status=400)

    try:
        with transaction.atomic():
            _, created = ProcessedStripeEvent.objects.get_or_create(
                event_id=event_id,
                defaults={'event_type': event.type},
            )
            if not created:
                return JsonResponse({'received': True})

            if event.type == 'checkout.session.completed':
                session = event.data.object
                payment_status = session.get('payment_status')
                if payment_status in {'paid', 'no_payment_required'} and checkout_session_has_pro_price(session):
                    customer_id = session.get('customer')
                    subscription_id = session.get('subscription')
                    profile = get_profile_by_customer_id(customer_id)
                    if profile is not None:
                        upgrade_profile(profile, subscription_id or '')

            elif event.type == 'customer.subscription.updated':
                subscription = event.data.object
                customer_id = subscription.get('customer')
                subscription_id = subscription.get('id') or ''
                subscription_status = subscription.get('status') or ''

                profile = get_profile_by_customer_id(customer_id)
                if profile is not None:
                    if subscription_status in {'active', 'trialing'} and subscription_has_pro_price(subscription):
                        upgrade_profile(profile, subscription_id)
                    else:
                        downgrade_profile(profile)

            elif event.type == 'invoice.payment_failed':
                invoice = event.data.object
                customer_id = invoice.get('customer')
                attempt_count = invoice.get('attempt_count') or 0
                next_payment_attempt = invoice.get('next_payment_attempt')

                if attempt_count >= 3 or not next_payment_attempt:
                    profile = get_profile_by_customer_id(customer_id)
                    if profile is not None:
                        downgrade_profile(profile)

            elif event.type == 'customer.subscription.deleted':
                sub = event.data.object
                customer_id = sub.get('customer')
                subscription_id = sub.get('id') or ''
                profile = get_profile_by_customer_id(customer_id)
                if profile is not None and should_downgrade_on_deleted(profile, subscription_id):
                    downgrade_profile(profile)
    except IntegrityError:
        return JsonResponse({'received': True})

    return JsonResponse({'received': True})