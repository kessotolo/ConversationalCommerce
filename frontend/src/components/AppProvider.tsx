import React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from '../contexts/AuthContext';

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
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}
