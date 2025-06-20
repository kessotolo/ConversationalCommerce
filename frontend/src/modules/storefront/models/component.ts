import type { TenantScoped, UUID } from '@/modules/core/models/base';
import type { PaginatedResult } from '@/modules/core/models/pagination';

export enum ComponentType {
  HERO = 'hero',
  PRODUCT_CARD = 'product_card',
  CALL_TO_ACTION = 'call_to_action',
  TEXT_BLOCK = 'text_block',
  TESTIMONIAL = 'testimonial',
  FEATURE_LIST = 'feature_list',
  NEWSLETTER_SIGNUP = 'newsletter_signup',
  IMAGE_GALLERY = 'image_gallery',
  CUSTOM = 'custom',
}

export enum ComponentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface Component extends TenantScoped {
  name: string;
  component_type: ComponentType;
  configuration: Record<string, unknown>;
  description?: string;
  is_global: boolean;
  tags: string[];
  status: ComponentStatus;
  created_by: UUID;
  modified_at?: string;
  modified_by?: UUID;
  published_at?: string;
  published_by?: UUID;
  duplicated_from?: UUID;
}

export type ComponentList = PaginatedResult<Component>;

export interface ComponentUsage {
  location_type: string;
  location_id: UUID;
  location_name: string;
  section?: string;
}

export interface StorefrontComponent {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface CreateComponentRequest {
  name: string;
  type: string;
  config: Record<string, unknown>;
}

export interface ComponentResponse {
  component: StorefrontComponent;
}

export interface ComponentsResponse {
  components: StorefrontComponent[];
  total: number;
}
