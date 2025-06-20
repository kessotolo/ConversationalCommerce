# Seller Onboarding Wizard (Web & Mobile)

## Overview

This module implements a mobile-first, robust seller onboarding flow for the ConversationalCommerce platform. It covers:

- Business info collection
- KYC (ID type, number, document upload, status feedback)
- Subdomain setup with real-time validation
- Team invite (WhatsApp, email, web link)
- Progress/status UI and error handling
- **Soft onboarding:** After sign in/up, users land on the dashboard. If onboarding is incomplete, a dismissible onboarding card appears at the top (web & mobile), launching the wizard in a modal. No hard blocks.

## Navigation & UX

- Uses the new `MobileNav` (see `src/components/MobileNav.tsx`) for all navigation (web & mobile).
- On mobile admin, a sticky bottom nav is used for quick access.
- The onboarding wizard is accessible from the dashboard onboarding card/modal at any time.
- Progress is saved; users can exit and return.

## API Usage

All onboarding API calls are imported from `../api/onboardingApi`:

- `onboardingApi.uploadKYCFile(file)`
- `onboardingApi.inviteTeam({ phone })`
- `validateDomain(domain)`
- `sendInviteEmail(email, link)`

## Customization & Extending

- To add or change onboarding steps, update `OnboardingWizard.tsx`.
- To customize the onboarding prompt card, see `OnboardingPromptCard.tsx`.
- To update navigation, edit `MobileNav.tsx`.
- The onboarding prompt logic is ready to connect to a real backend status API.

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

## Best Practices

- Use soft onboarding for a professional, user-friendly experience (Shopify-style)
- Never block users from exploring the app
- Keep UI/UX mobile-first and accessible
