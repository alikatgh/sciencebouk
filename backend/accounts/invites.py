from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from .models import InviteCode, InviteRedemption, hash_invite_code, normalize_invite_code


class InviteCodeError(ValueError):
    pass


@dataclass(frozen=True)
class InviteRequestMeta:
    ip_address: str | None = None
    user_agent: str = ""


def get_request_meta(request) -> InviteRequestMeta:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip_address = forwarded_for.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
    return InviteRequestMeta(
        ip_address=ip_address or None,
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:1000],
    )


def get_available_invite(raw_code: str) -> InviteCode:
    normalized = normalize_invite_code(raw_code or "")
    if not normalized:
        raise InviteCodeError("Invite code is required.")

    try:
        invite = InviteCode.objects.select_for_update().get(code_hash=hash_invite_code(normalized))
    except InviteCode.DoesNotExist as exc:
        raise InviteCodeError("Invite code is invalid.") from exc

    if invite.is_revoked:
        raise InviteCodeError("Invite code has been revoked.")
    if invite.is_expired:
        raise InviteCodeError("Invite code has expired.")
    if invite.remaining_uses <= 0:
        raise InviteCodeError("Invite code has already been used.")

    return invite


def validate_invite_code(raw_code: str) -> None:
    with transaction.atomic():
        get_available_invite(raw_code)


def redeem_invite_code(raw_code: str, user, meta: InviteRequestMeta | None = None) -> InviteRedemption:
    meta = meta or InviteRequestMeta()

    with transaction.atomic():
        invite = get_available_invite(raw_code)
        invite.used_count += 1
        invite.last_used_at = timezone.now()
        invite.save(update_fields=["used_count", "last_used_at", "updated_at"])

        return InviteRedemption.objects.create(
            invite=invite,
            user=user,
            redeemed_email=user.email,
            ip_address=meta.ip_address,
            user_agent=meta.user_agent,
        )
