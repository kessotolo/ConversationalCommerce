// Public types for storefront module. Do not import from models/ in other modules; import from this file.

import type { UUID, TenantScoped, Draftable, Entity } from '@/modules/core/models/base';

export enum BannerType {
  HERO = 'hero',
  PROMOTION = 'promotion',
  ANNOUNCEMENT = 'announcement',
  SPECIAL = 'special',
}

export enum BannerStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  INACTIVE = 'inactive',
}

export enum TargetAudience {
  ALL = 'all',
  NEW_USERS = 'new_users',
  RETURNING_USERS = 'returning_users',
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
}

export interface Banner extends TenantScoped {
  title: string;
  banner_type: BannerType;
  asset_id: UUID;
  link_url?: string;
  content?: Record<string, unknown>;
  start_date?: string;
  end_date?: string;
  display_order: number;
  target_audience?: TargetAudience[];
  custom_target?: Record<string, unknown>;
  custom_styles?: Record<string, unknown>;
  status: BannerStatus;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
}

export enum LogoType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  FOOTER = 'footer',
  MOBILE = 'mobile',
  FAVICON = 'favicon',
}

export enum LogoStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  INACTIVE = 'inactive',
}

export interface Logo extends TenantScoped {
  name: string;
  logo_type: LogoType;
  asset_id: UUID;
  display_settings: Record<string, unknown>;
  responsive_settings: Record<string, unknown>;
  start_date?: string;
  end_date?: string;
  status: LogoStatus;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
}

export interface Draft extends Draftable {
  name: string;
  description: string;
  changes: Record<string, unknown>;
}

export interface Version extends Entity {
  storefront_config_id: UUID;
  version_number: number;
  created_by: UUID;
  change_summary: string;
  change_description: string;
  tags: string[];
  configuration_snapshot: Record<string, unknown>;
  differences: Record<string, unknown>;
}

export interface VersionDiff {
  differences: Record<string, unknown>;
}

export enum StorefrontRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  PUBLISHER = 'publisher',
  ADMIN = 'admin',
}

export enum StorefrontSectionType {
  THEME = 'theme',
  LAYOUT = 'layout',
  CONTENT = 'content',
  PRODUCTS = 'products',
  SETTINGS = 'settings',
  BANNERS = 'banners',
  ASSETS = 'assets',
  SEO = 'seo',
}

export interface Permission {
  id: UUID;
  user_id: UUID;
  role: StorefrontRole;
  section: StorefrontSectionType;
  created_at: string;
  updated_at?: string;
}

export interface UserPermission extends Permission {
  user_email: string;
  user_name: string;
}

export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  OTHER = 'other',
}

export interface AssetMetadata {
  [key: string]: unknown;
}

export interface Asset extends TenantScoped {
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  asset_type: AssetType;
  alt_text?: string;
  title: string;
  description?: string;
  metadata: AssetMetadata;
  is_active: boolean;
  is_optimized: boolean;
  usage_count: number;
  usage_locations?: string[];
}
