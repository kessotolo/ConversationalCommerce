'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  LinearProgress,
  Button
} from '@mui/material';
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

  return (
    <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
      <LinearProgress 
        variant="determinate" 
        value={getProgressValue()} 
        sx={{ height: 10, borderRadius: 5 }} 
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption">Order Placed</Typography>
        <Typography variant="caption">Processing</Typography>
        <Typography variant="caption">Shipped</Typography>
        <Typography variant="caption">Delivered</Typography>
      </Box>
    </Box>
  );
};

/**
 * Component for displaying order status as a chip
 */
const OrderStatusChip = ({ status }: { status: OrderStatus }): JSX.Element => {
  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PENDING:
        return '#FFA726'; // Orange
      case OrderStatus.PAID:
        return '#42A5F5'; // Blue
      case OrderStatus.PROCESSING:
        return '#AB47BC'; // Purple
      case OrderStatus.SHIPPED:
        return '#66BB6A'; // Green
      case OrderStatus.DELIVERED:
        return '#2E7D32'; // Dark Green
      case OrderStatus.CANCELLED:
        return '#EF5350'; // Red
      case OrderStatus.REFUNDED:
        return '#EC407A'; // Pink
      case OrderStatus.FAILED:
        return '#D32F2F'; // Dark Red
      default:
        return '#9E9E9E'; // Gray
    }
  };
  
  return (
    <Chip 
      label={status} 
      sx={{ 
        backgroundColor: getStatusColor(status),
        color: 'white',
        fontWeight: 'bold'
      }} 
    />
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
      setError('Error loading order: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, [orderId, orderNumber, customerPhone, customerId, orderService, tenantId, onOrderLoaded]);

  useEffect(() => {
    if (orderId || orderNumber || customerPhone || customerId) {
      fetchOrder();
    } else {
      setError('No order identifier provided. Please provide an order ID, order number, customer phone, or customer ID.');
      setLoading(false);
    }
  }, [orderId, orderNumber, customerPhone, customerId, fetchOrder]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">{error}</Alert>
    );
  }

  if (!order) {
    return (
      <Alert severity="info">No order information available.</Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">Order #{order.order_number}</Typography>
            <OrderStatusChip status={order.status} />
          </Box>
          
          {(order.status === OrderStatus.PENDING || 
            order.status === OrderStatus.PAID || 
            order.status === OrderStatus.PROCESSING || 
            order.status === OrderStatus.SHIPPED || 
            order.status === OrderStatus.DELIVERED) && (
            <OrderProgressBar status={order.status} />
          )}
          
          <Divider />
          
          <Typography variant="h6">Order Items</Typography>
          <Stack spacing={1}>
            {order.items.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body1">
                    {item.product_name} {item.variant_name ? `(${item.variant_name})` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Qty: {item.quantity}
                  </Typography>
                </Box>
                <Typography variant="body1">
                  {item.total_price.currency} {item.total_price.amount.toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Stack>
          
          <Divider />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1">Subtotal:</Typography>
            <Typography variant="body1">
              {order.subtotal.currency} {order.subtotal.amount.toFixed(2)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1">Tax:</Typography>
            <Typography variant="body1">
              {order.tax.currency} {order.tax.amount.toFixed(2)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1">Shipping:</Typography>
            <Typography variant="body1">
              {order.shipping.shipping_cost.currency} {order.shipping.shipping_cost.amount.toFixed(2)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1" fontWeight="bold">Total:</Typography>
            <Typography variant="body1" fontWeight="bold">
              {order.total_amount.currency} {order.total_amount.amount.toFixed(2)}
            </Typography>
          </Box>
          
          <Divider />
          
          <Typography variant="h6">Shipping Information</Typography>
          <Box>
            <Typography variant="body2">
              <strong>Address:</strong> {formatAddress(order.shipping.address)}
            </Typography>
            <Typography variant="body2">
              <strong>Method:</strong> {typeof order.shipping.method === 'string' 
                ? order.shipping.method 
                : 'Shipping' // Fallback if method is not a string
              }
            </Typography>
            {order.shipping.tracking_number && (
              <Typography variant="body2">
                <strong>Tracking:</strong> {order.shipping.tracking_number}
              </Typography>
            )}
            {order.shipping.estimated_delivery && (
              <Typography variant="body2">
                <strong>Estimated Delivery:</strong> {order.shipping.estimated_delivery}
              </Typography>
            )}
          </Box>
          
          <Divider />
          
          <Typography variant="h6">Payment Information</Typography>
          <Box>
            <Typography variant="body2">
              <strong>Method:</strong> {order.payment.method}
            </Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {order.payment.status}
            </Typography>
            {order.payment.transaction_id && (
              <Typography variant="body2">
                <strong>Transaction ID:</strong> {order.payment.transaction_id}
              </Typography>
            )}
            {order.payment.provider && (
              <Typography variant="body2">
                <strong>Provider:</strong> {order.payment.provider}
              </Typography>
            )}
            {order.payment.payment_date && (
              <Typography variant="body2">
                <strong>Date:</strong> {order.payment.payment_date}
              </Typography>
            )}
          </Box>
          
          <Divider />
          
          <Typography variant="h6">Customer Information</Typography>
          <Box>
            <Typography variant="body2">
              <strong>Name:</strong> {order.customer.name}
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {order.customer.email}
            </Typography>
            <Typography variant="body2">
              <strong>Phone:</strong> {order.customer.phone}
            </Typography>
          </Box>
          
          {order.notes && (
            <>
              <Divider />
              <Typography variant="h6">Notes</Typography>
              <Typography variant="body2">{order.notes}</Typography>
            </>
          )}

          {/* Timeline section */}
          {order.timeline && order.timeline.length > 0 && (
            <>
              <Divider />
              <Typography variant="h6">Order Timeline</Typography>
              <Stack spacing={2}>
                {order.timeline.map((event) => (
                  <Box key={event.id} sx={{ display: 'flex', gap: 2 }}>
                    <Box 
                      sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main', 
                        mt: 1 
                      }} 
                    />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {event.status}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.timestamp).toLocaleString()}
                      </Typography>
                      {event.note && (
                        <Typography variant="body2">{event.note}</Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </>
          )}

          {/* Actions */}
          {order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.REFUNDED && (
            <>
              <Divider />
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button 
                  variant="outlined"
                  onClick={() => window.print()}
                >
                  Print Receipt
                </Button>

                {order.status === OrderStatus.PENDING && (
                  <Button 
                    variant="outlined" 
                    color="error"
                  >
                    Cancel Order
                  </Button>
                )}

                <Button 
                  variant="contained"
                >
                  Contact Support
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default OrderTracking;
