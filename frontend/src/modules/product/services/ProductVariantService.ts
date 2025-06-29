import { AxiosError } from 'axios';
import { apiClient } from '@/lib/api';
import type {
  VariantOption,
  VariantOptionValue,
  ProductVariant,
  VariantOptionCreate,
  VariantOptionUpdate,
  VariantOptionValueCreate,
  VariantOptionValueUpdate,
  ProductVariantCreate,
  ProductVariantUpdate
} from '../models/product';

/**
 * Service for interacting with product variant APIs
 */
export class ProductVariantService {
  /**
   * Get all variant options for a product
   */
  static async getVariantOptions(productId: string, tenantId: string): Promise<VariantOption[]> {
    try {
      const response = await apiClient.get(
        `/api/tenants/${tenantId}/products/${productId}/variants/options`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Create a new variant option for a product
   */
  static async createVariantOption(
    productId: string,
    tenantId: string,
    option: VariantOptionCreate
  ): Promise<VariantOption> {
    try {
      const response = await apiClient.post(
        `/api/tenants/${tenantId}/products/${productId}/variants/options`,
        option
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Update a variant option
   */
  static async updateVariantOption(
    optionId: string,
    tenantId: string,
    option: VariantOptionUpdate
  ): Promise<VariantOption> {
    try {
      const response = await apiClient.patch(
        `/api/tenants/${tenantId}/products/variants/options/${optionId}`,
        option
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Delete a variant option
   */
  static async deleteVariantOption(optionId: string, tenantId: string): Promise<void> {
    try {
      await apiClient.delete(
        `/api/tenants/${tenantId}/products/variants/options/${optionId}`
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Create a new option value
   */
  static async createOptionValue(
    optionId: string,
    tenantId: string,
    value: VariantOptionValueCreate
  ): Promise<VariantOptionValue> {
    try {
      const response = await apiClient.post(
        `/api/tenants/${tenantId}/products/variants/options/${optionId}/values`,
        value
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Update an option value
   */
  static async updateOptionValue(
    valueId: string,
    tenantId: string,
    value: VariantOptionValueUpdate
  ): Promise<VariantOptionValue> {
    try {
      const response = await apiClient.patch(
        `/api/tenants/${tenantId}/products/variants/options/values/${valueId}`,
        value
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Delete an option value
   */
  static async deleteOptionValue(valueId: string, tenantId: string): Promise<void> {
    try {
      await apiClient.delete(
        `/api/tenants/${tenantId}/products/variants/options/values/${valueId}`
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Get all variants for a product
   */
  static async getProductVariants(productId: string, tenantId: string): Promise<ProductVariant[]> {
    try {
      const response = await apiClient.get(
        `/api/tenants/${tenantId}/products/${productId}/variants`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Create a new product variant
   */
  static async createProductVariant(
    productId: string,
    tenantId: string,
    variant: ProductVariantCreate
  ): Promise<ProductVariant> {
    try {
      const response = await apiClient.post(
        `/api/tenants/${tenantId}/products/${productId}/variants`,
        variant
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Update a product variant
   */
  static async updateProductVariant(
    variantId: string,
    tenantId: string,
    variant: ProductVariantUpdate
  ): Promise<ProductVariant> {
    try {
      const response = await apiClient.patch(
        `/api/tenants/${tenantId}/products/variants/${variantId}`,
        variant
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }

  /**
   * Delete a product variant
   */
  static async deleteProductVariant(variantId: string, tenantId: string): Promise<void> {
    try {
      await apiClient.delete(
        `/api/tenants/${tenantId}/products/variants/${variantId}`
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message);
    }
  }
}
