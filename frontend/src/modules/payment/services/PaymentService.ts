import type { Result } from '@/modules/core/models/base/result';

import { PaymentProvider } from '../models/payment';
import type {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  PaymentVerificationResponse,
  ManualPaymentProof,
  PaymentSettings,
} from '@/modules/payment/models/payment';

import { StripeProvider } from './providers/StripeProvider';

/**
 * Payment service interface for handling payments across different providers
 */
export interface PaymentService {
  /**
   * Initialize a payment transaction with a provider
   */
  initializePayment(
    request: PaymentInitializeRequest,
  ): Promise<Result<PaymentInitializeResponse, Error>>;

  /**
   * Verify a payment transaction
   */
  verifyPayment(
    reference: string,
    provider: PaymentProvider,
  ): Promise<Result<PaymentVerificationResponse, Error>>;

  /**
   * Submit proof of manual payment (bank transfer)
   */
  submitManualPaymentProof(
    orderid: string,
    proof: ManualPaymentProof,
  ): Promise<Result<boolean, Error>>;

  /**
   * Get payment settings for a tenant
   */
  getPaymentSettings(tenantId: string): Promise<Result<PaymentSettings, Error>>;

  /**
   * Update payment settings for a tenant
   */
  updatePaymentSettings(
    tenantId: string,
    settings: PaymentSettings,
  ): Promise<Result<PaymentSettings, Error>>;
}

/**
 * HTTP implementation of the payment service
 */
export class HttpPaymentService implements PaymentService {
  private apiUrl: string;

  constructor(apiUrl = '/api/v1') {
    this.apiUrl = apiUrl;
  }

  async initializePayment(
    request: PaymentInitializeRequest,
  ): Promise<Result<PaymentInitializeResponse, Error>> {
    switch (request.provider) {
      case PaymentProvider.PAYSTACK:
        try {
          const response = await fetch(`${this.apiUrl}/payments/initialize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message ?? 'Failed to initialize payment');
          }

          const data = await response.json();
          return {
            success: true,
            data: data.payment,
          };
        } catch (error) {
          console.error('Error initializing payment:', error);
          return {
            success: false,
            error: error as Error,
          };
        }
      case PaymentProvider.FLUTTERWAVE:
        try {
          const response = await fetch(`${this.apiUrl}/payments/initialize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message ?? 'Failed to initialize payment');
          }

          const data = await response.json();
          return {
            success: true,
            data: data.payment,
          };
        } catch (error) {
          console.error('Error initializing payment:', error);
          return {
            success: false,
            error: error as Error,
          };
        }
      case PaymentProvider.STRIPE:
        try {
          const stripeProvider = new StripeProvider(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');
          const data = await stripeProvider.initializePayment(request);
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error as Error };
        }
      default:
        throw new Error('Unsupported payment provider');
    }
  }

  async verifyPayment(
    reference: string,
    provider: PaymentProvider,
  ): Promise<Result<PaymentVerificationResponse, Error>> {
    try {
      const response = await fetch(
        `${this.apiUrl}/payments/verify?reference=${encodeURIComponent(reference)}&provider=${encodeURIComponent(provider)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to verify payment');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.verification,
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async submitManualPaymentProof(
    orderId: string,
    proof: ManualPaymentProof,
  ): Promise<Result<boolean, Error>> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/manual/${orderId}/proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proof),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to submit payment proof');
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      console.error('Error submitting payment proof:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async getPaymentSettings(tenantId: string): Promise<Result<PaymentSettings, Error>> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/settings`, {
        method: 'GET',
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to get payment settings');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.settings,
      };
    } catch (error) {
      console.error('Error getting payment settings:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async updatePaymentSettings(
    tenantId: string,
    settings: PaymentSettings,
  ): Promise<Result<PaymentSettings, Error>> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to update payment settings');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.settings,
      };
    } catch (error) {
      console.error('Error updating payment settings:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }
}

// Document: To use Stripe, instantiate StripeProvider with your public key and use initializePayment and createPaymentWidget.
// For sandbox/testing, use test keys for Paystack, Flutterwave, and Stripe.

// Add type guards for global objects
// Example: typeof window !== 'undefined' before using window
// Example: typeof fetch !== 'undefined' before using fetch
// Example: typeof document !== 'undefined' before using document
// Example: typeof console !== 'undefined' before using console
