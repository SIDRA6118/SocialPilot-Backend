from django.db import models
from django.contrib.auth.models import User


class ScheduledPost(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    platform = models.CharField(max_length=50)
    scheduled_time = models.DateTimeField()
    status = models.CharField(max_length=20, default="scheduled")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.platform} - {self.scheduled_time}"


class SocialAccount(models.Model):
    PLATFORM_CHOICES = [
        ("linkedin", "LinkedIn"),
        ("twitter", "Twitter"),
        ("facebook", "Facebook"),
        ("instagram", "Instagram"),
        ("youtube", "YouTube"),
        ("pinterest", "Pinterest"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="social_accounts",
    )

    platform = models.CharField(
        max_length=30,
        choices=PLATFORM_CHOICES,
    )

    access_token = models.TextField()

    refresh_token = models.TextField(
        blank=True,
        null=True,
    )

    account_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    account_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.platform}"