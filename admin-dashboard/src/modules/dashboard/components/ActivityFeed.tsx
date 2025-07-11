'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Activity,
    RefreshCw,
    Search,
    User,
    Settings,
    Shield,
    ShoppingCart,
    Building2,
    Package,
    ExternalLink,
    AlertTriangle,
    Wifi,
    WifiOff
} from 'lucide-react';

interface ActivityItem {
    id: string;
    event_type: string;
    title: string;
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical';
    actor_id?: string;
    target_id?: string;
    target_type?: string;
    ip_address?: string;
    metadata?: Record<string, unknown>;
}

export function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchActivities = useCallback(async () => {
        try {
            setError(null);
            const params = new URLSearchParams();
            if (severityFilter !== 'all') {
                params.append('severity', severityFilter);
            }
            if (eventTypeFilter !== 'all') {
                params.append('event_types', eventTypeFilter);
            }

            const response = await fetch(`/api/admin/activity/feed?${params}`);
            if (response.ok) {
                const data = await response.json();
                setActivities(data);
            } else {
                throw new Error(`Failed to fetch activities: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
            setError(error instanceof Error ? error.message : 'Failed to load activities');
        } finally {
            setLoading(false);
        }
    }, [severityFilter, eventTypeFilter]);

    useEffect(() => {
        fetchActivities();

        // Auto-refresh every 30 seconds if enabled
        if (autoRefresh) {
            const interval = setInterval(fetchActivities, 30000);
            return () => clearInterval(interval);
        }

        return () => { };
    }, [fetchActivities, autoRefresh]);

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!autoRefresh) {
            return () => { };
        }

        const connectWebSocket = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/admin/activity/ws/current_user`;

            try {
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log('Connected to activity feed WebSocket');
                    setWsConnected(true);
                    setError(null);

                    // Subscribe to all activity events
                    ws.send(JSON.stringify({
                        type: 'subscribe',
                        event_types: ['all']
                    }));
                };

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'activity') {
                            setActivities(prev => [message.data, ...prev.slice(0, 49)]);
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                ws.onclose = (event) => {
                    console.log('Disconnected from activity feed WebSocket:', event.code, event.reason);
                    setWsConnected(false);

                    // Attempt to reconnect after 5 seconds
                    if (autoRefresh && event.code !== 1000) {
                        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setWsConnected(false);
                    setError('WebSocket connection failed. Falling back to polling.');
                };

                return () => {
                    ws.close();
                };
            } catch (error) {
                console.error('WebSocket connection error:', error);
                setError('Failed to establish WebSocket connection. Using polling mode.');
                return () => { };
            }
        };

        const cleanup = connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (cleanup) cleanup();
        };
    }, [autoRefresh]);

    const getActivityIcon = (eventType: string) => {
        switch (eventType) {
            case 'authentication':
            case 'user_login':
                return <User className="h-4 w-4" aria-hidden="true" />;
            case 'security_violation':
            case 'emergency_lockdown':
                return <Shield className="h-4 w-4" aria-hidden="true" />;
            case 'order_created':
            case 'order_updated':
                return <ShoppingCart className="h-4 w-4" aria-hidden="true" />;
            case 'tenant_created':
            case 'tenant_updated':
                return <Building2 className="h-4 w-4" aria-hidden="true" />;
            case 'product_created':
            case 'product_updated':
                return <Package className="h-4 w-4" aria-hidden="true" />;
            case 'admin_action':
            case 'configuration_changed':
                return <Settings className="h-4 w-4" aria-hidden="true" />;
            default:
                return <Activity className="h-4 w-4" aria-hidden="true" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'destructive';
            case 'warning':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) {
            return 'Just now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        } else if (diffInMinutes < 1440) {
            return `${Math.floor(diffInMinutes / 60)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const filteredActivities = activities.filter(activity => {
        if (searchTerm && !activity.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !activity.description.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        return true;
    });

    const handleRefresh = () => {
        setLoading(true);
        fetchActivities();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                    <div>
                        <CardTitle className="flex items-center space-x-2">
                            <span>Activity Feed</span>
                            {wsConnected ? (
                                <Wifi className="h-4 w-4 text-green-600" aria-label="WebSocket connected" />
                            ) : (
                                <WifiOff className="h-4 w-4 text-gray-400" aria-label="WebSocket disconnected" />
                            )}
                        </CardTitle>
                        <CardDescription>Real-time platform activity and events</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            aria-label={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} aria-hidden="true" />
                            {autoRefresh ? 'Auto' : 'Manual'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={loading}
                            aria-label="Refresh activities"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Error Display */}
                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <Input
                            placeholder="Search activities..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                            aria-label="Search activities"
                        />
                    </div>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                        <SelectTrigger className="w-32" aria-label="Filter by severity">
                            <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Severity</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                        <SelectTrigger className="w-40" aria-label="Filter by event type">
                            <SelectValue placeholder="Event Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Events</SelectItem>
                            <SelectItem value="authentication">Authentication</SelectItem>
                            <SelectItem value="security">Security</SelectItem>
                            <SelectItem value="orders">Orders</SelectItem>
                            <SelectItem value="tenants">Tenants</SelectItem>
                            <SelectItem value="admin">Admin Actions</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Activities List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" aria-hidden="true" />
                            <p className="text-sm text-muted-foreground">Loading activities...</p>
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="text-center py-8">
                            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                            <p className="text-sm text-muted-foreground">No activities found</p>
                        </div>
                    ) : (
                        filteredActivities.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                                role="article"
                                aria-label={`Activity: ${activity.title}`}
                            >
                                <div className="flex-shrink-0 p-2 rounded-full bg-muted">
                                    {getActivityIcon(activity.event_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-gray-900 truncate">
                                            {activity.title}
                                        </h4>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={getSeverityColor(activity.severity)}>
                                                {activity.severity}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimestamp(activity.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                        {activity.description}
                                    </p>
                                    {activity.ip_address && (
                                        <div className="flex items-center space-x-1 mt-2">
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                                            <span className="text-xs text-muted-foreground">
                                                IP: {activity.ip_address}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Activity Count */}
                {filteredActivities.length > 0 && (
                    <div className="text-center text-sm text-muted-foreground">
                        Showing {filteredActivities.length} of {activities.length} activities
                    </div>
                )}
            </CardContent>
        </Card>
    );
}