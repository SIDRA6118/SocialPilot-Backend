from django.contrib.auth.models import User

from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import ScheduledPost
from .serializers import (
    ScheduledPostSerializer,
    RegisterSerializer,
)


class ScheduledPostViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduledPostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ScheduledPost.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]