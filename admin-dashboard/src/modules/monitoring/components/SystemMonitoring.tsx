'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Activity,
    AlertTriangle,
    Server,
    Zap,
    RefreshCw
} from 'lucide-react';
import api from '@/lib/api';

import { MetricsCharts } from './MetricsCharts';
import { SystemLogsViewer } from './SystemLogsViewer';
import { AlertConfiguration } from './AlertConfiguration';

interface SystemMetrics {
    cpu_usage: number;
    memory_usage: number;
    memory_total: number;
    disk_usage: number;
    disk_total: number;
    network_in: number;
    network_out: number;
    database_connections: number;
    database_queries_per_second: number;
    api_requests_per_second: number;
    error_rate: number;
    response_time_avg: number;
    uptime_percentage: number;
    last_updated: string;
}

interface ServiceStatus {
    name: string;
    status: 'healthy' | 'warning' | 'critical' | 'offline';
    response_time: number;
    last_check: string;
    error_count: number;
    uptime_percentage: number;
}

type SystemMonitoringProps = Record<string, never>;

export function SystemMonitoring({ }: SystemMonitoringProps) {
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

    const fetchMonitoringData = async () => {
        try {
            setRefreshing(true);
            const [metricsResponse, servicesResponse] = await Promise.all([
                api.get('/api/admin/monitoring/metrics'),
                api.get('/api/admin/monitoring/services')
            ]);

            setMetrics(metricsResponse.data);
            setServices(servicesResponse.data);
        } catch (error) {
            console.error('Error fetching monitoring data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMonitoringData();
        const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'healthy':
            case 'active':
                return 'text-green-600';
            case 'warning':
            case 'degraded':
                return 'text-yellow-600';
            case 'critical':
            case 'error':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'healthy':
            case 'active':
                return <Activity className="h-4 w-4 text-green-600" />;
            case 'warning':
            case 'degraded':
                return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            case 'critical':
            case 'error':
                return <AlertTriangle className="h-4 w-4 text-red-600" />;
            default:
                return <Activity className="h-4 w-4 text-gray-600" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">System Monitoring</h2>
                    <p className="text-muted-foreground">Real-time system health and performance monitoring</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRefreshing(!refreshing)}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="logs">System Logs</TabsTrigger>
                    <TabsTrigger value="alerts">Alerts</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics?.cpu_usage?.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">
                                    Current CPU utilization
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                                <Server className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics?.memory_usage?.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">
                                    Memory utilization
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics?.error_rate?.toFixed(2)}%</div>
                                <p className="text-xs text-muted-foreground">
                                    Current error rate
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics?.uptime_percentage?.toFixed(2)}%</div>
                                <p className="text-xs text-muted-foreground">
                                    System uptime
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Services Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Services Status</CardTitle>
                            <CardDescription>Real-time status of all system services</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {services.map((service) => (
                                    <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            {getStatusIcon(service.status)}
                                            <div>
                                                <div className="font-medium">{service.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Response: {service.response_time}ms
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge className={getStatusColor(service.status)}>
                                                {service.status}
                                            </Badge>
                                            <div className="text-sm text-muted-foreground">
                                                {service.uptime_percentage.toFixed(1)}% uptime
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                    <MetricsCharts timeRange={timeRange} onTimeRangeChange={setTimeRange} />
                </TabsContent>

                <TabsContent value="logs" className="space-y-4">
                    <SystemLogsViewer timeRange={timeRange} />
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    <AlertConfiguration />
                </TabsContent>
            </Tabs>
        </div>
    );
}