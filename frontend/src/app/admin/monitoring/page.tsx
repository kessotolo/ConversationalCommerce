'use client';

import { useUser } from '@clerk/nextjs';
import { ArrowLeft, RefreshCw, WifiOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast, ToastProvider } from '@/components/ui/use-toast';
// Remove pagination component import since we're using custom pagination controls
import { monitoringApi, ActivityEvent, SystemMetrics } from '@/modules/admin/api/monitoringApi';
import { useNetworkStatus } from '@/modules/core/hooks/useNetworkStatus';
import { onboardingApi } from '@/modules/tenant/api/onboardingApi';
import type { KYCInfoResponse } from '@/modules/tenant/api/onboardingApi';

// Time range options for filtering
const TIME_RANGE_OPTIONS = [
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

// Filter type options
const FILTER_TYPE_OPTIONS = [
  { value: 'all', label: 'All activities' },
  { value: 'high', label: 'High severity' },
  { value: 'alerts', label: 'System alerts' },
  { value: 'errors', label: 'Errors' },
];

const severityColors = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-red-100 text-red-800 border-red-200',
};

function MonitoringContent() {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const { isOnline, offlineDuration } = useNetworkStatus();
  
  // Activity monitoring state
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [filterType, setFilterType] = useState<string>('all');
  const [metrics, setMetrics] = useState<SystemMetrics>({
    active_users: 0,
    high_severity_count: 0,
    total_activities: 0,
    error_rate: 0
  });
  
  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  
  // KYC state
  const [kycRequests, setKycRequests] = useState<KYCInfoResponse[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycActionLoading, setKycActionLoading] = useState<string | null>(null);

  // Fetch activities and metrics
  const fetchActivitiesAndMetrics = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const token = (user as any)?.sessionToken || '';
      
      // Fetch activities with pagination
      const activitiesResponse = await monitoringApi.getActivities(
        token,
        offset,
        limit,
        timeRange,
        filterType
      );
      
      setActivities(activitiesResponse.items);
      setTotal(activitiesResponse.total);
      
      // Fetch system metrics
      const metricsData = await monitoringApi.getSystemMetrics(token, timeRange);
      setMetrics(metricsData);
      
      if (isOnline) {
        toast({
          title: 'Monitoring Updated',
          description: 'Activity data has been refreshed',
          variant: 'default',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error instanceof Error) ? error.message : 'Failed to load activities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchActivitiesAndMetrics();
    
    // Set up periodic refresh (every 30 seconds if online)
    const intervalId = setInterval(() => {
      if (isOnline && !refreshing) {
        fetchActivitiesAndMetrics();
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [user, isOnline, offset, limit, timeRange, filterType]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    if (!isOnline) {
      toast({
        title: 'Offline',
        description: 'Cannot refresh while offline',
        variant: 'destructive',
      });
      return;
    }
    
    setRefreshing(true);
    fetchActivitiesAndMetrics();
  };

  useEffect(() => {
    const fetchKYC = async () => {
      setKycLoading(true);
      setKycError(null);
      try {
        const token = (user as any)?.sessionToken || '';
        const data = await onboardingApi.listKYCRequests(token);
        setKycRequests(data);
      } catch (err) {
        setKycError((err as Error).message ?? 'Failed to load KYC requests');
      } finally {
        setKycLoading(false);
      }
    };
    fetchKYC();
  }, [user]);

  const handleKYCAction = async (kyc_id: string, action: 'approve' | 'reject') => {
    setKycActionLoading(kyc_id + action);
    try {
      const token = (user as any)?.sessionToken || '';
      await onboardingApi.reviewKYC({ kyc_id, action }, token);
      setKycRequests((prev) => prev.filter((k) => k.id !== kyc_id));
      toast({
        title: `KYC ${action === 'approve' ? 'approved' : 'rejected'}`,
        description: `KYC request ${kyc_id} has been ${action}d`,
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: (err as Error).message ?? 'Failed to update KYC',
        variant: 'destructive',
      });
    } finally {
      setKycActionLoading(null);
    }
  };

  const renderActivity = (activity: ActivityEvent) => (
    <div
      key={activity.id}
      className={`mb-2 p-3 rounded-md border ${severityColors[activity.severity]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">
            {activity.action} {activity.resource_type}
          </div>
          <div className="text-sm text-gray-600">
            {activity.user_name || activity.user_id} •
            {new Date(activity.timestamp).toLocaleTimeString()}
          </div>
        </div>
        <div>
          {activity.details.status_code && (
            <Badge variant={activity.details.status_code < 400 ? 'outline' : 'destructive'}>
              {activity.details.status_code}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" className="mb-4" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Activity Monitoring</h1>
        </div>

        {/* Network status indicator */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-6 flex items-center">
            <WifiOff className="h-5 w-5 mr-2 text-amber-600" />
            <span className="text-amber-800">
              You are currently offline. Data shown may be outdated. 
              {offlineDuration > 60 && ` (Offline for ${Math.floor(offlineDuration / 60)} minutes)`}
            </span>
          </div>
        )}
        
        {/* Controls row */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
              className="border rounded-md px-2 py-1.5 text-sm"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              disabled={loading || refreshing}
            >
              {TIME_RANGE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select 
              className="border rounded-md px-2 py-1.5 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              disabled={loading || refreshing}
            >
              {FILTER_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto" 
            onClick={handleRefresh}
            disabled={!isOnline || loading || refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_activities}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">High Severity Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.high_severity_count}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.active_users}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.error_rate}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">Activity Log</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">Loading activity data...</span>
            </div>
          ) : activities.length > 0 ? (
            <>
              <div className="space-y-2 mb-4">{activities.map(renderActivity)}</div>
              
              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {offset + 1}-{Math.min(offset + activities.length, total)} of {total} activities
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={offset === 0 || loading || refreshing}
                    onClick={() => setOffset(0)}
                  >
                    First
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={offset === 0 || loading || refreshing}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={offset + limit >= total || loading || refreshing}
                    onClick={() => setOffset(offset + limit)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No activities to display for the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  return (
    <ToastProvider>
      <MonitoringContent />
    </ToastProvider>
  );
}
