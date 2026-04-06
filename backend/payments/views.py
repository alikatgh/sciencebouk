import os

import stripe
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Create a Stripe Checkout session for the Pro subscription."""
    profile = request.user.profile

    if not settings.STRIPE_SECRET_KEY:
        return Response({'error': 'Payments not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if not profile.stripe_customer_id:
        customer = stripe.Customer.create(email=request.user.email)
        profile.stripe_customer_id = customer.id
        profile.save()

    price_type = request.data.get("price_type", "monthly")
    if price_type == "yearly":
        price_id = os.environ.get("STRIPE_PRO_YEARLY_PRICE_ID", "")
    else:
        price_id = os.environ.get(
            "STRIPE_PRO_MONTHLY_PRICE_ID",
            os.environ.get("STRIPE_PRO_PRICE_ID", ""),
        )

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
    profile = request.user.profile

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
    profile = request.user.profile
    return Response({
        'tier': profile.tier,
        'is_pro': profile.is_pro,
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

    sig = request.META.get('HTTP_STRIPE_SIGNATURE', '')

    if not settings.STRIPE_WEBHOOK_SECRET:
        return JsonResponse({'error': 'Webhooks not configured'}, status=503)

    try:
        event = stripe.Webhook.construct_event(
            request.body, sig, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return JsonResponse({'error': 'Invalid signature'}, status=400)

    from accounts.models import Profile

    if event.type == 'checkout.session.completed':
        session = event.data.object
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        try:
            profile = Profile.objects.get(stripe_customer_id=customer_id)
            profile.tier = 'pro'
            profile.stripe_subscription_id = subscription_id or ''
            profile.save()
        except Profile.DoesNotExist:
            pass

    elif event.type == 'customer.subscription.deleted':
        sub = event.data.object
        subscription_id = sub.get('id')
        try:
            profile = Profile.objects.get(stripe_subscription_id=subscription_id)
            profile.tier = 'free'
            profile.stripe_subscription_id = ''
            profile.save()
        except Profile.DoesNotExist:
            pass

    return JsonResponse({'received': True})
