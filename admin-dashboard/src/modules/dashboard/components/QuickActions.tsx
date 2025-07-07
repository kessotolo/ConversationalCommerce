'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Users,
    Building2,
    Settings,
    Download,
    Upload,
    AlertTriangle,
    Lock,
    Unlock,
    RefreshCw,
    Search,
    BarChart3,
    FileText,
    Database,
    Zap
} from 'lucide-react';

export function QuickActions() {
    const actions = [
        {
            title: 'Security Scan',
            description: 'Run security vulnerability scan',
            icon: Shield,
            variant: 'default' as const,
            action: () => console.log('Security scan'),
            urgent: false
        },
        {
            title: 'User Management',
            description: 'Manage user accounts and permissions',
            icon: Users,
            variant: 'outline' as const,
            action: () => console.log('User management'),
            urgent: false
        },
        {
            title: 'Tenant Overview',
            description: 'View all tenant statistics',
            icon: Building2,
            variant: 'outline' as const,
            action: () => console.log('Tenant overview'),
            urgent: false
        },
        {
            title: 'System Settings',
            description: 'Configure system parameters',
            icon: Settings,
            variant: 'outline' as const,
            action: () => console.log('System settings'),
            urgent: false
        },
        {
            title: 'Export Data',
            description: 'Download platform data',
            icon: Download,
            variant: 'outline' as const,
            action: () => console.log('Export data'),
            urgent: false
        },
        {
            title: 'Analytics Report',
            description: 'Generate comprehensive analytics',
            icon: BarChart3,
            variant: 'outline' as const,
            action: () => console.log('Analytics report'),
            urgent: false
        },
        {
            title: 'Emergency Lockdown',
            description: 'Activate emergency security measures',
            icon: AlertTriangle,
            variant: 'destructive' as const,
            action: () => console.log('Emergency lockdown'),
            urgent: true
        },
        {
            title: 'Database Backup',
            description: 'Create system backup',
            icon: Database,
            variant: 'outline' as const,
            action: () => console.log('Database backup'),
            urgent: false
        }
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                    Frequently used admin tasks and shortcuts
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {actions.map((action, index) => (
                        <Button
                            key={index}
                            variant={action.variant}
                            className="h-auto p-4 flex flex-col items-center space-y-2 relative"
                            onClick={action.action}
                        >
                            {action.urgent && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs"
                                >
                                    !
                                </Badge>
                            )}
                            <action.icon className="h-5 w-5" />
                            <div className="text-center">
                                <div className="text-sm font-medium">{action.title}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {action.description}
                                </div>
                            </div>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}