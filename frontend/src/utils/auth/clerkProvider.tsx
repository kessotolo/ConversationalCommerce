/**
 * Clerk Authentication Provider with build-time safety
 * This component wraps Clerk's ClerkProvider with logic to safely handle build time
 * without requiring any file modifications or hacky build-override scripts
 */
import { ClerkProvider } from '@clerk/nextjs';
import React from 'react';

// Get props type from ClerkProvider component
type ClerkProviderProps = React.ComponentProps<typeof ClerkProvider>;

// Custom Provider component that safely handles build environment
export function SafeClerkProvider({
  children,
  ...props
}: React.PropsWithChildren<ClerkProviderProps>) {
  // Check if we're in a build environment where auth should be disabled
  const isBuildEnv =
    typeof window === 'undefined' &&
    (!process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] ||
      process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] === '');

  // During build time, just render children without Clerk
  if (isBuildEnv) {
    return <>{children}</>;
  }

  // During runtime, use the real Clerk provider
  return <ClerkProvider {...props}>{children}</ClerkProvider>;
}
