from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Draft(models.Model):
    """Stores draft posts that are not yet scheduled"""
    CONTENT_TYPES = [
        ("text", "Text"),
        ("image", "Image"),
        ("video", "Video"),
        ("carousel", "Carousel"),
        ("story", "Story"),
        ("reel", "Reel"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="drafts")
    content = models.TextField()
    platform = models.CharField(max_length=50, blank=True)  # Optional until scheduling
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default="text")
    media_url = models.URLField(blank=True)
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Draft - {self.title or 'Untitled'} ({self.user.username})"

    class Meta:
        ordering = ["-updated_at"]


class ScheduledPost(models.Model):
    CONTENT_TYPES = [
        ("text", "Text"),
        ("image", "Image"),
        ("video", "Video"),
        ("carousel", "Carousel"),
        ("story", "Story"),
        ("reel", "Reel"),
    ]
    
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("scheduled", "Scheduled"),
        ("processing", "Processing"),
        ("published", "Published"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="scheduled_posts")
    content = models.TextField()
    platform = models.CharField(max_length=50)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default="text")
    media_url = models.URLField(blank=True)
    scheduled_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    is_recurring = models.BooleanField(default=False)
    recurrence = models.CharField(max_length=30, blank=True)  # daily, weekly, monthly, etc.
    recurrence_end_date = models.DateTimeField(blank=True, null=True)  # When to stop recurring
    parent_post = models.ForeignKey(
        "self", 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name="recurring_instances"
    )  # Link to original recurring post
    queue_position = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.platform} - {self.scheduled_time}"

    class Meta:
        ordering = ["-scheduled_time"]


class PublishingLog(models.Model):
    """Tracks publishing attempts and results"""
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("published", "Published"),
        ("failed", "Failed"),
    ]

    post = models.ForeignKey(
        ScheduledPost,
        on_delete=models.CASCADE,
        related_name="publishing_logs"
    )
    platform = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    platform_response = models.JSONField(blank=True, null=True)  # Store API response
    error_message = models.TextField(blank=True)
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=3)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.post.platform} - {self.status}"

    class Meta:
        ordering = ["-created_at"]


class PublishingQueue(models.Model):
    """Manages posts ready to be published"""
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    post = models.ForeignKey(
        ScheduledPost,
        on_delete=models.CASCADE,
        related_name="queue_entries"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    scheduled_for = models.DateTimeField()  # When post should be published
    attempts = models.PositiveIntegerField(default=0)
    last_attempt = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_for", "created_at"]
        indexes = [
            models.Index(fields=["status", "scheduled_for"]),
        ]

    def __str__(self):
        return f"Queue: {self.post.platform} - {self.status}"


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