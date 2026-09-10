# Milestone 2 Quick Start & Testing Guide

## Complete Setup Instructions

### Step 1: Backend Setup (Django)

```bash
# Navigate to project directory
cd "C:\Users\sidra\OneDrive\Desktop\SocialPilot\Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform"

# Install dependencies (if not already done)
pip install -r requirements.txt

# Apply migrations (already done, but for reference)
python manage.py migrate

# Create a superuser (optional)
python manage.py createsuperuser
```

### Step 2: Start Services

**Terminal 1 - Django API Server:**
```bash
cd "C:\Users\sidra\OneDrive\Desktop\SocialPilot\Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform"
python manage.py runserver
# Django will be available at http://127.0.0.1:8000
```

**Terminal 2 - Publishing Service (Optional but Recommended):**
```bash
cd "C:\Users\sidra\OneDrive\Desktop\SocialPilot\Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform"
python publish_service.py
# Publishing service will be available at http://127.0.0.1:8001
```

**Terminal 2 Alternative - Manual Queue Processing:**
```bash
cd "C:\Users\sidra\OneDrive\Desktop\SocialPilot\Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform"
# One-time processing
python manage.py process_queue

# OR continuous processing
python manage.py process_queue --continuous --interval 60
```

### Step 3: Frontend Setup (React)

**Terminal 3 - React Development Server:**
```bash
cd "C:\Users\sidra\OneDrive\Desktop\SocialPilot\Intelligent-Social-Media-Scheduling-and-Multi-Platform-Campaign-Management-Platform\frontend"
npm install  # Only needed first time
npm run dev
# Frontend will be available at http://127.0.0.1:5173
```

### Step 4: Access the Application

Open your browser and go to:
- **Frontend:** http://localhost:5173
- **Django Admin:** http://localhost:8000/admin
- **API Documentation:** http://localhost:8000/api/

---

## Testing Workflow

### Test 1: Create a Draft

1. Go to http://localhost:5173
2. Login with your credentials
3. Scroll to the "📝 Drafts" section
4. Click "+ New Draft"
5. Enter:
   - Title: "Test Draft"
   - Content: "This is a test post content"
   - Platform: "LinkedIn"
   - Media URL: (leave blank or add a URL)
6. Click "Save Draft"
7. Verify draft appears in the list

### Test 2: Convert Draft to Scheduled Post

1. In the Drafts section, find your draft
2. Click "Schedule" button
3. The draft should convert to a scheduled post
4. You should be redirected to the calendar view

### Test 3: Create a Recurring Post

1. In the "Create New Post" form
2. Fill in:
   - Content: "Daily motivation!"
   - Platform: "Twitter"
   - Scheduled Time: Tomorrow at 9:00 AM (or any future time)
3. Check "Repeat this post"
4. Select "Daily" for recurrence
5. Click "📅 Schedule Post"
6. Verify post appears in:
   - Recent Posts section
   - Upcoming posts section
   - Calendar (for tomorrow's date)

### Test 4: View Publishing Calendar

1. Click "View Calendar" from dashboard
2. Or click on the calendar month in the "Publishing Calendar" section
3. Navigate through months
4. Click on dates with posts to see details
5. Verify:
   - Dates with posts show a number indicator
   - Clicking shows post details
   - Time, platform, and status are displayed

### Test 5: Monitor Publishing Queue

1. In the "📤 Publishing Queue" section on dashboard
2. View queue statistics:
   - Pending: Posts ready to publish
   - Processing: Currently being published
   - Completed: Successfully published
3. See list of pending posts
4. Enable "Auto-refresh" to see live updates
5. Click "Refresh" to manually update

### Test 6: Test Auto-Publishing (Future Dates)

**Note:** For testing, you can create posts scheduled for dates in the past (if you modify the validation) or:

1. Create a post scheduled for 5 minutes from now
2. Keep the app running
3. After 5 minutes, trigger queue processing:
   - Via API: `curl -X POST http://127.0.0.1:8001/publish/process-queue`
   - Or wait if auto-processor is running
4. Check:
   - Queue status changes to "completed"
   - Post status changes to "published"
   - published_at timestamp is set
   - PublishingLog entry created

### Test 7: Test Role-Based Access Control

1. Create posts as different users
2. Assign different roles (creator, marketing, business, administrator)
3. Verify permissions:
   - Creator: Can create, edit, delete posts
   - Marketing: Can create, edit, delete posts
   - Business: Can only view posts and analytics
   - Administrator: Full access

### Test 8: API Testing

**Get all posts:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8000/api/posts/
```

**Create a draft:**
```bash
curl -X POST http://127.0.0.1:8000/api/drafts/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Draft",
    "content": "Test content",
    "platform": "linkedin",
    "content_type": "text"
  }'
```

**Get calendar posts:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  'http://127.0.0.1:8000/api/posts/calendar/?start_date=2026-09-01&end_date=2026-09-30'
```

**Get queue status:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8000/api/posts/queue_status/
```

**Get publishing service health:**
```bash
curl http://127.0.0.1:8001/health
```

---

## Troubleshooting

### Issue: Frontend doesn't load new components

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Check browser console for errors (F12)
3. Verify all imports are correct in App.jsx
4. Ensure milestone2_styles.css is imported
5. Restart dev server: Stop npm dev and run `npm run dev` again

### Issue: API endpoints return 404

**Solution:**
1. Verify migrations were applied: `python manage.py showmigrations scheduler`
2. Check Django is running on port 8000
3. Verify endpoint URLs match those in frontend
4. Check authentication token is being sent

### Issue: Posts not publishing

**Solution:**
1. Check publishing service is running (port 8001)
2. Verify post scheduled_time is in the future
3. Manually trigger processing: `python manage.py process_queue`
4. Check logs for errors
5. Verify queue entries exist: Query PublishingQueue table

### Issue: Database migration errors

**Solution:**
```bash
# Check migration status
python manage.py showmigrations

# If stuck, see which migration failed
python manage.py showmigrations scheduler

# Roll back if needed (CAUTION - data loss)
python manage.py migrate scheduler 0003_teammember_scheduledpost_content_type_and_more
python manage.py migrate

# Or recreate from scratch (dev only)
rm db.sqlite3
python manage.py migrate
```

---

## Verification Checklist

- [ ] Django server starts without errors
- [ ] Publishing service/queue processor starts
- [ ] Frontend loads at http://localhost:5173
- [ ] Can login with existing account
- [ ] Can register new account
- [ ] Can create a draft
- [ ] Can convert draft to post
- [ ] Can create a scheduled post
- [ ] Can create a recurring post
- [ ] Can view calendar with posts
- [ ] Can view queue status
- [ ] Auto-refresh works on queue status
- [ ] Can reschedule a post
- [ ] Can cancel a post
- [ ] Can delete a post
- [ ] Can view publishing logs
- [ ] Role-based permissions work
- [ ] Dark mode styles work for new components
- [ ] Responsive design works on mobile
- [ ] All API endpoints return correct data
- [ ] Publishing service processes queue

---

## File Structure Summary

**Backend Files Added/Modified:**
```
scheduler/
├── models.py (Enhanced: Added Draft, PublishingLog, PublishingQueue)
├── serializers.py (Enhanced: New serializers for new models)
├── views.py (Enhanced: New viewsets and actions)
├── urls.py (Enhanced: New routes)
├── services.py (NEW: Publishing, queue, and service logic)
├── management/
│   └── commands/
│       └── process_queue.py (NEW: Queue processing command)
└── migrations/
    ├── 0004_milestone2_models.py (NEW)
    └── 0005_alter_scheduledpost_options_and_more.py (Auto-generated)

publish_service.py (NEW: FastAPI publishing service)
requirements.txt (Updated: Added FastAPI, Celery, Redis)
```

**Frontend Files Added/Modified:**
```
frontend/src/
├── App.jsx (Enhanced: Integrated new components)
├── App.css (No change needed - reuse existing styles)
├── PublishingCalendar.jsx (NEW: Calendar component)
├── Drafts.jsx (NEW: Drafts management component)
├── QueueStatus.jsx (NEW: Queue monitoring component)
└── milestone2_styles.css (NEW: All new component styles)
```

---

## Performance Notes

- Calendar is optimized with memoization
- Queue processing batches operations (max 100 per run)
- Database queries use select_related and prefetch_related
- Publishing attempts are limited to 3 by default
- Queue polling interval is configurable

---

## Next Steps

1. **Test in production-like environment:**
   - Use PostgreSQL instead of SQLite
   - Use Gunicorn/Nginx for Django
   - Use Celery + Redis for task queue

2. **Implement real API calls:**
   - Add platform SDK imports
   - Implement actual publishing logic
   - Handle token refresh

3. **Add monitoring:**
   - Set up error logging
   - Monitor queue performance
   - Track publishing metrics

4. **Deploy:**
   - Configure for production
   - Set up CI/CD pipeline
   - Deploy to cloud platform

---

## Support Resources

- Django Docs: https://docs.djangoproject.com/
- React Docs: https://react.dev
- REST Framework: https://www.django-rest-framework.org/
- FastAPI: https://fastapi.tiangolo.com/

