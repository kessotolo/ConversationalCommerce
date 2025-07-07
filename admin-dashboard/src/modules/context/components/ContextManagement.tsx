'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Settings,
    Database,
    Globe,
    Shield,
    Mail,
    CreditCard,
    MessageSquare,
    Cloud,
    Activity,
    AlertTriangle,
    CheckCircle,
    X,
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Save,
    Undo,
    RefreshCw,
    Search,
    Filter,
    Copy,
    Download,
    Upload,
    Lock,
    Unlock,
    Key,
    Server,
    Monitor,
    Bell,
    Zap
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
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [environmentFilter, setEnvironmentFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedEnvVar, setSelectedEnvVar] = useState<EnvironmentVariable | null>(null);
    const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showValueModal, setShowValueModal] = useState(false);
    const [showSecrets, setShowSecrets] = useState(false);

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
        setLoading(false);
    }, []);

    const filteredEnvVars = envVars.filter(envVar => {
        const matchesSearch = envVar.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            envVar.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEnvironment = environmentFilter === 'all' || envVar.environment === environmentFilter;
        const matchesCategory = categoryFilter === 'all' || envVar.category === categoryFilter;
        return matchesSearch && matchesEnvironment && matchesCategory;
    });

    const filteredSystemSettings = systemSettings.filter(setting => {
        const matchesSearch = setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            setting.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || setting.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'database':
                return <Database className="h-4 w-4" />;
            case 'security':
                return <Shield className="h-4 w-4" />;
            case 'messaging':
                return <MessageSquare className="h-4 w-4" />;
            case 'payment':
                return <CreditCard className="h-4 w-4" />;
            case 'cloud':
                return <Cloud className="h-4 w-4" />;
            case 'monitoring':
                return <Monitor className="h-4 w-4" />;
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

    const handleUpdateEnvVar = (id: string, newValue: string) => {
        setEnvVars(prev => prev.map(envVar =>
            envVar.id === id ? {
                ...envVar,
                value: newValue,
                last_updated: new Date().toISOString(),
                updated_by: 'admin@enwhe.com'
            } : envVar
        ));
    };

    const handleUpdateSetting = (id: string, newValue: any) => {
        setSystemSettings(prev => prev.map(setting =>
            setting.id === id ? {
                ...setting,
                value: newValue,
                last_updated: new Date().toISOString(),
                updated_by: 'admin@enwhe.com'
            } : setting
        ));
    };

    const exportConfiguration = () => {
        const config = {
            environment_variables: envVars,
            system_settings: systemSettings,
            exported_at: new Date().toISOString(),
            exported_by: 'admin@enwhe.com'
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `configuration-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className={className}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Context Management</h2>
                    <p className="text-muted-foreground">
                        Manage environment variables, system settings, and configuration
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={exportConfiguration}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Config
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Variable
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="environment" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="environment">Environment Variables</TabsTrigger>
                    <TabsTrigger value="settings">System Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="environment" className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search variables..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Environment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Environments</SelectItem>
                                <SelectItem value="development">Development</SelectItem>
                                <SelectItem value="staging">Staging</SelectItem>
                                <SelectItem value="production">Production</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="database">Database</SelectItem>
                                <SelectItem value="security">Security</SelectItem>
                                <SelectItem value="messaging">Messaging</SelectItem>
                                <SelectItem value="payment">Payment</SelectItem>
                                <SelectItem value="cloud">Cloud</SelectItem>
                                <SelectItem value="monitoring">Monitoring</SelectItem>
                                <SelectItem value="api">API</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => setShowSecrets(!showSecrets)}
                        >
                            {showSecrets ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {showSecrets ? 'Hide' : 'Show'} Secrets
                        </Button>
                    </div>

                    {/* Environment Variables List */}
                    <div className="grid gap-4">
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : filteredEnvVars.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Settings className="h-8 w-8 mx-auto mb-2" />
                                <p>No environment variables found</p>
                                <p className="text-sm">Add environment variables to configure the system</p>
                            </div>
                        ) : (
                            filteredEnvVars.map((envVar) => (
                                <Card key={envVar.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                {getCategoryIcon(envVar.category)}
                                                <div>
                                                    <h3 className="text-lg font-semibold">{envVar.key}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {envVar.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="outline" className={getCategoryColor(envVar.category)}>
                                                    {envVar.category}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {envVar.environment}
                                                </Badge>
                                                {envVar.is_secret && (
                                                    <Badge variant="outline" className="bg-red-100 text-red-800">
                                                        Secret
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium mb-1">Value:</p>
                                                <p className="text-sm text-muted-foreground font-mono bg-gray-100 p-2 rounded">
                                                    {envVar.is_secret && !showSecrets
                                                        ? maskSecretValue(envVar.value)
                                                        : envVar.value
                                                    }
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4">
                                                <Button variant="outline" size="sm" onClick={() => setSelectedEnvVar(envVar)}>
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    <Copy className="h-4 w-4 mr-1" />
                                                    Copy
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
                                            <span>Updated: {formatDate(envVar.last_updated)} by {envVar.updated_by}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                    {/* System Settings List */}
                    <div className="grid gap-4">
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : filteredSystemSettings.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Settings className="h-8 w-8 mx-auto mb-2" />
                                <p>No system settings found</p>
                                <p className="text-sm">System settings will appear here</p>
                            </div>
                        ) : (
                            filteredSystemSettings.map((setting) => (
                                <Card key={setting.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                {getCategoryIcon(setting.category)}
                                                <div>
                                                    <h3 className="text-lg font-semibold">{setting.key}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {setting.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="outline" className={getCategoryColor(setting.category)}>
                                                    {setting.category}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {setting.type}
                                                </Badge>
                                                {setting.requires_restart && (
                                                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                                        Restart Required
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium mb-1">Value:</p>
                                                <p className="text-sm text-muted-foreground font-mono bg-gray-100 p-2 rounded">
                                                    {typeof setting.value === 'object'
                                                        ? JSON.stringify(setting.value, null, 2)
                                                        : String(setting.value)
                                                    }
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4">
                                                <Button variant="outline" size="sm" onClick={() => setSelectedSetting(setting)}>
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                                {setting.is_editable && (
                                                    <Button variant="outline" size="sm">
                                                        <Edit className="h-4 w-4 mr-1" />
                                                        Edit
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
                                            <span>Updated: {formatDate(setting.last_updated)} by {setting.updated_by}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Environment Variables</CardTitle>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{envVars.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {envVars.filter(v => v.is_secret).length} secrets
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Settings</CardTitle>
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemSettings.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {systemSettings.filter(s => s.requires_restart).length} need restart
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Production Config</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {envVars.filter(v => v.environment === 'production').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Active variables
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatDate(Math.max(...envVars.map(v => new Date(v.last_updated).getTime())))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Most recent change
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}