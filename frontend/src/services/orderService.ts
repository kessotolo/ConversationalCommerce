import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image_url?: string;
  quantity: number;
  price: number;
  discount?: number;
  options?: Record<string, any>;
  returned_quantity?: number;
  is_returned?: boolean;
}

export interface OrderAddress {
  recipient_name: string;
  street_address_1: string;
  street_address_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  user_id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total: number;
  payment_method: string;
  payment_id?: string;
  shipping_address: OrderAddress;
  billing_address?: OrderAddress;
  tracking_number?: string;
  carrier?: string;
  estimated_delivery_date?: string;
  order_items: OrderItem[];
  notes?: string;
  is_cancelled: boolean;
  is_returned: boolean;
  cancellation_reason?: string;
  cancellation_date?: string;
  return_reason?: string;
  return_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface CancellationRequest {
  order_id: string;
  reason: string;
  additional_details?: string;
}

export interface ReturnRequest {
  order_id: string;
  reason: string;
  items: {
    order_item_id: string;
    quantity: number;
    reason?: string;
  }[];
  additional_details?: string;
}

// Get orders for current user with pagination
export const getUserOrders = async (
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<OrderListResponse> => {
  const params: Record<string, any> = { page, limit };
  if (status) params.status = status;

  const response = await axios.get(`${API_BASE_URL}/v1/users/me/orders`, {
    params,
  });
  return response.data;
};

// Get order details by ID
export const getOrderById = async (id: string): Promise<Order> => {
  const response = await axios.get(`${API_BASE_URL}/v1/orders/${id}`);
  return response.data;
};

// Request order cancellation
export const cancelOrder = async (
  cancellationData: CancellationRequest
): Promise<Order> => {
  const response = await axios.post(
    `${API_BASE_URL}/v1/orders/${cancellationData.order_id}/cancel`,
    cancellationData
  );
  return response.data;
};

// Request order return
export const returnOrder = async (
  returnData: ReturnRequest
): Promise<Order> => {
  const response = await axios.post(
    `${API_BASE_URL}/v1/orders/${returnData.order_id}/return`,
    returnData
  );
  return response.data;
};

// Get order tracking information
export const getOrderTracking = async (id: string): Promise<{
  tracking_number: string;
  carrier: string;
  status: string;
  estimated_delivery_date?: string;
  tracking_history: {
    status: string;
    location?: string;
    timestamp: string;
  }[];
}> => {
  const response = await axios.get(`${API_BASE_URL}/v1/orders/${id}/tracking`);
  return response.data;
};
