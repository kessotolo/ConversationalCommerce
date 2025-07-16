'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle
} from 'lucide-react';

import type { OrderService } from '@/modules/order/services/OrderService';
import { OrderStatus, type Order } from '@/modules/order/models/order';

type OrderTrackingProps = {
  orderService: OrderService;
  orderId?: string;
  orderNumber?: string;
  customerPhone?: string;
  customerId?: string;
  tenantId: string;
  onOrderLoaded?: (order: Order) => void;
};

/**
 * Component for tracking order status progress
 */
const OrderProgressBar = ({ status }: { status: OrderStatus }): JSX.Element => {
  const getProgressValue = (): number => {
    switch (status) {
      case OrderStatus.PENDING:
        return 0;
      case OrderStatus.PAID:
        return 25;
      case OrderStatus.PROCESSING:
        return 50;
      case OrderStatus.SHIPPED:
        return 75;
      case OrderStatus.DELIVERED:
        return 100;
      default:
        return 0;
    }
  };

  const progressSteps = [
    { label: 'Order Placed', status: OrderStatus.PENDING },
    { label: 'Processing', status: OrderStatus.PROCESSING },
    { label: 'Shipped', status: OrderStatus.SHIPPED },
    { label: 'Delivered', status: OrderStatus.DELIVERED },
  ];

  return (
    <div className="w-full mt-4 mb-6">
      <Progress value={getProgressValue()} className="h-3 mb-4" />
      <div className="flex justify-between">
        {progressSteps.map((step, index) => (
          <div key={index} className="text-center flex-1">
            <div className="text-xs text-gray-600">{step.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Component for displaying order status as a badge
 */
const OrderStatusBadge = ({ status }: { status: OrderStatus }): JSX.Element => {
  const getStatusVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'secondary';
      case OrderStatus.PAID:
        return 'default';
      case OrderStatus.PROCESSING:
        return 'default';
      case OrderStatus.SHIPPED:
        return 'default';
      case OrderStatus.DELIVERED:
        return 'default';
      case OrderStatus.CANCELLED:
      case OrderStatus.FAILED:
        return 'destructive';
      case OrderStatus.REFUNDED:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Badge variant={getStatusVariant(status)} className="font-semibold">
      {status}
    </Badge>
  );
};

/**
 * Format an address object into a readable string
 */
const formatAddress = (address: {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}): string => {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postal_code,
    address.country
  ].filter(Boolean);

  return parts.join(', ');
};

/**
 * OrderTracking component for displaying order details and status
 */
export const OrderTracking = ({
  orderService,
  orderId,
  orderNumber,
  customerPhone,
  customerId,
  tenantId,
  onOrderLoaded
}: OrderTrackingProps): JSX.Element => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let fetchedOrder: Order | undefined;

      if (orderId) {
        const result = await orderService.getOrderById(orderId, tenantId);
        if (result.success && result.data) {
          fetchedOrder = result.data;
        } else if (result.error) {
          throw result.error;
        }
      } else if (orderNumber) {
        // We don't have getOrderByOrderNumber in the interface, but we can try a search
        try {
          const ordersResult = await orderService.getOrders({
            tenantId,
            search: orderNumber,
            limit: 1
          });

          if (ordersResult.success && ordersResult.data && ordersResult.data.items.length > 0) {
            fetchedOrder = ordersResult.data.items[0];
          }
        } catch (err) {
          throw new Error(`Failed to find order by number: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (customerPhone) {
        // We need to handle possibly multiple orders here
        const result = await orderService.getOrdersByPhone(customerPhone, tenantId);
        if (result.success && result.data && result.data.length > 0) {
          // Get the latest order by comparing timestamps
          fetchedOrder = [...result.data].sort((a: Order, b: Order) => {
            const aTime = a.timeline?.[0]?.timestamp || '';
            const bTime = b.timeline?.[0]?.timestamp || '';
            return bTime.localeCompare(aTime); // descending order
          })[0];
        }
      } else if (customerId) {
        // We need to handle possibly multiple orders here
        const result = await orderService.getOrdersByCustomerId(customerId, tenantId);
        if (result.success && result.data && result.data.length > 0) {
          // Get the latest order
          fetchedOrder = [...result.data].sort((a: Order, b: Order) => {
            const aTime = a.timeline?.[0]?.timestamp || '';
            const bTime = b.timeline?.[0]?.timestamp || '';
            return bTime.localeCompare(aTime); // descending order
          })[0];
        }
      }

      if (fetchedOrder) {
        setOrder(fetchedOrder);
        if (onOrderLoaded) {
          onOrderLoaded(fetchedOrder);
        }
      } else {
        setError('Order not found');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderService, orderId, orderNumber, customerPhone, customerId, tenantId, onOrderLoaded]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleRefresh = () => {
    fetchOrder();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading order details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No order found</h3>
          <p className="text-gray-500">Please check your order details and try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Order #{order.order_number}</span>
            </CardTitle>
            <OrderStatusBadge status={order.status} />
          </div>
        </CardHeader>
        <CardContent>
          <OrderProgressBar status={order.status} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date:</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">
                    {order.total_amount.currency} {order.total_amount.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <Badge variant={order.payment.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {order.payment.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span>{order.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span>{order.customer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span>{order.customer.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Information */}
      {order.shipping.address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Shipping Address</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{formatAddress(order.shipping.address)}</p>
            {order.shipping.tracking_number && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Tracking Number: {order.shipping.tracking_number}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium">{item.product_name}</h5>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity} × {item.unit_price.currency} {item.unit_price.amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {item.total_price.currency} {item.total_price.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                {index < order.items.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order Timeline */}
      {order.timeline && order.timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Order Timeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.timeline
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((event, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.status}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.notes && (
                        <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={handleRefresh} variant="outline" className="flex items-center space-x-2">
          <Package className="h-4 w-4" />
          <span>Refresh Order Status</span>
        </Button>
      </div>
    </div>
  );
};

export default OrderTracking;
