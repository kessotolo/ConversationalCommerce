import * as React from 'react';
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from '@/utils/AuthUtils';
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import NetworkStatusIndicator from '@/components/ui/NetworkStatusIndicator';

// This wrapper provides core services throughout the application including:
// - Authentication via Clerk
// - Network status detection for low-connectivity environments
// - Theme management with offline support via localStorage
// - Toast notifications for non-blocking user feedback
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <NetworkStatusProvider>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <div className="fixed top-2 right-2 z-50">
                <NetworkStatusIndicator />
              </div>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </NetworkStatusProvider>
    </ClerkProvider>
  );
}
