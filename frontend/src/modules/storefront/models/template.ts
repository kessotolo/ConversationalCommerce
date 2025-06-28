import type { TenantScoped, UUID } from '@/modules/core/models/base';
import type { PaginatedResult } from '@/modules/core/models/pagination';

export enum PageTemplateType {
  HOME = 'home',
  PRODUCT = 'product',
  CATEGORY = 'category',
  ABOUT = 'about',
  CONTACT = 'contact',
  CUSTOM = 'custom',
}

export enum TemplateStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface PageTemplate extends TenantScoped {
  name: string;
  template_type: PageTemplateType;
  structure: Record<string, unknown>;
  description?: string;
  is_default: boolean;
  tags: string[];
  status: TemplateStatus;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
  duplicated_from?: UUID;
}

export type PageTemplateList = PaginatedResult<PageTemplate>;
