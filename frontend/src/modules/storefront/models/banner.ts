import type { TenantScoped, UUID } from '@/modules/core/models/base';
import type { PaginatedResult } from '@/modules/core/models/pagination';

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

export type BannerList = PaginatedResult<Banner>;

export interface CreateBannerRequest {
  title: string;
  content: Record<string, unknown>;
  start_date?: string;
  end_date?: string;
  // Add other fields as needed for creation
}

export interface BannerResponse {
  banner: Banner;
}

export interface BannersResponse {
  banners: Banner[];
  total: number;
}
