'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, formatPhoneNumber } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '@/components/ui/Card';
import {
  ArrowLeft,
  Package,
  Truck,
  X,
  Clock,
  MessageSquare,
  Printer,
  RefreshCw,
  AlertTriangle,
  MapPin,
  Calendar,
  Send,
  Check,
  User,
  Phone,
} from 'lucide-react';

// Define types
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  id: string;
  date: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  notes: string;
  paymentMethod: string;
  source: 'web' | 'whatsapp' | 'in-store';
}

export default function OrderPage() {
  const router = useRouter();
  const params = useParams() as Record<string, string>;
  const id = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [processingMode, setProcessingMode] = useState<'auto' | 'manual'>('auto');

  // Mock data for the demo
  useEffect(() => {
    const mockOrder = {
      id: id as string,
      date: '2023-08-15T14:30:00Z',
      customer: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1234567890',
        address: '123 Main St, Anytown, CA 12345',
      },
      items: [
        {
          id: '1',
          name: 'Premium T-Shirt',
          price: 29.99,
          quantity: 2,
          image: 'https://source.unsplash.com/random/100x100?tshirt',
        },
        {
          id: '2',
          name: 'Denim Jeans',
          price: 59.99,
          quantity: 1,
          image: 'https://source.unsplash.com/random/100x100?jeans',
        },
      ],
      total: 119.97,
      status: 'processing' as OrderStatus,
      notes: 'Please leave at the front door',
      paymentMethod: 'Credit Card',
      source: 'whatsapp' as const,
    };

    // Simulate API call
    setTimeout(() => {
      setOrder(mockOrder);
      setStatus(mockOrder.status);
      setLoading(false);
    }, 1000);
  }, [id]);

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus(newStatus);
      setUpdated(true);
      setTimeout(() => setUpdated(false), 3000);
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const messageCustomer = () => {
    alert(`Sending message to ${order?.customer.name} at ${order?.customer.phone}`);
  };

  const statusIcons = {
    pending: <Clock className="h-4 w-4" />,
    processing: <Package className="h-4 w-4" />,
    shipped: <Truck className="h-4 w-4" />,
    delivered: <Check className="h-4 w-4" />,
    cancelled: <X className="h-4 w-4" />,
  };

  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
        <p>Loading order information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-100 p-4 rounded-md mb-4 flex items-center">
          <AlertTriangle className="text-red-500 mr-2" />
          <span>Failed to load order information.</span>
        </div>
        <Button onClick={() => router.push('/dashboard/orders')} className="mt-4">
          Retry
        </Button>
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
            Order {order?.id}
            <Badge className={`ml-3 ${statusStyles[order?.status || 'pending']}`}>
              <span className="flex items-center">
                {statusIcons[order?.status || 'pending']}
                <span className="ml-1 capitalize">{order?.status}</span>
              </span>
            </Badge>
          </h1>
          <p className="text-gray-500 flex items-center mt-1">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(order?.date || '')}
            <span className="mx-2">•</span>
            <Badge className="badge-outline">
              {order?.source === 'whatsapp'
                ? 'WhatsApp Order'
                : order?.source === 'web'
                  ? 'Web Order'
                  : 'In-store Order'}
            </Badge>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
          <Button onClick={messageCustomer} className="flex items-center">
            <MessageSquare className="mr-2 h-4 w-4" />
            Message Customer
          </Button>
          <Button className="flex items-center">
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
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
                Current status: <span className="font-medium capitalize">{order?.status}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        order?.status === 'cancelled'
                          ? 'bg-red-500'
                          : order?.status === 'pending'
                            ? 'bg-yellow-500 w-1/4'
                            : order?.status === 'processing'
                              ? 'bg-blue-500 w-2/4'
                              : order?.status === 'shipped'
                                ? 'bg-purple-500 w-3/4'
                                : 'bg-green-500 w-full'
                      }`}
                    ></div>
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
                <div className="flex flex-wrap gap-2">
                  {order?.status !== 'pending' && order?.status !== 'cancelled' && (
                    <Button
                      onClick={() => updateOrderStatus('pending')}
                      disabled={updating}
                      className="flex items-center btn-sm btn-outline"
                    >
                      <Clock className="mr-1 h-4 w-4" />
                      Mark as Pending
                    </Button>
                  )}

                  {order?.status !== 'processing' && order?.status !== 'cancelled' && (
                    <Button
                      onClick={() => updateOrderStatus('processing')}
                      disabled={updating}
                      className="flex items-center btn-sm btn-outline"
                    >
                      <Package className="mr-1 h-4 w-4" />
                      Mark as Processing
                    </Button>
                  )}

                  {order?.status !== 'shipped' && order?.status !== 'cancelled' && (
                    <Button
                      onClick={() => updateOrderStatus('shipped')}
                      disabled={updating}
                      className="flex items-center btn-sm btn-outline"
                    >
                      <Truck className="mr-1 h-4 w-4" />
                      Mark as Shipped
                    </Button>
                  )}

                  {order?.status !== 'delivered' && order?.status !== 'cancelled' && (
                    <Button
                      onClick={() => updateOrderStatus('delivered')}
                      disabled={updating}
                      className="flex items-center btn-sm btn-outline"
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Mark as Delivered
                    </Button>
                  )}

                  {order?.status !== 'cancelled' && (
                    <Button
                      onClick={() => updateOrderStatus('cancelled')}
                      disabled={updating}
                      className="flex items-center btn-sm btn-destructive"
                    >
                      <X className="mr-1 h-4 w-4" />
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
                {order?.items.length} items, Total: {formatCurrency(order?.total || 0)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order?.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded overflow-hidden bg-gray-100">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(item.price)} x {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="font-medium">{formatCurrency(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="w-full space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order?.total || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t mt-2">
                  <span>Total</span>
                  <span>{formatCurrency(order?.total || 0)}</span>
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
                  <p className="font-medium">{order?.customer.name}</p>
                  <p className="text-sm text-gray-500">{order?.customer.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 rounded-full p-2">
                  <Phone className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm">{formatPhoneNumber(order?.customer.phone || '')}</p>
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
                  <p className="whitespace-pre-line">{order?.customer.address}</p>
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
                <span>{order?.paymentMethod}</span>
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
