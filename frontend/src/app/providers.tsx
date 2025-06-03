'use client';

import React from 'react';
import { AuthProvider } from '@/utils/auth-utils';
import { SafeClerkProvider } from '@/utils/auth/clerkProvider';

// This wrapper provides authentication services throughout the application
// and properly handles UUID standardization for database entities
// Using SafeClerkProvider to handle build-time scenarios without hacky scripts
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeClerkProvider>
      <AuthProvider>{children}</AuthProvider>
    </SafeClerkProvider>
  );
}
