import { OrderItem } from '@/modules/orders/models/order';

/**
 * Enum for return request statuses
 */
export enum ReturnStatus {
  REQUESTED = 'requested',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  RECEIVED = 'received',
  PARTIAL_APPROVED = 'partial_approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

/**
 * Enum for return reason codes
 */
export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  NOT_AS_DESCRIBED = 'not_as_described',
  ARRIVED_LATE = 'arrived_late',
  NO_LONGER_NEEDED = 'no_longer_needed',
  SIZE_ISSUE = 'size_issue',
  QUALITY_ISSUE = 'quality_issue',
  OTHER = 'other'
}

/**
 * Enum for refund methods
 */
export enum RefundMethod {
  ORIGINAL_PAYMENT = 'original_payment',
  STORE_CREDIT = 'store_credit',
  MANUAL_PROCESSING = 'manual_processing',
  EXCHANGE = 'exchange'
}

/**
 * Interface for return address
 */
export interface ReturnAddress {
  full_name: string;
  street_address1: string;
  street_address2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  email?: string;
}

/**
 * Interface for creating a return item
 */
export interface ReturnItemCreate {
  order_item_id: string;
  quantity: number;
  reason: ReturnReason;
  item_condition?: string;
  customer_notes?: string;
}

/**
 * Interface for updating a return item
 */
export interface ReturnItemUpdate {
  quantity?: number;
  reason?: ReturnReason;
  item_condition?: string;
  store_notes?: string;
  customer_notes?: string;
  status?: ReturnStatus;
  refund_amount?: number;
  refund_tax_amount?: number;
  refund_shipping_amount?: number;
  restocked?: boolean;
  restocked_quantity?: number;
  restocked_at?: Date;
}

/**
 * Interface for return item response
 */
export interface ReturnItemResponse extends ReturnItemCreate {
  id: string;
  return_request_id: string;
  tenant_id: string;
  status: ReturnStatus;
  refund_amount?: number;
  refund_tax_amount?: number;
  refund_shipping_amount?: number;
  restocked: boolean;
  restocked_quantity: number;
  store_notes?: string;
  created_at: string;
  updated_at: string;
  
  // Additional fields from OrderItem
  product_name?: string;
  product_image?: string;
  variant_name?: string;
  unit_price?: number;
  
  // Extended data
  order_item?: OrderItem;
}

/**
 * Interface for creating a return request
 */
export interface ReturnRequestCreate {
  order_id: string;
  reason: ReturnReason;
  explanation?: string;
  return_shipping_required?: boolean;
  return_address?: ReturnAddress;
  items: ReturnItemCreate[];
}

/**
 * Interface for updating a return request
 */
export interface ReturnRequestUpdate {
  status?: ReturnStatus;
  reason?: ReturnReason;
  explanation?: string;
  return_shipping_method?: string;
  return_shipping_carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  return_address?: ReturnAddress;
  refund_method?: RefundMethod;
  refund_amount?: number;
  rejection_reason?: string;
}

/**
 * Interface for return request response
 */
export interface ReturnRequestResponse {
  id: string;
  tenant_id: string;
  order_id: string;
  customer_id: string;
  return_number: string;
  status: ReturnStatus;
  reason: ReturnReason;
  explanation?: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  return_shipping_required: boolean;
  return_shipping_method?: string;
  return_shipping_carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  return_address?: ReturnAddress;
  refund_method?: RefundMethod;
  refund_amount?: number;
  refund_currency: string;
  refund_processed_at?: string;
  refund_transaction_id?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  
  // Related objects
  items?: ReturnItemResponse[];
}

/**
 * Interface for paginated return request response
 */
export interface ReturnRequestListResponse {
  items: ReturnRequestResponse[];
  total: number;
  page: number;
  page_size: number;
}
