'use client';

import { Check, Eye, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Route } from 'next';

import { createMerchantAdminRoute } from '@/utils/routes';

import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatPhoneNumber } from '@/lib/utils';
import type { Money } from '@/modules/core/models/base/money';
import type { Order } from '@/modules/order/models/order';
import { OrderStatus } from '@/modules/order/models/order';
import { OrderStatusBadge } from './OrderStatusBadge';

/**
 * Props for the OrdersTable component
 *
 * @interface OrdersTableProps
 * @property {Order[]} orders - Array of order objects to display in the table
 * @property {string[]} selectedOrders - Array of order IDs that are currently selected
 * @property {function} toggleSelectOrder - Function to toggle selection state of a single order
 * @property {function} toggleSelectAll - Function to toggle selection state of all orders
 * @property {function} messageCustomer - Function to initiate communication with a customer
 * @property {function} updateOrderStatus - Function to update the status of an order
 */
interface OrdersTableProps {
  /** Array of order objects to display in the table */
  orders: Order[];

  /** Array of order IDs that are currently selected */
  selectedOrders: string[];

  /** Function to toggle selection state of a single order */
  toggleSelectOrder: (id: string) => void;

  /** Function to toggle selection state of all orders */
  toggleSelectAll: () => void;

  /** Function to initiate communication with a customer */
  messageCustomer: (phone: string) => void;

  /** Function to update the status of an order */
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
}

/**
 * OrdersTable Component
 * Displays a table of orders with selection capabilities, status indicators, and action buttons.
 * Implements responsive design patterns and optimized rendering for large order lists.
 *
 * @param {OrdersTableProps} props - Component props
 * @returns {JSX.Element} Rendered table of orders with interactive elements
 */
export function OrdersTable({
  orders,
  selectedOrders,
  toggleSelectOrder,
  toggleSelectAll,
  messageCustomer,
  updateOrderStatus,
}: OrdersTableProps) {
  /**
   * Compute selection states locally based on orders and selectedOrders props
   * - isAllSelected: true when all available orders are selected
   * - isIndeterminate: true when some but not all orders are selected (for checkbox UI)
   */
  const isAllSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const isIndeterminate = selectedOrders.length > 0 && selectedOrders.length < orders.length;
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = isIndeterminate;
                      }
                    }}
                    onChange={toggleSelectAll}
                  />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className={`${selectedOrders.includes(order.id) ? 'bg-blue-50' : ''} transition-colors hover:bg-gray-50`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => toggleSelectOrder(order.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{order.order_number}</div>
                    <div className="text-sm text-gray-500">{order.items?.length || 0} items</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.customer.name}</div>
                    <div className="text-sm text-gray-500">{formatPhoneNumber(order.customer.phone)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="text-sm text-gray-900">
                      {/* Handle both object-style and numeric total_amount formats for backward compatibility */}
                      {formatCurrency(
                        typeof order.total_amount === 'object'
                          ? order.total_amount.amount
                          : order.total_amount || 0,
                        typeof order.total_amount === 'object'
                          ? order.total_amount.currency
                          : 'USD'
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(
                      order.created_at
                        ? new Date(order.created_at)
                        : new Date()
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link href={createMerchantAdminRoute(order.tenant_id, `orders/${order.id}`)} passHref>
                        <Button variant="ghost" size="sm" className="flex items-center" title="View Order">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateOrderStatus(order.id, OrderStatus.PROCESSING)}
                        className="flex items-center"
                        title="Update Status"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center"
                        title="Message Customer"
                        onClick={() => messageCustomer(order.customer.phone)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
