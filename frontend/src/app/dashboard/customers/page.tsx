'use client';
import { ChevronRight, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { HttpOrderService } from '@/modules/order/services/OrderService';
import type { Order } from '@/modules/order/models/order';

export default function CustomersPage() {
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search] = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log('[CustomersPage] mount', { tenant, isLoading, isTenantLoading, orders });
  }, []);

  useEffect(() => {
    console.log('[CustomersPage] tenant changed', { tenant });
  }, [tenant]);

  useEffect(() => {
    console.log('[CustomersPage] loading state', { isLoading, isTenantLoading });
  }, [isLoading, isTenantLoading]);

  useEffect(() => {
    if (!tenant?.id) return;
    console.log('[CustomersPage] fetching orders for tenant', tenant.id);
  }, [tenant?.id]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!tenant?.id) return;
      setIsLoading(true);
      setError(null);
      setTimedOut(false);
      try {
        const orderService = new HttpOrderService();
        const result = await orderService.getOrders({ tenantId: tenant.id, limit: 100, offset: 0 });
        if (result.success && result.data && Array.isArray(result.data.items)) {
          setOrders(result.data.items);
          console.log('[CustomersPage] fetchOrders result', { result });
        } else {
          setOrders([]);
          setError(result.error?.message ?? 'Failed to fetch orders');
        }
      } catch (err: unknown) {
        setError((err as Error).message ?? 'Failed to fetch orders');
        console.error('[CustomersPage] fetchOrders error', err);
      } finally {
        setIsLoading(false);
        console.log('[CustomersPage] fetchOrders complete', { isLoading: false });
      }
    };
    if (tenant?.id) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, retryCount]);

  // Aggregate customers from orders
  const customerMap = new Map<
    string,
    {
      name: string;
      email: string;
      phone: string;
      orders: Order[];
      totalSpent: number;
      lastOrder: string;
    }
  >();
  for (const order of orders) {
    const email = order.customer.email;
    if (!customerMap.has(email)) {
      customerMap.set(email, {
        name: order.customer.name,
        email,
        phone: order.customer.phone,
        orders: [],
        totalSpent: 0,
        lastOrder: order.created_at ?? '',
      });
    }
    const customer = customerMap.get(email)!;
    customer.orders.push(order);
    customer.totalSpent += order.total_amount.amount;
    if (order.created_at && new Date(order.created_at) > new Date(customer.lastOrder)) {
      customer.lastOrder = order.created_at;
    }
  }
  const customers = Array.from(customerMap.values());
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  );

  useEffect(() => {
    if (isLoading || isTenantLoading) {
      const timeout = setTimeout(() => {
        setTimedOut(true);
        setIsLoading(false);
      }, 10000); // 10 seconds
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isLoading, isTenantLoading, retryCount]);
  
  // Force loading to complete if tenant is loaded but there's no tenant ID
  useEffect(() => {
    if (!isLoading && tenant !== undefined && !tenant?.id) {
      console.log('[CustomersPage] tenant loaded with no ID, showing empty state');
      setOrders([]);
    }
  }, [tenant, isLoading]);

  // Retry handler
  const handleRetry = () => {
    setTimedOut(false);
    setError(null);
    setRetryCount((c) => c + 1);
  };

  if (timedOut) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-2">Loading timed out</h2>
        <p className="text-gray-500 mb-6">The customers list took too long to load. Please check your connection or try again later.</p>
        <button
          onClick={handleRetry}
          className="mt-4 px-6 py-2 bg-[#6C9A8B] text-white rounded-lg font-semibold hover:bg-[#55806e] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show loading spinner only if still actively fetching data
  if ((isLoading || isTenantLoading) && tenant === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcf7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C9A8B]" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-2">Error loading customers</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={handleRetry}
          className="mt-4 px-6 py-2 bg-[#6C9A8B] text-white rounded-lg font-semibold hover:bg-[#55806e] transition"
        >
          Retry
        </button>
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-semibold mb-2">No customers found</h2>
        <p className="text-gray-500 mb-6">No customers match your search or there are no orders yet.</p>
      </div>
    );
  }
  if (!isLoading && !isTenantLoading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-semibold mb-2">No customers found</h2>
        <p className="text-gray-500 mb-6">No customers yet. Customers will appear after you receive your first order.</p>
      </div>
    );
  }

  // Display customer list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="text-sm text-gray-500">
          {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-[#f7faf9]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((customer) => (
                <tr key={customer.email} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-[#6C9A8B] flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.email}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.orders.length}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₦{customer.totalSpent.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString() : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={`/dashboard/customers/${encodeURIComponent(customer.email)}`}
                      className="text-[#6C9A8B] hover:text-[#55806e] flex items-center"
                    >
                      View details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
