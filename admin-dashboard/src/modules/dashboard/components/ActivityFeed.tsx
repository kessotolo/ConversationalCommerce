'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    ExternalLink
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
    metadata?: Record<string, any>;
}

export function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchActivities = useCallback(async () => {
        try {
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
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
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

        // Return empty cleanup function when autoRefresh is false
        return () => { };
    }, [fetchActivities, autoRefresh]);

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!autoRefresh) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/admin/activity/ws/current_user`;

        try {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('Connected to activity feed WebSocket');
                // Subscribe to all activity events
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    event_types: ['all']
                }));
            };

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'activity') {
                    setActivities(prev => [message.data, ...prev.slice(0, 49)]);
                }
            };

            ws.onclose = () => {
                console.log('Disconnected from activity feed WebSocket');
            };

            return () => {
                ws.close();
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }, [autoRefresh]);

    const getActivityIcon = (eventType: string) => {
        switch (eventType) {
            case 'authentication':
            case 'user_login':
                return <User className="h-4 w-4" />;
            case 'security_violation':
            case 'emergency_lockdown':
                return <Shield className="h-4 w-4" />;
            case 'order_created':
            case 'order_updated':
                return <ShoppingCart className="h-4 w-4" />;
            case 'tenant_created':
            case 'tenant_updated':
                return <Building2 className="h-4 w-4" />;
            case 'product_created':
            case 'product_updated':
                return <Package className="h-4 w-4" />;
            case 'admin_action':
            case 'configuration_changed':
                return <Settings className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
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

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                    <div>
                        <CardTitle>Activity Feed</CardTitle>
                        <CardDescription>Real-time platform activity and events</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                            {autoRefresh ? 'Auto' : 'Manual'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchActivities}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search activities..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                        <SelectTrigger className="w-full sm:w-[120px]">
                            <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Severity</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                        <SelectTrigger className="w-full sm:w-[140px]">
                            <SelectValue placeholder="Event Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Events</SelectItem>
                            <SelectItem value="authentication">Authentication</SelectItem>
                            <SelectItem value="security_violation">Security</SelectItem>
                            <SelectItem value="order_created">Orders</SelectItem>
                            <SelectItem value="tenant_created">Tenants</SelectItem>
                            <SelectItem value="admin_action">Admin Actions</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mr-2" />
                        No activities found
                    </div>
                ) : (
                    <div className="max-h-96 overflow-auto">
                        {filteredActivities.map((activity, index) => (
                            <div
                                key={activity.id}
                                className={`p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${index === 0 ? 'bg-muted/25' : ''
                                    }`}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className={`p-2 rounded-full ${activity.severity === 'critical' ? 'bg-red-100 text-red-600' :
                                        activity.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                        {getActivityIcon(activity.event_type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-foreground">
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

                                        <p className="text-sm text-muted-foreground mt-1">
                                            {activity.description}
                                        </p>

                                        {/* Metadata */}
                                        {(activity.ip_address || activity.actor_id || activity.target_id) && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {activity.ip_address && (
                                                    <Badge variant="outline" className="text-xs">
                                                        IP: {activity.ip_address}
                                                    </Badge>
                                                )}
                                                {activity.actor_id && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Actor: {activity.actor_id}
                                                    </Badge>
                                                )}
                                                {activity.target_id && activity.target_type && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Target: {activity.target_type}#{activity.target_id}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action button */}
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}