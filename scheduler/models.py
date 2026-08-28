from django.db import models
from django.contrib.auth.models import User


class ScheduledPost(models.Model):
    CONTENT_TYPES = [
        ("text", "Text"),
        ("image", "Image"),
        ("video", "Video"),
        ("carousel", "Carousel"),
        ("story", "Story"),
        ("reel", "Reel"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    platform = models.CharField(max_length=50)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default="text")
    media_url = models.URLField(blank=True)
    scheduled_time = models.DateTimeField()
    status = models.CharField(max_length=20, default="scheduled")
    is_recurring = models.BooleanField(default=False)
    recurrence = models.CharField(max_length=30, blank=True)
    queue_position = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.platform} - {self.scheduled_time}"


class TeamMember(models.Model):
    ROLE_CHOICES = [
        ("creator", "Content Creator"),
        ("marketing", "Marketing Team"),
        ("business", "Business User"),
        ("administrator", "Administrator"),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_team_members")
    member = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True, related_name="team_memberships")
    invited_email = models.EmailField(blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="creator")
    status = models.CharField(max_length=20, default="invited")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["owner", "member"], name="unique_team_member"),
        ]


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

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "platform", "account_id"], name="unique_social_account"),
        ]