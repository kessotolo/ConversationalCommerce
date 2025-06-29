import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface PaymentMethod {
  id: string;
  payment_type: string;
  display_name: string;
  card_brand?: string;
  last_four?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodRequest {
  payment_type: string;
  provider_token: string;
  display_name: string;
  payment_details?: Record<string, any>;
  is_default?: boolean;
}

export interface UpdatePaymentMethodRequest {
  display_name?: string;
  is_default?: boolean;
}

// Get all payment methods for the current user
export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const response = await axios.get(`${API_BASE_URL}/v1/buyer/payment-methods`);
  return response.data;
};

// Get a specific payment method by ID
export const getPaymentMethod = async (id: string): Promise<PaymentMethod> => {
  const response = await axios.get(`${API_BASE_URL}/v1/buyer/payment-methods/${id}`);
  return response.data;
};

// Create a new payment method
export const createPaymentMethod = async (data: CreatePaymentMethodRequest): Promise<PaymentMethod> => {
  const response = await axios.post(`${API_BASE_URL}/v1/buyer/payment-methods`, data);
  return response.data;
};

// Update an existing payment method
export const updatePaymentMethod = async (
  id: string, 
  data: UpdatePaymentMethodRequest
): Promise<PaymentMethod> => {
  const response = await axios.patch(`${API_BASE_URL}/v1/buyer/payment-methods/${id}`, data);
  return response.data;
};

// Set a payment method as default
export const setDefaultPaymentMethod = async (id: string): Promise<PaymentMethod> => {
  const response = await axios.post(`${API_BASE_URL}/v1/buyer/payment-methods/${id}/default`);
  return response.data;
};

// Delete a payment method
export const deletePaymentMethod = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/v1/buyer/payment-methods/${id}`);
};
