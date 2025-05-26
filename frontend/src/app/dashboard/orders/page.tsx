'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, formatPhoneNumber } from '@/lib/utils';
import { 
  Search, 
  Filter, 
  RefreshCcw, 
  ChevronDown, 
  Eye,
  MessageSquare,
  Package,
  Truck,
  Check
} from 'lucide-react';
import { orderService } from '@/lib/api';

// Define order types to match component requirements
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  customerName: string;
  phone: string;
  amount: number;
  items: number;
  status: OrderStatus;
  date: string;
  paymentMethod: string;
}

// Mock data for orders
const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    phone: '+234 123 456 7890',
    amount: 150.50,
    items: 3,
    status: 'processing',
    date: '2025-05-20T14:30:00',
    paymentMethod: 'Mobile Money'
  },
  {
    id: 'ORD-002',
    customerName: 'Sarah Johnson',
    phone: '+234 234 567 8901',
    amount: 85.75,
    items: 2,
    status: 'delivered',
    date: '2025-05-19T09:15:00',
    paymentMethod: 'Cash on Delivery'
  },
  {
    id: 'ORD-003',
    customerName: 'Michael Smith',
    phone: '+234 345 678 9012',
    amount: 210.25,
    items: 4,
    status: 'pending',
    date: '2025-05-21T16:45:00',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'ORD-004',
    customerName: 'Elizabeth Brown',
    phone: '+234 456 789 0123',
    amount: 65.99,
    items: 1,
    status: 'cancelled',
    date: '2025-05-18T11:30:00',
    paymentMethod: 'Mobile Money'
  },
  {
    id: 'ORD-005',
    customerName: 'David Wilson',
    phone: '+234 567 890 1234',
    amount: 175.50,
    items: 3,
    status: 'delivered',
    date: '2025-05-17T13:20:00',
    paymentMethod: 'Cash on Delivery'
  },
  {
    id: 'ORD-006',
    customerName: 'Grace Okonkwo',
    phone: '+234 678 901 2345',
    amount: 132.75,
    items: 2,
    status: 'shipped',
    date: '2025-05-20T10:15:00',
    paymentMethod: 'Mobile Money'
  }
];

// Status badge colors
const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

export default function OrdersPage() {
  const [orders, setOrders] = useState(mockOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch orders with API integration structure (using mock data for now)
  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // This is where you would make a real API call
      // const response = await orderService.getOrders();
      // setOrders(response.data);
      
      // Simulate API call with mock data
      setTimeout(() => {
        setOrders(mockOrders);
        setIsLoading(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
      setIsLoading(false);
    }
  };

  // Filter orders based on search term and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Function to update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsLoading(true);
    
    try {
      // This is where you would make a real API call
      // await orderService.updateOrderStatus(orderId, newStatus);
      
      // Simulate API call
      setTimeout(() => {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
        setIsLoading(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
      setIsLoading(false);
    }
  };
  
  // Function to message customer via WhatsApp
  const messageCustomer = (phone: string) => {
    // In production, this would use the Twilio API
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-4 sm:mb-0">Orders</h1>
          <div className="flex space-x-3">
            <Button onClick={fetchOrders} variant="outline" className="flex items-center">
              <RefreshCcw className="h-4 w-4 mr-2" />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Order Status Tabs */}
        <div className="border-b mb-6 overflow-x-auto pb-px">
          <div className="flex whitespace-nowrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'all' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              All Orders
              <span className="ml-2 bg-gray-100 text-gray-700 py-0.5 px-2 rounded-full text-xs">
                {orders.length}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'pending' ? 'border-yellow-500 text-yellow-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Pending
              <span className="ml-2 bg-yellow-100 text-yellow-700 py-0.5 px-2 rounded-full text-xs">
                {orders.filter(o => o.status === 'pending').length}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'processing' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Processing
              <span className="ml-2 bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">
                {orders.filter(o => o.status === 'processing').length}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('shipped')}
              className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'shipped' ? 'border-purple-500 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Shipped
              <span className="ml-2 bg-purple-100 text-purple-700 py-0.5 px-2 rounded-full text-xs">
                {orders.filter(o => o.status === 'shipped').length}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'delivered' ? 'border-green-500 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Delivered
              <span className="ml-2 bg-green-100 text-green-700 py-0.5 px-2 rounded-full text-xs">
                {orders.filter(o => o.status === 'delivered').length}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'cancelled' ? 'border-red-500 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Cancelled
              <span className="ml-2 bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs">
                {orders.filter(o => o.status === 'cancelled').length}
              </span>
            </button>
          </div>
        </div>

        {/* Filters and search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders by name, ID or phone..."
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            <p>{error}</p>
          </div>
        )}

        {/* Orders list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Order ID</th>
                      <th className="text-left py-3 px-4 font-medium">Customer</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Payment</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{order.id}</td>
                        <td className="py-3 px-4">
                          <div>{order.customerName}</div>
                          <div className="text-xs text-gray-500">{formatPhoneNumber(order.phone)}</div>
                        </td>
                        <td className="py-3 px-4">{formatDate(order.date)}</td>
                        <td className="py-3 px-4 font-medium">{formatCurrency(order.amount)}</td>
                        <td className="py-3 px-4">
                          <Badge className={statusStyles[order.status as keyof typeof statusStyles]}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{order.paymentMethod}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Link href={`/dashboard/orders/${order.id}`}>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View Order Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0" 
                              title="Message Customer"
                              onClick={() => messageCustomer(order.phone)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            {/* Quick status update buttons */}
                            {order.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-blue-600" 
                                title="Mark as Processing"
                                onClick={() => updateOrderStatus(order.id, 'processing')}
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            )}
                            {order.status === 'processing' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-purple-600" 
                                title="Mark as Shipped"
                                onClick={() => updateOrderStatus(order.id, 'shipped')}
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                            {order.status === 'shipped' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-green-600" 
                                title="Mark as Delivered"
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No orders found matching your criteria
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
