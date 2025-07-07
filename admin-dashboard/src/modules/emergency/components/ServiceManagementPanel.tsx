'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Power } from 'lucide-react';

interface SystemShutdown {
    service_name: string;
    status: 'online' | 'maintenance' | 'shutdown';
    shutdown_reason: string;
    shutdown_initiated_by: string;
    shutdown_initiated_at: string;
    estimated_restart_time: string;
}

interface ServiceManagementPanelProps {
    systemShutdowns: SystemShutdown[];
    onRestartService: (serviceName: string) => void;
}

export function ServiceManagementPanel({ systemShutdowns, onRestartService }: ServiceManagementPanelProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Service Management</CardTitle>
                <CardDescription>Monitor and control individual services</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    <div className="space-y-4">
                        {systemShutdowns.map((service) => (
                            <div key={service.service_name} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${service.status === 'online' ? 'bg-green-500' :
                                            service.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`} />
                                    <div>
                                        <div className="font-medium">{service.service_name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {service.status === 'shutdown' ?
                                                `Shutdown by ${service.shutdown_initiated_by} at ${new Date(service.shutdown_initiated_at).toLocaleString()}` :
                                                'Online'
                                            }
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Badge variant={service.status === 'online' ? 'default' : 'destructive'}>
                                        {service.status}
                                    </Badge>
                                    {service.status === 'shutdown' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onRestartService(service.service_name)}
                                        >
                                            <Power className="h-4 w-4 mr-2" />
                                            Restart
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}