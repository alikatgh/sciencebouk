from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.utils import get_md5_hash_password


class CaseInsensitiveModelBackend(ModelBackend):
    """Authenticate by a case-insensitive username (the username is the email).

    Registration lowercases new accounts, but pre-existing accounts may be
    mixed-case; this lets either log in regardless of the case typed, without a
    data migration. Falls back safely (returns None) if the lookup is ambiguous.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        user_model = get_user_model()
        if username is None:
            username = kwargs.get(user_model.USERNAME_FIELD)
        if username is None or password is None:
            return None
        try:
            user = user_model._default_manager.get(
                **{f"{user_model.USERNAME_FIELD}__iexact": username}
            )
        except user_model.DoesNotExist:
            # Run the default password hasher once to reduce timing differences.
            user_model().set_password(password)
            return None
        except user_model.MultipleObjectsReturned:
            # Pre-existing case-duplicate accounts: ambiguous → fail closed.
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None


class ProfileJWTAuthentication(JWTAuthentication):
    """JWTAuthentication that fetches the user's profile in the same query.

    The user payload serializer embeds the OneToOne ``profile``, and several
    views read ``request.user.profile`` directly. Stock SimpleJWT ``get_user``
    does a bare ``User.objects.get(...)``, so the first profile access fires a
    second query on every authenticated request. We override it to
    ``select_related("profile")``.

    The body mirrors SimpleJWT 5.5.1's ``get_user`` exactly except for the
    queryset — re-verify it against the upstream method when upgrading the SDK.
    """

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError as exc:
            raise InvalidToken(_("Token contained no recognizable user identification")) from exc

        try:
            user = self.user_model.objects.select_related("profile").get(
                **{api_settings.USER_ID_FIELD: user_id}
            )
        except self.user_model.DoesNotExist as exc:
            raise AuthenticationFailed(_("User not found"), code="user_not_found") from exc

        if api_settings.CHECK_USER_IS_ACTIVE and not user.is_active:
            raise AuthenticationFailed(_("User is inactive"), code="user_inactive")

        if api_settings.CHECK_REVOKE_TOKEN:
            if validated_token.get(api_settings.REVOKE_TOKEN_CLAIM) != get_md5_hash_password(user.password):
                raise AuthenticationFailed(
                    _("The user's password has been changed."), code="password_changed"
                )

        return user
