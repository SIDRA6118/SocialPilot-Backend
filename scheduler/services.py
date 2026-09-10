"""
Services for publishing, scheduling, and queue management
"""
import json
import requests
import httpx
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings

from .models import ScheduledPost, PublishingLog, PublishingQueue, SocialAccount


class PublishingService:
    """Base service for publishing posts to social platforms"""
    
    @staticmethod
    def publish_post(post):
        """
        Publish a post to its platform
        Returns: (success: bool, response: dict, error: str)
        """
        try:
            # Get social account for this user/platform
            platform = post.platform.lower()

            social_account = SocialAccount.objects.filter(
                user=post.user,
                platform=platform
            ).first()
            
            if not social_account:
                raise Exception(f"No social account found for {post.platform}")
            
            # Create publishing log entry
            log = PublishingLog.objects.create(
                post=post,
                platform=post.platform,
                status="processing"
            )
            
            # Call platform-specific publisher
            platform_publisher = PlatformPublisherFactory.get_publisher(platform)
            success, response, error = platform_publisher.publish(
                post,
                social_account
            )
            
            # Update log
            log.attempts += 1
            if success:
                log.status = "published"
                log.platform_response = response
                post.status = "published"
                post.published_at = timezone.now()
            else:
                if log.attempts >= log.max_attempts:
                    log.status = "failed"
                    post.status = "failed"
                else:
                    log.status = "pending"
                
                log.error_message = error
            
            log.save()
            post.save()
            
            return success, response, error
            
        except Exception as e:
            error_msg = str(e)
            PublishingLog.objects.create(
                post=post,
                platform=post.platform,
                status="failed",
                error_message=error_msg,
                attempts=1
            )
            post.status = "failed"
            post.save()
            return False, None, error_msg


class PlatformPublisher:
    """Base class for platform-specific publishers"""
    
    def publish(self, post, social_account):
        """
        Publish a post
        Returns: (success: bool, response: dict, error: str)
        """
        raise NotImplementedError


class FacebookPublisher(PlatformPublisher):
    """Facebook publishing implementation"""
    
    def publish(self, post, social_account):
        """Publish to Facebook"""
        try:
            # This is a placeholder for actual Facebook Graph API integration
            # In production, use: https://developers.facebook.com/docs/graph-api
            
            if not social_account.access_token:
                return False, None, "Missing access token"
            
            # Placeholder: would call Facebook API here
            response = {
                "status": "published",
                "platform": "facebook",
                "post_id": f"facebook_{post.id}_{timezone.now().timestamp()}",
                "timestamp": timezone.now().isoformat(),
            }
            
            return True, response, None
            
        except Exception as e:
            return False, None, str(e)


class InstagramPublisher(PlatformPublisher):
    """Instagram publishing implementation using Instagram Graph API"""

    def publish(self, post, social_account):
        """Publish a post to Instagram"""
        try:
            if not social_account.access_token:
                return False, None, "Missing access token"

            access_token = social_account.access_token

            # Instagram account ID
            instagram_user_id = social_account.account_id

            if not instagram_user_id:
                return False, None, "Missing Instagram account ID"

            # Instagram requires a publicly accessible image URL
            if not post.media_url:
                return False, None, "Instagram requires an image URL"

            # Step 1: Create media container
            container_url = (
                f"https://graph.facebook.com/v26.0/"
                f"{instagram_user_id}/media"
            )

            container_data = {
                "image_url": post.media_url,
                "caption": post.content or "",
                "access_token": access_token,
            }

            container_response = requests.post(
                container_url,
                data=container_data,
                timeout=30,
            )

            container_result = container_response.json()

            if container_response.status_code != 200 or "id" not in container_result:
                return (
                    False,
                    None,
                    container_result.get("error", {}).get(
                        "message",
                        "Failed to create Instagram media container"
                    ),
                )

            creation_id = container_result["id"]

            # Step 2: Publish the media container
            publish_url = (
                f"https://graph.facebook.com/v26.0/"
                f"{instagram_user_id}/media_publish"
            )

            publish_data = {
                "creation_id": creation_id,
                "access_token": access_token,
            }

            publish_response = requests.post(
                publish_url,
                data=publish_data,
                timeout=30,
            )

            publish_result = publish_response.json()

            if publish_response.status_code != 200 or "id" not in publish_result:
                return (
                    False,
                    None,
                    publish_result.get("error", {}).get(
                        "message",
                        "Failed to publish Instagram post"
                    ),
                )

            response = {
                "status": "published",
                "platform": "instagram",
                "post_id": publish_result["id"],
                "creation_id": creation_id,
                "timestamp": timezone.now().isoformat(),
            }

            return True, response, None

        except requests.RequestException as e:
            return False, None, f"Instagram API request failed: {str(e)}"

        except Exception as e:
            return False, None, str(e)

class TwitterPublisher(PlatformPublisher):
    """Twitter/X publishing implementation"""
    
    def publish(self, post, social_account):
        """Publish to Twitter/X"""
        try:
            # Placeholder for Twitter API v2 integration
            # In production, use: https://developer.twitter.com/en/docs/twitter-api
            
            if not social_account.access_token:
                return False, None, "Missing access token"
            
            response = {
                "status": "published",
                "platform": "twitter",
                "post_id": f"twitter_{post.id}_{timezone.now().timestamp()}",
                "timestamp": timezone.now().isoformat(),
            }
            
            return True, response, None
            
        except Exception as e:
            return False, None, str(e)


class LinkedInPublisher(PlatformPublisher):
    """LinkedIn publishing implementation"""

    API_URL = "https://api.linkedin.com/v2/ugcPosts"

    def publish(self, post, social_account):
        """Publish a text post to LinkedIn using the LinkedIn API"""

        try:
            access_token = social_account.access_token
            author_id = social_account.account_id

            if not access_token:
                return False, None, "Missing LinkedIn access token"

            if not author_id:
                return False, None, "Missing LinkedIn account ID"

            payload = {
                "author": f"urn:li:person:{author_id}",
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": post.content
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            }

            response = httpx.post(
                self.API_URL,
                headers=headers,
                json=payload,
                timeout=30.0,
            )

            if response.status_code in [200, 201]:
                return True, {
                    "status": "published",
                    "platform": "linkedin",
                    "post_id": response.headers.get(
                        "X-RestLi-Id"
                    ),
                    "response": response.json()
                    if response.content
                    else {},
                    "timestamp": timezone.now().isoformat(),
                }, None

            try:
                error_data = response.json()
            except Exception:
                error_data = response.text

            return False, None, (
                f"LinkedIn API error ({response.status_code}): "
                f"{error_data}"
            )

        except httpx.RequestError as e:
            return False, None, f"LinkedIn connection error: {str(e)}"

        except Exception as e:
            return False, None, str(e)          


class YouTubePublisher(PlatformPublisher):
    """YouTube publishing implementation"""
    
    def publish(self, post, social_account):
        """Publish to YouTube"""
        try:
            # Placeholder for YouTube API integration
            # In production, use: https://developers.google.com/youtube/v3
            
            if not social_account.access_token:
                return False, None, "Missing access token"
            
            response = {
                "status": "published",
                "platform": "youtube",
                "post_id": f"youtube_{post.id}_{timezone.now().timestamp()}",
                "timestamp": timezone.now().isoformat(),
            }
            
            return True, response, None
            
        except Exception as e:
            return False, None, str(e)


class PinterestPublisher(PlatformPublisher):
    """Pinterest publishing implementation"""
    
    def publish(self, post, social_account):
        """Publish to Pinterest"""
        try:
            # Placeholder for Pinterest API integration
            # In production, use: https://developers.pinterest.com/
            
            if not social_account.access_token:
                return False, None, "Missing access token"
            
            response = {
                "status": "published",
                "platform": "pinterest",
                "post_id": f"pinterest_{post.id}_{timezone.now().timestamp()}",
                "timestamp": timezone.now().isoformat(),
            }
            
            return True, response, None
            
        except Exception as e:
            return False, None, str(e)


class PlatformPublisherFactory:
    """Factory for getting platform-specific publishers"""
    
    PUBLISHERS = {
        "facebook": FacebookPublisher,
        "instagram": InstagramPublisher,
        "twitter": TwitterPublisher,
        "linkedin": LinkedInPublisher,
        "youtube": YouTubePublisher,
        "pinterest": PinterestPublisher,
    }
    
    @classmethod
    def get_publisher(cls, platform):
        """Get publisher for a specific platform"""
        publisher_class = cls.PUBLISHERS.get(platform.lower())
        
        if not publisher_class:
            raise ValueError(f"Unknown platform: {platform}")
        
        return publisher_class()


class QueueService:
    """Service for managing publishing queue"""
    
    @staticmethod
    def process_pending_posts():
        """
        Process all posts that are ready to be published
        Should be called by a scheduled task (Celery or similar)
        """
        now = timezone.now()
        
        # Get all pending queue entries that are due
        pending_entries = PublishingQueue.objects.filter(
            status="pending",
            scheduled_for__lte=now
        ).select_related("post").order_by("scheduled_for")[:100]  # Process max 100 per run
        
        results = {
            "processed": 0,
            "success": 0,
            "failed": 0,
            "errors": []
        }
        
        for entry in pending_entries:
            try:
                post = entry.post
                
                # Skip if already published or cancelled
                if post.status in ["published", "cancelled", "failed"]:
                    entry.status = "completed"
                    entry.save()
                    results["processed"] += 1
                    continue
                
                # Update entry status
                entry.status = "processing"
                entry.last_attempt = now
                entry.attempts += 1
                entry.save()
                
                # Publish the post
                success, response, error = PublishingService.publish_post(post)
                
                if success:
                    entry.status = "completed"
                    results["success"] += 1
                else:
                    if entry.attempts >= 3:  # Max retries
                        entry.status = "failed"
                        entry.error_message = error
                    else:
                        entry.status = "pending"
                        entry.error_message = error
                    
                    results["failed"] += 1
                    results["errors"].append({
                        "post_id": post.id,
                        "error": error
                    })
                
                entry.save()
                results["processed"] += 1
                
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "entry_id": entry.id,
                    "error": str(e)
                })
        
        return results


class RecurringPostService:
    """Service for handling recurring posts"""
    
    @staticmethod
    def generate_recurring_instances(post):
        """Generate future instances for a recurring post"""
        if not post.is_recurring or not post.recurrence:
            return []
        
        if not post.recurrence_end_date:
            post.recurrence_end_date = post.scheduled_time + timedelta(days=365)
            post.save()
        
        instances = []
        current_time = post.scheduled_time
        recurrence = post.recurrence.lower()
        
        while current_time < post.recurrence_end_date:
            if recurrence == "daily":
                current_time += timedelta(days=1)
            elif recurrence == "weekly":
                current_time += timedelta(weeks=1)
            elif recurrence == "monthly":
                try:
                    if current_time.month == 12:
                        current_time = current_time.replace(year=current_time.year + 1, month=1)
                    else:
                        current_time = current_time.replace(month=current_time.month + 1)
                except ValueError:
                    # Handle end of month edge cases
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
                
                # Add to queue
                PublishingQueue.objects.create(
                    post=recurring_post,
                    status="pending",
                    scheduled_for=current_time
                )
                
                instances.append(recurring_post)
        
        return instances
