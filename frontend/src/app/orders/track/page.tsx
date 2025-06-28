'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { OrderTracking } from '@/modules/order/components/OrderTracking';
import type { Order } from '@/modules/order/models/order';
import { HttpOrderService } from '@/modules/order/services/OrderService';
import { useTenant } from '@/contexts/TenantContext';

// Define gtag for analytics tracking
declare global {
  interface Window {
    gtag?: (command: string, action: string, params: object) => void;
  }
}

const orderTrackingSchema = z
  .object({
    trackingType: z.enum(['orderNumber', 'phone']),
    orderNumber: z
      .string()
      .optional()
      .refine((val: string | undefined) => val === undefined || val.trim().length > 0, {
        message: 'Order number is required when selected',
      }),
    phone: z
      .string()
      .optional()
      .refine((val: string | undefined) => val === undefined || val.trim().length > 0, {
        message: 'Phone number is required when selected',
      }),
  })
  .refine(
    (data: { trackingType: 'phone' | 'orderNumber'; orderNumber?: string | undefined; phone?: string | undefined }) => {
      if (data.trackingType === 'orderNumber') {
        return !!data.orderNumber;
      } else if (data.trackingType === 'phone') {
        return !!data.phone;
      }
      return true;
    },
    {
      message: 'Please provide the required information for your selected tracking method',
      path: ['trackingType'],
    },
  );

type OrderTrackingFormValues = z.infer<typeof orderTrackingSchema>;

function OrderTrackingPageInner() {
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);

  // Extract query parameters
  const orderNumber = searchParams?.get('orderNumber') || '';
  const phone = searchParams?.get('phone') || '';

  // Form initialization
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<OrderTrackingFormValues>({
    resolver: zodResolver(orderTrackingSchema),
    defaultValues: {
      trackingType: orderNumber ? 'orderNumber' : 'phone',
      orderNumber: orderNumber || '',
      phone: phone || '',
    },
  });

  const trackingType = watch('trackingType');

  const onSubmit = (data: OrderTrackingFormValues) => {
    // Update URL with search params for shareable links
    const params = new URLSearchParams();

    if (data.trackingType === 'orderNumber' && data.orderNumber) {
      params.set('orderNumber', data.orderNumber);
    } else if (data.trackingType === 'phone' && data.phone) {
      params.set('phone', data.phone);
    }

    router.push(`/orders/track?${params.toString()}`);
  };

  const handleOrderLoaded = (order: Order) => {
    setFoundOrder(order);

    // Track analytics event for order tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'track_order', {
        order_id: order.id,
        order_number: order.order_number,
      });
    }
  };

  if (isTenantLoading || !tenant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Track Your Order</h1>

      {!foundOrder && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <p className="text-gray-600 mb-6">
            Enter your order details below to track your package or check your order status.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="orderNumber"
                    className="form-radio"
                    {...register('trackingType')}
                  />
                  <span className="ml-2">Track by Order Number</span>
                </label>

                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="phone"
                    className="form-radio"
                    {...register('trackingType')}
                  />
                  <span className="ml-2">Track by Phone Number</span>
                </label>
              </div>

              {errors.trackingType && (
                <p className="text-red-500 text-sm">{errors.trackingType.message}</p>
              )}
            </div>

            {trackingType === 'orderNumber' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Order Number</label>
                <input
                  type="text"
                  className="w-full p-3 border rounded"
                  placeholder="e.g. ORD-20250603-1234"
                  {...register('orderNumber')}
                />
                {errors.orderNumber && (
                  <p className="text-red-500 text-sm">{errors.orderNumber.message}</p>
                )}
              </div>
            )}

            {trackingType === 'phone' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Phone Number</label>
                <input
                  type="tel"
                  className="w-full p-3 border rounded"
                  placeholder="+254..."
                  {...register('phone')}
                />
                {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
                <p className="text-gray-500 text-sm">
                  We'll find your most recent order associated with this phone number.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition"
            >
              Track Order
            </button>
          </form>
        </div>
      )}

      {/* Show order tracking component with appropriate parameters */}
      <OrderTracking
        orderNumber={orderNumber || undefined}
        customerPhone={phone || undefined}
        onOrderLoaded={handleOrderLoaded}
        orderService={new HttpOrderService()}
        tenantId={tenant.id}
      />

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Need Help?</h2>
        <p className="text-gray-700 mb-4">
          You can also track your order by sending a WhatsApp message to our customer service with
          your order number or simply asking "Where is my order?"
        </p>
        <a
          href="https://wa.me/254700000000?text=Track%20my%20order"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Chat on WhatsApp
        </a>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderTrackingPageInner />
    </Suspense>
  );
}
