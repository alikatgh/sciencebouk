from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    TIER_CHOICES = [('free', 'Free'), ('pro', 'Pro')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='free')
    display_name = models.CharField(max_length=100, blank=True)
    avatar_url = models.URLField(blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
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


@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
        UserSettings.objects.create(user=instance)
