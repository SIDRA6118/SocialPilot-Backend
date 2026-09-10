"""
FastAPI asynchronous publishing service for SocialPilot.

This module provides a lightweight FastAPI layer that triggers
the existing Django publishing queue in a background task.
"""

import os
import asyncio

from fastapi import FastAPI, BackgroundTasks
from django import setup


# ---------------------------------------------------------
# Django setup
# ---------------------------------------------------------

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "socialpilot.settings"
)

setup()


# Import Django services only after Django is initialized
from .services import QueueService


# ---------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------

app = FastAPI(
    title="SocialPilot Publishing Service",
    description="Asynchronous publishing and queue management service",
    version="1.0.0",
)


# ---------------------------------------------------------
# Background publishing task
# ---------------------------------------------------------

async def process_publishing_queue():
    """
    Process scheduled posts asynchronously.

    QueueService contains the actual publishing and retry logic.
    Running it through an async FastAPI background task prevents
    the API request from waiting for the publishing operation.
    """

    loop = asyncio.get_running_loop()

    result = await loop.run_in_executor(
        None,
        QueueService.process_pending_posts
    )

    return result


# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------

@app.get("/")
async def root():
    return {
        "service": "SocialPilot Publishing Service",
        "status": "running",
    }


# ---------------------------------------------------------
# Queue processing endpoint
# ---------------------------------------------------------

@app.post("/publish/process")
async def process_queue(background_tasks: BackgroundTasks):
    """
    Start asynchronous processing of the publishing queue.

    The API responds immediately while the queue is processed
    in the background.
    """

    background_tasks.add_task(process_publishing_queue)

    return {
        "status": "accepted",
        "message": "Publishing queue processing started in background",
    }