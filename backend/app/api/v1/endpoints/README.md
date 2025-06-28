# API Endpoints Module

This directory contains FastAPI routers for all backend API endpoints.

## onboarding.py

- Provides endpoints for seller onboarding: start, KYC, domain, team invite, KYC document upload.
- Endpoints are thin: all business logic is delegated to service classes (see SellerOnboardingService).
- All onboarding endpoints must log analytics/events using the ConversationEvent pattern.

See backend/README.md for more details on endpoint patterns and event logging.
