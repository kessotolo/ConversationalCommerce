'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from '@/utils/auth-utils';

// This wrapper provides authentication services throughout the application
// and properly handles UUID standardization for database entities
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ClerkProvider>
  );
}
