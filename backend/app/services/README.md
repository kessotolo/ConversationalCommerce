# Services Module

This directory contains service classes responsible for business logic in the backend.

## SellerOnboardingService

- Handles all seller onboarding flows: merchant signup, KYC, domain setup, team invitations, and document upload.
- Used by onboarding API endpoints in `api/v1/endpoints/onboarding.py`.
- Follows the service-centric pattern: endpoints are thin, all business logic is in services.

See backend/README.md for more details on module boundaries and patterns.
