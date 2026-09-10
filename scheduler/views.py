from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta

import secrets
import httpx

from django.conf import settings
from django.core.signing import dumps, loads, BadSignature, SignatureExpired
from django.shortcuts import redirect
from urllib.parse import urlencode

from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission

from .models import ScheduledPost, SocialAccount, TeamMember, Draft, PublishingLog, PublishingQueue
from .serializers import (
    ScheduledPostSerializer,
    RegisterSerializer,
    SocialAccountSerializer,
    TeamMemberSerializer,
    DraftSerializer,
    PublishingLogSerializer,
    PublishingQueueSerializer,
)
from .services import QueueService

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


class DraftViewSet(viewsets.ModelViewSet):
    serializer_class = DraftSerializer
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
        return Draft.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def convert_to_post(self, request, pk=None):
        """Convert a draft to a scheduled post"""
        draft = self.get_object()
        
        # Validate that required fields are provided
        platform = request.data.get('platform')
        scheduled_time = request.data.get('scheduled_time')
        
        if not platform:
            return Response(
                {"error": "Platform is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not scheduled_time:
            return Response(
                {"error": "Scheduled time is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            scheduled_time = datetime.fromisoformat(scheduled_time)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid scheduled time format"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if timezone.is_naive(scheduled_time):
            scheduled_time = timezone.make_aware(scheduled_time, timezone.get_current_timezone())

        if scheduled_time <= timezone.now():
            return Response(
                {"error": "Scheduled time must be in the future"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Create scheduled post from draft
        post = ScheduledPost.objects.create(
            user=request.user,
            content=draft.content,
            platform=platform,
            content_type=draft.content_type,
            media_url=draft.media_url,
            scheduled_time=scheduled_time,
            status="scheduled"
        )
        
        # Delete draft
        draft.delete()
        
        # Create queue entry
        PublishingQueue.objects.create(
            post=post,
            status="pending",
            scheduled_for=scheduled_time
        )
        
        return Response(
            ScheduledPostSerializer(post).data,
            status=status.HTTP_201_CREATED
        )


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
        ).prefetch_related("publishing_logs")

    def perform_create(self, serializer):
        post = serializer.save(user=self.request.user)
        
        # Create queue entry for this post
        PublishingQueue.objects.create(
            post=post,
            status="pending",
            scheduled_for=post.scheduled_time
        )
        
        # If recurring, generate future instances
        if post.is_recurring and post.recurrence:
            self._generate_recurring_instances(post)

    def _generate_recurring_instances(self, post):
        """Generate instances for recurring posts"""
        if not post.recurrence_end_date:
            # Default to 1 year if no end date
            post.recurrence_end_date = post.scheduled_time + timedelta(days=365)
            post.save()
        
        current_time = post.scheduled_time
        recurrence = post.recurrence.lower()
        
        while current_time < post.recurrence_end_date:
            if recurrence == "daily":
                current_time += timedelta(days=1)
            elif recurrence == "weekly":
                current_time += timedelta(weeks=1)
            elif recurrence == "monthly":
                try:
                    current_time = current_time.replace(month=current_time.month + 1)
                except ValueError:
                    current_time = current_time.replace(day=28).replace(month=current_time.month + 1)
            else:
                break
            
            if current_time < post.recurrence_end_date:
                recurring_post = ScheduledPost.objects.create(
                    user=post.user,
                    content=post.content,
                    platform=post.platform,
                    content_type=post.content_type,
                    media_url=post.media_url,
                    scheduled_time=current_time,
                    status="scheduled",
                    is_recurring=False,
                    parent_post=post,
                )
                PublishingQueue.objects.create(
                    post=recurring_post,
                    status="pending",
                    scheduled_for=current_time
                )

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """Get posts for calendar view with date range filtering"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.get_queryset()
        
        if start_date:
            try:
                start_date = datetime.fromisoformat(start_date)
                queryset = queryset.filter(scheduled_time__gte=start_date)
            except (ValueError, TypeError):
                pass
        
        if end_date:
            try:
                end_date = datetime.fromisoformat(end_date)
                queryset = queryset.filter(scheduled_time__lte=end_date)
            except (ValueError, TypeError):
                pass
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def queue_status(self, request):
        """Get publishing queue status"""
        total = PublishingQueue.objects.filter(
            post__user=request.user
        ).count()
        
        pending = PublishingQueue.objects.filter(
            post__user=request.user,
            status="pending"
        ).count()
        
        processing = PublishingQueue.objects.filter(
            post__user=request.user,
            status="processing"
        ).count()
        
        completed = PublishingQueue.objects.filter(
            post__user=request.user,
            status="completed"
        ).count()
        
        return Response({
            "total": total,
            "pending": pending,
            "processing": processing,
            "completed": completed,
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a scheduled post"""
        post = self.get_object()
        
        if post.status not in ["scheduled", "pending"]:
            return Response(
                {"error": "Can only cancel scheduled or pending posts"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        post.status = "cancelled"
        post.save()
        
        # Update queue entry
        PublishingQueue.objects.filter(post=post).update(status="cancelled")
        
        return Response(ScheduledPostSerializer(post).data)

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule a post to a different time"""
        post = self.get_object()
        new_time = request.data.get('scheduled_time')
        
        if not new_time:
            return Response(
                {"error": "scheduled_time is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_time = datetime.fromisoformat(new_time)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid datetime format"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_time <= timezone.now():
            return Response(
                {"error": "Scheduled time must be in the future"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        post.scheduled_time = new_time
        post.save()
        
        # Update queue entry
        PublishingQueue.objects.filter(post=post).update(
            scheduled_for=new_time,
            status="pending"
        )
        
        return Response(ScheduledPostSerializer(post).data)



class PublishingQueueViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PublishingQueueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PublishingQueue.objects.filter(
            post__user=self.request.user
        ).select_related("post")

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """Get all pending posts ready to publish"""
        now = timezone.now()

        pending_posts = PublishingQueue.objects.filter(
            post__user=request.user,
            status="pending",
            scheduled_for__lte=now
        ).select_related("post")

        serializer = self.get_serializer(
            pending_posts,
            many=True
        )

        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def process(self, request):
        """Process all pending posts that are ready to publish"""

        try:
            results = QueueService.process_pending_posts()

            return Response(
                results,
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )        


class PublishingLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PublishingLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PublishingLog.objects.filter(
            post__user=self.request.user
        ).select_related("post")


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
            permissions.append(
                RolePermission(required_permission="manage_team")
            )

        return permissions

    def get_queryset(self):
        return TeamMember.objects.filter(
            owner=self.request.user
        ).select_related("member")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class LinkedInConnectView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        state = dumps(
            {
                "user_id": request.user.id,
                "nonce": secrets.token_urlsafe(16),
            },
            salt="linkedin-oauth",
        )

        params = {
            "response_type": "code",
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
            "state": state,
            "scope": "openid profile w_member_social",
        }

        linkedin_url = (
            "https://www.linkedin.com/oauth/v2/authorization?"
            + urlencode(params)
        )

        return Response({"authorization_url": linkedin_url})
            

class LinkedInCallbackView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        state = request.GET.get("state")
        error = request.GET.get("error")

        frontend_url = getattr(
            settings,
            "FRONTEND_URL",
            "http://localhost:5173"
        )

        if error:
            return redirect(
                f"{frontend_url}/?linkedin=error&message={error}"
            )

        if not code or not state:
            return redirect(
                f"{frontend_url}/?linkedin=error&message=missing_code_or_state"
            )

        try:
            state_data = loads(
                state,
                salt="linkedin-oauth",
                max_age=600,
            )
        except (BadSignature, SignatureExpired):
            return redirect(
                f"{frontend_url}/?linkedin=error&message=invalid_state"
            )

        user_id = state_data.get("user_id")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return redirect(
                f"{frontend_url}/?linkedin=error&message=user_not_found"
            )

        token_url = "https://www.linkedin.com/oauth/v2/accessToken"

        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "client_secret": settings.LINKEDIN_CLIENT_SECRET,
        }

        try:
            token_response = httpx.post(
                token_url,
                data=token_data,
                timeout=20,
            )

            print("LINKEDIN TOKEN STATUS:", token_response.status_code)
            print("LINKEDIN TOKEN RESPONSE:", token_response.text)

            token_response.raise_for_status()
            token_json = token_response.json()

        except httpx.HTTPError as error:
            print("LINKEDIN TOKEN ERROR:", error)

            return redirect(
                f"{frontend_url}/?linkedin=error&message=token_exchange_failed"
        )
        access_token = token_json.get("access_token")

        if not access_token:
            return redirect(
                f"{frontend_url}/?linkedin=error&message=no_access_token"
            )

        # Get LinkedIn profile information
        try:
            profile_response = httpx.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
                timeout=20,
            )
            profile_response.raise_for_status()
            profile = profile_response.json()

        except httpx.HTTPError:
            return redirect(
                f"{frontend_url}/?linkedin=error&message=profile_fetch_failed"
            )

        linkedin_id = profile.get("sub")
        first_name = profile.get("given_name", "")
        last_name = profile.get("family_name", "")

        linkedin_name = (
            profile.get("name")
            or f"{first_name} {last_name}".strip()
            or "LinkedIn Account"
        )

        if not linkedin_id:
            return redirect(
                f"{frontend_url}/?linkedin=error&message=profile_id_missing"
            )

        # Save/update LinkedIn account
        SocialAccount.objects.update_or_create(
            user=user,
            platform="linkedin",
            defaults={
                "account_name": linkedin_name,
                "access_token": access_token,
                "account_id": linkedin_id,
            },
        )

        return redirect(
            f"{frontend_url}/?linkedin=connected"
        )

class InstagramConnectView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        state = dumps(
            {
                "user_id": request.user.id,
                "nonce": secrets.token_urlsafe(16),
            },
            salt="instagram-oauth",
        )

        params = {
            "client_id": settings.INSTAGRAM_APP_ID,
            "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
            "state": state,
            "scope": "instagram_business_basic,instagram_business_content_publish",
            "response_type": "code",
        }

        instagram_url = (
            "https://www.instagram.com/oauth/authorize?"
            + urlencode(params)
        )

        return Response({
            "authorization_url": instagram_url
        })


class InstagramCallbackView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        state = request.GET.get("state")
        error = request.GET.get("error")

        frontend_url = getattr(
            settings,
            "FRONTEND_URL",
            "http://localhost:5173"
        )

        if error:
            return redirect(
                f"{frontend_url}/?instagram=error&message={error}"
            )

        if not code or not state:
            return redirect(
                f"{frontend_url}/?instagram=error&message=missing_code_or_state"
            )

        # Validate OAuth state
        try:
            state_data = loads(
                state,
                salt="instagram-oauth",
                max_age=600,
            )
        except (BadSignature, SignatureExpired):
            return redirect(
                f"{frontend_url}/?instagram=error&message=invalid_state"
            )

        user_id = state_data.get("user_id")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return redirect(
                f"{frontend_url}/?instagram=error&message=user_not_found"
            )

        # Exchange authorization code for Instagram access token
        token_url = "https://api.instagram.com/oauth/access_token"

        token_data = {
            "client_id": settings.INSTAGRAM_APP_ID,
            "client_secret": settings.INSTAGRAM_APP_SECRET,
            "grant_type": "authorization_code",
            "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
            "code": code,
        }

        try:
            token_response = httpx.post(
                token_url,
                data=token_data,
                timeout=20,
            )

            print(
                "INSTAGRAM TOKEN STATUS:",
                token_response.status_code
            )
            print(
                "INSTAGRAM TOKEN RESPONSE:",
                token_response.text
            )

            token_response.raise_for_status()
            token_json = token_response.json()

        except httpx.HTTPError as error:
            print("INSTAGRAM TOKEN ERROR:", error)

            return redirect(
                f"{frontend_url}/?instagram=error&message=token_exchange_failed"
            )

        access_token = token_json.get("access_token")
        instagram_user_id = token_json.get("user_id")

        if not access_token or not instagram_user_id:
            return redirect(
                f"{frontend_url}/?instagram=error&message=instagram_account_missing"
            )

        # Fetch Instagram account information
        try:
            profile_response = httpx.get(
                f"https://graph.instagram.com/{instagram_user_id}",
                params={
                    "fields": "id,username,account_type",
                    "access_token": access_token,
                },
                timeout=20,
            )

            print(
                "INSTAGRAM PROFILE STATUS:",
                profile_response.status_code
            )
            print(
                "INSTAGRAM PROFILE RESPONSE:",
                profile_response.text
            )

            profile_response.raise_for_status()
            profile = profile_response.json()

        except httpx.HTTPError as error:
            print("INSTAGRAM PROFILE ERROR:", error)

            return redirect(
                f"{frontend_url}/?instagram=error&message=profile_fetch_failed"
            )

        instagram_id = profile.get("id")
        username = profile.get("username")

        if not instagram_id:
            return redirect(
                f"{frontend_url}/?instagram=error&message=profile_id_missing"
            )

        # Save/update Instagram account
        SocialAccount.objects.update_or_create(
            user=user,
            platform="instagram",
            defaults={
                "account_name": (
                    f"@{username}"
                    if username
                    else "Instagram Account"
                ),
                "access_token": access_token,
                "account_id": instagram_id,
            },
        )

        return redirect(
            f"{frontend_url}/?instagram=connected"
        )
class FacebookConnectView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        state = dumps(
            {
                "user_id": request.user.id,
                "nonce": secrets.token_urlsafe(16),
            },
            salt="facebook-oauth",
        )

        params = {
            "client_id": settings.FACEBOOK_APP_ID,
            "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
            "state": state,
            "config_id": settings.FACEBOOK_CONFIG_ID,
            "response_type": "code",
        }

        facebook_url = (
            "https://www.facebook.com/v24.0/dialog/oauth?"
            + urlencode(params)
        )

        return Response({
            "authorization_url": facebook_url
        })
class FacebookCallbackView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        state = request.GET.get("state")
        error = request.GET.get("error")

        frontend_url = getattr(
            settings,
            "FRONTEND_URL",
            "http://localhost:5173"
        )

        if error:
            return redirect(
                f"{frontend_url}/?facebook=error&message={error}"
            )

        if not code or not state:
            return redirect(
                f"{frontend_url}/?facebook=error&message=missing_code_or_state"
            )

        try:
            state_data = loads(
                state,
                salt="facebook-oauth",
                max_age=600,
            )
        except (BadSignature, SignatureExpired):
            return redirect(
                f"{frontend_url}/?facebook=error&message=invalid_state"
            )

        user_id = state_data.get("user_id")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return redirect(
                f"{frontend_url}/?facebook=error&message=user_not_found"
            )

        # Exchange authorization code for Facebook user access token
        token_url = "https://graph.facebook.com/v24.0/oauth/access_token"

        token_params = {
            "client_id": settings.FACEBOOK_APP_ID,
            "client_secret": settings.FACEBOOK_APP_SECRET,
            "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
            "code": code,
        }

        try:
            token_response = httpx.get(
                token_url,
                params=token_params,
                timeout=20,
            )

            print(
                "FACEBOOK TOKEN STATUS:",
                token_response.status_code
            )
            print(
                "FACEBOOK TOKEN RESPONSE:",
                token_response.text
            )

            token_response.raise_for_status()
            token_json = token_response.json()

        except httpx.HTTPError as error:
            print("FACEBOOK TOKEN ERROR:", error)

            return redirect(
                f"{frontend_url}/?facebook=error&message=token_exchange_failed"
            )

        access_token = token_json.get("access_token")

        if not access_token:
            return redirect(
                f"{frontend_url}/?facebook=error&message=no_access_token"
            )

        # Get Facebook Pages connected to this account
        pages_url = "https://graph.facebook.com/v24.0/me/accounts"

        try:
            pages_response = httpx.get(
                pages_url,
                params={
                    "access_token": access_token,
                    "fields": "id,name,access_token",
                },
                timeout=20,
            )

            print(
                "FACEBOOK PAGES STATUS:",
                pages_response.status_code
            )
            print(
                "FACEBOOK PAGES RESPONSE:",
                pages_response.text
            )

            pages_response.raise_for_status()
            pages_json = pages_response.json()

        except httpx.HTTPError as error:
            print("FACEBOOK PAGES ERROR:", error)

            return redirect(
                f"{frontend_url}/?facebook=error&message=pages_fetch_failed"
            )

        pages = pages_json.get("data", [])

        if not pages:
            return redirect(
                f"{frontend_url}/?facebook=error&message=no_pages_found"
            )

        # Save the first available Facebook Page
        page = pages[0]

        page_id = page.get("id")
        page_name = page.get("name")
        page_access_token = page.get("access_token")

        if not page_id or not page_access_token:
            return redirect(
                f"{frontend_url}/?facebook=error&message=page_token_missing"
            )

        SocialAccount.objects.update_or_create(
            user=user,
            platform="facebook",
            account_id=page_id,
            defaults={
                "account_name": page_name or "Facebook Page",
                "access_token": page_access_token,
            },
        )

        return redirect(
            f"{frontend_url}/?facebook=connected"
        )

