import { AxiosError } from 'axios';
import { apiClient } from '@/lib/api';
import type {
  ShippingRateRequest,
  ShippingRateResponse,
  ShippingRate,
  LabelRequest,
  LabelResponse,
  TrackingResponse,
} from '../models/shipping';

/**
 * Service for interacting with shipping APIs
 */
export class ShippingService {
  /**
   * Get shipping rates for a specific shipment
   */
  static async getRates(
    tenantId: string,
    request: ShippingRateRequest
  ): Promise<ShippingRateResponse> {
    try {
      const response = await apiClient.post(
        `/api/tenants/${tenantId}/shipping/rates`,
        request
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Generate shipping labels for an order
   */
  static async createLabels(
    tenantId: string,
    orderId: string,
    request: LabelRequest
  ): Promise<LabelResponse> {
    try {
      const response = await apiClient.post(
        `/api/tenants/${tenantId}/orders/${orderId}/shipping/labels`,
        request
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Track a shipment using the tracking number
   */
  static async trackShipment(
    tenantId: string,
    trackingNumber: string,
    carrier?: string
  ): Promise<TrackingResponse> {
    try {
      const params = carrier ? `?carrier=${carrier}` : '';
      const response = await apiClient.get(
        `/api/tenants/${tenantId}/shipping/track/${trackingNumber}${params}`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Get available shipping services
   */
  static async getAvailableServices(
    tenantId: string
  ): Promise<{ carrier: string; services: { code: string; name: string }[] }[]> {
    try {
      const response = await apiClient.get(
        `/api/tenants/${tenantId}/shipping/services`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Save a selected rate quote
   */
  static async saveRateQuote(
    tenantId: string,
    rate: ShippingRate,
    orderId?: string
  ): Promise<{ quote_id: string }> {
    try {
      const response = await apiClient.post(
        `/api/tenants/${tenantId}/shipping/quotes`,
        {
          rate,
          order_id: orderId
        }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }
}
