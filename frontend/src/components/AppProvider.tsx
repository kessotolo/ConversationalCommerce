import React from 'react';

import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';

import { ThemeProvider } from './ThemeProvider';

/**
 * Root provider that wraps the application with all context providers
 * Ensures proper integration between auth, tenant, and theme systems
 * while maintaining UUID-based model relationships
 */
interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <TenantProvider>{children}</TenantProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
