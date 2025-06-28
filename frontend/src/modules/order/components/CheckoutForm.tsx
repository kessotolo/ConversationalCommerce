'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateOrder } from '@/modules/order/hooks/useCreateOrder';
import type { CreateOrderRequest } from '@/modules/order/validation/orderSchema';
import { OrderSource, PaymentMethod, ShippingMethod } from '@/modules/order/models/order';
import { getAddresses } from '@/lib/api/addressBook';

// Define checkout form schema using Zod
const checkoutFormSchema = z.object({
  // Customer information
  customerName: z.string().min(2, 'Name is required'),
  customerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  customerPhone: z.string().min(10, 'Valid phone number is required'),

  // Shipping information
  shippingStreet: z.string().min(3, 'Street address is required'),
  shippingCity: z.string().min(2, 'City is required'),
  shippingState: z.string().min(2, 'State/Province is required'),
  shippingPostalCode: z.string().optional(),
  shippingCountry: z.string().min(2, 'Country is required'),
  shippingNotes: z.string().optional(),

  // Payment information
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentPhoneNumber: z.string().optional(),

  // Order notes
  orderNotes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

// Define CartItem interface for type safety
interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variantId?: string;
  variantName?: string;
  imageUrl?: string;
}

interface SavedAddress {
  id: string;
  street: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  apartment?: string;
  landmark?: string;
  coordinates?: { latitude: number; longitude: number };
  is_default: boolean;
}

interface CheckoutFormProps {
  /**
   * List of products in the cart
   */
  cartItems: CartItem[];
  /**
   * Shipping cost
   */
  shippingCost: { amount: number; currency: string };
  /**
   * Tax amount
   */
  taxAmount: { amount: number; currency: string };
  /**
   * Total amount
   */
  totalAmount: { amount: number; currency: string };
  /**
   * Function called after successful checkout
   */
  onCheckoutSuccess?: (orderId: string, orderNumber: string) => void;
}

/**
 * Checkout form component for web UI
 * Uses our domain models and services
 */
export function CheckoutForm({
  cartItems,
  shippingCost,
  taxAmount,
  totalAmount,
  onCheckoutSuccess,
}: CheckoutFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createOrder, order, isLoading, error, isSuccess } = useCreateOrder();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      paymentMethod: PaymentMethod.MOBILE_MONEY,
      shippingCountry: 'Kenya',
    },
  });

  const paymentMethod = watch('paymentMethod');
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | string>(
    ShippingMethod.RIDER,
  );
  const [pluginProvider, setPluginProvider] = useState<string>('');
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  useEffect(() => {
    // Fetch available shipping providers from the backend
    fetch('/api/v1/shipping/providers')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.providers)) {
          // No need to update availableProviders as it's not used in the new code
        }
      })
      .catch(() => {
        // No need to update availableProviders as it's not used in the new code
      });
  }, []);

  useEffect(() => {
    getAddresses()
      .then((data) => {
        setAddresses(data);
        const def = data.find((a) => a.is_default);
        if (def) {
          setSelectedAddressId(def.id);
          setValue('shippingStreet', def.street);
          setValue('shippingCity', def.city);
          setValue('shippingState', def.state || '');
          setValue('shippingPostalCode', def.postal_code || '');
          setValue('shippingCountry', def.country);
        }
      })
      .catch(() => {
        // ignore address load errors
      });
  }, [setValue]);

  function handleSelectAddress(id: string) {
    setSelectedAddressId(id);
    const addr = addresses.find((a) => a.id === id);
    if (addr) {
      setValue('shippingStreet', addr.street);
      setValue('shippingCity', addr.city);
      setValue('shippingState', addr.state || '');
      setValue('shippingPostalCode', addr.postal_code || '');
      setValue('shippingCountry', addr.country);
    }
  }

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);
    try {
      // Map form data to CreateOrderRequest
      const orderRequest: CreateOrderRequest = {
        customer: {
          name: data.customerName,
          email: data.customerEmail || undefined,
          phone: data.customerPhone,
          is_guest: true, // Assuming guest checkout
        },
        items: cartItems.map((item) => ({
          id: item.id, // Required by schema
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: {
            amount: item.price,
            currency: totalAmount.currency,
          },
          total_price: {
            amount: item.price * item.quantity,
            currency: totalAmount.currency,
          },
          variant_id: item.variantId,
          variant_name: item.variantName,
          image_url: item.imageUrl,
        })),
        shipping: {
          address: {
            street: data.shippingStreet,
            city: data.shippingCity,
            state: data.shippingState,
            postalCode: data.shippingPostalCode,
            country: data.shippingCountry,
            apartment: undefined,
            landmark: undefined,
            coordinates: undefined,
          },
          method: shippingMethod,
          pluginMeta:
            shippingMethod === 'other' && pluginProvider ? { provider: pluginProvider } : undefined,
          shipping_cost: shippingCost,
          notes: data.shippingNotes,
          tracking_number: undefined,
          estimated_delivery: undefined,
        },
        payment: {
          method: data.paymentMethod,
          // Only method is required for creation; other fields are filled by payment service
        },
        source: OrderSource.WEBSITE,
        notes: data.orderNotes,
        metadata: {},
        idempotency_key: crypto.randomUUID(), // Generate unique key for idempotency
        channel: 'web', // Add channel metadata for API consistency
      };
      // Create order via service
      const result = await createOrder(orderRequest);
      if (result && onCheckoutSuccess) {
        onCheckoutSuccess(result.id, result.order_number);
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Checkout</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error.message || 'An error occurred during checkout'}
        </div>
      )}
      {isSuccess && order && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          Order #{order.order_number} created successfully!
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Customer Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <Controller
                name="customerName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full p-2 border rounded"
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.customerName && (
                <p className="text-red-500 text-xs mt-1">{errors.customerName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Controller
                name="customerEmail"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="email"
                    className="w-full p-2 border rounded"
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.customerEmail && (
                <p className="text-red-500 text-xs mt-1">{errors.customerEmail.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone Number *</label>
              <Controller
                name="customerPhone"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="tel"
                    className="w-full p-2 border rounded"
                    placeholder="+254..."
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.customerPhone && (
                <p className="text-red-500 text-xs mt-1">{errors.customerPhone.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Shipping Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Shipping Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Saved Addresses</label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedAddressId}
                  onChange={(e) => handleSelectAddress(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select saved address</option>
                  {addresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.street}, {addr.city}, {addr.country}
                      {addr.is_default ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Street Address *</label>
              <Controller
                name="shippingStreet"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full p-2 border rounded"
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.shippingStreet && (
                <p className="text-red-500 text-xs mt-1">{errors.shippingStreet.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <Controller
                name="shippingCity"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full p-2 border rounded"
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.shippingCity && (
                <p className="text-red-500 text-xs mt-1">{errors.shippingCity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">State/Province *</label>
              <Controller
                name="shippingState"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full p-2 border rounded"
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.shippingState && (
                <p className="text-red-500 text-xs mt-1">{errors.shippingState.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Postal Code</label>
              <Controller
                name="shippingPostalCode"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full p-2 border rounded"
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.shippingPostalCode && (
                <p className="text-red-500 text-xs mt-1">{errors.shippingPostalCode.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <Controller
                name="shippingCountry"
                control={control}
                render={({ field }) => (
                  <select {...field} className="w-full p-2 border rounded" disabled={isSubmitting}>
                    <option value="Kenya">Kenya</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Tanzania">Tanzania</option>
                    <option value="Rwanda">Rwanda</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Ghana">Ghana</option>
                  </select>
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Shipping Method *</label>
              <select
                className="w-full p-2 border rounded"
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                disabled={isSubmitting}
              >
                {Object.values(ShippingMethod).map((method) => (
                  <option key={method} value={method}>
                    {method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
                <option value="other">Other (Plugin/Custom)</option>
              </select>
            </div>

            {shippingMethod === 'other' && (
              <div>
                <label className="block text-sm font-medium mb-1">Shipping Provider (Plugin)</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={pluginProvider}
                  onChange={(e) => setPluginProvider(e.target.value)}
                  placeholder="e.g. Sendy, DHL, CustomProvider"
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Delivery Notes</label>
              <Controller
                name="shippingNotes"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className="w-full p-2 border rounded"
                    placeholder="Landmark, gate color, etc."
                    rows={2}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Payment Method</h3>
          <div className="space-y-3">
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="mobile-money"
                      value={PaymentMethod.MOBILE_MONEY}
                      checked={field.value === PaymentMethod.MOBILE_MONEY}
                      onChange={() => field.onChange(PaymentMethod.MOBILE_MONEY)}
                      className="mr-2"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="mobile-money">Mobile Money (M-Pesa, etc.)</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="cash-delivery"
                      value={PaymentMethod.CASH_ON_DELIVERY}
                      checked={field.value === PaymentMethod.CASH_ON_DELIVERY}
                      onChange={() => field.onChange(PaymentMethod.CASH_ON_DELIVERY)}
                      className="mr-2"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="cash-delivery">Cash on Delivery</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="card-payment"
                      value={PaymentMethod.CARD}
                      checked={field.value === PaymentMethod.CARD}
                      onChange={() => field.onChange(PaymentMethod.CARD)}
                      className="mr-2"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="card-payment">Card Payment</label>
                  </div>
                </div>
              )}
            />

            {paymentMethod === PaymentMethod.MOBILE_MONEY && (
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Mobile Money Number</label>
                <Controller
                  name="paymentPhoneNumber"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      className="w-full p-2 border rounded"
                      placeholder="+254..."
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Order Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Order Notes</label>
          <Controller
            name="orderNotes"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Any special instructions for your order"
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        {/* Order Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>
                {(totalAmount.amount - taxAmount.amount - shippingCost.amount).toLocaleString()}{' '}
                {totalAmount.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>
                {shippingCost.amount.toLocaleString()} {shippingCost.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>
                {taxAmount.amount.toLocaleString()} {taxAmount.currency}
              </span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span>
                {totalAmount.amount.toLocaleString()} {totalAmount.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? 'Processing...' : 'Complete Order'}
        </button>
      </form>
    </div>
  );
}

export default CheckoutForm;
