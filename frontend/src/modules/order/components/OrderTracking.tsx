'use client';

import React, { useEffect, useState } from 'react';

import { formatAddress } from '@/modules/core/models/base/address';

import { useOrderService } from '@/modules/order/hooks/useOrderService';
import { OrderStatus } from '@/modules/order/models/order';
import type { Order } from '@/modules/order/models/order';

interface OrderTrackingProps {
  /**
   * Order ID to track, if known
   */
  orderId?: string;
  /**
   * Order number to track, if ID not known
   */
  orderNumber?: string;
  /**
   * Customer phone number to look up orders
   */
  customerPhone?: string;
  /**
   * Called when an order is loaded
   */
  onOrderLoaded?: (order: Order) => void;
}

/**
 * Order tracking component that works across web and conversational channels
 */
export function OrderTracking({
  orderId,
  orderNumber,
  customerPhone,
  onOrderLoaded,
}: OrderTrackingProps) {
  const orderService = useOrderService();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId && !orderNumber && !customerPhone) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let result;

        // Try loading by ID first
        if (orderId) {
          result = await orderService.getOrderById(orderId);
          if (result.success && result.data) {
            setOrder(result.data);
            onOrderLoaded?.(result.data);
            return;
          }
        }

        // If no result by ID, try by order number
        if (orderNumber) {
          result = await orderService.getOrderByNumber(orderNumber);
          if (result.success && result.data) {
            setOrder(result.data);
            onOrderLoaded?.(result.data);
            return;
          }
        }

        // If no result by order number, try by phone
        if (customerPhone) {
          result = await orderService.getOrdersByCustomerPhone(customerPhone);
          if (result.success && result.data && result.data.length > 0) {
            // Use the most recent order
            const sortedOrders = result.data.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            );
            setOrder(sortedOrders[0]);
            onOrderLoaded?.(sortedOrders[0]);
            return;
          }
        }

        // If we get here, no order was found
        setError('Order not found. Please check your information and try again.');
      } catch (err) {
        setError('Failed to load order. Please try again later.');
        console.error('Error loading order:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId, orderNumber, customerPhone, orderService, onOrderLoaded]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Track Your Order</h2>
        <p className="text-gray-600 mb-4">Enter your order details to track your package</p>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Order Number</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="e.g. ORD-20250603-1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input type="tel" className="w-full p-2 border rounded" placeholder="+254..." />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
          >
            Track Order
          </button>
        </form>
      </div>
    );
  }

  // If we have an order, show tracking information
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">Order #{order.order_number}</h2>
            <p className="text-gray-600">{new Date(order.created_at).toLocaleDateString()}</p>
          </div>
          <div
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: getStatusColor(order.status).bg,
              color: getStatusColor(order.status).text,
            }}
          >
            {order.status}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Tracking Information</h3>
          <div className="bg-gray-50 p-4 rounded">
            {order.shipping.tracking_number ? (
              <div>
                <p className="font-medium">Tracking #: {order.shipping.tracking_number}</p>
                {order.shipping.estimated_delivery && (
                  <p className="text-gray-600 mt-1">
                    Estimated delivery:{' '}
                    {new Date(order.shipping.estimated_delivery).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-600">
                Tracking information will be available once your order ships.
              </p>
            )}
          </div>
        </div>

        {/* Order Progress */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Order Progress</h3>
          <OrderProgressBar status={order.status} />
        </div>

        {/* Order Details */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Shipping Details</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-gray-600">{formatAddress(order.shipping.address)}</p>
              <p className="text-gray-600 mt-2">{order.customer.phone}</p>
              {order.customer.email && <p className="text-gray-600">{order.customer.email}</p>}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Payment Information</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-medium">Method: {order.payment.method.replace('_', ' ')}</p>
              <p className="text-gray-600">Status: {order.payment.status}</p>
              <p className="font-medium mt-2">
                Total: {order.total_amount.amount.toLocaleString()} {order.total_amount.currency}
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-2">Order Items</h3>
          <div className="border rounded overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.image_url && (
                          <div className="flex-shrink-0 h-10 w-10 mr-3">
                            <img
                              className="h-10 w-10 object-cover rounded"
                              src={item.image_url}
                              alt={item.product_name}
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{item.product_name}</div>
                          {item.variant_name && (
                            <div className="text-gray-500">{item.variant_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.unit_price.amount.toLocaleString()} {item.unit_price.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {item.total_price.amount.toLocaleString()} {item.total_price.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-6 py-3" />
                  <td className="px-6 py-3 text-sm font-medium text-gray-500">Subtotal:</td>
                  <td className="px-6 py-3 text-sm font-medium">
                    {order.subtotal.amount.toLocaleString()} {order.subtotal.currency}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="px-6 py-3" />
                  <td className="px-6 py-3 text-sm font-medium text-gray-500">Shipping:</td>
                  <td className="px-6 py-3 text-sm font-medium">
                    {order.shipping.shipping_cost.amount.toLocaleString()}{' '}
                    {order.shipping.shipping_cost.currency}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="px-6 py-3" />
                  <td className="px-6 py-3 text-sm font-medium text-gray-500">Tax:</td>
                  <td className="px-6 py-3 text-sm font-medium">
                    {order.tax.amount.toLocaleString()} {order.tax.currency}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="px-6 py-3" />
                  <td className="px-6 py-3 text-sm font-bold text-gray-700">Total:</td>
                  <td className="px-6 py-3 text-lg font-bold">
                    {order.total_amount.amount.toLocaleString()} {order.total_amount.currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Order Timeline */}
        {order.timeline && order.timeline.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {order.timeline.map((event, index) => (
                <div key={event.id} className="relative pl-8">
                  {/* Timeline connector */}
                  {index !== order.timeline.length - 1 && (
                    <div className="absolute top-4 left-[0.4375rem] bottom-0 w-0.5 bg-gray-200" />
                  )}

                  {/* Timeline dot */}
                  <div className="absolute top-1 left-0 w-3 h-3 rounded-full bg-blue-500" />

                  {/* Event content */}
                  <div>
                    <p className="font-medium">{event.status}</p>
                    <p className="text-gray-500 text-sm">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {event.note && <p className="text-gray-600 mt-1">{event.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
            onClick={() => window.print()}
          >
            Print Receipt
          </button>

          {order.status === OrderStatus.PENDING && (
            <button
              className="px-4 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700"
              onClick={() => {
                // Would trigger cancel order flow
                alert('This would trigger the cancel order flow');
              }}
            >
              Cancel Order
            </button>
          )}

          <button
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50"
            onClick={() => {
              // Would trigger customer support flow
              alert('This would trigger the customer support flow');
            }}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Order progress bar component for visualizing order status
 */
function OrderProgressBar({ status }: { status: OrderStatus }) {
  const steps = [
    { key: OrderStatus.PENDING, label: 'Order Placed' },
    { key: OrderStatus.PAID, label: 'Payment Confirmed' },
    { key: OrderStatus.PROCESSING, label: 'Processing' },
    { key: OrderStatus.SHIPPED, label: 'Shipped' },
    { key: OrderStatus.DELIVERED, label: 'Delivered' },
  ];

  // Find the current step index
  const statusIndex = steps.findIndex((step) => step.key === status);
  const currentStep =
    statusIndex !== -1
      ? statusIndex
      : status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED
        ? -1
        : 0;

  // Special cases
  if (status === OrderStatus.CANCELLED) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
        <p className="text-red-700 font-medium">This order has been cancelled</p>
      </div>
    );
  }

  if (status === OrderStatus.REFUNDED) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-center">
        <p className="text-amber-700 font-medium">This order has been refunded</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200 absolute top-5 left-0 right-0 z-0">
        <div
          className="h-1 bg-blue-500 absolute top-0 left-0 z-10"
          style={{ width: `${Math.max(0, (currentStep / (steps.length - 1)) * 100)}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between relative z-20">
        {steps.map((step, index) => (
          <div key={step.key} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-1
                ${index <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}
            >
              {index <= currentStep ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-sm text-center ${index <= currentStep ? 'font-medium' : 'text-gray-500'}`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Get color for order status
 */
function getStatusColor(status: OrderStatus): { bg: string; text: string } {
  switch (status) {
    case OrderStatus.PENDING:
      return { bg: '#f3f4f6', text: '#4b5563' }; // gray-100, gray-600
    case OrderStatus.PAID:
      return { bg: '#eff6ff', text: '#2563eb' }; // blue-50, blue-600
    case OrderStatus.PROCESSING:
      return { bg: '#eef2ff', text: '#4f46e5' }; // indigo-50, indigo-600
    case OrderStatus.SHIPPED:
      return { bg: '#f0fdfa', text: '#0d9488' }; // teal-50, teal-600
    case OrderStatus.DELIVERED:
      return { bg: '#ecfdf5', text: '#059669' }; // green-50, green-600
    case OrderStatus.CANCELLED:
      return { bg: '#fef2f2', text: '#dc2626' }; // red-50, red-600
    case OrderStatus.REFUNDED:
      return { bg: '#fffbeb', text: '#d97706' }; // amber-50, amber-600
    default:
      return { bg: '#f3f4f6', text: '#4b5563' }; // gray-100, gray-600
  }
}
