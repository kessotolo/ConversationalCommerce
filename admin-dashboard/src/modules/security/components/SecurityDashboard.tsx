'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Shield,
    Lock,
    Eye,
    Users,
    Activity,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    XCircle,
    AlertCircle,
    Clock,
    Globe,
    UserCheck
} from 'lucide-react';

// Types for security metrics
interface SecurityMetrics {
    active_sessions: number;
    failed_login_attempts_24h: number;
    ip_allowlist_entries: number;
    enabled_2fa_users: number;
    security_violations_24h: number;
    emergency_lockouts: number;
    rate_limit_violations_24h: number;
    cors_violations_24h: number;
}

interface SecurityEvent {
    id: string;
    timestamp: string;
    event_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    user_id?: string;
    ip_address?: string;
    description: string;
    details?: Record<string, unknown>;
}

interface SecurityAlert {
    id: string;
    title: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
    action_required: boolean;
}

export default function SecurityDashboard() {
    const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Fetch security metrics and events
    useEffect(() => {
        const fetchSecurityData = async () => {
            try {
                setLoading(true);

                // Fetch security metrics
                const metricsResponse = await fetch('/api/admin/security/metrics');
                const metricsData = await metricsResponse.json();
                setMetrics(metricsData);

                // Fetch recent security events
                const eventsResponse = await fetch('/api/admin/security/events?limit=50');
                const eventsData = await eventsResponse.json();
                setEvents(eventsData);

                // Fetch security alerts
                const alertsResponse = await fetch('/api/admin/security/alerts');
                const alertsData = await alertsResponse.json();
                setAlerts(alertsData);

                setLastUpdate(new Date());
            } catch (error) {
                console.error('Failed to fetch security data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSecurityData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchSecurityData, 30000);
        return () => clearInterval(interval);
    }, []);

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'high':
                return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            case 'medium':
                return <AlertCircle className="h-4 w-4 text-yellow-500" />;
            case 'low':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            default:
                return <Activity className="h-4 w-4 text-blue-500" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'low':
                return 'bg-green-100 text-green-800 border-green-300';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-300';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
                    <p className="text-muted-foreground">
                        Monitor security status and respond to threats in real-time
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                        <Activity className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Security Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map((alert) => (
                        <Alert key={alert.id} className={`border-l-4 ${alert.severity === 'error' ? 'border-l-red-500' :
                            alert.severity === 'warning' ? 'border-l-yellow-500' :
                                'border-l-blue-500'
                            }`}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="flex items-center justify-between">
                                {alert.title}
                                <Badge variant={alert.severity === 'error' ? 'destructive' : 'default'}>
                                    {alert.severity.toUpperCase()}
                                </Badge>
                            </AlertTitle>
                            <AlertDescription>
                                {alert.message}
                                {alert.action_required && (
                                    <p className="mt-2 font-medium text-red-600">
                                        ⚠️ Immediate action required
                                    </p>
                                )}
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            {/* Security Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.active_sessions || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            SuperAdmin sessions currently active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed Logins (24h)</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {metrics?.failed_login_attempts_24h || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Failed authentication attempts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">IP Allowlist</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.ip_allowlist_entries || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Active IP allowlist entries
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">2FA Enabled</CardTitle>
                        <Lock className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {metrics?.enabled_2fa_users || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Users with 2FA enabled
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Security Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Security Violations (24h)</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {metrics?.security_violations_24h || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total security violations detected
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Emergency Lockouts</CardTitle>
                        <Shield className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {metrics?.emergency_lockouts || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Active emergency lockouts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rate Limit Violations (24h)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {metrics?.rate_limit_violations_24h || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Rate limiting violations
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Security Events Table */}
            <Tabs defaultValue="events" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="events">Recent Events</TabsTrigger>
                    <TabsTrigger value="violations">Security Violations</TabsTrigger>
                    <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
                </TabsList>

                <TabsContent value="events" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Security Events</CardTitle>
                            <CardDescription>
                                Real-time security events and system activities
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {events.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No recent security events
                                    </p>
                                ) : (
                                    events.map((event) => (
                                        <div
                                            key={event.id}
                                            className="flex items-start space-x-3 p-3 rounded-lg border bg-card"
                                        >
                                            {getSeverityIcon(event.severity)}
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium">{event.description}</p>
                                                    <Badge className={getSeverityColor(event.severity)}>
                                                        {event.severity.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                                                    {event.ip_address && (
                                                        <span>IP: {event.ip_address}</span>
                                                    )}
                                                    {event.user_id && (
                                                        <span>User: {event.user_id}</span>
                                                    )}
                                                    <span>Type: {event.event_type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="violations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Violations</CardTitle>
                            <CardDescription>
                                Failed authentication attempts, IP blocks, and policy violations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {events
                                    .filter(event =>
                                        event.event_type.includes('failed') ||
                                        event.event_type.includes('blocked') ||
                                        event.event_type.includes('violation')
                                    )
                                    .map((event) => (
                                        <div
                                            key={event.id}
                                            className="flex items-start space-x-3 p-3 rounded-lg border border-red-200 bg-red-50"
                                        >
                                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium text-red-900">
                                                    {event.description}
                                                </p>
                                                <div className="flex items-center space-x-4 text-xs text-red-600">
                                                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                                                    {event.ip_address && (
                                                        <span>IP: {event.ip_address}</span>
                                                    )}
                                                    <span>Type: {event.event_type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sessions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active SuperAdmin Sessions</CardTitle>
                            <CardDescription>
                                Currently active SuperAdmin sessions and their details
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Session details will be displayed here</p>
                                <p className="text-sm">Showing {metrics?.active_sessions || 0} active sessions</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Security Actions</CardTitle>
                    <CardDescription>
                        Common security operations and emergency controls
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button variant="outline" className="flex items-center space-x-2">
                            <Shield className="h-4 w-4" />
                            <span>Emergency Lockdown</span>
                        </Button>
                        <Button variant="outline" className="flex items-center space-x-2">
                            <Globe className="h-4 w-4" />
                            <span>Manage IP Allowlist</span>
                        </Button>
                        <Button variant="outline" className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <span>View Audit Logs</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}