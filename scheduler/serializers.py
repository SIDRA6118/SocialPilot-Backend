from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone

from .models import ScheduledPost, SocialAccount, TeamMember, Draft, PublishingLog, PublishingQueue


class DraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Draft
        fields = [
            "id",
            "title",
            "content",
            "platform",
            "content_type",
            "media_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PublishingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublishingLog
        fields = [
            "id",
            "post",
            "platform",
            "status",
            "platform_response",
            "error_message",
            "attempts",
            "max_attempts",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PublishingQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublishingQueue
        fields = [
            "id",
            "post",
            "status",
            "scheduled_for",
            "attempts",
            "last_attempt",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ScheduledPostSerializer(serializers.ModelSerializer):
    publishing_logs = PublishingLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = ScheduledPost
        fields = [
            "id",
            "content",
            "platform",
            "content_type",
            "media_url",
            "scheduled_time",
            "status",
            "is_recurring",
            "recurrence",
            "recurrence_end_date",
            "parent_post",
            "queue_position",
            "published_at",
            "created_at",
            "updated_at",
            "user",
            "publishing_logs",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "user", "published_at", "publishing_logs"]
    
    def validate_scheduled_time(self, value):
        """Ensure scheduled_time is in the future"""
        if value <= timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        return user


class SocialAccountSerializer(serializers.ModelSerializer):
    access_token = serializers.CharField(write_only=True, required=False)
    refresh_token = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = SocialAccount
        fields = [
            "id",
            "platform",
            "access_token",
            "refresh_token",
            "account_id",
            "account_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class TeamMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="member.username", read_only=True)

    class Meta:
        model = TeamMember
        fields = ["id", "username", "member", "invited_email", "role", "status", "created_at"]
        read_only_fields = ["id", "owner", "username", "status", "created_at"]

    def validate(self, attrs):
        if not attrs.get("member") and not attrs.get("invited_email"):
            raise serializers.ValidationError("Add a member username or invitation email.")
        return attrs