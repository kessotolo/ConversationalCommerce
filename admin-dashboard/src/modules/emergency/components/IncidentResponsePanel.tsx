'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle } from 'lucide-react';

interface IncidentResponse {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    status: 'active' | 'resolved' | 'investigating';
    created_at: string;
    updated_at: string;
    assigned_to: string;
    affected_services: string[];
    resolution_notes: string;
}

interface IncidentResponsePanelProps {
    incidents: IncidentResponse[];
}

export function IncidentResponsePanel({ incidents }: IncidentResponsePanelProps) {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'low':
                return 'bg-blue-500';
            case 'medium':
                return 'bg-yellow-500';
            case 'high':
                return 'bg-orange-500';
            case 'critical':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Incidents</CardTitle>
                <CardDescription>Current incident response and management</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    <div className="space-y-4">
                        {incidents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                                <p>No active incidents</p>
                            </div>
                        ) : (
                            incidents.map((incident) => (
                                <div key={incident.id} className="border rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Badge className={getSeverityColor(incident.severity)}>
                                                    {incident.severity}
                                                </Badge>
                                                <Badge variant={incident.status === 'active' ? 'destructive' : 'default'}>
                                                    {incident.status}
                                                </Badge>
                                            </div>
                                            <h3 className="font-medium">{incident.title}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">{incident.description}</p>
                                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                                                <span>Created: {new Date(incident.created_at).toLocaleString()}</span>
                                                <span>Assigned: {incident.assigned_to}</span>
                                            </div>
                                            {incident.resolution_notes && (
                                                <div className="mt-2 p-2 bg-muted rounded text-sm">
                                                    <strong>Resolution Notes:</strong> {incident.resolution_notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}