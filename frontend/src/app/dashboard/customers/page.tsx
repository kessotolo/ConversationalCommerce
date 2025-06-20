'use client';
import { ChevronRight, Users, Search } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { HttpOrderService } from '@/modules/order/services/OrderService';
import type { Order } from '@/modules/order/models/order';

export default function CustomersPage() {
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!tenant?.id) return;
      setIsLoading(true);
      setError(null);
      try {
        const orderService = new HttpOrderService();
        const result = await orderService.getOrders({ tenantId: tenant.id, limit: 100, offset: 0 });
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
    if (tenant?.id) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  // Aggregate customers from orders
  const customerMap = new Map<string, {
    name: string;
    email: string;
    phone: string;
    orders: Order[];
    totalSpent: number;
    lastOrder: string;
  }>();
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

  if (isLoading || isTenantLoading) {
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
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-2">No customers found</h2>
        <p className="text-gray-500">No customers match your search or there are no orders yet.</p>
      </div>
    );
  }
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-[#6C9A8B]" /> Customers
        </h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            className="pl-10 pr-3 py-2 rounded-lg border border-gray-200 w-full focus:outline-none focus:ring-2 focus:ring-[#6C9A8B] bg-white"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-[#f7faf9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
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
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filtered.map((c) => (
              <tr key={c.email} className="hover:bg-[#f7faf9] transition">
                <td className="px-6 py-4 font-semibold text-gray-900">{c.name}</td>
                <td className="px-6 py-4">{c.email}</td>
                <td className="px-6 py-4">{c.phone}</td>
                <td className="px-6 py-4">{c.orders.length}</td>
                <td className="px-6 py-4">₦{c.totalSpent.toFixed(2)}</td>
                <td className="px-6 py-4">{new Date(c.lastOrder).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/customers/${encodeURIComponent(c.email)}`}
                    className="text-[#6C9A8B] font-semibold hover:underline flex items-center"
                  >
                    View <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
