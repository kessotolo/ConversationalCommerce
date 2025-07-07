'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Activity,
    AlertTriangle,
    Clock,
    Calendar,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    XCircle,
    RefreshCw
} from 'lucide-react';
import api from '@/lib/api';

interface ServiceStatusEvent {
    id: string;
    service_name: string;
    status: 'online' | 'offline' | 'degraded' | 'maintenance';
    previous_status: string;
    timestamp: string;
    duration_minutes: number;
    reason?: string;
    user_id?: string;
    notes?: string;
}

interface ServiceHistoryProps {
    serviceName?: string;
    timeRange?: '24h' | '7d' | '30d' | '90d';
}

export function ServiceHistory({ serviceName, timeRange = '7d' }: ServiceHistoryProps) {
    const [events, setEvents] = useState<ServiceStatusEvent[]>([]);
    const [services, setServices] = useState<string[]>([]);
    const [selectedService, setSelectedService] = useState<string>(serviceName || 'all');
    const [selectedTimeRange, setSelectedTimeRange] = useState<string>(timeRange);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchServiceHistory = async () => {
        try {
            setRefreshing(true);
            const response = await api.get('/api/admin/monitoring/services/history', {
                params: {
                    service: selectedService !== 'all' ? selectedService : undefined,
                    time_range: selectedTimeRange
                }
            });
            setEvents(response.data.events);
            setServices(response.data.services);
        } catch (error) {
            console.error('Error fetching service history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchServiceHistory();
    }, [selectedService, selectedTimeRange]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'online':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'offline':
                return <XCircle className="h-4 w-4 text-red-600" />;
            case 'degraded':
                return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            case 'maintenance':
                return <Clock className="h-4 w-4 text-blue-600" />;
            default:
                return <Activity className="h-4 w-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online':
                return 'bg-green-500';
            case 'offline':
                return 'bg-red-500';
            case 'degraded':
                return 'bg-yellow-500';
            case 'maintenance':
                return 'bg-blue-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes}m`;
        } else if (minutes < 1440) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins}m`;
        } else {
            const days = Math.floor(minutes / 1440);
            const hours = Math.floor((minutes % 1440) / 60);
            return `${days}d ${hours}h`;
        }
    };

    const calculateUptime = (events: ServiceStatusEvent[]) => {
        if (events.length === 0) return 100;

        const totalTime = events.reduce((sum, event) => sum + event.duration_minutes, 0);
        const onlineTime = events
            .filter(event => event.status === 'online')
            .reduce((sum, event) => sum + event.duration_minutes, 0);

        return totalTime > 0 ? (onlineTime / totalTime) * 100 : 100;
    };

    const getServiceStats = (serviceName: string) => {
        const serviceEvents = events.filter(event => event.service_name === serviceName);
        const totalEvents = serviceEvents.length;
        const onlineEvents = serviceEvents.filter(event => event.status === 'online').length;
        const offlineEvents = serviceEvents.filter(event => event.status === 'offline').length;
        const degradedEvents = serviceEvents.filter(event => event.status === 'degraded').length;
        const maintenanceEvents = serviceEvents.filter(event => event.status === 'maintenance').length;

        return {
            totalEvents,
            onlineEvents,
            offlineEvents,
            degradedEvents,
            maintenanceEvents,
            uptime: calculateUptime(serviceEvents)
        };
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
                    <Select value={selectedService} onValueChange={setSelectedService}>
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Services</SelectItem>
                            {services.map((service) => (
                                <SelectItem key={service} value={service}>{service}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="24h">Last 24h</SelectItem>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchServiceHistory}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Tabs defaultValue="timeline" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="stats">Statistics</TabsTrigger>
                    <TabsTrigger value="services">Service Overview</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Service Status Timeline</CardTitle>
                            <CardDescription>
                                Historical service status changes and events
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-4">
                                    {events.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Activity className="h-8 w-8 mx-auto mb-2" />
                                            <p>No service events found for the selected criteria</p>
                                        </div>
                                    ) : (
                                        events.map((event) => (
                                            <div key={event.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                                                <div className="flex items-center space-x-2">
                                                    {getStatusIcon(event.status)}
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-medium">{event.service_name}</span>
                                                            <Badge className={getStatusColor(event.status)}>
                                                                {event.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {new Date(event.timestamp).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 ml-4">
                                                    {event.reason && (
                                                        <p className="text-sm">{event.reason}</p>
                                                    )}
                                                    {event.duration_minutes > 0 && (
                                                        <p className="text-sm text-muted-foreground">
                                                            Duration: {formatDuration(event.duration_minutes)}
                                                        </p>
                                                    )}
                                                    {event.notes && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {event.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {selectedService !== 'all' ? (
                            (() => {
                                const stats = getServiceStats(selectedService);
                                return (
                                    <>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{stats.uptime.toFixed(2)}%</div>
                                                <p className="text-xs text-muted-foreground">
                                                    Service availability
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                                                <p className="text-xs text-muted-foreground">
                                                    Status changes
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Online Events</CardTitle>
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{stats.onlineEvents}</div>
                                                <p className="text-xs text-muted-foreground">
                                                    Successful status
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Offline Events</CardTitle>
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{stats.offlineEvents}</div>
                                                <p className="text-xs text-muted-foreground">
                                                    Service outages
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </>
                                );
                            })()
                        ) : (
                            <div className="col-span-full text-center py-8 text-muted-foreground">
                                <Activity className="h-8 w-8 mx-auto mb-2" />
                                <p>Select a specific service to view statistics</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="services" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Service Overview</CardTitle>
                            <CardDescription>
                                Uptime and status statistics for all services
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {services.map((service) => {
                                    const stats = getServiceStats(service);
                                    return (
                                        <div key={service} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                                <div>
                                                    <div className="font-medium">{service}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {stats.totalEvents} events in {selectedTimeRange}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold">{stats.uptime.toFixed(1)}%</div>
                                                <div className="text-sm text-muted-foreground">Uptime</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}