'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';

import { EmergencyStatusCard } from './EmergencyStatusCard';
import { EmergencyControlCards } from './EmergencyControlCards';
import { IncidentResponsePanel } from './IncidentResponsePanel';
import { ServiceManagementPanel } from './ServiceManagementPanel';

interface EmergencyStatus {
    lockdown_active: boolean;
    lockdown_reason: string;
    lockdown_initiated_by: string;
    lockdown_initiated_at: string;
    lockdown_duration_minutes: number;
    affected_services: string[];
    total_users_affected: number;
    total_tenants_affected: number;
}

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

interface SystemShutdown {
    service_name: string;
    status: 'online' | 'maintenance' | 'shutdown';
    shutdown_reason: string;
    shutdown_initiated_by: string;
    shutdown_initiated_at: string;
    estimated_restart_time: string;
}

export function EmergencyControls() {
    const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus | null>(null);
    const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
    const [systemShutdowns, setSystemShutdowns] = useState<SystemShutdown[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchEmergencyData = async () => {
        try {
            setRefreshing(true);
            const [statusResponse, incidentsResponse, shutdownsResponse] = await Promise.all([
                api.get('/api/admin/emergency/status'),
                api.get('/api/admin/emergency/incidents'),
                api.get('/api/admin/emergency/shutdowns')
            ]);

            setEmergencyStatus(statusResponse.data);
            setIncidents(incidentsResponse.data);
            setSystemShutdowns(shutdownsResponse.data);
        } catch (error) {
            console.error('Error fetching emergency data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchEmergencyData();
        const interval = setInterval(fetchEmergencyData, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const handleInitiateLockdown = async (reason: string) => {
        try {
            await api.post('/api/admin/emergency/lockdown', {
                reason,
                duration_minutes: 30
            });
            fetchEmergencyData();
        } catch (error) {
            console.error('Error initiating lockdown:', error);
        }
    };

    const handleLiftLockdown = async () => {
        try {
            await api.post('/api/admin/emergency/lockdown/lift');
            fetchEmergencyData();
        } catch (error) {
            console.error('Error lifting lockdown:', error);
        }
    };

    const handleShutdownService = async (serviceName: string, reason: string) => {
        try {
            await api.post('/api/admin/emergency/shutdown', {
                service_name: serviceName,
                reason
            });
            fetchEmergencyData();
        } catch (error) {
            console.error('Error shutting down service:', error);
        }
    };

    const handleRestartService = async (serviceName: string) => {
        try {
            await api.post(`/api/admin/emergency/restart/${serviceName}`);
            fetchEmergencyData();
        } catch (error) {
            console.error('Error restarting service:', error);
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
                    <h2 className="text-2xl font-bold">Emergency Controls</h2>
                    <p className="text-muted-foreground">Critical system controls and incident response</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchEmergencyData}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Emergency Status Alert */}
            <EmergencyStatusCard
                emergencyStatus={emergencyStatus}
                onLiftLockdown={handleLiftLockdown}
            />

            <Tabs defaultValue="controls" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="controls">Emergency Controls</TabsTrigger>
                    <TabsTrigger value="incidents">Incident Response</TabsTrigger>
                    <TabsTrigger value="services">Service Management</TabsTrigger>
                </TabsList>

                <TabsContent value="controls" className="space-y-4">
                    <EmergencyControlCards
                        emergencyStatus={emergencyStatus}
                        systemShutdowns={systemShutdowns}
                        onInitiateLockdown={handleInitiateLockdown}
                        onShutdownService={handleShutdownService}
                    />
                </TabsContent>

                <TabsContent value="incidents" className="space-y-4">
                    <IncidentResponsePanel incidents={incidents} />
                </TabsContent>

                <TabsContent value="services" className="space-y-4">
                    <ServiceManagementPanel
                        systemShutdowns={systemShutdowns}
                        onRestartService={handleRestartService}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}