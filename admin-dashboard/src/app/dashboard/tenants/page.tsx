'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Building2,
    Users,
    ShoppingCart,
    DollarSign,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Eye,
    Filter
} from 'lucide-react';
import api from '@/lib/api';

type SortBy = 'name' | 'created_at' | 'total_users';
type SortOrder = 'asc' | 'desc';

interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    custom_domain?: string;
    status: 'active' | 'inactive' | 'suspended';
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

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState<SortBy>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [showFilterModal, setShowFilterModal] = useState(false);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/admin/tenants');
            setTenants(response.data);
        } catch (error) {
            console.error('Error fetching tenants:', error);
            // Fallback to mock data for development
            setTenants([
                {
                    id: '1',
                    name: 'TechCorp Store',
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
                    name: 'Fashion Boutique',
                    subdomain: 'fashionboutique',
                    custom_domain: 'fashionboutique.com',
                    status: 'active',
                    is_verified: true,
                    created_at: '2024-01-10T14:20:00Z',
                    admin_user_id: 'user2',
                    admin_user_name: 'Sarah Johnson',
                    metrics: {
                        total_users: 890,
                        total_orders: 2150,
                        total_revenue: 89000,
                        active_users: 650,
                        order_completion_rate: 91.2,
                        avg_order_value: 41.3
                    },
                    health: {
                        status: 'warning',
                        uptime_percentage: 98.5,
                        last_activity: '2024-01-20T12:15:00Z',
                        error_rate: 1.2
                    }
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500';
            case 'inactive':
                return 'bg-gray-500';
            case 'suspended':
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

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const sortedTenants = [...filteredTenants].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortBy === 'total_users') {
            aValue = a.metrics.total_users;
            bValue = b.metrics.total_users;
        } else {
            aValue = a[sortBy as keyof Tenant] as string | number;
            bValue = b[sortBy as keyof Tenant] as string | number;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <Skeleton className="h-8 w-24" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
                    <p className="text-gray-600">Manage all platform tenants and their performance</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tenant
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Tenant Filters</CardTitle>
                    <CardDescription>Search and filter tenants by various criteria</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search tenants..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowFilterModal(true)}>
                                <Filter className="w-4 h-4 mr-2" />
                                Advanced Filters
                            </Button>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [field, order] = e.target.value.split('-');
                                    setSortBy(field as SortBy);
                                    setSortOrder(order as SortOrder);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="name-asc">Name A-Z</option>
                                <option value="name-desc">Name Z-A</option>
                                <option value="created_at-desc">Newest First</option>
                                <option value="created_at-asc">Oldest First</option>
                                <option value="total_users-desc">Most Users</option>
                                <option value="total_users-asc">Least Users</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tenants List */}
            <div className="space-y-4">
                {sortedTenants.map((tenant) => (
                    <Card key={tenant.id} className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                                            <p className="text-sm text-gray-500">
                                                {tenant.subdomain}.enwhe.io
                                                {tenant.custom_domain && ` • ${tenant.custom_domain}`}
                                            </p>
                                        </div>
                                        <Badge className={getStatusColor(tenant.status)}>
                                            {tenant.status}
                                        </Badge>
                                        {tenant.is_verified && (
                                            <CheckCircle className="w-4 h-4 text-green-600" aria-label="Verified" />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div className="flex items-center space-x-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatNumber(tenant.metrics.total_users)}
                                                </div>
                                                <div className="text-xs text-gray-500">Total Users</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <ShoppingCart className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatNumber(tenant.metrics.total_orders)}
                                                </div>
                                                <div className="text-xs text-gray-500">Total Orders</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(tenant.metrics.total_revenue)}
                                                </div>
                                                <div className="text-xs text-gray-500">Revenue</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {tenant.health.status === 'healthy' ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : tenant.health.status === 'warning' ? (
                                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-600" />
                                            )}
                                            <div>
                                                <div className={`text-sm font-medium ${getHealthColor(tenant.health.status)}`}>
                                                    {tenant.health.uptime_percentage.toFixed(1)}%
                                                </div>
                                                <div className="text-xs text-gray-500">Uptime</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                    <Button variant="outline" size="sm">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {sortedTenants.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || statusFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria'
                                : 'Get started by adding your first tenant'
                            }
                        </p>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Tenant
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>Advanced Tenant Filters</CardTitle>
                            <CardDescription>Set detailed filter criteria for tenants</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Verification Status</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">All</option>
                                    <option value="verified">Verified Only</option>
                                    <option value="unverified">Unverified Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Date Range</label>
                                <div className="flex gap-2 mt-1">
                                    <Input type="date" placeholder="From" />
                                    <Input type="date" placeholder="To" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Revenue Range</label>
                                <div className="flex gap-2 mt-1">
                                    <Input type="number" placeholder="Min Revenue" />
                                    <Input type="number" placeholder="Max Revenue" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button onClick={() => setShowFilterModal(false)} className="flex-1">
                                    Apply Filters
                                </Button>
                                <Button variant="outline" onClick={() => setShowFilterModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}