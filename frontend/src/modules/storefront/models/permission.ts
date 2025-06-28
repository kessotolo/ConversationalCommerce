import type { UUID } from '@/modules/core/models/base';
import type { PaginatedResult } from '@/modules/core/models/pagination';

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

export type UserPermissionsList = PaginatedResult<UserPermission>;

export interface AssignRoleRequest {
  role: StorefrontRole;
}

export interface SetSectionPermissionRequest {
  section: string;
  permission: string;
}

export interface SetComponentPermissionRequest {
  componentId: string;
  permission: string;
}

export interface PermissionResponse {
  permission: Permission;
}

export interface PermissionsResponse {
  permissions: Permission[];
  total: number;
}
