'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Activity,
    AlertTriangle,
    Bell,
    Cpu,
    Database,
    HardDrive,
    Network,
    Server,
    Shield,
    Wifi,
    Zap,
    RefreshCw,
    Settings,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle
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

interface Alert {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    timestamp: string;
    acknowledged: boolean;
    service: string;
}

interface SystemHealth {
    overall_status: string;
    uptime_percentage: number;
    database_status: string;
    database_response_time: number;
    api_response_time: number;
    error_rate: number;
    services_status: Record<string, string>;
}

interface SystemMonitoringProps {
    onAlertTriggered?: (alert: any) => void;
}

export function SystemMonitoring({ onAlertTriggered }: SystemMonitoringProps) {
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

    const fetchMonitoringData = async () => {
        try {
            setRefreshing(true);
            const [metricsResponse, servicesResponse, alertsResponse] = await Promise.all([
                api.get('/api/admin/monitoring/metrics'),
                api.get('/api/admin/monitoring/services'),
                api.get('/api/admin/monitoring/alerts')
            ]);

            setMetrics(metricsResponse.data);
            setServices(servicesResponse.data);
            setAlerts(alertsResponse.data);
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

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`;
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
                    {/* System Health Overview */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
                                {systemHealth && getStatusIcon(systemHealth.overall_status)}
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{systemHealth?.overall_status || 'Unknown'}</div>
                                <p className="text-xs text-muted-foreground">
                                    System health status
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                                <Server className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{systemHealth?.uptime_percentage || 0}%</div>
                                <p className="text-xs text-muted-foreground">
                                    System uptime
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">API Response</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {systemHealth ? (systemHealth.api_response_time * 1000).toFixed(0) : 0}ms
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Average response time
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{systemHealth?.error_rate.toFixed(2) || 0}%</div>
                                <p className="text-xs text-muted-foreground">
                                    Current error rate
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Service Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Service Status</CardTitle>
                            <CardDescription>Real-time status of all system services</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {systemHealth?.services_status && Object.entries(systemHealth.services_status).map(([service, status]) => (
                                    <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(status)}
                                            <span className="font-medium">{service}</span>
                                        </div>
                                        <Badge className={getStatusColor(status).replace('text-', 'bg-')}>
                                            {status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                    <MetricsCharts
                        timeRange={timeRange}
                        onTimeRangeChange={setTimeRange}
                    />
                </TabsContent>

                <TabsContent value="logs" className="space-y-4">
                    <SystemLogsViewer maxEntries={1000} />
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    <AlertConfiguration onAlertTriggered={onAlertTriggered} />
                </TabsContent>
            </Tabs>
        </div>
    );
}