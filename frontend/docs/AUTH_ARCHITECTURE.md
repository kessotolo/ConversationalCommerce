# Authentication Architecture Guide

This guide explains the clean authentication architecture implemented in the Conversational Commerce frontend.

## Core Principles

Our authentication architecture follows these key principles:

1. **Build-Safe Design**: Authentication works seamlessly during both development and build-time without hacks
2. **Modular Monolith Boundaries**: Authentication is part of the core domain with proper module boundaries
3. **Domain-Driven Design**: Authentication interfaces expose domain concepts rather than implementation details
4. **Type Safety**: Full TypeScript support with proper error handling and type checking
5. **Clean Code**: No hacky overrides, file modifications, or bridge patterns

## Architecture Components

### 1. SafeClerkProvider

Located in `src/utils/auth/clerkProvider.tsx`, this component wraps Clerk's provider to make it build-safe:

```typescript
export function SafeClerkProvider({ children }: { children: React.ReactNode }) {
  // During build time, just render children without Clerk
  if (process.env.IS_BUILD_TIME === 'true') {
    return <>{children}</>;
  }

  // During runtime, use actual Clerk provider
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  );
}
```

### 2. Core Authentication Service

Located in `src/modules/core/services/auth/buildSafeAuth.ts`, this service:

- Detects build-time environment
- Returns safe default values during build
- Implements the Result pattern from core domain models
- Provides a consistent interface for both client and server

### 3. Domain Authentication Hook

Located in `src/modules/core/hooks/useAuth.ts`, this hook:

```typescript
export function useAuth() {
  // Implementation abstracts Clerk details
  // Returns domain-specific user model with proper types
  return {
    user,
    isAuthenticated,
    isLoading,
    // Additional domain-specific methods
  };
}

// Server-side authentication check
export async function checkAuth(req): Promise<Result<User>> {
  // Implementation for server-side auth checks
}
```

### 4. Authentication in Page Components

Pages and components should use the core `useAuth` hook rather than direct Clerk hooks:

```typescript
import { useAuth } from '@/modules/core/hooks/useAuth';

export default function ProtectedPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!isAuthenticated) return <RedirectToSignIn />;

  return <YourContent user={user} />;
}
```

## Authentication Flow

1. **Request Arrives**: Middleware handles tenant resolution and authentication
2. **Page Renders**: Page component uses `useAuth` hook to check authentication
3. **Auth State**: Hook provides auth state (loading, authenticated, user data)
4. **Protected Content**: Component renders protected content if authenticated

## Build-Time vs. Runtime Behavior

### Build Time

During the Next.js build process:

- `IS_BUILD_TIME=true` environment variable is set
- `SafeClerkProvider` detects build mode and renders children without Clerk
- `useAuth` hook returns safe defaults (unauthenticated state)
- Pages render static content without auth errors

### Runtime

In browser/server runtime:

- `IS_BUILD_TIME` is not set
- `SafeClerkProvider` uses actual Clerk provider
- `useAuth` hook connects to Clerk and returns real auth state
- Pages render dynamic, authenticated content

## How to Extend

### Adding New Auth Properties

If you need to expose additional auth properties:

1. Update the `AuthResult` type in the core service
2. Implement the property in the `buildSafeAuth` function
3. Expose the property in the `useAuth` hook
4. Use type-safe access in components

### Supporting New Auth Providers

While we currently use Clerk, the architecture is designed for provider flexibility:

1. Create a new adapter in `src/modules/core/services/auth/`
2. Implement the same interface as the current auth service
3. Update the provider exports to use the new adapter
4. Components using `useAuth` will work without changes

## Troubleshooting

### Build Errors

If you encounter build errors related to authentication:

1. Check that you're using the core `useAuth` hook, not direct Clerk hooks
2. Verify that `IS_BUILD_TIME=true` is set in your build environment
3. Ensure Clerk keys are not exposed during build time

### Runtime Errors

For runtime authentication issues:

1. Check Clerk API keys in environment variables
2. Verify middleware is correctly identifying tenant and user
3. Check for circular dependencies in auth-related imports

## Best Practices

- Always use the core `useAuth` hook instead of direct Clerk hooks
- Don't mix different authentication patterns in the same component
- Keep authentication logic separate from business logic
- Use proper error handling with the Result pattern
- Test authentication with different tenant scenarios
