'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Users,
    Building2,
    Settings,
    Download,
    AlertTriangle,
    BarChart3,
    Database,
    Eye,
    Lock,
    RefreshCw,
    FileText
} from 'lucide-react';

export function QuickActions() {
    const actions = [
        {
            title: 'Security Scan',
            description: 'Run vulnerability scan',
            icon: Shield,
            color: 'blue',
            action: () => console.log('Security scan'),
            urgent: false
        },
        {
            title: 'User Management',
            description: 'Manage accounts',
            icon: Users,
            color: 'green',
            action: () => console.log('User management'),
            urgent: false
        },
        {
            title: 'Tenant Overview',
            description: 'View statistics',
            icon: Building2,
            color: 'purple',
            action: () => console.log('Tenant overview'),
            urgent: false
        },
        {
            title: 'System Settings',
            description: 'Configure parameters',
            icon: Settings,
            color: 'gray',
            action: () => console.log('System settings'),
            urgent: false
        },
        {
            title: 'Export Data',
            description: 'Download platform data',
            icon: Download,
            color: 'indigo',
            action: () => console.log('Export data'),
            urgent: false
        },
        {
            title: 'Analytics Report',
            description: 'Generate reports',
            icon: BarChart3,
            color: 'cyan',
            action: () => console.log('Analytics report'),
            urgent: false
        },
        {
            title: 'View Activity Logs',
            description: 'Monitor system activity',
            icon: Eye,
            color: 'teal',
            action: () => console.log('View activity logs'),
            urgent: false
        },
        {
            title: 'Emergency Lockdown',
            description: 'Activate security measures',
            icon: AlertTriangle,
            color: 'red',
            action: () => console.log('Emergency lockdown'),
            urgent: true
        },
        {
            title: 'Database Backup',
            description: 'Create backup',
            icon: Database,
            color: 'orange',
            action: () => console.log('Database backup'),
            urgent: false
        },
        {
            title: 'Refresh Status',
            description: 'Sync latest data',
            icon: RefreshCw,
            color: 'blue',
            action: () => console.log('Refresh status'),
            urgent: false
        },
        {
            title: 'View Documentation',
            description: 'Access system docs',
            icon: FileText,
            color: 'gray',
            action: () => console.log('View documentation'),
            urgent: false
        },
        {
            title: 'Access Control',
            description: 'Manage permissions',
            icon: Lock,
            color: 'indigo',
            action: () => console.log('Access control'),
            urgent: false
        },
        {
            title: 'System Health',
            description: 'Check system status',
            icon: Shield,
            color: 'green',
            action: () => console.log('System health check'),
            urgent: false
        }
    ];

    const getColorClasses = (color: string) => {
        const colorMap = {
            blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700',
            green: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700',
            purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700',
            gray: 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700',
            indigo: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700',
            cyan: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700',
            red: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700',
            orange: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700',
            teal: 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700'
        };
        return colorMap[color as keyof typeof colorMap] || colorMap.gray;
    };

    const getIconColor = (color: string) => {
        const colorMap = {
            blue: 'text-blue-600',
            green: 'text-green-600',
            purple: 'text-purple-600',
            gray: 'text-gray-600',
            indigo: 'text-indigo-600',
            cyan: 'text-cyan-600',
            red: 'text-red-600',
            orange: 'text-orange-600',
            teal: 'text-teal-600'
        };
        return colorMap[color as keyof typeof colorMap] || colorMap.gray;
    };

    return (
        <div className="admin-grid admin-grid-cols-4">
            {actions.map((action, index) => (
                <Button
                    key={index}
                    variant="ghost"
                    className={`admin-card p-4 text-left transition-all duration-200 hover:shadow-md ${getColorClasses(action.color)}`}
                    onClick={action.action}
                >
                    <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor(action.color)} bg-white/50`}>
                            <action.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-semibold truncate">{action.title}</h3>
                                {action.urgent && (
                                    <Badge className="admin-status-badge error text-xs">
                                        Urgent
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs mt-1 opacity-80">{action.description}</p>
                        </div>
                    </div>
                </Button>
            ))}
        </div>
    );
}