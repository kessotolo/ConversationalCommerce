'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '../../components/ui/Card';
import { formatCurrency, formatDate } from '../../lib/utils';
import { getBuyerOrders } from '../../lib/api/orderHistory';
import type { Order } from '../../modules/order/models/order';

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const data = await getBuyerOrders();
        setOrders(data);
      } catch (err) {
        console.error('Failed to load orders', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  return (
    <div>
      <h1>My Orders</h1>
      <Card>
        {loading ? (
          <p>Loading...</p>
        ) : orders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={`/orders/track?orderNumber=${order.order_number}`}>#{order.order_number}</Link>
                  </td>
                  <td className="px-4 py-2">{order.items?.length || 0}</td>
                  <td className="px-4 py-2">
                    {formatCurrency(
                      typeof order.total_amount === 'object'
                        ? order.total_amount.amount
                        : (order.total_amount as number) || 0,
                      typeof order.total_amount === 'object'
                        ? order.total_amount.currency
                        : 'USD'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {formatDate(
                      order.created_at ? new Date(order.created_at) : new Date(),
                      'full'
                    )}
                  </td>
                  <td className="px-4 py-2">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
