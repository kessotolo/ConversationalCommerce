'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertTriangle,
    Shield,
    Power,
    Lock,
    Unlock,
    Server,
    Database,
    Globe,
    Wifi,
    Settings,
    Activity,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';
import api from '@/lib/api';

interface EmergencyStatus {
    system_locked: boolean;
    emergency_mode: boolean;
    maintenance_mode: boolean;
    last_emergency_action: string;
    last_emergency_user: string;
    emergency_reason?: string;
}

interface EmergencyAction {
    id: string;
    action: string;
    user_id: string;
    user_name: string;
    timestamp: string;
    reason?: string;
    status: 'active' | 'resolved';
}

interface EmergencyControlsProps {
    onEmergencyAction?: (action: string) => void;
}

export function EmergencyControls({ onEmergencyAction }: EmergencyControlsProps) {
    const [status, setStatus] = useState<EmergencyStatus | null>(null);
    const [actions, setActions] = useState<EmergencyAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        action: string;
        title: string;
        description: string;
        severity: 'warning' | 'destructive';
    }>({
        open: false,
        action: '',
        title: '',
        description: '',
        severity: 'warning'
    });

    const fetchEmergencyData = async () => {
        try {
            const [statusResponse, actionsResponse] = await Promise.all([
                api.get('/api/admin/emergency/status'),
                api.get('/api/admin/emergency/actions')
            ]);
            setStatus(statusResponse.data);
            setActions(actionsResponse.data);
        } catch (error) {
            console.error('Error fetching emergency data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmergencyData();
        const interval = setInterval(fetchEmergencyData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleEmergencyAction = async (action: string, reason?: string) => {
        try {
            await api.post('/api/admin/emergency/actions', {
                action,
                reason
            });
            setConfirmDialog({ open: false, action: '', title: '', description: '', severity: 'warning' });
            fetchEmergencyData();
            onEmergencyAction?.(action);
        } catch (error) {
            console.error('Error executing emergency action:', error);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action.toLowerCase()) {
            case 'lockdown':
                return <Lock className="h-4 w-4" />;
            case 'unlock':
                return <Unlock className="h-4 w-4" />;
            case 'maintenance':
                return <Settings className="h-4 w-4" />;
            case 'emergency':
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action.toLowerCase()) {
            case 'lockdown':
                return 'bg-red-500';
            case 'unlock':
                return 'bg-green-500';
            case 'maintenance':
                return 'bg-yellow-500';
            case 'emergency':
                return 'bg-orange-500';
            default:
                return 'bg-gray-500';
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
            {/* Emergency Status */}
            {status && (
                <Alert variant={status.emergency_mode ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                        {status.emergency_mode ? 'Emergency Mode Active' : 'System Normal'}
                    </AlertTitle>
                    <AlertDescription>
                        {status.emergency_mode
                            ? `System is in emergency mode. Last action: ${status.last_emergency_action} by ${status.last_emergency_user}`
                            : 'All systems are operating normally. Emergency controls are available if needed.'
                        }
                    </AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="controls" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="controls">Emergency Controls</TabsTrigger>
                    <TabsTrigger value="actions">Action History</TabsTrigger>
                    <TabsTrigger value="status">System Status</TabsTrigger>
                </TabsList>

                <TabsContent value="controls" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* System Lockdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Lock className="h-5 w-5 mr-2" />
                                    System Lockdown
                                </CardTitle>
                                <CardDescription>
                                    Immediately lock all user access to the platform
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Status:</span>
                                        <Badge variant={status?.system_locked ? 'destructive' : 'secondary'}>
                                            {status?.system_locked ? 'Locked' : 'Unlocked'}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant={status?.system_locked ? 'outline' : 'destructive'}
                                        onClick={() => setConfirmDialog({
                                            open: true,
                                            action: status?.system_locked ? 'unlock' : 'lockdown',
                                            title: status?.system_locked ? 'Unlock System' : 'System Lockdown',
                                            description: status?.system_locked
                                                ? 'This will unlock the system and restore normal access for all users.'
                                                : 'This will immediately lock all user access to the platform. Only administrators will be able to access the system.',
                                            severity: 'destructive'
                                        })}
                                        className="w-full"
                                    >
                                        {status?.system_locked ? 'Unlock System' : 'Lock System'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Emergency Mode */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <AlertTriangle className="h-5 w-5 mr-2" />
                                    Emergency Mode
                                </CardTitle>
                                <CardDescription>
                                    Activate emergency mode with restricted functionality
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Status:</span>
                                        <Badge variant={status?.emergency_mode ? 'destructive' : 'secondary'}>
                                            {status?.emergency_mode ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant={status?.emergency_mode ? 'outline' : 'destructive'}
                                        onClick={() => setConfirmDialog({
                                            open: true,
                                            action: status?.emergency_mode ? 'disable_emergency' : 'emergency',
                                            title: status?.emergency_mode ? 'Disable Emergency Mode' : 'Activate Emergency Mode',
                                            description: status?.emergency_mode
                                                ? 'This will disable emergency mode and restore normal system functionality.'
                                                : 'This will activate emergency mode with restricted functionality and enhanced monitoring.',
                                            severity: 'destructive'
                                        })}
                                        className="w-full"
                                    >
                                        {status?.emergency_mode ? 'Disable Emergency' : 'Activate Emergency'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Maintenance Mode */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Settings className="h-5 w-5 mr-2" />
                                    Maintenance Mode
                                </CardTitle>
                                <CardDescription>
                                    Enable maintenance mode for system updates
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Status:</span>
                                        <Badge variant={status?.maintenance_mode ? 'secondary' : 'outline'}>
                                            {status?.maintenance_mode ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant={status?.maintenance_mode ? 'outline' : 'default'}
                                        onClick={() => setConfirmDialog({
                                            open: true,
                                            action: status?.maintenance_mode ? 'disable_maintenance' : 'maintenance',
                                            title: status?.maintenance_mode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode',
                                            description: status?.maintenance_mode
                                                ? 'This will disable maintenance mode and restore normal system access.'
                                                : 'This will enable maintenance mode with limited functionality for system updates.',
                                            severity: 'warning'
                                        })}
                                        className="w-full"
                                    >
                                        {status?.maintenance_mode ? 'Disable Maintenance' : 'Enable Maintenance'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="actions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Emergency Action History</CardTitle>
                            <CardDescription>
                                Recent emergency actions and their status
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-4">
                                    {actions.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                                            <p>No emergency actions recorded</p>
                                        </div>
                                    ) : (
                                        actions.map((action) => (
                                            <div key={action.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                                                <div className="flex items-center space-x-2">
                                                    {getActionIcon(action.action)}
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-medium">{action.action}</span>
                                                            <Badge className={getActionColor(action.action)}>
                                                                {action.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {action.user_name} • {new Date(action.timestamp).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                {action.reason && (
                                                    <div className="flex-1 ml-4">
                                                        <p className="text-sm">{action.reason}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="status" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Server className="h-5 w-5 mr-2" />
                                    API Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-sm">Operational</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Database className="h-5 w-5 mr-2" />
                                    Database Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-sm">Operational</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Globe className="h-5 w-5 mr-2" />
                                    Network Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-sm">Operational</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            {confirmDialog.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {confirmDialog.description}
                        </p>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant={confirmDialog.severity}
                                onClick={() => handleEmergencyAction(confirmDialog.action)}
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}