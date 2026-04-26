from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import InviteCode, InviteRedemption, Profile


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    fields = ("tier", "display_name", "avatar_url", "stripe_customer_id", "stripe_subscription_id", "daily_goal_minutes", "preferred_difficulty", "onboarding_completed")


class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]
    list_display = ("username", "email", "get_tier", "is_staff")
    list_filter = ("is_staff", "is_active", "profile__tier")

    @admin.display(description="Tier")
    def get_tier(self, obj):
        return obj.profile.tier if hasattr(obj, "profile") else "-"


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


class InviteCodeAdminForm(forms.ModelForm):
    new_code = forms.CharField(
        required=False,
        help_text="Leave blank while creating to generate a code. On edit, fill this only to rotate the code.",
    )

    class Meta:
        model = InviteCode
        fields = (
            "label",
            "new_code",
            "max_uses",
            "expires_at",
            "revoked_at",
        )

    def save(self, commit=True):
        invite = super().save(commit=False)
        raw_code = self.cleaned_data.get("new_code", "").strip()

        if not invite.pk and not raw_code:
            raw_code = InviteCode.generate_code()

        if raw_code:
            invite.set_code(raw_code)
            invite._raw_invite_code = raw_code

        if commit:
            invite.save()
            self.save_m2m()

        return invite


@admin.register(InviteCode)
class InviteCodeAdmin(admin.ModelAdmin):
    form = InviteCodeAdminForm
    list_display = (
        "label",
        "code_preview",
        "status",
        "used_count",
        "max_uses",
        "expires_at",
        "created_by",
        "created_at",
    )
    list_filter = ("revoked_at", "expires_at", "created_at")
    search_fields = ("label", "code_preview")
    readonly_fields = ("code_hash", "code_preview", "used_count", "created_by", "created_at", "updated_at", "last_used_at")

    @admin.display(description="Status")
    def status(self, obj):
        if obj.is_revoked:
            return "Revoked"
        if obj.is_expired:
            return "Expired"
        if obj.remaining_uses <= 0:
            return "Used up"
        return "Available"

    def save_model(self, request, obj, form, change):
        if not change and not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        raw_code = getattr(obj, "_raw_invite_code", "")
        if raw_code:
            messages.success(request, f"Invite code generated. Copy it now: {raw_code}")


@admin.register(InviteRedemption)
class InviteRedemptionAdmin(admin.ModelAdmin):
    list_display = ("redeemed_email", "invite", "user", "ip_address", "redeemed_at")
    list_filter = ("redeemed_at",)
    search_fields = ("redeemed_email", "user__email", "invite__label", "invite__code_preview")
    readonly_fields = ("invite", "user", "redeemed_email", "ip_address", "user_agent", "redeemed_at")

    def has_add_permission(self, request):
        return False
