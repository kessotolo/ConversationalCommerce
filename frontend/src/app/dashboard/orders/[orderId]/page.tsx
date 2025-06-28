'use client';

import {
  ArrowLeft,
  Package,
  Truck,
  X,
  Clock,
  MessageSquare,
  Printer,
  MapPin,
  Calendar,
  Check,
  User,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '@/components/ui/Card';
import { formatCurrency, formatDate, formatPhoneNumber } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';
import type { Order } from '@/modules/order/models/order';
import { OrderStatus, OrderSource } from '@/modules/order/models/order';
import { OrderProvider, useOrderContext } from '@/modules/order/context/OrderContext';

// Wrapper component that provides the OrderContext
export default function OrderDetailPageWithProvider() {
  return (
    <OrderProvider>
      <OrderDetailPage />
    </OrderProvider>
  );
}

// Main OrderDetailPage component that uses the OrderContext
function OrderDetailPage() {
  const params = useParams() as Record<string, string>;
  const orderId = params.orderId || params.id;
  const { tenant } = useTenant();
  const { updateOrderStatus: contextUpdateOrderStatus, messageCustomer } = useOrderContext();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const [updating, setUpdating] = useState(false);
  // Processing mode configuration
  const processingMode = useState<'auto' | 'manual'>('auto')[0];

  // Load order details using context
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!tenant?.id || !orderId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Use the context to get order details
        const result = await fetch(`/api/orders/${orderId}?tenantId=${tenant.id}`);
        const data = await result.json();
        
        if (data.success) {
          setOrder(data.data);
        } else {
          setError(data.error?.message || 'Order not found');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Error loading order: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [tenant?.id, orderId]);

  // Update order status using context
  const handleUpdateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order || !tenant?.id) return;
    
    setUpdating(true);
    try {
      // Use context function to update status
      await contextUpdateOrderStatus(order.id, newStatus, tenant.id);
      
      // Update local order state
      setOrder({ ...order, status: newStatus });
      setUpdated(true);
      setTimeout(() => setUpdated(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error updating order status:', errorMessage);
      setError(`Error updating order status: ${errorMessage}`);
    } finally {
      setUpdating(false);
    }
  };
  
  // Handle messaging customer
  const handleMessageCustomer = () => {
    if (order?.customer.phone) {
      messageCustomer(order.customer.phone);
    }
  };

  const statusIcons = {
    [OrderStatus.PENDING]: <Clock className="h-4 w-4" />,
    [OrderStatus.PROCESSING]: <Package className="h-4 w-4" />,
    [OrderStatus.SHIPPED]: <Truck className="h-4 w-4" />,
    [OrderStatus.DELIVERED]: <Check className="h-4 w-4" />,
    [OrderStatus.CANCELLED]: <X className="h-4 w-4" />,
    [OrderStatus.PAID]: <Check className="h-4 w-4" />,
    [OrderStatus.REFUNDED]: <Check className="h-4 w-4" />,
    [OrderStatus.FAILED]: <X className="h-4 w-4" />,
  };

  const statusStyles = {
    [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [OrderStatus.PROCESSING]: 'bg-blue-100 text-blue-800',
    [OrderStatus.SHIPPED]: 'bg-purple-100 text-purple-800',
    [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800',
    [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800',
    [OrderStatus.PAID]: 'bg-green-100 text-green-800',
    [OrderStatus.REFUNDED]: 'bg-gray-100 text-gray-800',
    [OrderStatus.FAILED]: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4" />
        <p>Loading order information...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500">{error || 'Order not found.'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <Link
            href="/dashboard/orders"
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
          <h1 className="text-2xl font-bold flex items-center">
            Order {order.order_number}
            <Badge className={`ml-3 ${statusStyles[order.status]}`}>
              <span className="flex items-center">
                {statusIcons[order.status]}
                <span className="ml-1 capitalize">{order.status.toLowerCase()}</span>
              </span>
            </Badge>
          </h1>
          <p className="text-gray-500 flex items-center mt-1">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(order.created_at || '')}
            <span className="mx-2">•</span>
            <Badge className="badge-outline">
              {order.source === OrderSource.WHATSAPP
                ? 'WhatsApp Order'
                : order.source === OrderSource.WEBSITE
                  ? 'Web Order'
                  : order.source === OrderSource.INSTAGRAM
                    ? 'Instagram Order'
                    : 'Other'}
            </Badge>
          </p>
        </div>

        <div className="flex space-x-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMessageCustomer}
            className="flex items-center"
            disabled={!order}
          >
            <MessageSquare className="h-4 w-4 mr-2" /> Message Customer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center"
            disabled={!order}
          >
            <Printer className="h-4 w-4 mr-2" /> Print Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main order content - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order status card with actions */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
              <CardDescription>
                Current status: <span className="font-medium capitalize">{order.status}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        order.status === OrderStatus.CANCELLED
                          ? 'bg-red-500'
                          : order.status === OrderStatus.PENDING
                            ? 'bg-yellow-500 w-1/4'
                            : order.status === OrderStatus.PROCESSING
                              ? 'bg-blue-500 w-2/4'
                              : order.status === OrderStatus.SHIPPED
                                ? 'bg-purple-500 w-3/4'
                                : 'bg-green-500 w-full'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Pending</span>
                    <span>Processing</span>
                    <span>Shipped</span>
                    <span>Delivered</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex space-x-2">
                  {order.status === OrderStatus.PENDING && (
                    <Button
                      onClick={() => handleUpdateOrderStatus(OrderStatus.PROCESSING)}
                      className="flex items-center"
                      disabled={updating}
                      size="sm"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Process Order
                    </Button>
                  )}
                  {order.status === OrderStatus.PROCESSING && (
                    <Button
                      onClick={() => handleUpdateOrderStatus(OrderStatus.SHIPPED)}
                      className="flex items-center"
                      disabled={updating}
                      size="sm"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Mark as Shipped
                    </Button>
                  )}
                  {order.status === OrderStatus.SHIPPED && (
                    <Button
                      onClick={() => handleUpdateOrderStatus(OrderStatus.DELIVERED)}
                      className="flex items-center"
                      variant="secondary"
                      disabled={updating}
                      size="sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Delivered
                    </Button>
                  )}
                  {order.status !== OrderStatus.CANCELLED && (
                    <Button
                      onClick={() => handleUpdateOrderStatus(OrderStatus.CANCELLED)}
                      className="flex items-center"
                      variant="destructive"
                      disabled={updating}
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between items-center">
              {updated && (
                <div className="text-sm text-green-600 flex items-center">
                  <Check className="mr-1 h-4 w-4" />
                  Status updated successfully
                </div>
              )}
              <div className="ml-auto text-xs text-gray-500">
                Last updated: {formatDate(new Date().toISOString())}
              </div>
            </CardFooter>
          </Card>

          {/* Order items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>
                {order.items.length} items, Total:{' '}
                {formatCurrency(order.total_amount.amount, order.total_amount.currency)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      {item.image_url && (
                        <Image
                          src={item.image_url}
                          alt={item.product_name}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} ×{' '}
                          {formatCurrency(item.unit_price.amount, item.unit_price.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="font-medium">
                      {formatCurrency(item.total_price.amount, item.total_price.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="w-full space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>
                    {formatCurrency(order.total_amount.amount, order.total_amount.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t mt-2">
                  <span>Total</span>
                  <span>
                    {formatCurrency(order.total_amount.amount, order.total_amount.currency)}
                  </span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Customer information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 rounded-full p-2">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">{order.customer.name}</p>
                  <p className="text-sm text-gray-500">{order.customer.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 rounded-full p-2">
                  <Phone className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm">{formatPhoneNumber(order.customer.phone || '')}</p>
                  <Button className="text-xs btn-ghost p-0 h-auto mt-1">Send Message</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping information */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 rounded-full p-2 mt-1">
                  <MapPin className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="whitespace-pre-line">{order.shipping.address?.street || ''}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button className="w-full btn-outline">
                <Printer className="mr-2 h-4 w-4" />
                Print Shipping Label
              </Button>
            </CardFooter>
          </Card>

          {/* Payment information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Method</span>
                <span>{order.payment.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge className="badge-success">Paid</Badge>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <p>Processing mode: {processingMode === 'auto' ? 'Automatic' : 'Manual'}</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
