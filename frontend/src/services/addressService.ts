import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface Address {
  id: string;
  tenant_id: string;
  user_id: string;
  nickname: string;
  recipient_name: string;
  street_address_1: string;
  street_address_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AddressRequest {
  nickname: string;
  recipient_name: string;
  street_address_1: string;
  street_address_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default?: boolean;
}

// Get all addresses for the current user
export const getUserAddresses = async (): Promise<Address[]> => {
  const response = await axios.get(`${API_BASE_URL}/v1/users/me/addresses`);
  return response.data;
};

// Get a specific address by ID
export const getAddress = async (id: string): Promise<Address> => {
  const response = await axios.get(`${API_BASE_URL}/v1/addresses/${id}`);
  return response.data;
};

// Create a new address
export const createAddress = async (address: AddressRequest): Promise<Address> => {
  const response = await axios.post(`${API_BASE_URL}/v1/addresses`, address);
  return response.data;
};

// Update an existing address
export const updateAddress = async (id: string, address: AddressRequest): Promise<Address> => {
  const response = await axios.put(`${API_BASE_URL}/v1/addresses/${id}`, address);
  return response.data;
};

// Delete an address
export const deleteAddress = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/v1/addresses/${id}`);
};

// Set an address as default
export const setDefaultAddress = async (id: string): Promise<Address> => {
  const response = await axios.post(`${API_BASE_URL}/v1/addresses/${id}/default`);
  return response.data;
};
