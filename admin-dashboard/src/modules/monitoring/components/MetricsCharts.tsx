'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, TrendingUp, TrendingDown, Activity, Cpu, Database, Network, HardDrive } from 'lucide-react';
import api from '@/lib/api';

interface MetricData {
    timestamp: string;
    value: number;
    label: string;
}

interface SystemMetrics {
    cpu_usage: MetricData[];
    memory_usage: MetricData[];
    disk_usage: MetricData[];
    network_throughput: MetricData[];
    response_time: MetricData[];
    error_rate: MetricData[];
    active_connections: MetricData[];
    requests_per_second: MetricData[];
}

interface MetricsChartsProps {
    timeRange: '1h' | '6h' | '24h' | '7d';
    onTimeRangeChange: (range: '1h' | '6h' | '24h' | '7d') => void;
}

export function MetricsCharts({ timeRange, onTimeRangeChange }: MetricsChartsProps) {
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMetrics = async () => {
        try {
            setRefreshing(true);
            const response = await api.get(`/api/admin/monitoring/metrics?range=${timeRange}`);
            setMetrics(response.data);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [timeRange]);

    const formatValue = (value: number, type: string) => {
        switch (type) {
            case 'percentage':
                return `${value.toFixed(1)}%`;
            case 'bytes':
                return `${(value / 1024 / 1024).toFixed(1)} MB`;
            case 'time':
                return `${value.toFixed(0)}ms`;
            case 'rate':
                return `${value.toFixed(1)}/s`;
            default:
                return value.toFixed(1);
        }
    };

    const getTrendIcon = (data: MetricData[]) => {
        if (data.length < 2) return Activity;
        const recent = data[data.length - 1].value;
        const previous = data[data.length - 2].value;
        return recent > previous ? TrendingUp : TrendingDown;
    };

    const getTrendColor = (data: MetricData[]) => {
        if (data.length < 2) return 'text-gray-500';
        const recent = data[data.length - 1].value;
        const previous = data[data.length - 2].value;
        return recent > previous ? 'text-green-500' : 'text-red-500';
    };

    const renderMetricCard = (
        title: string,
        data: MetricData[],
        type: string,
        icon: React.ComponentType<any>,
        color: string = 'text-blue-500'
    ) => {
        if (!data || data.length === 0) return null;

        const currentValue = data[data.length - 1]?.value || 0;
        const Icon = icon;
        const TrendIcon = getTrendIcon(data);
        const trendColor = getTrendColor(data);

        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Icon className={`h-4 w-4 ${color}`} />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-2xl font-bold">{formatValue(currentValue, type)}</div>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                                <span>Live data</span>
                            </div>
                        </div>
                        <div className="h-12 w-20 bg-muted rounded">
                            {/* Simple sparkline visualization */}
                            <div className="h-full flex items-end justify-between px-1">
                                {data.slice(-8).map((point, i) => (
                                    <div
                                        key={i}
                                        className="bg-primary rounded-sm"
                                        style={{
                                            height: `${(point.value / Math.max(...data.map(d => d.value))) * 100}%`,
                                            width: '2px'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Select value={timeRange} onValueChange={(value: any) => onTimeRangeChange(value)}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1h">Last Hour</SelectItem>
                            <SelectItem value="6h">Last 6 Hours</SelectItem>
                            <SelectItem value="24h">Last 24 Hours</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchMetrics}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Metrics Grid */}
            {metrics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {renderMetricCard('CPU Usage', metrics.cpu_usage, 'percentage', Cpu, 'text-orange-500')}
                    {renderMetricCard('Memory Usage', metrics.memory_usage, 'percentage', Activity, 'text-blue-500')}
                    {renderMetricCard('Disk Usage', metrics.disk_usage, 'percentage', HardDrive, 'text-green-500')}
                    {renderMetricCard('Network Throughput', metrics.network_throughput, 'bytes', Network, 'text-purple-500')}
                    {renderMetricCard('Response Time', metrics.response_time, 'time', Activity, 'text-yellow-500')}
                    {renderMetricCard('Error Rate', metrics.error_rate, 'percentage', Activity, 'text-red-500')}
                    {renderMetricCard('Active Connections', metrics.active_connections, 'rate', Activity, 'text-indigo-500')}
                    {renderMetricCard('Requests/sec', metrics.requests_per_second, 'rate', Activity, 'text-cyan-500')}
                </div>
            )}

            {/* Detailed Charts */}
            <Tabs defaultValue="performance" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                    <TabsTrigger value="errors">Errors</TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Response Time Trend</CardTitle>
                            <CardDescription>Average response time over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                <Activity className="h-8 w-8 mr-2" />
                                Advanced chart visualization would go here
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="resources" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resource Utilization</CardTitle>
                            <CardDescription>CPU, Memory, and Disk usage</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                <Cpu className="h-8 w-8 mr-2" />
                                Resource utilization charts would go here
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="errors" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Error Rate Analysis</CardTitle>
                            <CardDescription>Error rates and patterns</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                <Activity className="h-8 w-8 mr-2" />
                                Error analysis charts would go here
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}