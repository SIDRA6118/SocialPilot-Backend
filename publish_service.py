"""
FastAPI application for asynchronous publishing services
This runs separately from the Django application and handles background publishing tasks
"""

from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from datetime import datetime
import os
import sys
import django
from typing import Optional

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'socialpilot.settings')
django.setup()

from scheduler.models import ScheduledPost, PublishingQueue
from scheduler.services import QueueService

app = FastAPI(
    title="SocialPilot Publishing Service",
    description="Async publishing service for scheduled social media posts",
    version="1.0.0"
)


class PublishingStatus(BaseModel):
    """Response model for publishing status"""
    processed: int
    success: int
    failed: int
    timestamp: str


class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    message: str
    timestamp: str


@app.on_event("startup")
async def startup_event():
    """Run on startup"""
    print("Publishing service started")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on shutdown"""
    print("Publishing service stopped")


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Publishing service is running",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/publish/process-queue", response_model=PublishingStatus)
async def process_queue(background_tasks: BackgroundTasks):
    """
    Process all pending posts in the queue
    This endpoint triggers the queue processing and returns immediately
    """
    
    # Run the queue processing in the background
    background_tasks.add_task(QueueService.process_pending_posts)
    
    # Get current queue status
    pending_count = PublishingQueue.objects.filter(status="pending").count()
    processing_count = PublishingQueue.objects.filter(status="processing").count()
    
    return {
        "processed": 0,
        "success": 0,
        "failed": 0,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/publish/queue-status")
async def queue_status():
    """Get current queue status"""
    pending = PublishingQueue.objects.filter(status="pending").count()
    processing = PublishingQueue.objects.filter(status="processing").count()
    completed = PublishingQueue.objects.filter(status="completed").count()
    failed = PublishingQueue.objects.filter(status="failed").count()
    
    return {
        "pending": pending,
        "processing": processing,
        "completed": completed,
        "failed": failed,
        "total": pending + processing + completed + failed,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/publish/retry/{post_id}")
async def retry_publish(post_id: int, background_tasks: BackgroundTasks):
    """
    Retry publishing a specific post
    """
    try:
        post = ScheduledPost.objects.get(id=post_id)
        
        # Create or update queue entry
        queue_entry, created = PublishingQueue.objects.get_or_create(
            post=post,
            defaults={'status': 'pending', 'scheduled_for': post.scheduled_time}
        )
        
        # Reset status for retry
        queue_entry.status = 'pending'
        queue_entry.attempts = 0
        queue_entry.error_message = ''
        queue_entry.save()
        
        # Process in background
        background_tasks.add_task(QueueService.process_pending_posts)
        
        return {
            "message": f"Queued post {post_id} for retry",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except ScheduledPost.DoesNotExist:
        raise HTTPException(status_code=404, detail=f"Post {post_id} not found")


@app.get("/publish/pending-posts")
async def get_pending_posts(limit: int = 10):
    """Get list of pending posts ready to publish"""
    from django.utils import timezone
    
    now = timezone.now()
    pending_posts = PublishingQueue.objects.filter(
        status="pending",
        scheduled_for__lte=now
    ).select_related("post").order_by("scheduled_for")[:limit]
    
    return {
        "count": len(pending_posts),
        "posts": [
            {
                "id": entry.post.id,
                "platform": entry.post.platform,
                "scheduled_for": entry.scheduled_for.isoformat(),
                "content": entry.post.content[:100] + "..." if len(entry.post.content) > 100 else entry.post.content,
                "attempts": entry.attempts
            }
            for entry in pending_posts
        ],
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
