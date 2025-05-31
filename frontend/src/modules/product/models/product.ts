/**
 * Product Models
 * 
 * These models define the product catalog functionality for the
 * Conversational Commerce platform, optimized for sharing via WhatsApp
 * and other messaging channels.
 */

import { Entity, Money, TenantScoped, UUID } from '../../core/models/base';

/**
 * Product
 * Represents a product in a merchant's catalog
 */
export interface Product extends TenantScoped {
  name: string;
  description: string;
  price: Money;
  compareAtPrice?: Money;
  sku?: string;
  barcode?: string;
  inventoryQuantity: number;
  isAvailable: boolean;
  categories: UUID[];
  tags: string[];
  attributes: ProductAttribute[];
  images: ProductImage[];
  variants: ProductVariant[];
  shareStats: ShareStatistics;
  messageTemplates: ProductMessageTemplate[];
  seoData: SEOData;
}

/**
 * Product attribute
 * Custom attributes for a product
 */
export interface ProductAttribute {
  name: string;
  value: string;
}

/**
 * Product image
 * Image asset for a product
 */
export interface ProductImage {
  id: UUID;
  url: string;
  altText?: string;
  width: number;
  height: number;
  position: number;
  isPrimary: boolean;
  optimizedUrls?: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
}

/**
 * Product variant
 * A specific variation of a product
 */
export interface ProductVariant extends Entity {
  productId: UUID;
  title: string;
  price: Money;
  compareAtPrice?: Money;
  sku?: string;
  barcode?: string;
  inventoryQuantity: number;
  isAvailable: boolean;
  options: VariantOption[];
  image?: ProductImage;
}

/**
 * Variant option
 * A specific option value for a variant
 */
export interface VariantOption {
  name: string;
  value: string;
}

/**
 * Share statistics
 * Metrics for product sharing across channels
 */
export interface ShareStatistics {
  totalShares: number;
  channelShares: {
    whatsapp: number;
    instagram: number;
    facebook: number;
    twitter: number;
    telegram: number;
    tiktok: number;
  };
  clicksGenerated: number;
  conversionsGenerated: number;
  revenue: Money;
}

/**
 * Product message template
 * Pre-defined messages for sharing products on different channels
 */
export interface ProductMessageTemplate {
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'telegram' | 'tiktok';
  template: string;
  includeImage: boolean;
  includePricing: boolean;
  includeDescription: boolean;
  callToAction: string;
  hashtags: string[];
}

/**
 * SEO data
 * Search engine optimization data for the product
 */
export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
}

/**
 * Product category
 * A category for organizing products
 */
export interface ProductCategory extends TenantScoped {
  name: string;
  description?: string;
  slug: string;
  parentId?: UUID;
  image?: string;
  position: number;
  isActive: boolean;
  productCount: number;
}

/**
 * Product collection
 * A curated collection of products
 */
export interface ProductCollection extends TenantScoped {
  name: string;
  description?: string;
  slug: string;
  isAutomated: boolean;
  rules?: CollectionRule[];
  productIds: UUID[];
  image?: string;
  isActive: boolean;
  productCount: number;
}

/**
 * Collection rule
 * A rule for automatically including products in a collection
 */
export interface CollectionRule {
  field: 'title' | 'type' | 'vendor' | 'variant_price' | 'tag' | 'category';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'starts_with' | 'ends_with' | 'contains';
  value: string;
}
