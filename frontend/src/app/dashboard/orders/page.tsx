'use client';

import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useTenant } from '@/contexts/TenantContext';
import type { Order } from '@/modules/order/models/order';
import { OrderStatus } from '@/modules/order/models/order';
import { OrderFilterBar } from '@/modules/order/components/OrderFilterBar';
import { OrdersTable } from '@/modules/order/components/OrdersTable';
import { OrderProvider, useOrderContext } from '@/modules/order/context/OrderContext';

// Wrapper component that provides the OrderContext
export default function OrdersPageWithProvider() {
  return (
    <OrderProvider>
      <OrdersPage />
    </OrderProvider>
  );
}

// Main OrdersPage component that uses the OrderContext
function OrdersPage() {
  const { tenant } = useTenant();
  const { 
    orders, 
    isLoading, 
    error, 
    loadOrders, 
    selectedOrders,
    toggleSelectOrder,
    toggleSelectAll,
    updateOrderStatus,
    messageCustomer,
    deleteSelectedOrders
  } = useOrderContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch orders using the OrderContext
  const fetchOrders = async () => {
    if (!tenant?.id) return;
    await loadOrders(tenant.id);
  };

  // Load orders when component mounts or filters change
  useEffect(() => {
    if (tenant?.id) {
      fetchOrders();
    }
  }, [tenant?.id, statusFilter, searchTerm]);

  // Count orders by status for filter bar badges
  const orderCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };
    
    orders.forEach(order => {
      const status = order.status.toLowerCase();
      if (status === OrderStatus.PENDING.toLowerCase()) counts.pending++;
      else if (status === OrderStatus.PROCESSING.toLowerCase()) counts.processing++;
      else if (status === OrderStatus.SHIPPED.toLowerCase()) counts.shipped++;
      else if (status === OrderStatus.DELIVERED.toLowerCase()) counts.delivered++;
      else if (status === OrderStatus.CANCELLED.toLowerCase()) counts.cancelled++;
    });
    
    return counts;
  }, [orders]);

  // Filter orders based on search term and status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.phone.includes(searchTerm);
      const matchesStatus =
        statusFilter === 'all' ||
        order.status === OrderStatus[statusFilter.toUpperCase() as keyof typeof OrderStatus];
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Function to update order status
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!tenant?.id) return;
    await updateOrderStatus(orderId, newStatus, tenant.id);
  };

  // Bulk selection handlers
  const isAllSelected =
    filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length;
  const isIndeterminate =
    selectedOrders.length > 0 && selectedOrders.length < filteredOrders.length;

  // Function to delete selected orders
  const handleDeleteSelectedOrders = async () => {
    if (!tenant?.id || selectedOrders.length === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedOrders.length} orders?`
    );

    if (!confirmDelete) return;
    
    await deleteSelectedOrders(tenant.id);
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

      <OrderFilterBar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        ordersCount={orderCounts}
      />

      <div className="mt-6">
        {error && <p className="text-red-600 mb-4">{error}</p>}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <OrdersTable
              orders={filteredOrders}
              selectedOrders={selectedOrders}
              toggleSelectOrder={toggleSelectOrder}
              toggleSelectAll={toggleSelectAll}
              messageCustomer={messageCustomer}
              updateOrderStatus={handleUpdateStatus}
            />

            {selectedOrders.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleDeleteSelectedOrders}
                  variant="destructive"
                >
                  Delete Selected ({selectedOrders.length})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
