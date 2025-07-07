'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Power, Activity } from 'lucide-react';

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

interface SystemShutdown {
    service_name: string;
    status: 'online' | 'maintenance' | 'shutdown';
    shutdown_reason: string;
    shutdown_initiated_by: string;
    shutdown_initiated_at: string;
    estimated_restart_time: string;
}

interface EmergencyControlCardsProps {
    emergencyStatus: EmergencyStatus | null;
    systemShutdowns: SystemShutdown[];
    onInitiateLockdown: (reason: string) => void;
    onShutdownService: (serviceName: string, reason: string) => void;
}

export function EmergencyControlCards({
    emergencyStatus,
    systemShutdowns,
    onInitiateLockdown,
    onShutdownService
}: EmergencyControlCardsProps) {
    const [lockdownDialogOpen, setLockdownDialogOpen] = useState(false);
    const [shutdownDialogOpen, setShutdownDialogOpen] = useState(false);
    const [lockdownReason, setLockdownReason] = useState('');
    const [shutdownService, setShutdownService] = useState('');
    const [shutdownReason, setShutdownReason] = useState('');

    const handleInitiateLockdown = () => {
        onInitiateLockdown(lockdownReason);
        setLockdownDialogOpen(false);
        setLockdownReason('');
    };

    const handleShutdownService = () => {
        onShutdownService(shutdownService, shutdownReason);
        setShutdownDialogOpen(false);
        setShutdownService('');
        setShutdownReason('');
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        System Lockdown
                    </CardTitle>
                    <CardDescription>
                        Emergency lockdown for security incidents
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Status:</span>
                            <Badge variant={emergencyStatus?.lockdown_active ? 'destructive' : 'default'}>
                                {emergencyStatus?.lockdown_active ? 'ACTIVE' : 'Inactive'}
                            </Badge>
                        </div>
                        <Dialog open={lockdownDialogOpen} onOpenChange={setLockdownDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive" className="w-full">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Initiate Lockdown
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Initiate Emergency Lockdown</DialogTitle>
                                    <p className="text-sm text-muted-foreground">
                                        This will immediately lock down the system for security reasons.
                                    </p>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="lockdown-reason">Reason for Lockdown</Label>
                                        <Textarea
                                            id="lockdown-reason"
                                            value={lockdownReason}
                                            onChange={(e) => setLockdownReason(e.target.value)}
                                            placeholder="Describe the security incident..."
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setLockdownDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" onClick={handleInitiateLockdown}>
                                        Initiate Lockdown
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Power className="h-5 w-5 mr-2" />
                        Service Shutdown
                    </CardTitle>
                    <CardDescription>
                        Shutdown specific services for maintenance
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Services Down:</span>
                            <Badge variant="secondary">
                                {systemShutdowns.filter(s => s.status === 'shutdown').length}
                            </Badge>
                        </div>
                        <Dialog open={shutdownDialogOpen} onOpenChange={setShutdownDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <Power className="h-4 w-4 mr-2" />
                                    Shutdown Service
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Shutdown Service</DialogTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Shutdown a specific service for maintenance or emergency.
                                    </p>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="service-name">Service Name</Label>
                                        <Input
                                            id="service-name"
                                            value={shutdownService}
                                            onChange={(e) => setShutdownService(e.target.value)}
                                            placeholder="e.g., api, database, cache"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="shutdown-reason">Reason</Label>
                                        <Textarea
                                            id="shutdown-reason"
                                            value={shutdownReason}
                                            onChange={(e) => setShutdownReason(e.target.value)}
                                            placeholder="Reason for shutdown..."
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setShutdownDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" onClick={handleShutdownService}>
                                        Shutdown Service
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        System Status
                    </CardTitle>
                    <CardDescription>
                        Current system status overview
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm">Total Services:</span>
                            <span className="text-sm font-medium">{systemShutdowns.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">Online:</span>
                            <span className="text-sm font-medium text-green-600">
                                {systemShutdowns.filter(s => s.status === 'online').length}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">Maintenance:</span>
                            <span className="text-sm font-medium text-yellow-600">
                                {systemShutdowns.filter(s => s.status === 'maintenance').length}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">Shutdown:</span>
                            <span className="text-sm font-medium text-red-600">
                                {systemShutdowns.filter(s => s.status === 'shutdown').length}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}