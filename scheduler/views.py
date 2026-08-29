from django.contrib.auth.models import User

from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission

from .models import ScheduledPost, SocialAccount, TeamMember
from .serializers import (
    ScheduledPostSerializer,
    RegisterSerializer,
    SocialAccountSerializer,
    TeamMemberSerializer,
)


class RolePermission(BasePermission):
    def __init__(self, required_permission=None):
        self.required_permission = required_permission

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        permission = self.required_permission or getattr(view, "required_permission", None)
        if not permission:
            return True

        return TeamMember.user_has_permission(request.user, permission)


class ScheduledPostViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduledPostSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [IsAuthenticated()]
        if self.action in {"create"}:
            permissions.append(RolePermission(required_permission="create_post"))
        elif self.action in {"update", "partial_update"}:
            permissions.append(RolePermission(required_permission="edit_post"))
        elif self.action in {"destroy"}:
            permissions.append(RolePermission(required_permission="delete_post"))
        else:
            permissions.append(RolePermission(required_permission="view_posts"))
        return permissions

    def get_queryset(self):
        return ScheduledPost.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )


class SocialAccountViewSet(viewsets.ModelViewSet):
    serializer_class = SocialAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [IsAuthenticated()]
        if self.action in {"create", "destroy"}:
            permissions.append(RolePermission(required_permission="connect_channels"))
        else:
            permissions.append(RolePermission(required_permission="view_posts"))
        return permissions

    def get_queryset(self):
        return SocialAccount.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )


class TeamMemberViewSet(viewsets.ModelViewSet):
    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [IsAuthenticated()]
        if self.action in {"create", "destroy"}:
            permissions.append(RolePermission(required_permission="manage_team"))
        else:
            permissions.append(RolePermission(required_permission="view_team"))
        return permissions

    def get_queryset(self):
        return TeamMember.objects.filter(owner=self.request.user).select_related("member")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]