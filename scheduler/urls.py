from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ScheduledPostViewSet,
    RegisterView,
)

router = DefaultRouter()

router.register(
    r"posts",
    ScheduledPostViewSet,
    basename="posts",
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
]