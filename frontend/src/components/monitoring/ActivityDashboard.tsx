import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Activity as ActivityIcon, Users, Globe } from 'lucide-react';

import { useWebSocket } from '@/hooks/useWebSocket';

import AuditLogTable from './AuditLogTable';
import NotificationCenter from './NotificationCenter';

interface Activity {
  id: string;
  user_id: string;
  resource_type: string;
  action: string;
  status_code: number;
  path: string;
  method: string;
  duration: number;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  details: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high';
}

interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<number, number>;
  byUser: Record<string, number>;
}

const ActivityDashboard: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    byType: {},
    byStatus: {},
    byUser: {},
  });

  const [tenantId, setTenantId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setTenantId(localStorage.getItem('tenant_id') ?? '');
    }
  }, []);

  // WebSocket connection - only establish when tenantId is available
  const { lastMessage } = useWebSocket(
    tenantId
      ? `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080'}/ws/monitoring/${tenantId}`
      : '',
  );

  useEffect(() => {
    if (lastMessage && typeof lastMessage === 'object') {
      try {
        // WebSocketMessage already contains parsed data in its payload
        if (lastMessage.type === 'activity' && lastMessage.payload) {
          const activityData = lastMessage.payload as Activity;
          setActivities((prev) => [activityData, ...prev].slice(0, 100));
          updateStats(activityData);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  const updateStats = (activity: Activity) => {
    setStats((prev) => ({
      total: prev.total + 1,
      byType: {
        ...prev.byType,
        [activity.resource_type]: (prev.byType[activity.resource_type] ?? 0) + 1,
      },
      byStatus: {
        ...prev.byStatus,
        [activity.status_code]: (prev.byStatus[activity.status_code] ?? 0) + 1,
      },
      byUser: {
        ...prev.byUser,
        [activity.user_id]: (prev.byUser[activity.user_id] ?? 0) + 1,
      },
    }));
  };

  const handleRefresh = () => {
    // Clear activities and fetch new ones
    setActivities([]);
    setStats({
      total: 0,
      byType: {},
      byStatus: {},
      byUser: {},
    });
  };

  const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getMethodVariant = (method: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'default';
      case 'POST':
        return 'secondary';
      case 'PUT':
      case 'PATCH':
        return 'outline';
      case 'DELETE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Activity Dashboard</h1>
        <div className="flex items-center space-x-4">
          {mounted && <NotificationCenter />}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Activities tracked in real-time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.byUser).length}</div>
            <p className="text-xs text-muted-foreground">
              Unique users with activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resource Types</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.byType).length}</div>
            <p className="text-xs text-muted-foreground">
              Different resource types accessed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Log</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No activities to display
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-medium">{activity.user_id}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{activity.resource_type}</TableCell>
                    <TableCell>
                      <Badge variant={getMethodVariant(activity.method)}>
                        {activity.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${activity.status_code >= 200 && activity.status_code < 300
                          ? 'bg-green-100 text-green-800'
                          : activity.status_code >= 400
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {activity.status_code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityVariant(activity.severity)}>
                        {activity.severity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <div>{mounted && tenantId && <AuditLogTable tenantId={tenantId} />}</div>
    </div>
  );
};

export default ActivityDashboard;
