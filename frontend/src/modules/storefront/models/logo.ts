import type { TenantScoped, UUID } from '@/modules/core/models/base';
import type { PaginatedResult } from '@/modules/core/models/pagination';

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

export type LogoList = PaginatedResult<Logo>;

export interface CreateLogoRequest {
  name: string;
  logo_type: string;
  asset_id: string;
  display_settings: Record<string, unknown>;
  responsive_settings: Record<string, unknown>;
  start_date?: string;
  end_date?: string;
  // Add other fields as needed for creation
}

export interface LogoResponse {
  logo: Logo;
}

export interface LogosResponse {
  logos: Logo[];
  total: number;
}
