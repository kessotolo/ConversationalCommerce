'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  Activity, 
  User, 
  Database, 
  AlertTriangle, 
  Filter, 
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// Note: Using div with appropriate classes instead of missing components
// Replace these with actual component imports if they exist elsewhere

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
  high: 'bg-red-100 text-red-800 border-red-200'
};

const actionColors = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  PATCH: 'bg-purple-100 text-purple-800',
  DELETE: 'bg-red-100 text-red-800'
};

export default function AdminMonitoringPage() {
  const router = useRouter();
  const { user } = useUser();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [realtimeActivities, setRealtimeActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState('history');
  const wsRef = useRef<WebSocket | null>(null);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    }).format(date);
  };

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      if (!user) return;
      
      const tenantId = localStorage.getItem('tenant_id');
      if (!tenantId) {
        console.error('No tenant ID found for WebSocket connection');
        return;
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const wsUrl = API_URL.replace('http', 'ws') + `/api/v1/ws/monitoring/${tenantId}`;
      
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Create new connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'activity') {
            // Add to real-time activities
            setRealtimeActivities(prev => {
              // Keep only latest 50 activities
              const updated = [message.data, ...prev].slice(0, 50);
              return updated;
            });
            
            // Show notification for high severity events
            if (message.data.severity === 'high') {
              toast({
                title: 'High Severity Activity',
                description: `${message.data.action} on ${message.data.resource_type}`,
                variant: 'destructive'
              });
            }
          }
        } catch (err) {
          console.error('Error processing WebSocket message', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to real-time activity monitoring',
          variant: 'destructive'
        });
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        // Attempt to reconnect after delay
        setTimeout(connectWebSocket, 5000);
      };
    };
    
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  // Fetch historical activity data
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/activities?timeRange=${timeRange}&filter=${filter}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': localStorage.getItem('tenant_id') || '',
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        
        const data = await response.json();
        setActivities(data.items || []);
      } catch (err) {
        setError('Failed to load activity data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [timeRange, filter]);

  // Filter activities based on search term
  const filteredActivities = activities.filter(activity => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      activity.action.toLowerCase().includes(searchLower) ||
      activity.resource_type.toLowerCase().includes(searchLower) ||
      activity.resource_id.toLowerCase().includes(searchLower) ||
      (activity.userName && activity.userName.toLowerCase().includes(searchLower))
    );
  });

  const renderActivityItem = (activity: ActivityEvent, isRealtime = false) => (
    <div 
      key={activity.id} 
      className={`p-4 border rounded-lg mb-3 ${isRealtime ? 'animate-pulse bg-gray-50' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="mr-3">
            <Activity className="h-5 w-5 text-gray-500" />
          </div>
          <div>
            <div className="font-medium">
              {activity.action} {activity.resource_type}
              {activity.resource_id !== 'none' && (
                <span className="ml-1 text-gray-500">#{activity.resource_id}</span>
              )}
            </div>
            <div className="text-sm text-gray-500 flex items-center mt-1">
              <Clock className="h-3 w-3 mr-1" />
              {formatDate(activity.timestamp)}
              
              <User className="h-3 w-3 ml-3 mr-1" />
              {activity.userName || activity.user_id.substring(0, 8)}
              
              <span className="ml-3">
                <Badge 
                  className={actionColors[activity.details.method as keyof typeof actionColors] || 'bg-gray-100'}
                >
                  {activity.details.method}
                </Badge>
              </span>
              
              <span className="ml-2">
                <Badge 
                  className={severityColors[activity.severity]}
                >
                  {activity.severity}
                </Badge>
              </span>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {activity.details.status_code && (
            <Badge variant={activity.details.status_code < 400 ? 'outline' : 'destructive'}>
              {activity.details.status_code}
            </Badge>
          )}
          {activity.details.duration && (
            <span className="ml-2">{activity.details.duration.toFixed(2)}s</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Activity Monitoring</h1>
              <p className="text-gray-500">Track and monitor all system activities</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last hour</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All activities</SelectItem>
                  <SelectItem value="high">High severity</SelectItem>
                  <SelectItem value="alerts">Alerts only</SelectItem>
                  <SelectItem value="errors">Errors only</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" onClick={() => router.refresh()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activities.length}</div>
              <p className="text-xs text-gray-500">in selected time period</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">High Severity Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {activities.filter(a => a.severity === 'high').length}
              </div>
              <p className="text-xs text-gray-500">requiring attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(activities.map(a => a.user_id)).size}
              </div>
              <p className="text-xs text-gray-500">unique users active</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-4 py-2">
              <TabsList>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="realtime">
                  Real-time
                  {realtimeActivities.length > 0 && (
                    <Badge className="ml-2 bg-blue-500">{realtimeActivities.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="alerts">
                  Alerts
                  <Badge className="ml-2 bg-red-500">
                    {activities.filter(a => a.severity === 'high').length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-3 mb-1">
                <Input
                  placeholder="Search activities..."
                  className="max-w-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  prefix={<Filter className="h-4 w-4 text-gray-400" />}
                />
              </div>
            </div>
            
            <TabsContent value="history" className="p-4">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="mb-3">
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))
              ) : error ? (
                <div className="text-center py-10">
                  <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.refresh()}
                  >
                    Try again
                  </Button>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-10">
                  <Database className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">No activities found</p>
                  <p className="text-gray-500">
                    Try changing your filters or time range
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredActivities.map(activity => renderActivityItem(activity))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="realtime" className="p-4">
              {realtimeActivities.length === 0 ? (
                <div className="text-center py-10">
                  <Activity className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">Waiting for activities</p>
                  <p className="text-gray-500">
                    Real-time activities will appear here as they happen
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {realtimeActivities
                    .filter(activity => {
                      if (!searchTerm) return true;
                      const searchLower = searchTerm.toLowerCase();
                      return (
                        activity.action.toLowerCase().includes(searchLower) ||
                        activity.resource_type.toLowerCase().includes(searchLower) ||
                        activity.resource_id.toLowerCase().includes(searchLower)
                      );
                    })
                    .map(activity => renderActivityItem(activity, true))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="alerts" className="p-4">
              {activities.filter(a => a.severity === 'high').length === 0 ? (
                <div className="text-center py-10">
                  <AlertTriangle className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">No alerts found</p>
                  <p className="text-gray-500">
                    No high severity events have been detected
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities
                    .filter(a => a.severity === 'high')
                    .map(activity => renderActivityItem(activity))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
