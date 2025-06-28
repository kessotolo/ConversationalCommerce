'use client';

import { ChevronLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/utils/auth-utils';
import { useTenant } from '@/contexts/TenantContext';
import { HttpOrderService } from '@/modules/order/services/OrderService';
import type { Order } from '@/modules/order/models/order';
import { useEffect, useState } from 'react';

type Customer = {
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  orders: Order[];
};

function CustomerDetail({ customer }: { customer: Customer }) {
  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-8">
      <div className="flex items-center gap-4 mb-6">
        <Users className="h-8 w-8 text-[#6C9A8B]" />
        <div>
          <div className="text-lg font-bold text-gray-900">{customer.name}</div>
          <div className="text-gray-500 text-sm">{customer.email}</div>
          <div className="text-gray-500 text-sm">{customer.phone}</div>
        </div>
      </div>
      <div className="mb-4">
        <span className="font-semibold">Total Spent:</span> ₦{customer.totalSpent.toFixed(2)}
      </div>
      <div className="mb-4">
        <span className="font-semibold">Orders:</span> {customer.orders.length}
      </div>
      <div className="mt-8">
        <h3 className="font-semibold mb-2">Order History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-[#f7faf9]">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {customer.orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-2">{order.order_number}</td>
                  <td className="px-4 py-2">₦{order.total_amount.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
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

export default function CustomerDetailPage() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const params = useParams();
  const email = params ? params['email'] : '';
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (isAuthLoading || isTenantLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcf7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C9A8B]" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return null;
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Link href="/dashboard/customers" className="inline-flex items-center text-[#6C9A8B] mb-6">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Customers
        </Link>
        <h2 className="text-xl font-bold mb-2">Error loading customer</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }
  const customerOrders = orders.filter((o: Order) => o.customer.email === email);
  if (customerOrders.length === 0 || !customerOrders[0]) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Link href="/dashboard/customers" className="inline-flex items-center text-[#6C9A8B] mb-6">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Customers
        </Link>
        <h2 className="text-xl font-bold mb-2">Customer not found</h2>
        <p className="text-gray-500">No customer with this email exists.</p>
      </div>
    );
  }
  const customer: Customer = {
    name: customerOrders[0].customer.name,
    email: customerOrders[0].customer.email,
    phone: customerOrders[0].customer.phone,
    totalSpent: customerOrders.reduce((sum, o) => sum + o.total_amount.amount, 0),
    orders: customerOrders,
  };
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/dashboard/customers" className="inline-flex items-center text-[#6C9A8B] mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Customers
      </Link>
      <CustomerDetail customer={customer} />
    </div>
  );
}
