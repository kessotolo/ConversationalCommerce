# Changelog

## 2025-06-28

### Added

#### Phase 2 Feature Completion

- **Buyer Profile Management**: 
  - Added ProfileEditForm component for editing profile details (name, email, phone)
  - Added password change functionality with validation
  - Implemented userService.ts for secure profile management API integration
  - Created NotificationPreferencesForm and its corresponding backend service

- **Address Book Management**: 
  - Implemented AddressForm component for adding and editing addresses
  - Created AddressList component for managing saved addresses
  - Added addressService.ts for CRUD operations with backend APIs

- **Buyer Order Management**:
  - Created OrderList component for viewing order history with filterable status tabs
  - Implemented OrderDetail component with comprehensive order information
  - Added OrderReturn component for processing returns with item selection
  - Built orderService.ts for backend API integration including order tracking

- **Team Role Management**:
  - Implemented TeamMemberList, TeamInviteList, and TeamInviteForm components
  - Created TeamManagement container component with tabs for members/invites
  - Added role editing and invitation functionality with email/SMS options

- **Seller Onboarding Admin Review**:
  - Built SellerVerificationStats for dashboard metrics visualization
  - Created SellerVerificationList and SellerVerificationDetail components
  - Implemented admin review workflow with approve/reject actions
  - Added multi-channel notifications for seller verification status changes

### Improved

- All React components now follow mobile-first, chat-native design principles
- Full error handling with toast notifications throughout the frontend
- React Query integration for efficient data fetching and cache management
- TypeScript strict mode enabled across all new components

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
