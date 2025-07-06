import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useClerk } from '@clerk/clerk-react';

import DashboardOverview from '@/modules/dashboard/components/DashboardOverview';

/**
 * Analytics Dashboard component that displays business metrics
 * Follows similar structure to existing dashboard components for consistency
 */
const AnalyticsDashboard: React.FC = () => {
  const { user } = useClerk();
  const [tenantId, setTenantId] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setTenantId(localStorage.getItem('tenant_id') ?? '');
    }
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

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
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="p-6">
            <DashboardOverview key={refreshKey} />
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
