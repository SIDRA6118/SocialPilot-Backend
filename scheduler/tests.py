from django.test import TestCase

from scheduler.models import TeamMember


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
