# Changelog

## 2025-06-14

### Fixed

#### Architecture

- Created SQLAlchemy `OrderItem` model in `app/models/order_item.py`
- Added `items` relationship to SQLAlchemy `Order` model
- Generated Alembic migration for the new `OrderItem` table
- Updated imports in `order_service.py` to use the new ORM model
- Fixed architectural mismatch where Pydantic domain models were incorrectly used as ORM objects

#### Code Quality

- Fixed 419 lint issues:
  - 370 issues automatically resolved with `ruff --fix`
  - 49 boolean comparison issues (E712) fixed with `--unsafe-fixes`
- Removed duplicate `fastapi` entry from `requirements.txt`
- Improved test assertions to use Pythonic boolean checks
- Fixed improper SQLAlchemy boolean comparisons (using `== True/False` instead of truthiness)

### Known Issues

A comprehensive list of TODOs remains in the codebase:

#### Backend TODOs

- Dashboard router: implement actual database queries
- Behavior analysis: implement system metrics collection
- Payment endpoints: add missing permission checks
- Storefront editor: implement actual audit log retrieval
- Storefront services: check if templates/components are in use before deleting
- Alert service: integrate with notification channels

#### Frontend TODOs

- Cart page: implement real session/user/phone logic
- Storefront Editor: align DTOs with backend (asset_id, alt_text, description fields, banner_type)

## 2025-06-16

### Added

#### Seller Onboarding (Phase 1.2)

- Scaffolded onboarding API endpoints: start, KYC, domain, team invite, KYC document upload
- Added SellerOnboardingService for onboarding business logic
- Created onboarding request/response schemas in `schemas/onboarding.py`
- Updated backend/README.md and schemas/README.md with onboarding documentation
