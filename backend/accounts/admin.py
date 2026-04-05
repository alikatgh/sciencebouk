from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import Profile


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
