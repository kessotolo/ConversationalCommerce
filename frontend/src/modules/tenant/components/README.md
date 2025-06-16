# Seller Onboarding Wizard (Web)

## Overview
This module implements a mobile-first, robust seller onboarding flow for the ConversationalCommerce platform. It covers:
- Business info collection
- KYC (ID type, number, document upload, status feedback)
- Subdomain setup with real-time validation
- Team invite (WhatsApp, email, web link)
- Progress/status UI and error handling

## API Usage
All onboarding API calls are imported from `../api/onboardingApi`:
- `onboardingApi.uploadKYCFile(file)`
- `onboardingApi.inviteTeam({ phone })`
- `validateDomain(domain)`
- `sendInviteEmail(email, link)`

## Adding/Extending Steps
- Add new steps to the `steps` array and update the form logic.
- Use the shared API module for backend calls.
- Add new fields to the form state as needed.
- Add/extend tests in `OnboardingWizard.test.tsx`.

## Mobile-First & Accessibility
- Large touch targets, readable font sizes, and sticky progress bar
- Animated upload progress and skeletons for slow connections
- All actions are accessible and optimized for low-end Android devices

## Testing
- See `OnboardingWizard.test.tsx` for comprehensive tests (happy path, KYC, domain, invite, errors)
- Use `@testing-library/react` and mock the API module for new tests

## Error Handling
- All errors are shown in a dismissible banner
- User-friendly messages for file upload, domain conflict, invite failure, and invalid input

## Extending
- To add new onboarding steps or API calls, update this README and the wizard logic
- Keep UI/UX mobile-first and accessible