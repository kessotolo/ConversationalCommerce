'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Settings,
    Database,
    Globe,
    Shield
} from 'lucide-react';

interface EnvironmentVariable {
    id: string;
    key: string;
    value: string;
    environment: 'development' | 'staging' | 'production';
    category: 'database' | 'api' | 'security' | 'payment' | 'messaging' | 'cloud' | 'monitoring';
    is_secret: boolean;
    description: string;
    last_updated: string;
    updated_by: string;
}

interface SystemSetting {
    id: string;
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'json';
    category: 'general' | 'security' | 'performance' | 'notifications' | 'features';
    description: string;
    is_editable: boolean;
    requires_restart: boolean;
    last_updated: string;
    updated_by: string;
}

interface ContextManagementProps {
    className?: string;
}

export function ContextManagement({ className }: ContextManagementProps) {
    const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([]);
    const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);

    // Mock data - replace with API call
    useEffect(() => {
        const mockEnvVars: EnvironmentVariable[] = [
            {
                id: '1',
                key: 'DATABASE_URL',
                value: 'postgresql://user:pass@localhost:5432/conversationalcommerce',
                environment: 'production',
                category: 'database',
                is_secret: true,
                description: 'Primary database connection string',
                last_updated: '2024-01-15T10:30:00Z',
                updated_by: 'admin@enwhe.com'
            },
            {
                id: '2',
                key: 'CLERK_SECRET_KEY',
                value: 'sk_test_...',
                environment: 'production',
                category: 'security',
                is_secret: true,
                description: 'Clerk authentication secret key',
                last_updated: '2024-01-10T09:00:00Z',
                updated_by: 'admin@enwhe.com'
            },
            {
                id: '3',
                key: 'TWILIO_ACCOUNT_SID',
                value: 'AC...',
                environment: 'production',
                category: 'messaging',
                is_secret: true,
                description: 'Twilio account identifier for SMS/WhatsApp',
                last_updated: '2024-01-12T14:20:00Z',
                updated_by: 'admin@enwhe.com'
            },
            {
                id: '4',
                key: 'CLOUDINARY_CLOUD_NAME',
                value: 'enwhe-cloud',
                environment: 'production',
                category: 'cloud',
                is_secret: false,
                description: 'Cloudinary cloud name for media storage',
                last_updated: '2024-01-08T11:15:00Z',
                updated_by: 'admin@enwhe.com'
            }
        ];

        const mockSystemSettings: SystemSetting[] = [
            {
                id: '1',
                key: 'MAX_FILE_UPLOAD_SIZE',
                value: '10MB',
                type: 'string',
                category: 'performance',
                description: 'Maximum file upload size for product images',
                is_editable: true,
                requires_restart: false,
                last_updated: '2024-01-18T16:45:00Z',
                updated_by: 'admin@enwhe.com'
            },
            {
                id: '2',
                key: 'ENABLE_ANALYTICS',
                value: true,
                type: 'boolean',
                category: 'features',
                description: 'Enable analytics tracking for user behavior',
                is_editable: true,
                requires_restart: false,
                last_updated: '2024-01-20T09:30:00Z',
                updated_by: 'admin@enwhe.com'
            },
            {
                id: '3',
                key: 'SESSION_TIMEOUT_MINUTES',
                value: 60,
                type: 'number',
                category: 'security',
                description: 'User session timeout in minutes',
                is_editable: true,
                requires_restart: true,
                last_updated: '2024-01-15T12:00:00Z',
                updated_by: 'admin@enwhe.com'
            },
            {
                id: '4',
                key: 'NOTIFICATION_SETTINGS',
                value: {
                    email: true,
                    sms: false,
                    push: true,
                    webhook: false
                },
                type: 'json',
                category: 'notifications',
                description: 'Default notification preferences',
                is_editable: true,
                requires_restart: false,
                last_updated: '2024-01-19T14:20:00Z',
                updated_by: 'admin@enwhe.com'
            }
        ];

        setEnvVars(mockEnvVars);
        setSystemSettings(mockSystemSettings);
    }, []);

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'database':
                return <Database className="h-4 w-4" />;
            case 'security':
                return <Shield className="h-4 w-4" />;
            case 'api':
                return <Globe className="h-4 w-4" />;
            default:
                return <Settings className="h-4 w-4" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'database':
                return 'bg-blue-100 text-blue-800';
            case 'security':
                return 'bg-red-100 text-red-800';
            case 'messaging':
                return 'bg-green-100 text-green-800';
            case 'payment':
                return 'bg-purple-100 text-purple-800';
            case 'cloud':
                return 'bg-indigo-100 text-indigo-800';
            case 'monitoring':
                return 'bg-orange-100 text-orange-800';
            case 'api':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const maskSecretValue = (value: string) => {
        if (value.length <= 8) return '*'.repeat(value.length);
        return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
    };

    return (
        <div className={className}>
            <h2 className="text-3xl font-bold tracking-tight mb-4">Context Management</h2>
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">Environment Variables</h3>
                <div className="grid gap-4">
                    {envVars.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Settings className="h-8 w-8 mx-auto mb-2" />
                            <p>No environment variables found</p>
                        </div>
                    ) : (
                        envVars.map((envVar) => (
                            <Card key={envVar.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center space-x-3">
                                        {getCategoryIcon(envVar.category)}
                                        <div>
                                            <h3 className="text-lg font-semibold">{envVar.key}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {envVar.description}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-sm">
                                            {envVar.is_secret ? maskSecretValue(envVar.value) : envVar.value}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(envVar.category)}`}>
                                            {envVar.category}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Last updated: {formatDate(envVar.last_updated)} by {envVar.updated_by}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-2">System Settings</h3>
                <div className="grid gap-4">
                    {systemSettings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Settings className="h-8 w-8 mx-auto mb-2" />
                            <p>No system settings found</p>
                        </div>
                    ) : (
                        systemSettings.map((setting) => (
                            <Card key={setting.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center space-x-3">
                                        {getCategoryIcon(setting.category)}
                                        <div>
                                            <h3 className="text-lg font-semibold">{setting.key}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {setting.description}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-sm">
                                            {typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(setting.category)}`}>
                                            {setting.category}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Last updated: {formatDate(setting.last_updated)} by {setting.updated_by}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}