import hashlib
import secrets
import string

from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


def normalize_invite_code(code: str) -> str:
    return "".join(char for char in code.upper() if char.isalnum())


def hash_invite_code(code: str) -> str:
    return hashlib.sha256(normalize_invite_code(code).encode("utf-8")).hexdigest()


class Profile(models.Model):
    TIER_CHOICES = [('free', 'Free'), ('pro', 'Pro')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='free')
    display_name = models.CharField(max_length=100, blank=True)
    avatar_url = models.URLField(blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, db_index=True)
    daily_goal_minutes = models.IntegerField(default=10)
    preferred_difficulty = models.CharField(max_length=20, default='beginner')
    onboarding_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.tier})"

    @property
    def is_pro(self):
        return self.tier == 'pro'


class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    data = models.JSONField(default=dict)  # stores the full settings blob
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.user.username}"


class InviteCode(models.Model):
    label = models.CharField(max_length=120, blank=True)
    code_hash = models.CharField(max_length=64, unique=True, db_index=True)
    code_preview = models.CharField(max_length=24, blank=True)
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_invite_codes",
    )
    max_uses = models.PositiveIntegerField(default=1)
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["expires_at"]),
            models.Index(fields=["revoked_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        label = self.label or "Invite"
        return f"{label} ({self.code_preview or 'hidden'})"

    @staticmethod
    def generate_code() -> str:
        alphabet = f"{string.ascii_uppercase}23456789"
        token = "".join(secrets.choice(alphabet) for _ in range(12))
        return f"SCB-{token[:4]}-{token[4:8]}-{token[8:12]}".upper()

    def set_code(self, raw_code: str) -> None:
        normalized = normalize_invite_code(raw_code)
        self.code_hash = hash_invite_code(normalized)
        self.code_preview = f"{normalized[:4]}...{normalized[-4:]}" if len(normalized) > 8 else normalized

    @property
    def is_expired(self) -> bool:
        return bool(self.expires_at and self.expires_at <= timezone.now())

    @property
    def is_revoked(self) -> bool:
        return bool(self.revoked_at)

    @property
    def remaining_uses(self) -> int:
        return max(0, self.max_uses - self.used_count)

    @property
    def is_available(self) -> bool:
        return not self.is_revoked and not self.is_expired and self.remaining_uses > 0


class InviteRedemption(models.Model):
    invite = models.ForeignKey(InviteCode, on_delete=models.PROTECT, related_name="redemptions")
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="invite_redemption")
    redeemed_email = models.EmailField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["redeemed_email"]),
            models.Index(fields=["redeemed_at"]),
        ]
        ordering = ["-redeemed_at"]

    def __str__(self):
        return f"{self.redeemed_email} via {self.invite.code_preview}"


@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
        UserSettings.objects.create(user=instance)
