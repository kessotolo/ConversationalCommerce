'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Server,
    Activity,
    CheckCircle,
    XCircle,
    AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';

interface ServiceEvent {
    id: string;
    service_name: string;
    event_type: 'start' | 'stop' | 'restart' | 'error' | 'warning';
    timestamp: string;
    duration?: number; // minutes
    status: 'success' | 'failed' | 'in_progress';
    message: string;
    user?: string;
}

interface ServiceHistoryProps {
    serviceName?: string;
}

export function ServiceHistory({ serviceName }: ServiceHistoryProps) {
    const [events, setEvents] = useState<ServiceEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchServiceHistory = useCallback(async () => {
        try {
            const response = await api.get(`/api/admin/monitoring/services/history${serviceName ? `?service=${serviceName}` : ''}`);
            setEvents(response.data);
        } catch (error) {
            console.error('Error fetching service history:', error);
        } finally {
            setLoading(false);
        }
    }, [serviceName]);

    useEffect(() => {
        fetchServiceHistory();
        const interval = setInterval(fetchServiceHistory, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [serviceName, fetchServiceHistory]);

    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'start':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'stop':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'restart':
                return <Activity className="h-4 w-4 text-blue-500" />;
            case 'error':
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            default:
                return <Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-green-500';
            case 'failed':
                return 'bg-red-500';
            case 'in_progress':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatDuration = (minutes?: number) => {
        if (!minutes) return 'N/A';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
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
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Service History</h3>
                    <p className="text-sm text-muted-foreground">
                        Recent service events and status changes
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Server className="h-5 w-5 mr-2" />
                        Service Timeline
                    </CardTitle>
                    <CardDescription>
                        Chronological list of service events and status changes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <div className="space-y-4">
                            {events.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Activity className="h-8 w-8 mx-auto mb-2" />
                                    <p>No service events found</p>
                                </div>
                            ) : (
                                events.map((event) => (
                                    <div key={event.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            {getEventIcon(event.event_type)}
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-medium">{event.service_name}</span>
                                                    <Badge className={getStatusColor(event.status)}>
                                                        {event.status}
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        {event.event_type}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {new Date(event.timestamp).toLocaleString()}
                                                    {event.duration && ` • Duration: ${formatDuration(event.duration)}`}
                                                    {event.user && ` • By: ${event.user}`}
                                                </div>
                                                <p className="text-sm mt-1">{event.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}