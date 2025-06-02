// Draft DTOs
export interface Draft {
  id: string;
  name: string;
  status: 'draft' | 'pending' | 'published' | 'scheduled';
  description?: string;
  changes: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface CreateDraftRequest {
  name: string;
  description?: string;
  changes: Record<string, unknown>;
}

export interface UpdateDraftRequest {
  name?: string;
  description?: string;
  changes?: Record<string, unknown>;
}

export interface DraftResponse {
  draft: Draft;
}

export interface DraftsResponse {
  drafts: Draft[];
}

// Asset DTOs
export interface Asset {
  id: string;
  title: string;
  asset_type: 'image' | 'video' | 'document' | 'audio';
  file_path: string;
  original_filename: string;
  file_size: number;
  is_optimized: boolean;
  usage_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface UploadAssetRequest {
  file: File;
  title?: string;
}

export interface AssetResponse {
  asset: Asset;
}

export interface AssetsResponse {
  assets: Asset[];
}

// Banner DTOs
export interface Banner {
  id: string;
  title: string;
  content?: Record<string, unknown>;
  status: 'active' | 'inactive' | 'draft';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateBannerRequest {
  title: string;
  content?: Record<string, unknown>;
  start_date?: string;
  end_date?: string;
}

export interface BannerResponse {
  banner: Banner;
}

export interface BannersResponse {
  banners: Banner[];
}

// Logo DTOs
export interface Logo {
  id: string;
  name: string;
  logo_type: string;
  asset_id: string;
  display_settings: Record<string, unknown>;
  responsive_settings: Record<string, unknown>;
  status: 'draft' | 'published' | 'inactive';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at?: string;
  published_at?: string;
  created_by: string;
  modified_at?: string;
  published_by?: string;
}

export interface CreateLogoRequest {
  name: string;
  logo_type: string;
  asset_id: string;
  display_settings?: Record<string, unknown>;
  responsive_settings?: Record<string, unknown>;
  start_date?: string;
  end_date?: string;
}

export interface LogoResponse {
  logo: Logo;
}

export interface LogosResponse {
  logos: Logo[];
  total: number;
}

// Component DTOs
export interface StorefrontComponent {
  id: string;
  name: string;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface CreateComponentRequest {
  name: string;
  configuration: Record<string, unknown>;
}

export interface ComponentResponse {
  component: StorefrontComponent;
}

export interface ComponentsResponse {
  components: StorefrontComponent[];
}

// Permission DTOs
export interface Permission {
  id: string;
  user_id: string;
  role: string;
  sections: string[];
  components: string[];
  created_at: string;
  updated_at?: string;
}

export interface AssignRoleRequest {
  role: string;
}

export interface SetSectionPermissionRequest {
  section: string;
  permission: string;
}

export interface SetComponentPermissionRequest {
  component: string;
  permission: string;
}

export interface PermissionResponse {
  permission: Permission;
}

export interface PermissionsResponse {
  permissions: Permission[];
}

// Generic API Response
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}
