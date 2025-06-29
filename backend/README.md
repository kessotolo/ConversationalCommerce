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
