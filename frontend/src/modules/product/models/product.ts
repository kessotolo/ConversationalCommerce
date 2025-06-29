import type { TenantScoped } from '@/modules/core/models/base';
import type { Money } from '@/modules/core/models/base/money';

/**
 * Product status enum representing the product lifecycle
 */
export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

/**
 * Product type enum representing different product categories
 */
export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  SERVICE = 'SERVICE',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

/**
 * Product variant option type enum
 */
export enum VariantOptionType {
  COLOR = 'COLOR',
  SIZE = 'SIZE',
  MATERIAL = 'MATERIAL',
  STYLE = 'STYLE',
  OTHER = 'OTHER',
}

/**
 * Interface for product variant option value
 */
export interface VariantOptionValue {
  id: string;
  name: string;
  display_order?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for product variant option
 */
export interface VariantOption {
  id: string;
  name: string;
  type: VariantOptionType;
  display_order?: number;
  values: VariantOptionValue[];
}

/**
 * Interface for product variant
 */
export interface ProductVariant {
  id: string;
  sku: string;
  name?: string;
  price: Money;
  sale_price?: Money;
  inventory_quantity?: number;
  option_values: {
    option_id: string;
    value_id: string;
  }[];
  image_url?: string;
  barcode?: string;
  weight?: number;
  weight_unit?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  is_default?: boolean;
}

/**
 * Interface for product image
 */
export interface ProductImage {
  id: string;
  url: string;
  alt_text?: string;
  position?: number;
}

/**
 * Interface for product category
 */
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  description?: string;
}

/**
 * Complete Product domain model with all details
 */
export interface Product extends TenantScoped {
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: Money;
  sale_price?: Money;
  status: ProductStatus;
  type: ProductType;
  sku: string;
  barcode?: string;
  inventory_quantity?: number;
  track_inventory: boolean;
  categories?: string[]; // Array of category IDs
  tags?: string[];
  images: ProductImage[];
  variant_options?: VariantOption[];
  variants?: ProductVariant[];
  metadata?: Record<string, unknown>;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  specs?: Record<string, string | number | boolean>;
  featured?: boolean;
  weight?: number;
  weight_unit?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  related_products?: string[]; // Array of related product IDs
  created_at: string;
  updated_at: string;
  published_at?: string;
}

/**
 * Domain methods for the Product model
 */
export const ProductDomainMethods = {
  /**
   * Check if a product is on sale
   */
  isOnSale(product: Product): boolean {
    return !!product.sale_price && 
      product.sale_price.amount < product.price.amount;
  },

  /**
   * Check if a product has variants
   */
  hasVariants(product: Product): boolean {
    return !!product.variants && product.variants.length > 0;
  },

  /**
   * Check if a product is in stock
   */
  isInStock(product: Product): boolean {
    if (!product.track_inventory) return true;
    
    // If using variants, check variant inventory
    if (this.hasVariants(product)) {
      return !!product.variants?.some(v => 
        v.inventory_quantity === undefined || v.inventory_quantity > 0
      );
    }
    
    // Otherwise check main product inventory
    return product.inventory_quantity === undefined || product.inventory_quantity > 0;
  },

  /**
   * Get the current active price (accounting for sales)
   */
  getCurrentPrice(product: Product): Money {
    if (this.isOnSale(product) && product.sale_price) {
      return product.sale_price;
    }
    return product.price;
  },
  
  /**
   * Get inventory status text
   */
  getInventoryStatusText(product: Product): string {
    if (!product.track_inventory) return 'Always Available';
    
    if (this.hasVariants(product)) {
      const inStockCount = product.variants?.filter(
        v => v.inventory_quantity !== undefined && v.inventory_quantity > 0
      ).length || 0;
      
      const totalVariants = product.variants?.length || 0;
      
      if (inStockCount === 0) return 'Out of Stock';
      if (inStockCount === totalVariants) return 'In Stock';
      return `${inStockCount}/${totalVariants} Variants In Stock`;
    }
    
    if (product.inventory_quantity === undefined) return 'Unknown';
    if (product.inventory_quantity <= 0) return 'Out of Stock';
    if (product.inventory_quantity <= 10) return 'Low Stock';
    return 'In Stock';
  },
};
