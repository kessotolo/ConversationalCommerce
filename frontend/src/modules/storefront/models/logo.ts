import { TenantScoped, UUID } from '@/modules/core/models/base';
import { PaginatedResult } from '@/modules/core/models/pagination';

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
  display_settings: Record<string, any>;
  responsive_settings: Record<string, any>;
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
