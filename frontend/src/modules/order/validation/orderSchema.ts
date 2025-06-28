import { z } from 'zod';

import {
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingMethod,
} from '@/modules/order/models/order';

/**
 * Address schema validation
 * Designed to work with both web form input and NLP extraction from conversational interfaces
 */
export const addressSchema = z.object({
  street: z.string().min(3, { message: 'Street address is required' }),
  city: z.string().min(2, { message: 'City is required' }),
  state: z.string().min(2, { message: 'State/Province is required' }),
  postalCode: z.string().optional(),
  country: z.string().min(2, { message: 'Country is required' }),
  apartment: z.string().optional(),
  landmark: z.string().optional(),
  coordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

/**
 * Money schema validation
 */
export const moneySchema = z.object({
  amount: z.number().nonnegative({ message: 'Amount must be greater than or equal to 0' }),
  currency: z.string().min(3).max(3), // ISO 4217 currency code
});

/**
 * Customer information schema
 * Email is optional for WhatsApp orders where we might only have phone
 */
export const customerInfoSchema = z.object({
  id: z.string().uuid().optional(), // Optional for guest checkout
  name: z.string().min(2, { message: 'Name is required' }),
  email: z.string().email({ message: 'Valid email is required' }).optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, { message: 'Valid phone number is required' }),
  is_guest: z.boolean().default(true),
});

/**
 * Order item schema
 */
export const orderItemSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: moneySchema,
  total_price: moneySchema,
  variant_id: z.string().uuid().optional(),
  variant_name: z.string().optional(),
  image_url: z.string().url().optional(),
});

/**
 * Shipping plugin meta schema
 */
export const shippingPluginMetaSchema = z.object({
  provider: z.string().min(2),
  pluginData: z.record(z.unknown()).optional(),
});

/**
 * Shipping details schema
 */
export const shippingDetailsSchema = z.object({
  address: addressSchema,
  method: z.nativeEnum(ShippingMethod).or(z.string().min(1)),
  pluginMeta: shippingPluginMetaSchema.optional(),
  tracking_number: z.string().optional(),
  estimated_delivery: z.string().optional(), // ISO date string
  shipping_cost: moneySchema,
  notes: z.string().optional(),
});

/**
 * Payment details schema
 */
export const paymentDetailsSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(PaymentStatus),
  transaction_id: z.string().optional(),
  provider: z.string().optional(),
  amount_paid: moneySchema,
  payment_date: z.string().optional(), // ISO date string
  receipt_url: z.string().url().optional(),
  last_four: z.string().optional(),
  phone_number: z.string().optional(),
});

/**
 * Order timeline entry schema
 */
export const orderTimelineSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(OrderStatus),
  timestamp: z.string(), // ISO date string
  note: z.string().optional(),
  created_by: z.string().optional(),
});

/**
 * Complete order schema
 */
export const orderSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  order_number: z.string().min(1),
  customer: customerInfoSchema,
  items: z.array(orderItemSchema).min(1, { message: 'Order must have at least one item' }),
  total_amount: moneySchema,
  subtotal: moneySchema,
  tax: moneySchema,
  status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
  source: z.nativeEnum(OrderSource),
  shipping: shippingDetailsSchema,
  payment: paymentDetailsSchema,
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  timeline: z.array(orderTimelineSchema).default([]),
  idempotency_key: z.string().uuid(),
  created_at: z.string().optional(), // ISO date string
  updated_at: z.string().optional(), // ISO date string
});

/**
 * Order creation request schema - slightly different from the full order
 * as some fields will be generated on the server
 */
export const createOrderRequestSchema = z.object({
  customer: customerInfoSchema,
  items: z.array(orderItemSchema).min(1),
  shipping: shippingDetailsSchema,
  payment: z.object({
    method: z.nativeEnum(PaymentMethod),
    // Other payment fields will be filled by the payment service
  }),
  source: z.nativeEnum(OrderSource),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  idempotency_key: z.string().uuid(),
  channel: z.string().min(2), // Required channel field for API consistency
});

/**
 * Order response schema
 */
export const orderResponseSchema = z.object({
  order: orderSchema,
});

/**
 * Orders list response schema
 */
export const ordersResponseSchema = z.object({
  orders: z.array(orderSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

// Export the types derived from schemas
export type Address = z.infer<typeof addressSchema>;
export type Money = z.infer<typeof moneySchema>;
export type CustomerInfo = z.infer<typeof customerInfoSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type ShippingDetails = z.infer<typeof shippingDetailsSchema>;
export type PaymentDetails = z.infer<typeof paymentDetailsSchema>;
export type OrderTimeline = z.infer<typeof orderTimelineSchema>;
export type Order = z.infer<typeof orderSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
export type OrderResponse = z.infer<typeof orderResponseSchema>;
export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
