import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer, ProfileSerializer, UserSettingsSerializer
from .invites import InviteCodeError, get_request_meta, redeem_invite_code, validate_invite_code

User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


def verify_google_credential(credential: str, client_id: str) -> dict:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    return google_id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """Verify a Google ID token and return JWT tokens, creating the user if needed."""
    credential = request.data.get('credential', '').strip()
    if not credential:
        return Response({"error": "credential is required"}, status=status.HTTP_400_BAD_REQUEST)

    client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
    if not client_id:
        return Response({"error": "Google OAuth is not configured on this server"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        idinfo = verify_google_credential(credential, client_id)
    except Exception:
        return Response({"error": "Invalid Google credential"}, status=status.HTTP_401_UNAUTHORIZED)

    email = idinfo.get('email', '').lower()
    if not email:
        return Response({"error": "Google account has no email"}, status=status.HTTP_400_BAD_REQUEST)
    if not idinfo.get('email_verified'):
        return Response({"error": "Google email is not verified"}, status=status.HTTP_400_BAD_REQUEST)

    invite_code = request.data.get('invite_code', '').strip()
    existing_user = User.objects.filter(email=email).first()

    if not existing_user and getattr(settings, 'INVITES_REQUIRED', False):
        try:
            validate_invite_code(invite_code)
        except InviteCodeError as exc:
            return Response({"invite_code": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user, created = User.objects.get_or_create(
            email=email,
            defaults={'username': email},
        )

        if created and getattr(settings, 'INVITES_REQUIRED', False):
            try:
                redeem_invite_code(invite_code, user, get_request_meta(request))
            except InviteCodeError as exc:
                user.delete()
                return Response({"invite_code": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)

    if created:
        user.set_unusable_password()
        user.save(update_fields=['password'])
        # Populate display name from Google profile if available
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        if hasattr(user, 'profile'):
            if name:
                user.profile.display_name = name
            if picture:
                user.profile.avatar_url = picture
            user.profile.save(update_fields=['display_name', 'avatar_url'])

    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user and return JWT tokens alongside the user payload."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    invite_code = serializer.validated_data.get('invite_code', '')
    user = serializer.save()

    if getattr(settings, 'INVITES_REQUIRED', False):
        try:
            redeem_invite_code(invite_code, user, get_request_meta(request))
        except InviteCodeError as exc:
            user.delete()
            return Response({"invite_code": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)

    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Return the authenticated user's profile."""
    return Response(UserSerializer(request.user).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update mutable profile fields for the authenticated user."""
    serializer = ProfileSerializer(request.user.profile, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_avatar(request):
    """Upload an avatar image. Saves to media/avatars/ and updates profile.avatar_url."""
    file = request.FILES.get('avatar')
    if not file:
        return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

    # Validate
    if file.size > 5 * 1024 * 1024:
        return Response({"error": "File too large (max 5MB)"}, status=status.HTTP_400_BAD_REQUEST)

    ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else 'jpg'
    if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif'):
        return Response({"error": "Invalid file type"}, status=status.HTTP_400_BAD_REQUEST)

    # Save file
    filename = f"avatars/{request.user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = settings.MEDIA_ROOT / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)

    with open(filepath, 'wb+') as dest:
        for chunk in file.chunks():
            dest.write(chunk)

    # Update profile
    avatar_url = f"{settings.MEDIA_URL}{filename}"
    profile = request.user.profile
    profile.avatar_url = avatar_url
    profile.save(update_fields=['avatar_url'])

    return Response({"avatar_url": avatar_url})


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_settings(request):
    """GET/PUT/PATCH the authenticated user's settings blob. Pro users only."""
    if not hasattr(request.user, 'profile') or not request.user.profile.is_pro:
        return Response({"error": "Pro subscription required"}, status=status.HTTP_403_FORBIDDEN)

    from .models import UserSettings
    settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        return Response(UserSettingsSerializer(settings_obj).data)

    if request.method == 'PUT':
        # Full replacement of the settings blob.
        serializer = UserSettingsSerializer(settings_obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # PATCH: merge partial update into existing blob.
    incoming = request.data.get('data', request.data)
    if not isinstance(incoming, dict):
        return Response({"error": "'data' must be a JSON object"}, status=status.HTTP_400_BAD_REQUEST)
    merged = {**settings_obj.data, **incoming}
    serializer = UserSettingsSerializer(settings_obj, data={'data': merged})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
