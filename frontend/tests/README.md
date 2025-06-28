# Frontend Tests Guide

## Overview

This directory contains test configuration and utilities for the ConversationalCommerce frontend application. The actual tests are located within their respective module directories.

## Test Structure

- **Unit Tests**: Located in `src/modules/*/tests/unit/`
- **Integration Tests**: Located in `src/modules/*/tests/integration/`
- **Component Tests**: Located alongside the components they test

## Running Tests

```bash
# Run all tests
npm test

# Run tests with verbose output
npm test -- --verbose

# Run tests in watch mode
npm test -- --watch

# Run a specific test file
npm test -- src/modules/tenant/components/OnboardingWizard.test.tsx
```

## Testing Best Practices

### 1. Component Selection

Use these methods in order of preference:

1. **Test IDs** (most reliable)
   ```tsx
   screen.getByTestId('kyc-status')
   ```

2. **Semantic Queries** (when appropriate)
   ```tsx
   screen.getByRole('button', { name: /submit/i })
   screen.getByLabelText(/business name/i)
   ```

3. **Text Content** (use flexible matching)
   ```tsx
   // Prefer this pattern for multiple text variations
   screen.queryAllByText(/error|warning|alert/i).length > 0
   ```

4. **DOM Selectors** (last resort)
   ```tsx
   document.querySelector('form')
   ```

### 2. Asynchronous Testing

Always wrap React state updates in `act()`:

```tsx
await act(async () => {
  fireEvent.change(input, { target: { value: 'test' } });
  fireEvent.submit(form);
});
```

Use `waitFor()` with appropriate timeouts:

```tsx
await waitFor(() => {
  expect(screen.getByText(/success/i)).toBeInTheDocument();
}, { timeout: 3000 });
```

### 3. Mocking

Mock external modules at the top of your test file:

```tsx
jest.mock('@/modules/tenant/onboardingApi', () => ({
  ...jest.requireActual('@/modules/tenant/onboardingApi'),
  validateDomain: jest.fn().mockResolvedValue({ available: true }),
}));
```

### 4. Common Issues & Solutions

- **Form submissions**: Use `document.querySelector('form')` instead of `screen.getByRole('form')`
- **Multiple matching elements**: Use `queryAllByText()` and check array length
- **Timeouts**: Increase test timeout with `jest.setTimeout(10000)` in the `describe` block
- **Text not found**: Use flexible regex patterns and consider text might be split across elements

## Recent Updates

As of June 25, 2025, all frontend tests are passing. See the detailed documentation in `/docs/TEST_FIXES_SUMMARY.md`.

## Known Issues

- TypeScript lint error about missing type definitions for `@testing-library/jest-dom`
  - Can be fixed by installing `@types/testing-library__jest-dom` or updating tsconfig

## Onboarding & KYC Review Testing

### Manual Testing
- Complete the onboarding wizard as a seller (business info, KYC, KYC upload, domain, team invite).
- Verify onboarding status updates in the dashboard and wizard.
- Test error handling (e.g., domain taken, KYC rejected, missing fields).
- As an admin, visit `/admin/monitoring` and approve/reject KYC requests. Confirm UI and backend updates.

### Automated Testing
- See `src/modules/tenant/components/OnboardingWizard.test.tsx` and related integration tests for onboarding flows.
- Add tests for admin KYC review actions and edge cases.
