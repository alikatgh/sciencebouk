from rest_framework import serializers
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Profile, UserSettings
from .invites import InviteCodeError, validate_invite_code


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['tier', 'display_name', 'avatar_url', 'daily_goal_minutes', 'preferred_difficulty', 'onboarding_completed', 'created_at']
        read_only_fields = ['tier', 'avatar_url', 'created_at']


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
    invite_code = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})

        invite_code = value.get('invite_code', '')
        if getattr(settings, 'INVITES_REQUIRED', False):
            try:
                validate_invite_code(invite_code)
            except InviteCodeError as exc:
                raise serializers.ValidationError({'invite_code': [str(exc)]})
        return value

    def create(self, validated_data):
        validated_data.pop('invite_code', None)
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        return user


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
