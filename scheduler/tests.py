from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from scheduler.models import Draft, PublishingQueue, ScheduledPost, TeamMember


class RoleAccessControlTests(TestCase):
    def test_role_choices_include_required_roles(self):
        roles = dict(TeamMember.ROLE_CHOICES)

        self.assertEqual(
            roles["creator"],
            "Content Creator",
        )
        self.assertEqual(
            roles["marketing"],
            "Marketing Team",
        )
        self.assertEqual(
            roles["business"],
            "Business User",
        )
        self.assertEqual(
            roles["administrator"],
            "Administrator",
        )

    def test_role_permissions_are_enforced_by_action(self):
        self.assertTrue(TeamMember.has_permission("create_post", "creator"))
        self.assertTrue(TeamMember.has_permission("manage_team", "administrator"))
        self.assertFalse(TeamMember.has_permission("manage_team", "creator"))
        self.assertTrue(TeamMember.has_permission("view_analytics", "marketing"))
        self.assertTrue(TeamMember.has_permission("connect_channels", "business"))


class PublishingWorkflowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("workflow-user", password="test-password")
        self.client.force_authenticate(self.user)

    def test_create_and_convert_draft(self):
        response = self.client.post(
            "/api/drafts/",
            {"content": "Milestone 2 draft post for testing", "platform": "linkedin"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        draft = Draft.objects.get(user=self.user)
        scheduled_time = timezone.now() + timedelta(days=1)

        response = self.client.post(
            f"/api/drafts/{draft.id}/convert_to_post/",
            {"platform": "linkedin", "scheduled_time": scheduled_time.isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(Draft.objects.filter(pk=draft.id).exists())
        self.assertEqual(ScheduledPost.objects.filter(user=self.user).count(), 1)
        self.assertEqual(PublishingQueue.objects.filter(post__user=self.user).count(), 1)

    def test_recurring_posts_create_weekly_instances_and_queue_total(self):
        scheduled_time = timezone.now() + timedelta(days=1)
        response = self.client.post(
            "/api/posts/",
            {
                "content": "Weekly SocialPilot campaign update",
                "platform": "linkedin",
                "scheduled_time": scheduled_time.isoformat(),
                "is_recurring": True,
                "recurrence": "weekly",
                "recurrence_end_date": (scheduled_time + timedelta(days=30)).date().isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ScheduledPost.objects.filter(user=self.user).count(), 5)
        self.assertEqual(PublishingQueue.objects.filter(post__user=self.user).count(), 5)

        response = self.client.get("/api/posts/queue_status/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pending"], 5)
        self.assertEqual(response.data["total"], 5)
