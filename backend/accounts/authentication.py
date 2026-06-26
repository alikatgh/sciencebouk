from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.utils import get_md5_hash_password


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
