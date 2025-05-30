import { BannerLogoManagement } from '@/components/StorefrontEditor/BannerLogoManagement/BannerLogoManagement';
import { Record } from 'react';import * as React from 'react';
// Using UUID type for consistency with backend
import { DraftManagement } from '@/components/StorefrontEditor/DraftManagement/DraftManagement';
import { VersionHistory } from '@/components/StorefrontEditor/VersionHistory/VersionHistory';
import { Component } from 'react';
import { DraftList } from '@/components/StorefrontEditor/DraftManagement/DraftList';
import { VersionList } from '@/components/StorefrontEditor/VersionHistory/VersionList';
import { BannerList } from '@/components/StorefrontEditor/BannerLogoManagement/BannerList';
import { LogoList } from '@/components/StorefrontEditor/BannerLogoManagement/LogoList';
export type UUID = string; // UUID represented as string but validated as UUID on backend

// Draft/Publish Types
export enum DraftStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived'
}

export interface Draft {
  id: UUID;
  tenant_id: UUID;
  name: string;
  description: string;
  changes: Record<string, any>;
  status: DraftStatus;
  created_at: string;
  created_by: UUID;
  updated_at: string;
  updated_by: UUID;
}

export interface DraftList {
  items: Draft[];
  total: number;
  skip: number;
  limit: number;
}

// Version History Types
export interface Version {
  id: UUID;
  storefront_config_id: UUID;
  version_number: number;
  created_at: string;
  created_by: UUID;
  change_summary: string;
  change_description: string;
  tags: string[];
  configuration_snapshot: Record<string, any>;
}

export interface VersionList {
  items: Version[];
  total: number;
  skip: number;
  limit: number;
}

export interface VersionDiff {
  differences: Record<string, any>;
  version1: UUID;
  version2: UUID;
}

// Permission Types
export enum StorefrontRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  PUBLISHER = 'publisher',
  ADMIN = 'admin'
}

export enum StorefrontSectionType {
  THEME = 'theme',
  LAYOUT = 'layout',
  CONTENT = 'content',
  PRODUCTS = 'products',
  SETTINGS = 'settings',
  BANNERS = 'banners',
  ASSETS = 'assets',
  SEO = 'seo'
}

export interface Permission {
  user_id: UUID;
  tenant_id: UUID;
  role: StorefrontRole;
  section_permissions?: Record<StorefrontSectionType, string[]>;
  component_permissions?: Record<string, string[]>;
}

export interface UserPermission {
  user_id: UUID;
  username: string;
  role: StorefrontRole;
  global_permissions: string[];
  section_permissions: Record<string, string[]>;
  component_permissions: Record<string, string[]>;
}

export interface UserPermissionsList {
  items: UserPermission[];
  total: number;
}

export interface AuditLogEntry {
  id: UUID;
  tenant_id: UUID;
  user_id: UUID;
  username: string;
  action: string;
  resource_type: string;
  resource_id: UUID;
  details: Record<string, any>;
  timestamp: string;
}

// Asset Management Types
export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  OTHER = 'other'
}

export interface Asset {
  id: UUID;
  tenant_id: UUID;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  asset_type: AssetType;
  alt_text?: string;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  is_active: boolean;
  is_optimized: boolean;
  usage_count: number;
  usage_locations?: any[];
  created_at: string;
  updated_at: string;
}

export interface AssetList {
  items: Asset[];
  total: number;
  offset: number;
  limit: number;
}

// Banner Types
export enum BannerType {
  HERO = 'hero',
  PROMOTION = 'promotion',
  ANNOUNCEMENT = 'announcement',
  SPECIAL = 'special'
}

export enum BannerStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  INACTIVE = 'inactive'
}

export enum TargetAudience {
  ALL = 'all',
  NEW_USERS = 'new_users',
  RETURNING_USERS = 'returning_users',
  MOBILE = 'mobile',
  DESKTOP = 'desktop'
}

export interface Banner {
  id: UUID;
  tenant_id: UUID;
  title: string;
  banner_type: BannerType;
  asset_id: UUID;
  link_url?: string;
  content?: Record<string, any>;
  start_date?: string;
  end_date?: string;
  display_order: number;
  target_audience?: TargetAudience[];
  custom_target?: Record<string, any>;
  custom_styles?: Record<string, any>;
  status: BannerStatus;
  created_at: string;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
}

export interface BannerList {
  items: Banner[];
  total: number;
  offset: number;
  limit: number;
}

// Logo Types
export enum LogoType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  FOOTER = 'footer',
  MOBILE = 'mobile',
  FAVICON = 'favicon'
}

export enum LogoStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  INACTIVE = 'inactive'
}

export interface Logo {
  id: UUID;
  tenant_id: UUID;
  name: string;
  logo_type: LogoType;
  asset_id: UUID;
  display_settings: Record<string, any>;
  responsive_settings: Record<string, any>;
  start_date?: string;
  end_date?: string;
  status: LogoStatus;
  created_at: string;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
}

export interface LogoList {
  items: Logo[];
  total: number;
  offset: number;
  limit: number;
}

export interface Logo {
  id: UUID;
  tenant_id: UUID;
  name: string;
  logo_type: LogoType;
  asset_id: UUID;
  display_settings: Record<string, any>;
  responsive_settings: Record<string, any>;
  start_date?: string;
  end_date?: string;
  status: LogoStatus;
  created_at: string;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
}

export interface LogoList {
  items: Logo[];
  total: number;
  offset: number;
  limit: number;
}

// Component Types
export enum ComponentType {
  HERO = 'hero',
  PRODUCT_CARD = 'product_card',
  CALL_TO_ACTION = 'call_to_action',
  TEXT_BLOCK = 'text_block',
  TESTIMONIAL = 'testimonial',
  FEATURE_LIST = 'feature_list',
  NEWSLETTER_SIGNUP = 'newsletter_signup',
  IMAGE_GALLERY = 'image_gallery',
  CUSTOM = 'custom'
}

export enum ComponentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export interface Component {
  id: UUID;
  tenant_id: UUID;
  name: string;
  component_type: ComponentType;
  configuration: Record<string, any>;
  description?: string;
  is_global: boolean;
  tags: string[];
  status: ComponentStatus;
  created_at: string;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
  duplicated_from?: UUID;
}

export interface ComponentList {
  items: Component[];
  total: number;
  offset: number;
  limit: number;
}

export interface ComponentUsage {
  location_type: string;
  location_id: UUID;
  location_name: string;
  section?: string;
}

// Page Template Types
export enum PageTemplateType {
  HOME = 'home',
  PRODUCT = 'product',
  CATEGORY = 'category',
  ABOUT = 'about',
  CONTACT = 'contact',
  CUSTOM = 'custom'
}

export enum TemplateStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export interface PageTemplate {
  id: UUID;
  tenant_id: UUID;
  name: string;
  template_type: PageTemplateType;
  structure: Record<string, any>;
  description?: string;
  is_default: boolean;
  tags: string[];
  status: TemplateStatus;
  created_at: string;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
  duplicated_from?: UUID;
}

export interface PageTemplateList {
  items: PageTemplate[];
  total: number;
  offset: number;
  limit: number;
}
