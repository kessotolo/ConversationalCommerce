import React from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ExternalLink, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';

interface Order {
  id: string;
  customerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  phone?: string;
}

interface RecentOrdersProps {
  orders: Order[];
  isLoading?: boolean;
}

export function RecentOrders({ orders, isLoading = false }: RecentOrdersProps) {
  const statusMap = {
    pending: { label: 'Pending', variant: 'pending' },
    processing: { label: 'Processing', variant: 'processing' },
    shipped: { label: 'Shipped', variant: 'shipped' },
    delivered: { label: 'Delivered', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
  } as const;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No recent orders</p>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b last:border-b-0 last:pb-0">
                <div className="mb-2 sm:mb-0">
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(order.date)} • {formatCurrency(order.amount)}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Badge variant={statusMap[order.status].variant as any}>
                    {statusMap[order.status].label}
                  </Badge>
                  <div className="flex gap-2">
                    {order.phone && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        aria-label="Contact on WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      aria-label="View order"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
