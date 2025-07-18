import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useTenant } from '@/contexts/TenantContext';
import { createMerchantAdminRoute } from '@/utils/routes';
import { OfflineAwareLayout } from '@/layouts/OfflineAwareLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataSavingModeToggle } from '@/components/DataSavingModeToggle';

interface MerchantDashboardLayoutProps {
  children: React.ReactNode;
  params: {
    merchantId: string;
  };
}

/**
 * Merchant-specific dashboard layout
 * Path: admin.enwhe.io/store/{merchant-id}/dashboard
 */
export default function MerchantDashboardLayout({
  children,
  params,
}: MerchantDashboardLayoutProps) {
  const { merchantId } = params;
  const { tenant, isLoading, error, mode } = useTenant();
  
  // If we're not in admin mode or there's no tenant, show a 404
  // This ensures proper access control for merchant-specific admin areas
  if (!isLoading && (mode !== 'admin' || !tenant)) {
    notFound();
  }
  
  return (
    <OfflineAwareLayout showNetworkIndicator={true} showDataSavingToggle={true} dataSavingTogglePosition="inline">
      <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-gray-900">
              {tenant?.name || 'Loading...'} Admin
            </span>
            <span className="text-sm text-gray-500">({merchantId})</span>
          </div>
          
          <nav className="flex items-center space-x-6">
            <Link 
              href={createMerchantAdminRoute(merchantId)}
              className="text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link 
              href={createMerchantAdminRoute(merchantId, 'products')}
              className="text-gray-600 hover:text-gray-900"
            >
              Products
            </Link>
            <Link 
              href={createMerchantAdminRoute(merchantId, 'orders')}
              className="text-gray-600 hover:text-gray-900"
            >
              Orders
            </Link>
            <Link 
              href={createMerchantAdminRoute(merchantId, 'customers')}
              className="text-gray-600 hover:text-gray-900"
            >
              Customers
            </Link>
            <Link 
              href={createMerchantAdminRoute(merchantId, 'settings')}
              className="text-gray-600 hover:text-gray-900"
            >
              Settings
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <a 
              href={`https://${tenant?.subdomain || merchantId}.enwhe.io`} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View Storefront
            </a>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading merchant dashboard...</div>
          </div>
        ) : (
          <>{children}</>
        )}
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            enwhe.io Admin Dashboard &copy; {new Date().getFullYear()}
          </div>
          <div className="flex items-center">
            <DataSavingModeToggle position="inline" />
          </div>
        </div>
      </footer>
      </div>
    </OfflineAwareLayout>
  );
}
