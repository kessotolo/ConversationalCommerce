import * as React from 'react';
// @ts-nocheck
// DO NOT MODIFY: This file is manually maintained
// Order type definitions

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  imageUrl?: string;
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
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
