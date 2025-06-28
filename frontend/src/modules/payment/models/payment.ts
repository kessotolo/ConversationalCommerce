import type { Money } from '@/modules/core/models/base/money';

/**
 * Payment provider enum
 */
export enum PaymentProvider {
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE',
  MANUAL = 'MANUAL',
  STRIPE = 'STRIPE',
}

/**
 * Payment method enum for different payment options
 * Extending the existing enum in the order model
 */
export enum PaymentMethod {
  CARD = 'CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  USSD = 'USSD',
}

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

/**
 * Bank account details for manual transfers
 */
export interface BankAccountDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
  instructions?: string;
}

/**
 * Provider credentials interface
 */
export interface ProviderCredentials {
  public_key: string;
  secret_key: string;
  encryption_key?: string; // Only required for Flutterwave
}

/**
 * Payment provider config for a tenant/seller
 */
export interface PaymentProviderConfig {
  provider: PaymentProvider;
  enabled: boolean;
  credentials: ProviderCredentials;
  is_default?: boolean;
  test_mode?: boolean; // If true, use test keys and allow test cards
}

/**
 * Payment settings for a tenant/seller
 */
export interface PaymentSettings {
  online_payments_enabled: boolean;
  providers: PaymentProviderConfig[];
  bank_transfer_details?: BankAccountDetails;
  platform_fee_percentage: number; // e.g., 5.0 for 5%
  auto_calculate_payout: boolean;
  fraud_detection_enabled: boolean;
  rate_limiting_enabled: boolean;
  webhook_security_enabled: boolean;
}

/**
 * Transaction Fee details
 */
export interface TransactionFee {
  percentage: number;
  fixed_amount?: Money;
  calculated_fee: Money;
}

/**
 * Payment initialization request
 */
export interface PaymentInitializeRequest {
  order_id: string;
  amount: Money;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  provider: PaymentProvider;
  redirect_url?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payment response from provider
 */
export interface PaymentInitializeResponse {
  checkout_url?: string;
  reference: string;
  access_code?: string; // Paystack specific
  payment_link?: string; // For sharing in chat
  metadata?: Record<string, unknown>; // For provider-specific data like Stripe client_secret
}

/**
 * Manual payment proof
 */
export interface ManualPaymentProof {
  reference: string;
  transfer_date: string;
  bank_name?: string;
  account_name?: string;
  screenshot_url?: string;
  notes?: string;
}

/**
 * Webhook event from payment provider
 */
export interface PaymentWebhookEvent {
  provider: PaymentProvider;
  event_type: string;
  data: unknown;
  signature?: string; // For validation
}

/**
 * Payment verification response
 */
export interface PaymentVerificationResponse {
  success: boolean;
  reference: string;
  amount: Money;
  provider: PaymentProvider;
  provider_reference?: string;
  transaction_date: string;
  metadata?: Record<string, unknown>;
  customer?: {
    email: string;
    name?: string;
    phone?: string;
  };
  payment_method?: PaymentMethod;
  fees?: TransactionFee;
}
