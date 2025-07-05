# ConversationalCommerce Backend

Backend for modular, multi-tenant, chat-driven commerce. Powered by FastAPI, SQLAlchemy (async), Alembic, PostgreSQL, Redis, Twilio, Cloudinary, and Clerk.

## 🚀 Dev Setup
- See [Onboarding Guide](/docs/ONBOARDING_GUIDE.md)
- Install Python 3.12+, `pip install -r requirements.txt`
- Run: `uvicorn app.main:app --reload`

## 🗄️ Migrations
- Alembic for schema migrations
- See [Architecture](/docs/ARCHITECTURE.md) for migration and RLS details

## 🔑 Key Services
- Clerk (auth), Cloudinary (media), Twilio (messaging), Redis (cache), PostgreSQL (db)

## 🧪 Testing
- `pytest` for all tests
- See [Onboarding Guide](/docs/ONBOARDING_GUIDE.md)

## 📚 Docs
- [Architecture](/docs/ARCHITECTURE.md)
- [AI Agent Config](/docs/AI_AGENT_CONFIG.md)
- [Changelog](/docs/CHANGELOG.md)
- [Contributing](/docs/CONTRIBUTING.md)

## Background Jobs: Celery + Redis

- All notification and fulfillment events are now processed asynchronously using Celery tasks.
- Redis is used as the broker and result backend.
- This ensures robust retries, dead-lettering, and scalable event handling.

### Setup
1. Ensure Redis is running (locally or via Docker):
   ```bash
   docker run -p 6379:6379 redis:7
   ```
2. Install dependencies (already in requirements.txt):
   ```bash
   pip install -r requirements.txt
   ```
3. Start the Celery worker:
   ```bash
   celery -A app.core.celery_app.celery_app worker --loglevel=info
   ```

### How it works
- All order-related notifications and fulfillment events are enqueued as Celery tasks.
- Tasks are retried automatically on failure (see app/tasks.py for details).
- No notification or fulfillment logic runs in the request/response cycle.

### Troubleshooting
- If notifications or fulfillment actions are not processed, ensure Redis and the Celery worker are running.
- Check logs for errors and retry information.

## Admin Backend Security & Environment Variables

The admin backend (for super admin/staff at https://admin.enwhe.io) enforces strict security and isolation:

- **CORS/Allowed Origins:** Only `https://admin.enwhe.io` is allowed for admin endpoints. Set `ALLOWED_ORIGINS` and `BACKEND_CORS_ORIGINS` accordingly in your environment.
- **IP Allowlisting:** All admin endpoints are protected by a global IP allowlist. Manage allowlist entries via the admin UI/API. Initial entries can be seeded via migration or config if needed.
- **Security Headers:** The following headers are enforced for all admin responses:
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `X-XSS-Protection`
- **Session Timeout & 2FA:**
  - `ADMIN_SESSION_INACTIVITY_TIMEOUT` (minutes)
  - `ADMIN_REQUIRE_2FA` (true/false)
- **ADMIN_MODE:** (optional) Set to `true` in the admin backend environment to enable admin-only features.
- **.env.example:** See this file for all required and recommended environment variables for admin deployment.

**Note:** These settings are for the admin backend only and do not affect seller, buyer, or main app flows.
