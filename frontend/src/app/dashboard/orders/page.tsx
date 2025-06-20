'use client';
import { Check, RefreshCcw, Search, Eye, MessageSquare, Package, Truck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardContent, CardHeader, CardTitle, Card } from '@/components/ui/Card';
import { formatCurrency, formatDate, formatPhoneNumber } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';
import { HttpOrderService } from '@/modules/order/services/OrderService';
import type { Order } from '@/modules/order/models/order';
import { OrderStatus } from '@/modules/order/models/order';

// Status badge colors
const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

// Helper to get order date (use latest timeline event or fallback)
function getOrderDate(order: Order): string {
  if (order.timeline && order.timeline.length > 0 && order.timeline[0]?.timestamp) {
    return order.timeline[0].timestamp;
  }
  return order.created_at ?? '';
}

// Helper to get payment method as string
function getPaymentMethod(order: Order): string {
  return order.payment?.method ? order.payment.method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
}

// Helper to get status display string
function getStatusDisplay(status: OrderStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function OrdersPage() {
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const orderService = new HttpOrderService();

  const fetchOrders = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await orderService.getOrders({
        tenantId: tenant.id,
        status: statusFilter,
        search: searchTerm,
        limit: 50,
        offset: 0,
      });
      if (result.success && result.data && Array.isArray(result.data.items)) {
        setOrders(result.data.items);
      } else {
        setOrders([]);
        setError(result.error?.message ?? 'Failed to fetch orders');
      }
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, statusFilter, searchTerm]);

  // Filter orders based on search term and status
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.phone.includes(searchTerm);
    const matchesStatus =
      statusFilter === 'all' || order.status === OrderStatus[statusFilter.toUpperCase() as keyof typeof OrderStatus];
    return matchesSearch && matchesStatus;
  });

  // Function to update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsLoading(true);
    try {
      // TODO: Call real API to update order status
      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order,
        ),
      );
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to update order status');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to message customer via WhatsApp
  const messageCustomer = (phone: string) => {
    // In production, this would use the Twilio API
    if (typeof window !== 'undefined')
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
  };

  // Bulk selection handlers
  const isAllSelected =
    filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length;
  const isIndeterminate =
    selectedOrders.length > 0 && selectedOrders.length < filteredOrders.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((order) => order?.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id],
    );
  };

  // Bulk action example: Mark selected as shipped
  const handleBulkMarkShipped = () => {
    setOrders(
      orders.map((order) =>
        selectedOrders.includes(order.id) && order.status === OrderStatus.PROCESSING
          ? { ...order, status: OrderStatus.SHIPPED } : order,
      ),
    );
    setSelectedOrders([]);
  };

  // Bulk action example: Delete selected (with confirm)
  const handleBulkDelete = () => {
    if (selectedOrders.length === 0) return;
    if (
      typeof window !== 'undefined' &&
      window.confirm(
        `Are you sure you want to delete ${selectedOrders.length} orders? This cannot be undone.`,
      )
    ) {
      setOrders(orders.filter((order) => !selectedOrders.includes(order?.id)));
      setSelectedOrders([]);
    }
  };

  // Bulk action example: Mark selected as processing
  const handleBulkMarkProcessing = () => {
    setOrders(
      orders.map((order) =>
        selectedOrders.includes(order.id) && order.status === OrderStatus.PENDING
          ? { ...order, status: OrderStatus.PROCESSING } : order,
      ),
    );
    setSelectedOrders([]);
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-4 sm:mb-0">Orders</h1>
        <div className="flex space-x-3">
          <Button onClick={fetchOrders} className="flex items-center">
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
              {orders.filter((o) => o.status === OrderStatus.PENDING).length}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'processing' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Processing
            <span className="ml-2 bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">
              {orders.filter((o) => o.status === OrderStatus.PROCESSING).length}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('shipped')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'shipped' ? 'border-purple-500 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Shipped
            <span className="ml-2 bg-purple-100 text-purple-700 py-0.5 px-2 rounded-full text-xs">
              {orders.filter((o) => o.status === OrderStatus.SHIPPED).length}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'delivered' ? 'border-green-500 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Delivered
            <span className="ml-2 bg-green-100 text-green-700 py-0.5 px-2 rounded-full text-xs">
              {orders.filter((o) => o.status === OrderStatus.DELIVERED).length}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`pb-3 px-4 font-medium text-sm border-b-2 ${statusFilter === 'cancelled' ? 'border-red-500 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Cancelled
            <span className="ml-2 bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs">
              {orders.filter((o) => o.status === OrderStatus.CANCELLED).length}
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

      {/* Bulk Action Bar */}
      {selectedOrders.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 shadow-sm">
          <span className="font-medium text-blue-800">
            {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2 flex-wrap">
            <Button
              className="btn-outline"
              onClick={handleBulkMarkProcessing}
              disabled={selectedOrders.length === 0}
            >
              Mark as Processing
            </Button>
            <Button
              className="btn-outline"
              onClick={handleBulkMarkShipped}
              disabled={selectedOrders.length === 0}
            >
              Mark as Shipped
            </Button>
            <Button
              className="btn-destructive"
              onClick={handleBulkDelete}
              disabled={selectedOrders.length === 0}
            >
              Delete
            </Button>
            <Button className="btn-ghost" onClick={() => setSelectedOrders([])}>
              Cancel
            </Button>
          </div>
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={toggleSelectAll}
                        aria-label="Select all orders"
                      />
                    </th>
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
                    <tr
                      key={order?.id}
                      className={`border-b hover:bg-[#f7faf9] transition ${selectedOrders.includes(order?.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order?.id)}
                          onChange={() => toggleSelectOrder(order?.id)}
                          aria-label={`Select order ${order?.id}`}
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <Link
                          href={`/dashboard/orders/${order?.id}`}
                          className="text-blue-700 hover:underline"
                          title="View Order Details"
                        >
                          {order?.id}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div>{order?.customer.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatPhoneNumber(order?.customer.phone)}
                        </div>
                      </td>
                      <td className="py-3 px-4">{formatDate(getOrderDate(order))}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(order.total_amount.amount, order.total_amount.currency)}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusStyles[getStatusDisplay(order.status).toLowerCase() as keyof typeof statusStyles]}>
                          {getStatusDisplay(order.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{getPaymentMethod(order)}</td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Link href={`/dashboard/orders/${order?.id}`}>
                            <Button className="h-8 w-8 p-0" title="View Order Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            className="h-8 w-8 p-0"
                            title="Message Customer"
                            onClick={() => messageCustomer(order?.customer.phone)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          {/* Quick status update buttons */}
                          {order?.status === OrderStatus.PENDING && (
                            <Button
                              className="h-8 w-8 p-0 text-blue-600"
                              title="Mark as Processing"
                              onClick={() => updateOrderStatus(order?.id, OrderStatus.PROCESSING)}
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          )}
                          {order?.status === OrderStatus.PROCESSING && (
                            <Button
                              className="h-8 w-8 p-0 text-purple-600"
                              title="Mark as Shipped"
                              onClick={() => updateOrderStatus(order?.id, OrderStatus.SHIPPED)}
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          {order?.status === OrderStatus.SHIPPED && (
                            <Button
                              className="h-8 w-8 p-0 text-green-600"
                              title="Mark as Delivered"
                              onClick={() => updateOrderStatus(order?.id, OrderStatus.DELIVERED)}
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
            <div className="flex flex-col items-center justify-center py-24">
              <Image
                src="/empty-box.svg"
                alt="No orders"
                width={500}
                height={300}
                className="w-32 h-32 mb-6 opacity-80"
              />
              <h2 className="text-xl font-semibold mb-2">No orders found</h2>
              <p className="text-gray-500 mb-6">
                Orders will appear here as customers make purchases.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
