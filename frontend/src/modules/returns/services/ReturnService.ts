import { AxiosError } from 'axios';
import { apiClient } from '@/lib/api';
import {
  ReturnRequestCreate,
  ReturnRequestUpdate,
  ReturnRequestResponse,
  ReturnRequestListResponse,
  ReturnItemUpdate,
  ReturnItemResponse,
  ReturnStatus
} from '../models/return';

/**
 * Service for handling return request operations
 */
export class ReturnService {
  /**
   * Create a new return request
   * @param tenantId - The tenant ID
   * @param data - Return request data
   * @returns The created return request
   */
  static async createReturnRequest(
    tenantId: string,
    data: ReturnRequestCreate
  ): Promise<ReturnRequestResponse> {
    try {
      const response = await apiClient.post(
        `/api/tenants/${tenantId}/returns`,
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      throw new Error(
        axiosError.response?.data?.detail || 
        'Failed to create return request'
      );
    }
  }

  /**
   * Get a return request by ID
   * @param tenantId - The tenant ID
   * @param returnId - The return request ID
   * @returns The return request
   */
  static async getReturnRequest(
    tenantId: string,
    returnId: string
  ): Promise<ReturnRequestResponse> {
    try {
      const response = await apiClient.get(
        `/api/tenants/${tenantId}/returns/${returnId}`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      throw new Error(
        axiosError.response?.data?.detail || 
        'Failed to fetch return request'
      );
    }
  }

  /**
   * Get all return requests for the current customer
   * @param tenantId - The tenant ID
   * @param page - Page number
   * @param pageSize - Page size
   * @returns Paginated list of return requests
   */
  static async getMyReturnRequests(
    tenantId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ReturnRequestListResponse> {
    try {
      const skip = (page - 1) * pageSize;
      const response = await apiClient.get(
        `/api/tenants/${tenantId}/returns/my-returns`,
        {
          params: {
            skip,
            limit: pageSize
          }
        }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      throw new Error(
        axiosError.response?.data?.detail || 
        'Failed to fetch return requests'
      );
    }
  }

  /**
   * Get all return requests for a specific order
   * @param tenantId - The tenant ID
   * @param orderId - The order ID
   * @returns List of return requests for the order
   */
  static async getReturnRequestsByOrder(
    tenantId: string,
    orderId: string
  ): Promise<ReturnRequestResponse[]> {
    try {
      const response = await apiClient.get(
        `/api/tenants/${tenantId}/orders/${orderId}/returns`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      throw new Error(
        axiosError.response?.data?.detail || 
        'Failed to fetch return requests'
      );
    }
  }

  /**
   * Update a return request
   * @param tenantId - The tenant ID
   * @param returnId - The return request ID
   * @param data - Return request update data
   * @returns The updated return request
   */
  static async updateReturnRequest(
    tenantId: string,
    returnId: string,
    data: ReturnRequestUpdate
  ): Promise<ReturnRequestResponse> {
    try {
      const response = await apiClient.patch(
        `/api/tenants/${tenantId}/returns/${returnId}`,
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      throw new Error(
        axiosError.response?.data?.detail || 
        'Failed to update return request'
      );
    }
  }

  /**
   * Cancel a return request
   * @param tenantId - The tenant ID
   * @param returnId - The return request ID
   * @returns The cancelled return request
   */
  static async cancelReturnRequest(
    tenantId: string,
    returnId: string
  ): Promise<ReturnRequestResponse> {
    try {
      const response = await apiClient.post(
        `/api/tenants/${tenantId}/returns/${returnId}/cancel`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      throw new Error(
        axiosError.response?.data?.detail || 
        'Failed to cancel return request'
      );
    }
  }

  /**
   * Update a return item
   * @param tenantId - The tenant ID
   * @param returnId - The return request ID
   * @param itemId - The return item ID
   * @param data - Return item update data
   * @returns The updated return item
   */
  static async updateReturnItem(
    tenantId: string,
    returnId: string,
    itemId: string,
    data: ReturnItemUpdate
  ): Promise<ReturnItemResponse> {
    try {
      const response = await apiClient.patch(
        `/api/tenants/${tenantId}/returns/${returnId}/items/${itemId}`,
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      throw new Error(
        axiosError.response?.data?.detail || 
        'Failed to update return item'
      );
    }
  }
  
  /**
   * Get return reason descriptions
   * @returns Map of reason codes to human-readable descriptions
   */
  static getReasonDescriptions(): Record<string, string> {
    return {
      defective: 'Item is defective or damaged',
      wrong_item: 'Received incorrect item',
      not_as_described: 'Item doesn\'t match description or images',
      arrived_late: 'Item arrived too late',
      no_longer_needed: 'No longer needed',
      size_issue: 'Wrong size or doesn\'t fit',
      quality_issue: 'Quality not as expected',
      other: 'Other reason'
    };
  }
  
  /**
   * Get status descriptions
   * @returns Map of status codes to human-readable descriptions
   */
  static getStatusDescriptions(): Record<string, string> {
    return {
      requested: 'Return Requested',
      under_review: 'Under Review',
      approved: 'Approved',
      received: 'Items Received',
      partial_approved: 'Partially Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
      completed: 'Completed'
    };
  }
}
