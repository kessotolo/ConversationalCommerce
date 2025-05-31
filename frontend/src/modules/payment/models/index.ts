/**
 * Payment Models
 * 
 * Models for payment processing functionality.
 * These models define payment methods, transactions, and gateways.
 */

// Placeholder export to make this a proper module
export interface PaymentMethod {
  id: string;
  name: string;
  type: 'credit_card' | 'mobile_money' | 'bank_transfer' | 'cash' | 'other';
  isEnabled: boolean;
}
