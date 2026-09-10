from django.urls import path, include

from rest_framework.routers import DefaultRouter

from .views import (
    ScheduledPostViewSet,
    SocialAccountViewSet,
    TeamMemberViewSet,
    DraftViewSet,
    PublishingQueueViewSet,
    PublishingLogViewSet,
    RegisterView,
    LinkedInConnectView,
    LinkedInCallbackView,
    FacebookConnectView,
    FacebookCallbackView,
    InstagramConnectView,
    InstagramCallbackView,
)


router = DefaultRouter()

router.register(
    r"posts",
    ScheduledPostViewSet,
    basename="posts",
)

router.register(
    r"drafts",
    DraftViewSet,
    basename="drafts",
)

router.register(
    r"social-accounts",
    SocialAccountViewSet,
    basename="social-accounts",
)

router.register(
    r"team-members",
    TeamMemberViewSet,
    basename="team-members",
)

router.register(
    r"queue",
    PublishingQueueViewSet,
    basename="queue",
)

router.register(
    r"publishing-logs",
    PublishingLogViewSet,
    basename="publishing-logs",
)


urlpatterns = [
    path("", include(router.urls)),

    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),

    path(
        "linkedin/connect/",
        LinkedInConnectView.as_view(),
        name="linkedin-connect",
    ),

    path(
        "linkedin/callback/",
        LinkedInCallbackView.as_view(),
        name="linkedin-callback",
    ),

        path(
        "facebook/connect/",
        FacebookConnectView.as_view(),
        name="facebook-connect",
    ),

    path(
        "facebook/callback/",
        FacebookCallbackView.as_view(),
        name="facebook-callback",
    ),

    path(
        "instagram/connect/",
        InstagramConnectView.as_view(),
        name="instagram-connect",
    ),

    path(
        "instagram/callback/",
        InstagramCallbackView.as_view(),
        name="instagram-callback",
    ),
]