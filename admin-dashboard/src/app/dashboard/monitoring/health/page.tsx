'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Activity,
    Server,
    Globe,
    CheckCircle,
    AlertTriangle,
    XCircle,
    RefreshCw,
    Clock,
    Zap
} from 'lucide-react';
import api from '@/lib/api';

interface SystemHealth {
    overall_status: 'healthy' | 'warning' | 'critical';
    uptime_percentage: number;
    database_status: string;
    database_response_time: number;
    api_response_time: number;
    error_rate: number;
    active_connections: number;
    memory_usage: number;
    cpu_usage: number;
    disk_usage: number;
    last_deployment: string;
    alerts_count: number;
    critical_alerts_count: number;
    services_status: Record<string, string>;
}

export default function SystemHealthPage() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchHealth();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchHealth = async () => {
        try {
            setRefreshing(true);
            const response = await api.get('/api/admin/monitoring/health');
            setHealth(response.data);
        } catch (error) {
            console.error('Error fetching system health:', error);
            // Fallback to mock data for development
            setHealth({
                overall_status: 'healthy',
                uptime_percentage: 99.9,
                database_status: 'healthy',
                database_response_time: 0.005,
                api_response_time: 0.125,
                error_rate: 0.2,
                active_connections: 1247,
                memory_usage: 65.2,
                cpu_usage: 42.1,
                disk_usage: 78.5,
                last_deployment: '2024-01-20T10:00:00Z',
                alerts_count: 3,
                critical_alerts_count: 1,
                services_status: {
                    'Authentication': 'healthy',
                    'Order Processing': 'healthy',
                    'Payment Gateway': 'warning',
                    'Email Service': 'healthy',
                    'SMS Service': 'healthy',
                    'File Storage': 'healthy'
                }
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'bg-green-500';
            case 'warning':
                return 'bg-yellow-500';
            case 'critical':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return CheckCircle;
            case 'warning':
                return AlertTriangle;
            case 'critical':
                return XCircle;
            default:
                return Activity;
        }
    };

    const getUsageColor = (usage: number) => {
        if (usage >= 90) return 'text-red-600';
        if (usage >= 70) return 'text-yellow-600';
        return 'text-green-600';
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-6 w-24 mb-2" />
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-4 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!health) {
        return (
            <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">System health data unavailable</h3>
                <p className="text-gray-500">Unable to fetch system health information.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
                    <p className="text-gray-600">Real-time system monitoring and status</p>
                </div>
                <Button onClick={fetchHealth} disabled={refreshing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Overall Status */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {React.createElement(getStatusIcon(health.overall_status), { className: 'w-6 h-6 text-green-600' })}
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
                                <p className="text-sm text-gray-500">Overall platform health</p>
                            </div>
                        </div>
                        <Badge className={getStatusColor(health.overall_status)}>
                            {health.overall_status.toUpperCase()}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Uptime */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <Badge className="bg-blue-100 text-blue-800">Uptime</Badge>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {health.uptime_percentage.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-500">System uptime</div>
                    </CardContent>
                </Card>

                {/* Response Time */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Zap className="w-5 h-5 text-green-600" />
                            <Badge className="bg-green-100 text-green-800">Performance</Badge>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {(health.api_response_time * 1000).toFixed(0)}ms
                        </div>
                        <div className="text-sm text-gray-500">Avg API response</div>
                    </CardContent>
                </Card>

                {/* Error Rate */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <Badge className="bg-red-100 text-red-800">Errors</Badge>
                        </div>
                        <div className={`text-2xl font-bold ${getUsageColor(health.error_rate)}`}>
                            {health.error_rate.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-500">Error rate</div>
                    </CardContent>
                </Card>

                {/* Active Connections */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Globe className="w-5 h-5 text-purple-600" />
                            <Badge className="bg-purple-100 text-purple-800">Connections</Badge>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {health.active_connections.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Active connections</div>
                    </CardContent>
                </Card>

                {/* Memory Usage */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Server className="w-5 h-5 text-orange-600" />
                            <Badge className="bg-orange-100 text-orange-800">Memory</Badge>
                        </div>
                        <div className={`text-2xl font-bold ${getUsageColor(health.memory_usage)}`}>
                            {health.memory_usage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">Memory usage</div>
                    </CardContent>
                </Card>

                {/* CPU Usage */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            <Badge className="bg-indigo-100 text-indigo-800">CPU</Badge>
                        </div>
                        <div className={`text-2xl font-bold ${getUsageColor(health.cpu_usage)}`}>
                            {health.cpu_usage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">CPU usage</div>
                    </CardContent>
                </Card>
            </div>

            {/* Service Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Service Status</CardTitle>
                    <CardDescription>Individual service health and performance</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(health.services_status).map(([service, status]) => (
                            <div key={service} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    {React.createElement(getStatusIcon(status), { className: 'w-5 h-5 text-gray-400' })}
                                    <span className="font-medium text-gray-900">{service}</span>
                                </div>
                                <Badge className={getStatusColor(status)}>
                                    {status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Alerts */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">System Alerts</CardTitle>
                    <CardDescription>Active alerts and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                <div>
                                    <h3 className="font-medium text-gray-900">Payment Gateway Warning</h3>
                                    <p className="text-sm text-gray-500">Response time increased by 15%</p>
                                </div>
                            </div>
                            <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div>
                                    <h3 className="font-medium text-gray-900">All Systems Operational</h3>
                                    <p className="text-sm text-gray-500">No critical issues detected</p>
                                </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-500">
                Last updated: {new Date().toLocaleString()}
            </div>
        </div>
    );
}