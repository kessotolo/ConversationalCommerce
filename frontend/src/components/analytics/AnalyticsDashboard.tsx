import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClerk } from '@clerk/clerk-react';
import type { DashboardStatsResponse } from '@/modules/core/models/dashboard';

interface AnalyticsDashboardProps {
  stats?: DashboardStatsResponse | null;
  onRefresh?: () => void;
}

/**
 * Analytics Dashboard component that displays business metrics
 * Follows similar structure to existing dashboard components for consistency
 */
const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ stats, onRefresh }) => {
  const { user } = useClerk();
  const [tenantId, setTenantId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setTenantId(localStorage.getItem('tenant_id') ?? '');
    }
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  // If no tenant is selected, show a message
  if (!tenantId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-semibold mb-4">No store selected</h2>
            <p className="text-gray-600">Please select a store to view analytics data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Business Analytics</h1>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="p-6">
            {stats ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* User Stats Card */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm uppercase tracking-wide mb-1">Total Users</h3>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold">{stats.totalUsers}</div>
                    </div>
                  </div>

                  {/* Orders Stats Card */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm uppercase tracking-wide mb-1">Total Orders</h3>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold">{stats.totalOrders}</div>
                    </div>
                  </div>

                  {/* Revenue Stats Card */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm uppercase tracking-wide mb-1">Total Revenue</h3>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold">
                        ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Empty State */}
                {stats.totalUsers === 0 && stats.totalOrders === 0 && stats.totalRevenue === 0 && (
                  <div className="mt-8 bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
                    <div className="w-16 h-16 text-gray-400 mx-auto mb-4">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1M9 7h6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-700">No data yet</h3>
                    <p className="mt-2 text-gray-500">
                      Your dashboard will populate as you onboard users and receive orders.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional analytics sections can be added here in the future */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 h-72 flex items-center justify-center">
              <h3 className="text-lg font-medium text-gray-500">
                Revenue Trends (Coming Soon)
              </h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 h-72 flex items-center justify-center">
              <h3 className="text-lg font-medium text-gray-500">
                Order Statistics (Coming Soon)
              </h3>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
