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
