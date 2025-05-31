import { UUID, TenantScoped, PaginatedResult } from '@core/models/base';

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

export interface PageTemplate extends TenantScoped {
  name: string;
  template_type: PageTemplateType;
  structure: Record<string, any>;
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
