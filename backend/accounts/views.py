import uuid

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer, ProfileSerializer, UserSettingsSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user and return JWT tokens alongside the user payload."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
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
