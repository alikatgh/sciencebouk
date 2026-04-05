from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, UserSettings


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['tier', 'display_name', 'avatar_url', 'daily_goal_minutes', 'preferred_difficulty', 'onboarding_completed', 'created_at']
        read_only_fields = ['tier', 'created_at']


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ['data', 'updated_at']
        read_only_fields = ['updated_at']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'profile']
        read_only_fields = ['id']


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        return user
