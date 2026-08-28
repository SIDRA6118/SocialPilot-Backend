# SocialPilot

SocialPilot is an intelligent social media scheduling and multi-platform campaign management platform. It combines a Django REST API with a React/Vite dashboard for planning posts, managing connected social accounts, and organizing team access.

## Features

### User management

- User registration and JWT login
- Profile and account settings
- Saved sign-ins for quick account switching
- Team invitations and role assignment
- Roles for content creators, marketing teams, business users, and administrators

### Social account management

- Manage accounts for LinkedIn, X/Twitter, Facebook, Instagram, YouTube, and Pinterest
- Connect and disconnect account records from Settings
- Store provider access tokens on the authenticated backend record
- Manage account names and provider identifiers

### Content scheduling

- Create, edit, delete, and list scheduled posts
- Support text, image, video, carousel, story, and reel content types
- Store optional media URLs
- Draft and scheduled workflow states
- Recurring schedule metadata
- Calendar view and platform/status filters
- Dashboard statistics and platform analytics

## Technology

- **Backend:** Python, Django, Django REST Framework, Simple JWT
- **Frontend:** React 19, Vite, Axios, React DatePicker
- **Database:** PostgreSQL
- **Authentication:** Bearer JWT access and refresh tokens

## Project structure

```text
.
├── accounts/                 # Registration and account app
├── scheduler/               # Posts, social accounts, teams, serializers, API routes
├── socialpilot/             # Django project settings and root URLs
├── frontend/
│   ├── src/                 # React application and dashboard UI
│   ├── package.json
│   └── vite.config.js
├── manage.py
├── requirements.txt
└── README.md
```

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer and npm
- PostgreSQL 14 or newer

## Backend setup

From the repository root, create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a PostgreSQL database named `socialpilot`. The current development settings expect:

```text
Database: socialpilot
User:     postgres
Host:     localhost
Port:     5432
```

Update `socialpilot/settings.py` or move these values to environment variables before using a different database or deploying the application. Do not commit production credentials.

Apply migrations and start Django:

```powershell
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

The API is available at `http://127.0.0.1:8000/api/`.

## Frontend setup

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/` in a browser.

Available frontend commands:

```powershell
npm run dev       # Start the Vite development server
npm run lint      # Run ESLint
npm run build     # Create a production build
npm run preview   # Preview the production build locally
```

The frontend currently uses `http://127.0.0.1:8000` for the Django API. Change the API constants in `frontend/src/App.jsx` or introduce a Vite environment variable before deploying to another host.

## API endpoints

All resource endpoints require a valid JWT access token unless stated otherwise.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/register/` | Register a user |
| POST | `/api/token/` | Obtain access and refresh tokens |
| POST | `/api/token/refresh/` | Refresh an access token |
| CRUD | `/api/posts/` | Manage the authenticated user's posts |
| CRUD | `/api/social-accounts/` | Manage the authenticated user's social accounts |
| CRUD | `/api/team-members/` | Manage the authenticated user's team members |

Send the access token as a bearer token:

```http
Authorization: Bearer <access-token>
```

Example post payload:

```json
{
	"content": "Our next campaign starts today.",
	"platform": "Instagram",
	"content_type": "image",
	"media_url": "https://example.com/campaign.jpg",
	"scheduled_time": "2026-08-30T19:30:00.000Z",
	"status": "scheduled",
	"is_recurring": false,
	"recurrence": ""
}
```

## Instagram and provider tokens

The current Settings flow creates social-account records using a provider token supplied by the user. It does not yet implement a complete provider OAuth flow or publish posts directly through Instagram, Meta, or another social network.

For Instagram, use an Instagram Business or Creator account connected to a Facebook Page and obtain credentials through a Meta Developer application. Keep tokens private and never commit them to source control.

## Troubleshooting

### Failed to fetch

Make sure both servers are running:

```powershell
# Terminal 1
python manage.py runserver 127.0.0.1:8000

# Terminal 2
cd frontend
npm run dev
```

If the API returns a database error after model changes, apply migrations:

```powershell
python manage.py migrate
```

If login succeeds but requests return `401`, refresh the page and sign in again to obtain a new access token.

## Development checks

```powershell
python manage.py check
python manage.py test
cd frontend
npm run lint
npm run build
```

## Security notes

- Replace the development Django `SECRET_KEY` before deployment.
- Set `DEBUG = False` in production.
- Configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` for the deployed domains.
- Move database passwords and provider tokens into environment variables or a secret manager.
- Use HTTPS for all deployed frontend and API traffic.
