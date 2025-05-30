import * as React from 'react';
'use client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// React is automatically imported by Next.js
import { Settings, AlertTriangle, ArrowLeft, Calendar, Check, Clock, DollarSign, MapPin, MessageSquare, Package, Phone, Printer, RefreshCw, Send, Truck, User, X } from 'lucide-react';
import { Order } from '@/types/order';
import { useParams, useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, formatPhoneNumber } from '@/lib/utils';

// Define types
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  imageUrl: string;
}

interface Customer {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
}

interface Order {
  id: string;
  customer: Customer;
  items: OrderItem[];
  total: number;
  subtotal: number;
  deliveryFee: number;
  status: OrderStatus;
  date: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  notes?: string;
  source: 'whatsapp' | 'web' | 'in-store';
  autoProcessed: boolean;
  autoNotifications: boolean;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
}

// Mock order data
const mockOrderData: Order = {
  id: 'ORD-001',
  customer: {
    name: 'John Doe',
    phone: '+2341234567890',
    address: '123 Main Street',
    city: 'Lagos',
    postalCode: '100001'
  },
  items: [
    {
      id: '1',
      productName: 'Organic Bananas',
      quantity: 2,
      price: 1.99,
      total: 3.98,
      imageUrl: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=500&auto=format'
    },
    {
      id: '2',
      productName: 'Premium Coffee Beans',
      quantity: 1,
      price: 12.99,
      total: 12.99,
      imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=500&auto=format'
    }
  ],
  subtotal: 16.97,
  deliveryFee: 3.50,
  total: 20.47,
  status: 'processing',
  date: '2025-05-25T10:30:00',
  paymentMethod: 'Cash on Delivery',
  paymentStatus: 'pending',
  notes: 'Please call when arriving',
  source: 'whatsapp',
  autoProcessed: true,
  autoNotifications: true,
  statusHistory: [
    {
      status: 'pending',
      timestamp: '2025-05-25T10:30:00',
      note: 'Order received'
    },
    {
      status: 'processing',
      timestamp: '2025-05-25T10:45:00',
      note: 'Payment confirmed, processing order'
    }
  ]
};

// Status badge styles
const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

// Status icons
const statusIcons = {
  pending: <Clock className="h-5 w-5" />,
  processing: <RefreshCw className="h-5 w-5" />,
  shipped: <Truck className="h-5 w-5" />,
  delivered: <Check className="h-5 w-5" />,
  cancelled: <X className="h-5 w-5" />
};

// Payment status badges
const paymentStatusStyles = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  failed: 'bg-red-100 text-red-800 border-red-200'
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<'auto' | 'manual'>('auto');
  
  useEffect(() => {
    // In a real app, this would fetch the order data from an API
    const fetchOrder = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setOrder(mockOrderData);
      } catch (err) {
        setError('Failed to load order details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch if we have a valid ID
    if (params?.id) {
      fetchOrder();
    }
  }, [params?.id]);

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    
    setUpdating(true);
    
    try {
      // In a real app, this would call an API to update the order status
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      const now = new Date().toISOString();
      const updatedOrder = {
        ...order,
        status: newStatus,
        statusHistory: [
          ...order.statusHistory,
          {
            status: newStatus,
            timestamp: now,
            note: `Status updated to ${newStatus}`
          }
        ]
      };
      
      setOrder(updatedOrder);
      
      // If auto-notifications are enabled, send customer notification
      if (updatedOrder.autoNotifications) {
        await sendCustomerNotification(newStatus);
      }
      
    } catch (err) {
      setError('Failed to update order status');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const sendCustomerNotification = async (status: OrderStatus) => {
    // In a real app, this would call the Twilio API to send WhatsApp message
    console.log(`Sending ${status} notification to customer via WhatsApp`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  };
  
  const toggleAutomation = (type: 'processing' | 'notifications') => {
    if (!order) return;
    
    if (type === 'processing') {
      setOrder({
        ...order,
        autoProcessed: !order.autoProcessed
      });
    } else {
      setOrder({
        ...order,
        autoNotifications: !order.autoNotifications
      });
    }
  };
  
  const messageCustomer = () => {
    if (!order) return;
    
    // In a real app, this would open the Twilio conversation or initiate a WhatsApp chat
    window.open(`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, '')}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/orders" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Failed to load order</h2>
            <p className="text-gray-500 mb-4">{error || 'Order not found'}</p>
            <Button onClick={() => router.push('/dashboard/orders')}>
              Return to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <Link href="/dashboard/orders" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
            <h1 className="text-2xl font-bold flex items-center">
              Order {order.id}
              <Badge className={`ml-3 ${statusStyles[order.status]}`}>
                <span className="flex items-center">
                  {statusIcons[order.status]}
                  <span className="ml-1 capitalize">{order.status}</span>
                </span>
              </Badge>
            </h1>
            <p className="text-gray-500 flex items-center mt-1">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(order.date)}
              <span className="mx-2">•</span>
              <Badge variant="outline">
                {order.source === 'whatsapp' ? 'WhatsApp Order' : order.source === 'web' ? 'Web Order' : 'In-store Order'}
              </Badge>
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
            <Button onClick={messageCustomer} variant="outline" className="flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message Customer
            </Button>
            <Button variant="outline" className="flex items-center">
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
                  Current status: <span className="font-medium capitalize">{order.status}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                      <div 
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          order.status === 'cancelled' 
                            ? 'bg-red-500' 
                            : order.status === 'pending' 
                              ? 'bg-yellow-500 w-1/4' 
                              : order.status === 'processing' 
                                ? 'bg-blue-500 w-2/4' 
                                : order.status === 'shipped' 
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
                    {order.status !== 'pending' && order.status !== 'cancelled' && (
                      <Button 
                        onClick={() => updateOrderStatus('pending')} 
                        size="sm" 
                        variant="outline"
                        disabled={updating}
                        className="flex items-center"
                      >
                        <Clock className="mr-1 h-4 w-4" />
                        Mark as Pending
                      </Button>
                    )}
                    
                    {order.status !== 'processing' && order.status !== 'cancelled' && (
                      <Button 
                        onClick={() => updateOrderStatus('processing')} 
                        size="sm" 
                        variant="outline"
                        disabled={updating}
                        className="flex items-center"
                      >
                        <Package className="mr-1 h-4 w-4" />
                        Mark as Processing
                      </Button>
                    )}
                    
                    {order.status !== 'shipped' && order.status !== 'cancelled' && (
                      <Button 
                        onClick={() => updateOrderStatus('shipped')} 
                        size="sm" 
                        variant="outline"
                        disabled={updating}
                        className="flex items-center"
                      >
                        <Truck className="mr-1 h-4 w-4" />
                        Mark as Shipped
                      </Button>
                    )}
                    
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button 
                        onClick={() => updateOrderStatus('delivered')} 
                        size="sm" 
                        variant={order.status === 'shipped' ? 'default' : 'outline'}
                        disabled={updating}
                        className="flex items-center"
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Mark as Delivered
                      </Button>
                    )}
                    
                    {order.status !== 'cancelled' && (
                      <Button 
                        onClick={() => updateOrderStatus('cancelled')} 
                        size="sm" 
                        variant="destructive"
                        disabled={updating}
                        className="flex items-center"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Payment Status: 
                  <Badge className={`ml-2 ${paymentStatusStyles[order.paymentStatus]}`}>
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500">
                  Via: {order.paymentMethod}
                </div>
              </CardFooter>
            </Card>
            
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>
                  {order.items.length} items, total {formatCurrency(order.total)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center pb-4 border-b last:border-0 last:pb-0">
                      <div className="h-16 w-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                        <img 
                          src={item.imageUrl} 
                          alt={item.productName} 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                      <div className="ml-4 flex-grow">
                        <h4 className="font-medium">{item.productName}</h4>
                        <div className="flex justify-between mt-1">
                          <div className="text-sm text-gray-500">
                            {item.quantity} × {formatCurrency(item.price)}
                          </div>
                          <div className="font-medium">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="w-full">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Delivery Fee</span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-medium text-lg border-t mt-2 pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </CardFooter>
            </Card>
            
            {/* Order History */}
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>
                  Status updates and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 border-l-2 border-gray-200 space-y-6">
                  {order.statusHistory.map((event, index) => (
                    <div key={index} className="relative pb-6 last:pb-0">
                      <div className="absolute -left-7 top-0 bg-white p-1 rounded-full border-2 border-gray-200">
                        {statusIcons[event.status]}
                      </div>
                      <div className="ml-4">
                        <p className="font-medium capitalize">{event.status}</p>
                        <p className="text-sm text-gray-500">{formatDate(event.timestamp)}</p>
                        {event.note && <p className="text-sm mt-1">{event.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <User className="text-gray-400 h-5 w-5 mr-2" />
                  <div>
                    <p className="font-medium">{order.customer.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="text-gray-400 h-5 w-5 mr-2" />
                  <div>
                    <p>{formatPhoneNumber(order.customer.phone)}</p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto text-primary" 
                      onClick={messageCustomer}
                    >
                      Message on WhatsApp
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="text-gray-400 h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <p>{order.customer.address}</p>
                    <p>{order.customer.city} {order.customer.postalCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Order Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{order.notes}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Automation Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Order Processing</CardTitle>
                <CardDescription>
                  Configure automatic order handling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-process orders</p>
                    <p className="text-sm text-gray-500">Automatically update order status</p>
                  </div>
                  <div className="relative inline-block w-12 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id="auto-process" 
                      checked={order.autoProcessed}
                      onChange={() => toggleAutomation('processing')}
                      className="opacity-0 absolute h-0 w-0"
                    />
                    <label 
                      htmlFor="auto-process" 
                      className={`block overflow-hidden h-6 rounded-full cursor-pointer ${order.autoProcessed ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${order.autoProcessed ? 'translate-x-6' : 'translate-x-0'}`}
                      ></span>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-notifications</p>
                    <p className="text-sm text-gray-500">Send WhatsApp status updates</p>
                  </div>
                  <div className="relative inline-block w-12 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id="auto-notify" 
                      checked={order.autoNotifications}
                      onChange={() => toggleAutomation('notifications')}
                      className="opacity-0 absolute h-0 w-0"
                    />
                    <label 
                      htmlFor="auto-notify" 
                      className={`block overflow-hidden h-6 rounded-full cursor-pointer ${order.autoNotifications ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${order.autoNotifications ? 'translate-x-6' : 'translate-x-0'}`}
                      ></span>
                    </label>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 text-sm text-gray-500">
                <p>Processing mode: {processingMode === 'auto' ? 'Automatic' : 'Manual'}</p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }
