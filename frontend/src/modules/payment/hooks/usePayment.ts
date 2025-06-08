import { useState, useCallback } from 'react';
import {
  PaymentProvider,
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  PaymentVerificationResponse,
  ManualPaymentProof,
} from '../models/payment';
import { HttpPaymentService } from '../services/PaymentService';
import { Order } from '@/modules/order/models/order';
import { Result } from '@/modules/core/models/base/result';

/**
 * Hook for managing payment operations
 */
export const usePayment = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] = useState<PaymentInitializeResponse | null>(null);
  const [verificationResponse, setVerificationResponse] =
    useState<PaymentVerificationResponse | null>(null);

  const paymentService = new HttpPaymentService();

  /**
   * Initialize a payment transaction
   */
  const initializePayment = useCallback(
    async (
      order: Order,
      provider: PaymentProvider,
      redirectUrl?: string,
    ): Promise<Result<PaymentInitializeResponse, Error>> => {
      setLoading(true);
      setError(null);

      try {
        const request: PaymentInitializeRequest = {
          order_id: order.order_number,
          amount: order.total_amount,
          customer_email: order.customer.email,
          customer_name: order.customer.name,
          customer_phone: order.customer.phone,
          provider,
          redirect_url: redirectUrl,
          metadata: {
            order_id: order.order_number,
            source: order.source,
          },
        };

        const result = await paymentService.initializePayment(request);

        if (result.success && result.data) {
          setPaymentResponse(result.data);
        } else if (result.error) {
          setError(result.error.message);
        }

        return result;
      } catch (err: any) {
        const errorMessage = `Payment initialization error: ${err.message || 'Unknown error'}`;
        setError(errorMessage);
        return {
          success: false,
          error: new Error(errorMessage),
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Verify a payment transaction
   */
  const verifyPayment = useCallback(
    async (
      reference: string,
      provider: PaymentProvider,
    ): Promise<Result<PaymentVerificationResponse, Error>> => {
      setLoading(true);
      setError(null);

      try {
        const result = await paymentService.verifyPayment(reference, provider);

        if (result.success && result.data) {
          setVerificationResponse(result.data);
        } else if (result.error) {
          setError(result.error.message);
        }

        return result;
      } catch (err: any) {
        const errorMessage = `Payment verification error: ${err.message || 'Unknown error'}`;
        setError(errorMessage);
        return {
          success: false,
          error: new Error(errorMessage),
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Submit proof of manual payment
   */
  const submitManualPayment = useCallback(
    async (orderId: string, proof: ManualPaymentProof): Promise<Result<boolean, Error>> => {
      setLoading(true);
      setError(null);

      try {
        const result = await paymentService.submitManualPaymentProof(orderId, proof);

        if (!result.success && result.error) {
          setError(result.error.message);
        }

        return result;
      } catch (err: any) {
        const errorMessage = `Payment proof submission error: ${err.message || 'Unknown error'}`;
        setError(errorMessage);
        return {
          success: false,
          error: new Error(errorMessage),
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Reset the payment state
   */
  const resetPaymentState = useCallback(() => {
    setLoading(false);
    setError(null);
    setPaymentResponse(null);
    setVerificationResponse(null);
  }, []);

  return {
    loading,
    error,
    paymentResponse,
    verificationResponse,
    initializePayment,
    verifyPayment,
    submitManualPayment,
    resetPaymentState,
  };
};

export default usePayment;
