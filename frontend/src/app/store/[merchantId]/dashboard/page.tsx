import React, { Suspense, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import Link from 'next/link';
import { Route } from 'next';
import { createMerchantAdminRoute } from '@/utils/routes';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import { useOfflineData } from '@/hooks/useOfflineData';
import { AdminLayout } from '../layouts/AdminLayout';
import { CardSkeleton } from '@/components/Skeletons/CardSkeleton';
import { TableSkeleton } from '@/components/Skeletons/TableSkeleton';
import { useToast } from '@/components/Toast/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Define extended tenant type for dashboard UI
interface TenantDetails {
  name?: string;
  profile?: {
    isComplete?: boolean;
  };
  paymentMethods?: Array<unknown>;
  theme?: {
    isCustomized?: boolean;
  };
}

interface MerchantDashboardPageProps {
  params: {
    merchantId: string;
  };
}

/**
 * Merchant-specific dashboard page
 * Path: admin.enwhe.io/store/{merchant-id}/dashboard
 */
export default function MerchantDashboardPage({ params }: MerchantDashboardPageProps) {
  const { merchantId } = params;
  // Type assertion for tenant to match our dashboard UI needs
  // Type assertion for tenant to match our dashboard UI needs
  const { tenant } = useTenant() as { tenant: TenantDetails | null };
  const { showToast } = useToast();
  
  // Effect to show network status toast when using cached data - positioned after the hook declaration
  
  // Use offline-capable data hook for dashboard stats with error handling
  const { 
    data: stats, 
    loading: statsLoading, 
    isFromCache: isUsingCachedStats,
    error: statsError 
  } = useOfflineData({
    storageKey: `dashboard-stats-${merchantId}`,
    fetchFn: async () => {
      try {
        // In production, this would call the actual API
        // Fetch from Track A's API endpoint as per API_CONTRACT_SPECIFICATIONS.md
        // GET /api/v1/admin/{merchant-id}/dashboard/metrics
        
        // Simulate API call for now
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
          totalOrders: 24,
          revenue: 2850,
          totalProducts: 16,
          totalCustomers: 18
        };
      } catch (error) {
        // Show toast notification for error
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }
    },
    defaultData: {
      totalOrders: 0,
      revenue: 0,
      totalProducts: 0,
      totalCustomers: 0
    }
  });
  
  // Setup guide steps with proper typing
  interface SetupGuideStep {
    title: string;
    description: string;
    completed: boolean;
    href: string;
    external?: boolean;
  }
  
  const setUpGuideSteps: SetupGuideStep[] = [
    {
      title: 'Complete your store profile',
      description: 'Add store details, logo, and contact information',
      completed: tenant?.profile?.isComplete || false,
      href: createMerchantAdminRoute(merchantId, 'settings/profile'),
    },
    {
      title: 'Add your first product',
      description: 'Create your first product listing to start selling',
      completed: stats?.totalProducts > 0,
      href: createMerchantAdminRoute(merchantId, 'products/new'),
    },
    {
      title: 'Set up payment methods',
      description: 'Connect your payment accounts to receive funds',
      completed: (tenant?.paymentMethods?.length ?? 0) > 0 || false,
      href: createMerchantAdminRoute(merchantId, 'settings/payments'),
    },
    {
      title: 'Customize your storefront',
      description: 'Personalize your online store appearance',
      completed: tenant?.theme?.isCustomized || false,
      href: createMerchantAdminRoute(merchantId, 'settings/appearance'),
    },
    {
      title: 'Read our merchant guide',
      description: 'Learn best practices for selling on enwhe.io',
      completed: false,
      href: 'https://help.enwhe.io/merchant-guide',
      external: true,
    },
  ];
  
  const completedSteps = setUpGuideSteps.filter(step => step.completed).length;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold mb-6" id="dashboard-heading">Dashboard</h1>
        <Link
          href={`/store/${merchantId}/dashboard/settings`}
          <Link
            href={`/store/${merchantId}/dashboard/settings`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Settings
          </Link>
        </div>
        
        {/* Dashboard Stats with loading state and error handling */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6" aria-live="polite">
          {statsLoading ? (
            // Skeleton loading state
            <>
              <CardSkeleton lines={2} hasAction={false} />
              <CardSkeleton lines={2} hasAction={false} />
              <CardSkeleton lines={2} hasAction={false} />
              <CardSkeleton lines={2} hasAction={false} />
            </>
          ) : statsError ? (
            // Error state
            <div className="col-span-full bg-red-50 p-4 rounded-lg border border-red-200" role="alert">
              <h3 className="font-medium text-red-800">Unable to load dashboard statistics</h3>
              <p className="mt-1 text-sm text-red-700">
                {statsError instanceof Error ? statsError.message : 'An unknown error occurred'}
              </p>
              <button 
                className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          ) : (
            // Loaded state
            <>
              <StatCard 
                title="Total Orders" 
                value={`${stats.totalOrders}`}
                change="+12% from last month"
                positive={true}
                href={createMerchantAdminRoute(merchantId, 'orders')}
              />
              <StatCard 
                title="Revenue" 
                value={`$${stats.revenue}`}
                change="+8% from last month"
                positive={true} 
                href={createMerchantAdminRoute(merchantId, 'analytics/revenue')}
              />
              <StatCard 
                title="Products" 
                value={`${stats.totalProducts}`}
                change="+2 this week"
                positive={true}
                href={createMerchantAdminRoute(merchantId, 'products')}
              />
              <StatCard 
                title="Customers" 
                value={`${stats.totalCustomers}`}
                change="+3 this week"
                positive={true}
                href={createMerchantAdminRoute(merchantId, 'customers')}
              />
            </>
          )}
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 id="recent-activity-heading" className="text-lg font-medium text-gray-900">Recent Activity</h2>
            <p className="text-gray-500 text-sm">Latest orders and customer interactions</p>
          </div>
          
          <ErrorBoundary>
            <Suspense fallback={<TableSkeleton rows={3} columns={3} />}>
              <div className="overflow-hidden">
                <div className="space-y-6">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="bg-white shadow sm:rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">Order #{1000 + item}</h3>
                            <p className="mt-1 text-xs text-gray-500">2 hours ago</p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Paid
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm text-gray-500">Customer: John Doe</p>
                          <p className="text-sm text-gray-500">Amount: $125.00</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Suspense>
          </ErrorBoundary>
        </div>
        
        {/* Setup Guide */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900" id="setup-guide-heading">Store Setup Guide</h2>
            <span className="text-sm text-gray-500" aria-live="polite">{completedSteps}/{setUpGuideSteps.length} completed</span>
          </div>
          
          <div className="space-y-4">
            {setUpGuideSteps.map((step: SetupGuideStep, index: number) => (
              <SetupStep
                key={index}
                title={step.title}
                description={step.description}
                completed={step.completed}
                href={step.href}
                external={step.external}
              />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Dashboard stat card with improved accessibility
function StatCard({ 
  title, 
  value, 
  change, 
  positive, 
  href 
}: { 
  title: string; 
  value: string; 
  change: string; 
  positive: boolean; 
  href: string; 
}) {
  return (
    <Link href={href as Route} className="block">
      <div 
        className="bg-white rounded-lg shadow p-6 h-full hover:shadow-md transition-shadow"
        aria-labelledby={`stat-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <h3 
          id={`stat-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
          className="text-sm font-medium text-gray-500 mb-1"
        >
          {title}
        </h3>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <span className={`text-sm ${positive ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Empty State Component with accessibility attributes
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center" role="status">

        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-gray-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  );
}

// Setup Step Component
// Setup guide step with improved accessibility
function SetupStep({ 
  title, 
  description, 
  completed, 
  href,
  external = false
}: { 
  title: string; 
  description: string; 
  completed: boolean; 
  href: string;
  external?: boolean;
}) {
  return (
    <div className="flex items-start space-x-4 p-4 border border-gray-100 rounded-lg">
      <div className={`rounded-full flex-shrink-0 h-6 w-6 flex items-center justify-center ${completed ? 'bg-green-500' : 'bg-gray-200'}`}>
        {completed ? (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        ) : (
          <span className="text-xs text-gray-600">•</span>
        )}
      </div>
      <div className="flex-grow">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mb-2">{description}</p>
        {external ? 
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {completed ? 'View' : 'Start'} →
          </a>
        : 
          <Link 
            href={href as Route} 
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {completed ? 'View' : 'Start'} →
          </Link>
        }
      </div>
    </div>
  );
}
