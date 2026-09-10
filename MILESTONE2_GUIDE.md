# Milestone 2 Implementation Guide

## Overview
This document explains the Milestone 2 implementation for the SocialPilot platform, including content scheduling workflows, publishing calendar, drafts, recurring posts, and asynchronous publishing.

## New Features Implemented

### 1. **Draft System**
Users can now save incomplete posts as drafts and convert them to scheduled posts later.

**Features:**
- Create, edit, and delete drafts
- Save draft title, content, platform selection (optional), and media URLs
- Convert drafts to scheduled posts with proper scheduling
- Drafts persist in the database across sessions

**API Endpoints:**
- `GET /api/drafts/` - List all drafts for the authenticated user
- `POST /api/drafts/` - Create a new draft
- `PATCH /api/drafts/{id}/` - Update a draft
- `DELETE /api/drafts/{id}/` - Delete a draft
- `POST /api/drafts/{id}/convert_to_post/` - Convert draft to scheduled post

### 2. **Content Scheduling Workflows**
Enhanced the scheduling system to support:

**Features:**
- Create posts with specific platforms and scheduled times
- Validate that scheduled times are in the future
- Automatic creation of publishing queue entries
- Support for recurring posts (daily, weekly, monthly)
- Reschedule posts to different times
- Cancel scheduled posts
- Post status tracking (draft, scheduled, processing, published, failed, cancelled)

**API Endpoints:**
- `GET /api/posts/` - List scheduled posts
- `POST /api/posts/` - Create a new post
- `PATCH /api/posts/{id}/` - Update a post
- `DELETE /api/posts/{id}/` - Delete a post
- `POST /api/posts/{id}/cancel/` - Cancel a scheduled post
- `POST /api/posts/{id}/reschedule/` - Reschedule a post
- `GET /api/posts/calendar/` - Get posts for calendar view with date range filtering

### 3. **Publishing Calendar**
Interactive calendar view displaying scheduled posts by date.

**Features:**
- View all scheduled posts by month
- Click on any date to see posts scheduled for that day
- Shows post count indicator for dates with multiple posts
- Displays post details (time, platform, content preview, status)
- Navigate between months

### 4. **Queue Management**
Manages posts ready to be published.

**Features:**
- Automatic creation of queue entries when posts are scheduled
- Queue status tracking (pending, processing, completed, failed)
- View pending posts ready to publish
- Auto-refresh queue status (every 10 seconds)
- Retry functionality for failed posts
- Publishing attempt tracking

**API Endpoints:**
- `GET /api/queue/` - List queue entries
- `GET /api/queue/pending/` - Get posts ready to publish
- `GET /api/posts/queue_status/` - Get queue statistics

### 5. **Publishing Logs & Tracking**
Tracks all publishing attempts and results.

**Features:**
- Records publishing status for each post
- Stores platform API responses
- Tracks error messages for failed attempts
- Maintains attempt count for retries
- Full publishing history for each post

**API Endpoints:**
- `GET /api/publishing-logs/` - List all publishing logs
- Logs are automatically created when attempting to publish

### 6. **Recurring Posts**
Support for recurring post scheduling.

**Features:**
- Create posts that repeat on a schedule
- Supported recurrence patterns: daily, weekly, monthly
- Set recurrence end date (defaults to 1 year)
- Automatic generation of future post instances
- Proper status tracking for recurring instances
- Each instance gets its own queue entry

### 7. **Social Media Publishing Service (FastAPI)**
Asynchronous service for publishing posts to social platforms.

**Architecture:**
- Separate FastAPI application running on port 8001
- Non-blocking publishing with background task support
- Platform-agnostic publishing interface with adapter pattern
- Support for multiple social media platforms

**Supported Platforms:**
- Facebook
- Instagram
- Twitter/X
- LinkedIn
- YouTube
- Pinterest

**Note:** Current implementation uses placeholder/mock publishers that simulate successful publishing. To enable real API integration:
1. Set up platform API credentials as environment variables
2. Implement actual API calls in each platform's publisher class
3. Handle token refresh and error cases

## Installation & Setup

### Backend Setup

1. **Install Dependencies:**
```bash
cd "path/to/SocialPilot"
pip install -r requirements.txt
```

2. **Run Migrations:**
```bash
python manage.py migrate
```

3. **Create Superuser (optional):**
```bash
python manage.py createsuperuser
```

4. **Start Django Development Server:**
```bash
python manage.py runserver
```

### Publishing Service Setup

1. **Install FastAPI & Uvicorn (already in requirements.txt):**
```bash
pip install fastapi uvicorn
```

2. **Start the Publishing Service:**
```bash
# In a separate terminal
python publish_service.py
```

The service will run on `http://127.0.0.1:8001`

3. **Manual Queue Processing (Alternative):**
If you prefer not to run the FastAPI service, you can process the queue manually:
```bash
python manage.py process_queue
```

Or run continuously:
```bash
python manage.py process_queue --continuous --interval 60
```

### Frontend Setup

1. **Install Dependencies:**
```bash
cd frontend
npm install
```

2. **Update App.jsx to include new components:**
The following components need to be imported and added to the App.jsx:
- `PublishingCalendar.jsx`
- `Drafts.jsx`
- `QueueStatus.jsx`

3. **Include the new CSS:**
Import `milestone2_styles.css` in App.jsx

4. **Start Development Server:**
```bash
npm run dev
```

Frontend will run on `http://127.0.0.1:5173`

## Usage Guide

### Creating a Draft

1. Navigate to the Drafts section
2. Click "+ New Draft"
3. Enter your post content (required)
4. Add optional title, platform selection, and media URL
5. Click "Save Draft"
6. Your draft is saved and can be edited later

### Converting Draft to Post

1. In the Drafts section, find your draft
2. Click "Schedule" button
3. The draft will be converted to a scheduled post (scheduled for 1 hour from now by default)
4. You can then reschedule it to your preferred time

### Creating a Scheduled Post Directly

1. In the Posts section, create a new post
2. Enter content, select platform
3. Select date and time (must be in the future)
4. Check "Is Recurring" if you want it to repeat
5. Select recurrence pattern (daily, weekly, monthly)
6. Optionally set recurrence end date
7. Click "Schedule Post"

### Viewing the Publishing Calendar

1. Open the Publishing Calendar component
2. Browse through months using previous/next buttons
3. Dates with scheduled posts show a post count
4. Click any date to view posts scheduled for that date
5. See detailed post information (time, platform, status)

### Monitoring the Publishing Queue

1. Open the Queue Status section
2. View statistics: pending, processing, completed posts
3. Enable "Auto-refresh" to see real-time updates
4. View list of pending posts ready to publish
5. The status updates as posts are published

### Publishing Workflow

The complete publishing workflow:

```
User Creates/Schedules Post
    ↓
Post saved in ScheduledPost table
    ↓
PublishingQueue entry created with status="pending"
    ↓
Scheduler checks queue periodically (via management command or FastAPI)
    ↓
When scheduled_time <= now:
    - Queue entry status → "processing"
    - PublishingService.publish_post() called
    - Platform publisher makes API call
    ↓
On Success:
    - Queue entry status → "completed"
    - Post status → "published"
    - PublishingLog created with status="published"
    - Post.published_at timestamp set
    ↓
On Failure:
    - PublishingLog created with error message
    - If attempts < max_attempts:
      Queue entry status remains "pending" for retry
    - If attempts >= max_attempts:
      Queue entry status → "failed"
      Post status → "failed"
```

## Environment Variables

Add these to a `.env` file if implementing real API integration:

```
# Facebook
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Instagram
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id
INSTAGRAM_ACCESS_TOKEN=your_token

# Twitter
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret

# LinkedIn
LINKEDIN_ACCESS_TOKEN=your_token

# YouTube
YOUTUBE_API_KEY=your_key

# Pinterest
PINTEREST_ACCESS_TOKEN=your_token

# Publishing Service
PUBLISHING_SERVICE_URL=http://127.0.0.1:8001
```

## Database Schema

### New Models

1. **Draft**
   - id (Primary Key)
   - user (ForeignKey to User)
   - content (TextField)
   - platform (CharField, optional)
   - content_type (CharField)
   - media_url (URLField)
   - title (CharField)
   - created_at (DateTimeField)
   - updated_at (DateTimeField)

2. **ScheduledPost (Enhanced)**
   - Added: recurrence_end_date, parent_post, updated_at
   - Modified: user relationship name, status choices, status validation

3. **PublishingLog**
   - id (Primary Key)
   - post (ForeignKey to ScheduledPost)
   - platform (CharField)
   - status (CharField: pending, processing, published, failed)
   - platform_response (JSONField)
   - error_message (TextField)
   - attempts (PositiveIntegerField)
   - max_attempts (PositiveIntegerField, default=3)
   - created_at (DateTimeField)
   - updated_at (DateTimeField)

4. **PublishingQueue**
   - id (Primary Key)
   - post (ForeignKey to ScheduledPost)
   - status (CharField: pending, processing, completed, failed)
   - scheduled_for (DateTimeField)
   - attempts (PositiveIntegerField)
   - last_attempt (DateTimeField)
   - error_message (TextField)
   - created_at (DateTimeField)
   - updated_at (DateTimeField)
   - Indexes: (status, scheduled_for) for efficient query

## API Examples

### Create a Draft

```bash
curl -X POST http://127.0.0.1:8000/api/drafts/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekend Tips",
    "content": "Here are some great tips for the weekend!",
    "platform": "linkedin",
    "content_type": "text",
    "media_url": ""
  }'
```

### Convert Draft to Post

```bash
curl -X POST http://127.0.0.1:8000/api/drafts/1/convert_to_post/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "linkedin",
    "scheduled_time": "2026-09-05T10:00:00Z"
  }'
```

### Create a Recurring Post

```bash
curl -X POST http://127.0.0.1:8000/api/posts/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Daily motivation!",
    "platform": "twitter",
    "content_type": "text",
    "scheduled_time": "2026-09-02T09:00:00Z",
    "is_recurring": true,
    "recurrence": "daily",
    "recurrence_end_date": "2026-12-31T23:59:59Z"
  }'
```

### Get Calendar Posts

```bash
curl -X GET 'http://127.0.0.1:8000/api/posts/calendar/?start_date=2026-09-01&end_date=2026-09-30' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Queue Status

```bash
curl -X GET http://127.0.0.1:8000/api/posts/queue_status/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Process Queue (FastAPI)

```bash
curl -X POST http://127.0.0.1:8001/publish/process-queue
```

## Troubleshooting

### Posts not publishing

1. Check if publishing service is running:
   - FastAPI: `curl http://127.0.0.1:8001/health`
   - Or use management command: `python manage.py process_queue`

2. Check queue status:
   - Visit queue endpoint to see pending posts
   - Check PublishingLog for error messages

3. Verify scheduled times:
   - Scheduled times must be in the future
   - Times are in UTC timezone

### Permission errors

- Ensure user role has correct permissions
- Check TeamMember.ROLE_PERMISSIONS for required permissions
- Administrator role has all permissions

### Database issues

- Run migrations: `python manage.py migrate`
- Check migration status: `python manage.py showmigrations`
- If issues, reset migrations (dev only): `python manage.py migrate --zero scheduler`

## Testing Checklist

- [ ] Create and save a draft
- [ ] Edit an existing draft
- [ ] Delete a draft
- [ ] Convert draft to scheduled post
- [ ] Create a scheduled post with future date
- [ ] View posts in calendar
- [ ] Click on calendar date to view posts
- [ ] Create recurring daily posts
- [ ] Create recurring weekly posts
- [ ] Create recurring monthly posts
- [ ] Check queue status updates
- [ ] Reschedule a post
- [ ] Cancel a scheduled post
- [ ] Monitor publishing progress
- [ ] Check publishing logs for completed posts
- [ ] Verify past scheduled posts show "published" status
- [ ] Test with multiple users (role-based access)
- [ ] Test dark mode styling for new components
- [ ] Test responsive design on mobile
- [ ] Login/logout and verify token refresh works
- [ ] Test with different social platforms

## Next Steps for Full Integration

1. **Implement Real API Calls:**
   - Add platform-specific API credentials
   - Implement actual publishing calls in each publisher
   - Handle token refresh and expiration

2. **Add Celery for Production:**
   - Replace FastAPI background tasks with Celery for production
   - Set up Redis as message broker
   - Configure periodic tasks

3. **Webhook Support:**
   - Implement webhooks to receive publishing status from platforms
   - Update post status in real-time

4. **Analytics Integration:**
   - Track impressions, clicks, engagement from published posts
   - Connect with existing analytics dashboard

5. **Advanced Features:**
   - Post templates for quick reuse
   - AI-powered content suggestions
   - Auto-scheduling based on audience insights
   - Multi-language post translations

## Architecture Diagram

```
React Frontend (Vite)
    ↓
Django REST API (port 8000)
    ├── Drafts endpoints
    ├── Posts endpoints
    ├── Queue endpoints
    └── Publishing Logs endpoints
    ↓
Django Services Layer
    ├── PublishingService
    ├── PlatformPublishers
    ├── QueueService
    └── RecurringPostService
    ↓
Database (PostgreSQL)
    ├── Draft
    ├── ScheduledPost
    ├── PublishingQueue
    ├── PublishingLog
    └── Other tables
    ↓
FastAPI Publishing Service (port 8001)
    ├── Queue processor
    ├── Health checks
    └── Background tasks
    ↓
Social Media APIs
    ├── Facebook Graph
    ├── Instagram API
    ├── Twitter API v2
    ├── LinkedIn API
    ├── YouTube API
    └── Pinterest API
```

## Support & Maintenance

For issues or questions:
1. Check the troubleshooting section above
2. Review API error responses for detailed error messages
3. Check Django logs for backend errors
4. Check browser console for frontend errors
5. Verify all services are running (Django, FastAPI)
6. Ensure database migrations have been applied

---

**Last Updated:** September 1, 2026
**Version:** 2.0 (Milestone 2)
