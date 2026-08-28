from django.urls import path, include

from rest_framework.routers import DefaultRouter

from .views import (
    ScheduledPostViewSet,
    SocialAccountViewSet,
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


urlpatterns = [
    path("", include(router.urls)),

    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
]