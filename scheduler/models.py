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

    ROLE_PERMISSIONS = {
        "creator": {"view_posts", "create_post", "edit_post", "delete_post", "view_analytics"},
        "marketing": {"view_posts", "create_post", "edit_post", "delete_post", "view_analytics"},
        "business": {"view_posts", "view_analytics", "connect_channels"},
        "administrator": {"view_posts", "create_post", "edit_post", "delete_post", "view_analytics", "connect_channels", "manage_team", "view_team", "manage_settings"},
    }

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_team_members")
    member = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True, related_name="team_memberships")
    invited_email = models.EmailField(blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="creator")
    status = models.CharField(max_length=20, default="invited")
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def has_permission(cls, permission, role):
        if not role:
            return False

        normalized_role = str(role).lower()
        return permission in cls.ROLE_PERMISSIONS.get(normalized_role, set())

    @classmethod
    def get_user_role(cls, user):
        if user is None or not getattr(user, "is_authenticated", False):
            return None

        if user.is_superuser:
            return "administrator"

        membership = cls.objects.filter(member=user).order_by("-created_at").first()
        if membership:
            return membership.role

        if cls.objects.filter(owner=user).exists():
            return "administrator"

        return "creator"

    @classmethod
    def user_has_permission(cls, user, permission):
        role = cls.get_user_role(user)
        return cls.has_permission(permission, role)

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