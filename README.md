# ConversationalCommerce

A modular monolith for mobile-first, AI-driven, multi-tenant commerce in Africa. Built for natural, chat-driven buying and selling—on WhatsApp, web, and beyond.

## 🏗️ Architecture

ConversationalCommerce follows a **true modular monolithic architecture** with self-contained services:

```
ConversationalCommerce/
├── backend/           # FastAPI backend service
├── frontend/          # Next.js frontend service
├── admin-dashboard/   # Next.js admin service
├── docs/             # Shared documentation
├── scripts/          # Shared deployment scripts
└── [minimal root]    # Only essential shared files
```

Each module is **completely self-contained** with its own:
- Dependencies (`package.json`, `requirements.txt`)
- Build configuration
- Testing setup
- Module-specific code organization

## 🚀 Quickstart
- [Onboarding Guide](/docs/ONBOARDING_GUIDE.md)
- [Architecture](/docs/ARCHITECTURE.md)
- [AI Agent Config](/docs/AI_AGENT_CONFIG.md)

## 📚 Service Documentation
- [Frontend README](frontend/README.md) — Next.js, Tailwind, mobile-first UI
- [Backend README](backend/README.md) — FastAPI, SQLAlchemy, Alembic, PostgreSQL
- [Admin Dashboard README](admin-dashboard/README.md) — Next.js admin interface
- [Changelog](/docs/CHANGELOG.md)
- [Contributing](/docs/CONTRIBUTING.md)

## 🤖 AI & Automation
- [AI Agent Config](/docs/AI_AGENT_CONFIG.md)

## 💡 Growth & Product
- [Growth Notes](/docs/GROWTH_NOTES.md) *(if exists)*

## 🛠️ Build & Development

### Building Individual Services
Each service builds independently:

```bash
# Frontend
cd frontend && npm run build

# Admin Dashboard
cd admin-dashboard && npm run build

# Backend
cd backend && python -m pytest
```

### Onboarding/KYC Review
- The onboarding flow supports seller onboarding, KYC, domain setup, and team invites.
- Admins can review and approve/reject KYC requests via the admin dashboard at `/admin/monitoring`.
- All onboarding and KYC actions are logged for analytics and audit.

See individual service READMEs for detailed build instructions.

## 🆘 Contact & Support
- For help, see the onboarding guide or contact the maintainers listed in [OWNERSHIP.md](/docs/OWNERSHIP.md).
