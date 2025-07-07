'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Building2,
    Users,
    ShoppingCart,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    X,
    Search,
    Filter,
    Plus,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
    Pause,
    Play,
    Activity,
    Shield,
    DollarSign
} from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    custom_domain?: string;
    status: 'active' | 'suspended' | 'pending' | 'deleted';
    is_verified: boolean;
    created_at: string;
    admin_user_id: string;
    admin_user_name: string;
    metrics: {
        total_users: number;
        total_orders: number;
        total_revenue: number;
        active_users: number;
        order_completion_rate: number;
        avg_order_value: number;
    };
    health: {
        status: 'healthy' | 'warning' | 'critical';
        uptime_percentage: number;
        last_activity: string;
        error_rate: number;
    };
}

interface TenantControlCenterProps {
    className?: string;
}

export function TenantControlCenter({ className }: TenantControlCenterProps) {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Mock data - replace with API call
    useEffect(() => {
        const mockTenants: Tenant[] = [
            {
                id: '1',
                name: 'TechCorp',
                subdomain: 'techcorp',
                custom_domain: 'techcorp.com',
                status: 'active',
                is_verified: true,
                created_at: '2024-01-15T10:30:00Z',
                admin_user_id: 'user1',
                admin_user_name: 'John Smith',
                metrics: {
                    total_users: 1250,
                    total_orders: 3420,
                    total_revenue: 125000,
                    active_users: 890,
                    order_completion_rate: 94.5,
                    avg_order_value: 36.5
                },
                health: {
                    status: 'healthy',
                    uptime_percentage: 99.8,
                    last_activity: '2024-01-20T14:30:00Z',
                    error_rate: 0.2
                }
            },
            {
                id: '2',
                name: 'FashionStore',
                subdomain: 'fashionstore',
                status: 'active',
                is_verified: true,
                created_at: '2024-01-10T09:15:00Z',
                admin_user_id: 'user2',
                admin_user_name: 'Sarah Johnson',
                metrics: {
                    total_users: 890,
                    total_orders: 1560,
                    total_revenue: 89000,
                    active_users: 450,
                    order_completion_rate: 91.2,
                    avg_order_value: 57.1
                },
                health: {
                    status: 'warning',
                    uptime_percentage: 98.5,
                    last_activity: '2024-01-20T12:45:00Z',
                    error_rate: 1.5
                }
            },
            {
                id: '3',
                name: 'FoodMart',
                subdomain: 'foodmart',
                status: 'suspended',
                is_verified: false,
                created_at: '2024-01-05T16:20:00Z',
                admin_user_id: 'user3',
                admin_user_name: 'Mike Wilson',
                metrics: {
                    total_users: 320,
                    total_orders: 450,
                    total_revenue: 18000,
                    active_users: 120,
                    order_completion_rate: 88.9,
                    avg_order_value: 40.0
                },
                health: {
                    status: 'critical',
                    uptime_percentage: 95.2,
                    last_activity: '2024-01-19T08:15:00Z',
                    error_rate: 4.8
                }
            }
        ];

        setTenants(mockTenants);
        setLoading(false);
    }, []);

    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.admin_user_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const sortedTenants = [...filteredTenants].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
            case 'name':
                aValue = a.name;
                bValue = b.name;
                break;
            case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
            case 'revenue':
                aValue = a.metrics.total_revenue;
                bValue = b.metrics.total_revenue;
                break;
            case 'users':
                aValue = a.metrics.total_users;
                bValue = b.metrics.total_users;
                break;
            case 'created':
                aValue = new Date(a.created_at);
                bValue = new Date(b.created_at);
                break;
            default:
                aValue = a.name;
                bValue = b.name;
        }

        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500';
            case 'suspended':
                return 'bg-yellow-500';
            case 'pending':
                return 'bg-blue-500';
            case 'deleted':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'text-green-600';
            case 'warning':
                return 'text-yellow-600';
            case 'critical':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className={className}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tenant Control Center</h2>
                    <p className="text-muted-foreground">
                        Manage all platform tenants, monitor health, and control access
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tenant
                </Button>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tenants..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="deleted">Deleted</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="created">Created</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
            </div>

            {/* Tenant List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : sortedTenants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="h-8 w-8 mx-auto mb-2" />
                        <p>No tenants found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    sortedTenants.map((tenant) => (
                        <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(tenant.status)}`} />
                                        <div>
                                            <h3 className="text-lg font-semibold">{tenant.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {tenant.subdomain}.enwhe.com
                                                {tenant.custom_domain && ` • ${tenant.custom_domain}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Badge variant={tenant.is_verified ? 'default' : 'secondary'}>
                                            {tenant.is_verified ? 'Verified' : 'Unverified'}
                                        </Badge>
                                        <Badge variant="outline">
                                            {tenant.status}
                                        </Badge>
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{tenant.metrics.total_users}</div>
                                        <div className="text-xs text-muted-foreground">Total Users</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{tenant.metrics.total_orders}</div>
                                        <div className="text-xs text-muted-foreground">Total Orders</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{formatCurrency(tenant.metrics.total_revenue)}</div>
                                        <div className="text-xs text-muted-foreground">Revenue</div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-2xl font-bold ${getHealthColor(tenant.health.status)}`}>
                                            {tenant.health.uptime_percentage}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Uptime</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-4">
                                        <span>Admin: {tenant.admin_user_name}</span>
                                        <span>Created: {formatDate(tenant.created_at)}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button variant="outline" size="sm">
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <Edit className="h-4 w-4 mr-1" />
                                            Edit
                                        </Button>
                                        {tenant.status === 'active' ? (
                                            <Button variant="outline" size="sm">
                                                <Pause className="h-4 w-4 mr-1" />
                                                Suspend
                                            </Button>
                                        ) : (
                                            <Button variant="outline" size="sm">
                                                <Play className="h-4 w-4 mr-1" />
                                                Activate
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenants.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {tenants.filter(t => t.status === 'active').length} active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tenants.reduce((sum, t) => sum + t.metrics.total_users, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Across all tenants
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(tenants.reduce((sum, t) => sum + t.metrics.total_revenue, 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Platform-wide
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Health</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tenants.filter(t => t.health.status === 'healthy').length}/{tenants.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Healthy tenants
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}