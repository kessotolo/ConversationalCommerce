import React, { Suspense, ReactNode } from 'react';
import Link from 'next/link';
import { Route } from 'next';
import { createMerchantAdminRoute } from '@/utils/routes';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import { ToastProvider } from '@/components/Toast/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTenant } from '@/contexts/TenantContext';

interface AdminLayoutProps {
  children: ReactNode;
  merchantId: string;
}

/**
 * Admin layout component for merchant dashboard
 * 
 * Provides consistent layout with navigation, error boundaries, toast notifications,
 * and network status monitoring for all merchant admin pages.
 * 
 * Implements accessibility features including proper landmark regions,
 * skip links, ARIA attributes, and keyboard navigation.
 */
export function AdminLayout({ children, merchantId }: AdminLayoutProps): JSX.Element {
  const { tenant } = useTenant();
  
  // Navigation items with proper routing
  const navItems = [
    { name: 'Dashboard', href: createMerchantAdminRoute(merchantId, 'dashboard'), icon: 'home' },
    { name: 'Products', href: createMerchantAdminRoute(merchantId, 'products'), icon: 'box' },
    { name: 'Orders', href: createMerchantAdminRoute(merchantId, 'orders'), icon: 'shopping-bag' },
    { name: 'Customers', href: createMerchantAdminRoute(merchantId, 'customers'), icon: 'users' },
    { name: 'Analytics', href: createMerchantAdminRoute(merchantId, 'analytics'), icon: 'chart-bar' },
    { name: 'Settings', href: createMerchantAdminRoute(merchantId, 'settings'), icon: 'cog' },
  ];

  return (
    <ToastProvider>
      {/* Skip link for keyboard users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:rounded focus:outline-none focus:shadow"
      >
        Skip to main content
      </a>
      
      <div className="min-h-screen bg-gray-50">
        {/* Network status monitoring */}
        <Suspense fallback={null}>
          <NetworkStatusIndicator />
        </Suspense>

        <div className="flex">
          {/* Sidebar Navigation */}
          <nav 
            className="bg-gray-800 w-64 min-h-screen p-4 hidden md:block"
            aria-label="Main Navigation"
          >
            <div className="mb-8">
              <h1 className="text-white text-xl font-bold">
                {tenant?.name || 'enwhe.io'}
              </h1>
              <p className="text-gray-400 text-sm">Merchant Dashboard</p>
            </div>

            <ul className="space-y-2" role="list">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.href as Route} 
                    className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
                    aria-current={
                      typeof window !== 'undefined' && 
                      window.location.pathname.includes(item.name.toLowerCase()) 
                        ? 'page' 
                        : undefined
                    }
                  >
                    <span className="mr-3">
                      <NavIcon name={item.icon} />
                    </span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <Link 
                href="/help" 
                className="text-gray-400 hover:text-white text-sm flex items-center px-4 py-2"
              >
                <span className="mr-2">
                  <NavIcon name="question-circle" />
                </span>
                Help & Support
              </Link>
            </div>
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden bg-gray-800 w-full p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-white text-xl font-bold">
                {tenant?.name || 'enwhe.io'}
              </h1>
              <button
                type="button"
                className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <main 
            id="main-content" 
            className="flex-1 overflow-auto"
            role="main"
            tabIndex={-1} // For focus when using skip link
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

// Simple icon component for navigation
function NavIcon({ name }: { name: string }): JSX.Element {
  // This would ideally use a proper icon library like heroicons or phosphor
  // For now we'll use a simple SVG mapping
  const iconMap: Record<string, JSX.Element> = {
    'home': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    'box': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    'shopping-bag': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    'users': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    'chart-bar': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    'cog': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    'question-circle': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return iconMap[name] || <span className="w-5 h-5" />;
}
