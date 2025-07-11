'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ShoppingCart,
    Search,
    Filter,
    Eye,
    Edit,
    CheckCircle,
    Clock,
    XCircle,
    DollarSign,
    Calendar,
    User,
    Building2,
    Download,
    BarChart3
} from 'lucide-react';
import api from '@/lib/api';

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    tenant_id: string;
    tenant_name: string;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    total_amount: number;
    created_at: string;
    updated_at: string;
    items_count: number;
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
}

interface OrderStats {
    total_orders: number;
    total_revenue: number;
    pending_orders: number;
    completed_orders: number;
    avg_order_value: number;
    orders_today: number;
    revenue_today: number;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<OrderStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [showFilterModal, setShowFilterModal] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchOrderStats();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/admin/orders');
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
            // Fallback to mock data for development
            setOrders([
                {
                    id: '1',
                    order_number: 'ORD-2024-001',
                    customer_name: 'John Doe',
                    customer_email: 'john.doe@example.com',
                    tenant_id: '1',
                    tenant_name: 'TechCorp Store',
                    status: 'delivered',
                    total_amount: 125.50,
                    created_at: '2024-01-20T10:30:00Z',
                    updated_at: '2024-01-20T14:30:00Z',
                    items_count: 3,
                    payment_status: 'paid'
                },
                {
                    id: '2',
                    order_number: 'ORD-2024-002',
                    customer_name: 'Sarah Johnson',
                    customer_email: 'sarah.johnson@example.com',
                    tenant_id: '2',
                    tenant_name: 'Fashion Boutique',
                    status: 'processing',
                    total_amount: 89.99,
                    created_at: '2024-01-20T12:15:00Z',
                    updated_at: '2024-01-20T12:15:00Z',
                    items_count: 2,
                    payment_status: 'paid'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderStats = async () => {
        try {
            const response = await api.get('/api/admin/orders/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching order stats:', error);
            // Fallback to mock data
            setStats({
                total_orders: 45000,
                total_revenue: 1250000,
                pending_orders: 150,
                completed_orders: 42000,
                avg_order_value: 27.8,
                orders_today: 25,
                revenue_today: 1250
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered':
                return 'bg-green-500';
            case 'shipped':
                return 'bg-blue-500';
            case 'processing':
                return 'bg-yellow-500';
            case 'confirmed':
                return 'bg-purple-500';
            case 'pending':
                return 'bg-gray-500';
            case 'cancelled':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-500';
            case 'pending':
                return 'bg-yellow-500';
            case 'failed':
                return 'bg-red-500';
            case 'refunded':
                return 'bg-gray-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter;
        return matchesSearch && matchesStatus && matchesPayment;
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
                    <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
                    <p className="text-gray-600">Manage all platform orders and transactions</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button variant="outline">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analytics
                    </Button>
                </div>
            </div>

            {/* Order Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{stats.total_orders.toLocaleString()}</div>
                            <p className="text-xs text-gray-500">All time</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_revenue)}</div>
                            <p className="text-xs text-gray-500">All time</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Pending Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{stats.pending_orders}</div>
                            <p className="text-xs text-gray-500">Awaiting processing</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Avg Order Value</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avg_order_value)}</div>
                            <p className="text-xs text-gray-500">Per order</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Order Filters</CardTitle>
                    <CardDescription>Search and filter orders by various criteria</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search orders by number, customer, or email..."
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
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <select
                                value={paymentFilter}
                                onChange={(e) => setPaymentFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Payments</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.map((order) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{order.order_number}</h3>
                                            <p className="text-sm text-gray-500">{order.customer_name} • {order.customer_email}</p>
                                        </div>
                                        <Badge className={getStatusColor(order.status)}>
                                            {order.status === 'delivered' && <CheckCircle className="w-3 h-3 mr-1" />}
                                            {order.status === 'processing' && <Clock className="w-3 h-3 mr-1" />}
                                            {order.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                                            {order.status}
                                        </Badge>
                                        <Badge className={getPaymentStatusColor(order.payment_status)}>
                                            {order.payment_status}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div className="flex items-center space-x-2">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(order.total_amount)}
                                                </div>
                                                <div className="text-xs text-gray-500">Total Amount</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-gray-500">Order Date</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {order.items_count}
                                                </div>
                                                <div className="text-xs text-gray-500">Items</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Building2 className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {order.tenant_name}
                                                </div>
                                                <div className="text-xs text-gray-500">Tenant</div>
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
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredOrders.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || statusFilter !== 'all' || paymentFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria'
                                : 'No orders have been placed yet'
                            }
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>Advanced Filters</CardTitle>
                            <CardDescription>Set detailed filter criteria for orders</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Date Range</label>
                                <div className="flex gap-2 mt-1">
                                    <Input type="date" placeholder="From" />
                                    <Input type="date" placeholder="To" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Amount Range</label>
                                <div className="flex gap-2 mt-1">
                                    <Input type="number" placeholder="Min Amount" />
                                    <Input type="number" placeholder="Max Amount" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Tenant</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">All Tenants</option>
                                    <option value="techcorp">TechCorp Store</option>
                                    <option value="fashionboutique">Fashion Boutique</option>
                                </select>
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