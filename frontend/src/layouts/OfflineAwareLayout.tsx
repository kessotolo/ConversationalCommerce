"use client";

import React, { ReactNode, useState } from 'react';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import { DataSavingModeToggle } from '@/components/DataSavingModeToggle';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast/ToastContext';

interface OfflineAwareLayoutProps {
  children: ReactNode;
  /** Whether to show the network status indicator */
  showNetworkIndicator?: boolean;
  /** Whether to show the data saving mode toggle */
  showDataSavingToggle?: boolean;
  /** Position for the data saving toggle */
  dataSavingTogglePosition?: 'bottom-bar' | 'inline' | 'settings';
}

/**
 * Layout component that adds offline support and accessibility features
 *
 * Wraps content with:
 * - Network status indicator - shows connectivity status
 * - Data saving mode toggle - controls data usage for low-connectivity environments
 * - Toast notifications - for accessible status messages
 * - Error boundary - for graceful error handling
 *
 * Use this layout to make any page offline-aware and accessible,
 * particularly important for users in regions with limited connectivity
 */
export function OfflineAwareLayout({
  children,
  showNetworkIndicator = true,
  showDataSavingToggle = false,
  dataSavingTogglePosition = 'bottom-bar'
}: OfflineAwareLayoutProps) {
  const [dataSavingMode, setDataSavingMode] = useState<'off' | 'low' | 'high'>('off');
  return (
    <ErrorBoundary
      fallback={(
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 text-red-800 bg-red-50 border border-red-200 rounded"
        >
          <h2 className="text-lg font-medium mb-2">Something went wrong</h2>
          <p className="mb-4">We've encountered an unexpected error. Please try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Refresh Page
          </button>
        </div>
      )}
    >
      <ToastProvider>
        {showNetworkIndicator && (
          <NetworkStatusIndicator
            showDetails={dataSavingMode !== 'off'}
            showAlways={dataSavingMode === 'high'}
          />
        )}

        {children}

        {showDataSavingToggle && (
          <DataSavingModeToggle
            position={dataSavingTogglePosition}
            onChange={(mode) => setDataSavingMode(mode)}
          />
        )}
      </ToastProvider>
    </ErrorBoundary>
  );
}
