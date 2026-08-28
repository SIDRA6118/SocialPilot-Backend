from django.urls import path, include

from rest_framework.routers import DefaultRouter

from .views import (
    ScheduledPostViewSet,
    SocialAccountViewSet,
    TeamMemberViewSet,
    RegisterView,
)


router = DefaultRouter()

router.register(
    r"posts",
    ScheduledPostViewSet,
    basename="posts",
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


urlpatterns = [
    path("", include(router.urls)),

    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
]