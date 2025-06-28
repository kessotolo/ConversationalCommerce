'use client';

import { useUser } from '@clerk/nextjs';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast, ToastProvider } from '@/components/ui/ToastProvider';
import { onboardingApi } from '@/modules/tenant/api/onboardingApi';
import type { KYCInfoResponse } from '@/modules/tenant/api/onboardingApi';

interface ActivityEvent {
  id: string;
  user_id: string;
  tenant_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: {
    path: string;
    method: string;
    status_code: number;
    duration: number;
    ip_address: string;
    user_agent: string;
  };
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  userName?: string;
}

const severityColors = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-red-100 text-red-800 border-red-200',
};

export default function MonitoringPage() {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [kycRequests, setKycRequests] = useState<KYCInfoResponse[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycActionLoading, setKycActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Simulate fetching data
    setTimeout(() => {
      setActivities([
        {
          id: '1',
          user_id: 'user123',
          tenant_id: 'tenant456',
          action: 'login',
          resource_type: 'user',
          resource_id: 'user123',
          details: {
            path: '/login',
            method: 'POST',
            status_code: 200,
            duration: 0.5,
            ip_address: '192.168.1.1',
            user_agent: 'Chrome',
          },
          severity: 'low',
          timestamp: new Date().toISOString(),
          userName: user.fullName || 'User',
        },
      ]);
      setLoading(false);

      // Show sample toast
      toast({
        title: 'Monitoring Active',
        description: 'Real-time activity monitoring is now active',
        variant: 'default',
      });
    }, 1000);

    return () => { };
  }, [user, toast]);

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
            {activity.userName || activity.user_id} •
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
    <ToastProvider>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activities.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Severity Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activities.filter((a) => a.severity === 'high').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(activities.map((a) => a.user_id)).size}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4">Activity Log</h2>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : activities.length > 0 ? (
              <div className="space-y-2">{activities.map(renderActivity)}</div>
            ) : (
              <div className="text-center py-8 text-gray-500">No activities to display.</div>
            )}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
