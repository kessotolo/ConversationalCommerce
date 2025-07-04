/* global console, setTimeout, localStorage */
// Using dynamic import approach for axios like in the main API file

import axios from 'axios';

import { API_BASE_URL, API_TIMEOUT, RETRY_ATTEMPTS, FEATURES } from '@/config';
import type { ApiResponse } from '@/lib/api';
import { parseApiError } from '@/lib/utils';
import type { Asset, AssetResponse, AssetsResponse } from '@/modules/storefront/models/asset';
import type {
  Banner,
  CreateBannerRequest,
  BannerResponse,
  BannersResponse,
} from '@/modules/storefront/models/banner';
import type {
  StorefrontComponent,
  CreateComponentRequest,
  ComponentResponse,
  ComponentsResponse,
} from '@/modules/storefront/models/component';
import type {
  CreateDraftRequest,
  UpdateDraftRequest,
  DraftResponse,
  DraftsResponse,
} from '@/modules/storefront/models/draft';
import type {
  Logo,
  CreateLogoRequest,
  LogoResponse,
  LogosResponse,
} from '@/modules/storefront/models/logo';
import type {
  AssignRoleRequest,
  SetSectionPermissionRequest,
  SetComponentPermissionRequest,
  PermissionResponse,
  PermissionsResponse,
} from '@/modules/storefront/models/permission';

// Create optimized axios instance for storefront editor
// Using separate instance with specific timeout for editor operations
// This helps with connectivity issues common in African markets
const editorAxios = axios.create({
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Add retry logic for better resilience in low-connectivity environments common in African markets
editorAxios.interceptors.response.use(null, async (error: unknown) => {
  // Use type guard for axios errors
  if (typeof error === 'object' && error !== null && 'config' in error) {
    const err = error as { config: Record<string, unknown> };
    if (typeof err.config === 'object' && err.config !== null) {
      if (!('retry' in err.config)) {
        err.config['retry'] = 0;
      }
      if (typeof err.config['retry'] === 'number' && err.config['retry'] >= RETRY_ATTEMPTS) {
        return Promise.reject(parseApiError(error));
      }
      err.config['retry'] = (err.config['retry'] as number) + 1;
      const delay = 1000 * Math.pow(2, err.config['retry'] as number) * (0.9 + Math.random() * 0.2);
      await new Promise<void>((resolve) =>
        typeof setTimeout !== 'undefined' ? setTimeout(resolve, delay) : resolve(),
      );
      return editorAxios(err.config);
    }
  }
  return Promise.reject(parseApiError(error));
});

// Types for the API responses using UUIDs
type UUID = string; // UUID represented as string but validated as UUID on backend

// API integration for Storefront Editor
// Optimized for mobile-first African markets with bandwidth conservation
const API_URL = `${API_BASE_URL}/v1/storefronts`;

// Progressive loading helpers - allow partial content loading on slow connections
const progressiveLoad = <T>(data: T, priority: string[] = []): T => {
  if (!FEATURES.lowBandwidthMode || !priority.length) return data;

  // When in low bandwidth mode, only return high priority fields
  if (typeof data === 'object' && data !== null) {
    const result = {} as T;
    priority.forEach((key) => {
      if (key in data) {
        result[key as keyof T] = data[key as keyof T];
      }
    });
    return result;
  }

  return data;
};

// Draft/Publish API
export const getDrafts = async (
  tenantId: UUID,
  skip = 0,
  limit = 10,
): Promise<ApiResponse<DraftsResponse>> => {
  try {
    // Reduce limit in low bandwidth mode to load faster
    const adjustedLimit = FEATURES.lowBandwidthMode ? Math.min(limit, 5) : limit;

    const response = await editorAxios.get(`${API_URL}/${tenantId}/drafts`, {
      params: { skip, limit: adjustedLimit },
    });

    // Apply progressive loading with high priority fields first
    return progressiveLoad(response.data, ['id', 'name', 'status', 'updated_at']);
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch drafts:', error);

    // Store locally for offline access if available
    if (FEATURES.offlineMode && typeof localStorage !== 'undefined') {
      const cachedData = localStorage.getItem(`drafts_${tenantId}`);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    }

    throw parseApiError(error);
  }
};

export const getDraft = async (
  tenantId: UUID,
  draftId: UUID,
): Promise<ApiResponse<DraftResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/drafts/${draftId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch draft:', error);
    throw parseApiError(error);
  }
};

export const createDraft = async (
  tenantId: UUID,
  draftData: CreateDraftRequest,
): Promise<ApiResponse<DraftResponse>> => {
  try {
    const response = await editorAxios.post(`${API_URL}/${tenantId}/drafts`, draftData);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to create draft:', error);
    throw parseApiError(error);
  }
};

export const updateDraft = async (
  tenantId: UUID,
  draftId: UUID,
  draftData: UpdateDraftRequest,
): Promise<ApiResponse<DraftResponse>> => {
  try {
    const response = await editorAxios.put(`${API_URL}/${tenantId}/drafts/${draftId}`, draftData);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to update draft:', error);
    throw parseApiError(error);
  }
};

export const publishDraft = async (
  tenantId: UUID,
  draftId: UUID,
  scheduleTime?: Date,
): Promise<ApiResponse<DraftResponse>> => {
  try {
    const response = await editorAxios.put(`${API_URL}/${tenantId}/drafts/${draftId}/publish`, {
      schedule_time: scheduleTime ? scheduleTime.toISOString() : undefined,
    });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to publish draft:', error);
    throw parseApiError(error);
  }
};

export const deleteDraft = async (
  tenantId: UUID,
  draftId: UUID,
): Promise<ApiResponse<{ success: boolean }>> => {
  try {
    const response = await editorAxios.delete(`${API_URL}/${tenantId}/drafts/${draftId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to delete draft:', error);
    throw parseApiError(error);
  }
};

// Version History API
export const getVersions = async (tenantId: UUID, skip = 0, limit = 10, tags?: string[]) => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/versions`, {
      params: { skip, limit, tags: tags?.join(',') },
    });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch versions:', error);
    throw parseApiError(error);
  }
};

export const getVersion = async (tenantId: UUID, versionId: UUID) => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/versions/${versionId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch version:', error);
    throw parseApiError(error);
  }
};

export const restoreVersion = async (tenantId: UUID, versionId: UUID) => {
  try {
    const response = await editorAxios.post(`${API_URL}/${tenantId}/versions/${versionId}/restore`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to restore version:', error);
    throw parseApiError(error);
  }
};

export const compareVersions = async (tenantId: UUID, v1: UUID, v2: UUID) => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/versions/compare`, {
      params: { v1, v2 },
    });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to compare versions:', error);
    throw parseApiError(error);
  }
};

// Permissions API
export const getPermissions = async (tenantId: UUID): Promise<ApiResponse<PermissionsResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/permissions`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch permissions:', error);
    throw parseApiError(error);
  }
};

export const getUserPermission = async (
  tenantId: UUID,
  userId: UUID,
): Promise<ApiResponse<PermissionResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/permissions/${userId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch user permission:', error);
    throw error;
  }
};

export const assignRole = async (
  tenantId: UUID,
  userId: UUID,
  roleData: AssignRoleRequest,
): Promise<ApiResponse<PermissionResponse>> => {
  try {
    const response = await editorAxios.put(
      `${API_URL}/${tenantId}/permissions/${userId}/role`,
      roleData,
    );
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to assign role:', error);
    throw error;
  }
};

export const setSectionPermission = async (
  tenantId: UUID,
  userId: UUID,
  sectionData: SetSectionPermissionRequest,
): Promise<ApiResponse<PermissionResponse>> => {
  try {
    const response = await editorAxios.put(
      `${API_URL}/${tenantId}/permissions/${userId}/section`,
      sectionData,
    );
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to set section permission:', error);
    throw error;
  }
};

export const setComponentPermission = async (
  tenantId: UUID,
  userId: UUID,
  componentData: SetComponentPermissionRequest,
): Promise<ApiResponse<PermissionResponse>> => {
  try {
    const response = await editorAxios.put(
      `${API_URL}/${tenantId}/permissions/${userId}/component`,
      componentData,
    );
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to set component permission:', error);
    throw error;
  }
};

export const removePermission = async (
  tenantId: UUID,
  userId: UUID,
): Promise<ApiResponse<{ success: boolean }>> => {
  try {
    const response = await editorAxios.delete(`${API_URL}/${tenantId}/permissions/${userId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to remove permission:', error);
    throw error;
  }
};

// Define AuditLogParams, PageTemplateParams, and PageLayoutData types
export interface AuditLogParams {
  startDate?: string;
  endDate?: string;
  actionTypes?: string[];
  userId?: string;
  page?: number;
  limit?: number;
}
export interface PageTemplateParams {
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}
export interface PageLayoutData {
  layout: Record<string, unknown>;
  updatedBy: string;
}

export const getAuditLog = async (tenantId: UUID, params?: AuditLogParams) => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/audit-log`, { params });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch audit log:', error);
    throw parseApiError(error);
  }
};

// Asset Management API
export const getAssets = async (
  tenantId: UUID,
  params?: Record<string, unknown>,
): Promise<ApiResponse<AssetsResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/assets`, { params });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch assets:', error);
    throw error;
  }
};

export const getAsset = async (
  tenantId: UUID,
  assetId: UUID,
): Promise<ApiResponse<AssetResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/assets/${assetId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch asset:', error);
    throw error;
  }
};

export const uploadAsset = async (
  tenantId: UUID,
  formData: FormData,
): Promise<ApiResponse<AssetResponse>> => {
  try {
    const response = await editorAxios.post(`${API_URL}/${tenantId}/assets`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to upload asset:', error);
    throw error;
  }
};

export const updateAsset = async (
  tenantId: UUID,
  assetId: UUID,
  assetData: Partial<Asset>,
): Promise<ApiResponse<AssetResponse>> => {
  try {
    const response = await editorAxios.put(`${API_URL}/${tenantId}/assets/${assetId}`, assetData);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to update asset:', error);
    throw error;
  }
};

export const deleteAsset = async (
  tenantId: UUID,
  assetId: UUID,
): Promise<ApiResponse<{ success: boolean }>> => {
  try {
    const response = await editorAxios.delete(`${API_URL}/${tenantId}/assets/${assetId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to delete asset:', error);
    throw error;
  }
};

export const optimizeAsset = async (
  tenantId: UUID,
  assetId: UUID,
): Promise<ApiResponse<AssetResponse>> => {
  try {
    const response = await editorAxios.post(`${API_URL}/${tenantId}/assets/${assetId}/optimize`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to optimize asset:', error);
    throw error;
  }
};

// Banner Management API
export const getBanners = async (
  tenantId: UUID,
  params?: Record<string, unknown>,
): Promise<ApiResponse<BannersResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/banners`, { params });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch banners:', error);
    throw error;
  }
};

export const getBanner = async (
  tenantId: UUID,
  bannerId: UUID,
): Promise<ApiResponse<BannerResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/banners/${bannerId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch banner:', error);
    throw error;
  }
};

export const createBanner = async (
  tenantId: UUID,
  bannerData: CreateBannerRequest,
): Promise<ApiResponse<BannerResponse>> => {
  try {
    const response = await editorAxios.post(`${API_URL}/${tenantId}/banners`, bannerData);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to create banner:', error);
    throw error;
  }
};

export const updateBanner = async (
  tenantId: UUID,
  bannerId: UUID,
  bannerData: Partial<Banner>,
): Promise<ApiResponse<BannerResponse>> => {
  try {
    const response = await editorAxios.put(
      `${API_URL}/${tenantId}/banners/${bannerId}`,
      bannerData,
    );
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to update banner:', error);
    throw error;
  }
};

export const publishBanner = async (
  tenantId: UUID,
  bannerId: UUID,
): Promise<ApiResponse<BannerResponse>> => {
  try {
    const response = await editorAxios.put(`${API_URL}/${tenantId}/banners/${bannerId}/publish`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to publish banner:', error);
    throw error;
  }
};

export const deleteBanner = async (
  tenantId: UUID,
  bannerId: UUID,
): Promise<ApiResponse<{ success: boolean }>> => {
  try {
    const response = await editorAxios.delete(`${API_URL}/${tenantId}/banners/${bannerId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to delete banner:', error);
    throw error;
  }
};

export const reorderBanners = async (
  tenantId: UUID,
  orderData: { order: UUID[] },
): Promise<ApiResponse<BannersResponse>> => {
  try {
    const response = await editorAxios.put(`${API_URL}/${tenantId}/banners/order`, orderData);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to reorder banners:', error);
    throw error;
  }
};

// Logo Management API
export const getLogos = async (
  tenantId: UUID,
  params?: Record<string, unknown>,
): Promise<ApiResponse<LogosResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/logos`, { params });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch logos:', error);
    throw error;
  }
};

export const getLogo = async (tenantId: UUID, logoId: UUID): Promise<ApiResponse<LogoResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/logos/${logoId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch logo:', error);
    throw error;
  }
};

export const createLogo = async (
  tenantId: UUID,
  logoData: CreateLogoRequest,
): Promise<ApiResponse<LogoResponse>> => {
  try {
    const response = await editorAxios.post(`${API_URL}/${tenantId}/logos`, logoData);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to create logo:', error);
    throw error;
  }
};

export const updateLogo = async (
  tenantId: UUID,
  logoId: UUID,
  logoData: Partial<Logo>,
): Promise<ApiResponse<LogoResponse>> => {
  try {
    const response = await editorAxios.put(`${API_URL}/${tenantId}/logos/${logoId}`, logoData);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to update logo:', error);
    throw error;
  }
};

export const deleteLogo = async (
  tenantId: UUID,
  logoId: UUID,
): Promise<ApiResponse<{ success: boolean }>> => {
  try {
    const response = await editorAxios.delete(`${API_URL}/${tenantId}/logos/${logoId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to delete logo:', error);
    throw error;
  }
};

export const publishLogo = async (
  tenantId: UUID,
  logoId: UUID,
): Promise<ApiResponse<LogoResponse>> => {
  try {
    const response = await editorAxios.put(`${API_URL}/${tenantId}/logos/${logoId}/publish`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to publish logo:', error);
    throw error;
  }
};

// Component API
export const getComponents = async (
  tenantId: UUID,
  params?: Record<string, unknown>,
): Promise<ApiResponse<ComponentsResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/components`, { params });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch components:', error);
    throw error;
  }
};

export const getComponent = async (
  tenantId: UUID,
  componentId: UUID,
): Promise<ApiResponse<ComponentResponse>> => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/components/${componentId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch component:', error);
    throw error;
  }
};

export const createComponent = async (
  tenantId: UUID,
  componentData: CreateComponentRequest,
): Promise<ApiResponse<ComponentResponse>> => {
  try {
    const response = await editorAxios.post(`${API_URL}/${tenantId}/components`, componentData);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to create component:', error);
    throw error;
  }
};

export const updateComponent = async (
  tenantId: UUID,
  componentId: UUID,
  componentData: Partial<StorefrontComponent>,
): Promise<ApiResponse<ComponentResponse>> => {
  try {
    const response = await editorAxios.put(
      `${API_URL}/${tenantId}/components/${componentId}`,
      componentData,
    );
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to update component:', error);
    throw error;
  }
};

export const deleteComponent = async (
  tenantId: UUID,
  componentId: UUID,
): Promise<ApiResponse<{ success: boolean }>> => {
  try {
    const response = await editorAxios.delete(`${API_URL}/${tenantId}/components/${componentId}`);
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to delete component:', error);
    throw error;
  }
};

export const getPageTemplates = async (tenantId: UUID, params?: PageTemplateParams) => {
  try {
    const response = await editorAxios.get(`${API_URL}/${tenantId}/page-templates`, { params });
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to fetch page templates:', error);
    throw parseApiError(error);
  }
};

export const updatePageLayout = async (
  tenantId: UUID,
  pageId: UUID,
  layoutData: PageLayoutData,
) => {
  try {
    const response = await editorAxios.put(
      `${API_URL}/${tenantId}/pages/${pageId}/layout`,
      layoutData,
    );
    return response.data;
  } catch (error) {
    if (typeof console !== 'undefined') console.error('Failed to update page layout:', error);
    throw parseApiError(error);
  }
};
