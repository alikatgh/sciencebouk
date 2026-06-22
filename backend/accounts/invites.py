from dataclasses import dataclass

from django.core.exceptions import ValidationError
from django.core.validators import validate_ipv46_address
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import InviteCode, InviteRedemption, hash_invite_code, normalize_invite_code


class InviteCodeError(ValueError):
    pass


@dataclass(frozen=True)
class InviteRequestMeta:
    ip_address: str | None = None
    user_agent: str = ""


def normalize_client_ip(ip_address: str | None) -> str | None:
    if not ip_address:
        return None

    candidate = ip_address.strip()
    if not candidate:
        return None

    try:
        validate_ipv46_address(candidate)
    except ValidationError:
        return None

    return candidate


def get_request_meta(request) -> InviteRequestMeta:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    remote_addr = request.META.get("REMOTE_ADDR")
    ip_address = normalize_client_ip(forwarded_for.split(",")[0].strip() or remote_addr)
    return InviteRequestMeta(
        ip_address=ip_address,
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


def increment_invite_usage(invite: InviteCode) -> None:
    now = timezone.now()
    rows_updated = InviteCode.objects.filter(
        pk=invite.pk,
        used_count__lt=F('max_uses'),
    ).update(
        used_count=F('used_count') + 1,
        last_used_at=now,
        updated_at=now,
    )
    if rows_updated != 1:
        raise InviteCodeError("Invite code has already been used.")
    invite.refresh_from_db()


def validate_invite_code(raw_code: str) -> None:
    with transaction.atomic():
        get_available_invite(raw_code)


def redeem_invite_code(raw_code: str, user, meta: InviteRequestMeta | None = None) -> InviteRedemption:
    meta = meta or InviteRequestMeta()

    with transaction.atomic():
        invite = get_available_invite(raw_code)
        increment_invite_usage(invite)

        return InviteRedemption.objects.create(
            invite=invite,
            user=user,
            redeemed_email=user.email,
            ip_address=meta.ip_address,
            user_agent=meta.user_agent,
        )
