

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
  content?: Record<string, any>;
  start_date?: string;
  end_date?: string;
  display_order: number;
  target_audience?: TargetAudience[];
  custom_target?: Record<string, any>;
  custom_styles?: Record<string, any>;
  status: BannerStatus;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
}

export type BannerList = PaginatedResult<Banner>;
