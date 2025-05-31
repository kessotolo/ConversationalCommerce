/**
 * Tenant Models
 * 
 * These models define the tenant entities for the Conversational Commerce platform.
 * Each tenant represents a merchant using the platform.
 */

import { Entity, Region, UUID } from '../../core/models/base';

/**
 * Tenant entity
 * Represents a merchant on the platform
 */
export interface Tenant extends Entity {
  name: string;
  subdomain: string;
  logoUrl?: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  region: Region;
  status: TenantStatus;
  plan: TenantPlan;
  settings: TenantSettings;
}

/**
 * Tenant status
 * Represents the current state of a tenant
 */
export enum TenantStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

/**
 * Tenant plan
 * Subscription plan level for the tenant
 */
export enum TenantPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

/**
 * Tenant settings
 * Configuration options for a tenant
 */
export interface TenantSettings {
  theme: ThemeSettings;
  messaging: MessagingSettings;
  features: FeatureSettings;
  localization: LocalizationSettings;
}

/**
 * Theme settings
 * Visual appearance of the tenant's storefront
 */
export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoPosition: 'left' | 'center' | 'right';
  darkMode: boolean;
  customCss?: string;
}

/**
 * Messaging settings
 * Configuration for the tenant's messaging channels
 */
export interface MessagingSettings {
  defaultChannel: 'whatsapp' | 'sms' | 'messenger';
  whatsappEnabled: boolean;
  whatsappBusinessNumber?: string;
  messengerEnabled: boolean;
  messengerPageId?: string;
  smsEnabled: boolean;
  smsNumber?: string;
  autoResponders: boolean;
  businessHours: BusinessHours[];
}

/**
 * Business hours
 * When the tenant is available for messaging
 */
export interface BusinessHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string; // Format: "HH:MM" in 24-hour
  close: string; // Format: "HH:MM" in 24-hour
  closed: boolean;
}

/**
 * Feature settings
 * Enabled features for the tenant
 */
export interface FeatureSettings {
  conversationalCommerce: boolean;
  productCatalog: boolean;
  orderManagement: boolean;
  analytics: boolean;
  contentModeration: boolean;
  multiChannelSharing: boolean;
}

/**
 * Localization settings
 * Language and region settings for the tenant
 */
export interface LocalizationSettings {
  language: string;
  currency: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
}
