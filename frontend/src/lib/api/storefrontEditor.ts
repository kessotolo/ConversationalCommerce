import axios from 'axios';
import { API_BASE_URL } from '../config';

// Types for the API responses using UUIDs
type UUID = string; // UUID represented as string but validated as UUID on backend

// API integration for Storefront Editor
const API_URL = `${API_BASE_URL}/v1/storefronts`;

// Draft/Publish API
export const getDrafts = async (tenantId: UUID, skip = 0, limit = 10) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/drafts`, {
      params: { skip, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch drafts:', error);
    throw error;
  }
};

export const getDraft = async (tenantId: UUID, draftId: UUID) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/drafts/${draftId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch draft:', error);
    throw error;
  }
};

export const createDraft = async (tenantId: UUID, draftData: any) => {
  try {
    const response = await axios.post(`${API_URL}/${tenantId}/drafts`, draftData);
    return response.data;
  } catch (error) {
    console.error('Failed to create draft:', error);
    throw error;
  }
};

export const updateDraft = async (tenantId: UUID, draftId: UUID, draftData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/drafts/${draftId}`, draftData);
    return response.data;
  } catch (error) {
    console.error('Failed to update draft:', error);
    throw error;
  }
};

export const publishDraft = async (tenantId: UUID, draftId: UUID, scheduleTime?: Date) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/drafts/${draftId}/publish`, {
      schedule_time: scheduleTime ? scheduleTime.toISOString() : undefined
    });
    return response.data;
  } catch (error) {
    console.error('Failed to publish draft:', error);
    throw error;
  }
};

export const deleteDraft = async (tenantId: UUID, draftId: UUID) => {
  try {
    const response = await axios.delete(`${API_URL}/${tenantId}/drafts/${draftId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete draft:', error);
    throw error;
  }
};

// Version History API
export const getVersions = async (tenantId: UUID, skip = 0, limit = 10, tags?: string[]) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/versions`, {
      params: { skip, limit, tags: tags?.join(',') }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch versions:', error);
    throw error;
  }
};

export const getVersion = async (tenantId: UUID, versionId: UUID) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/versions/${versionId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch version:', error);
    throw error;
  }
};

export const restoreVersion = async (tenantId: UUID, versionId: UUID) => {
  try {
    const response = await axios.post(`${API_URL}/${tenantId}/versions/${versionId}/restore`);
    return response.data;
  } catch (error) {
    console.error('Failed to restore version:', error);
    throw error;
  }
};

export const compareVersions = async (tenantId: UUID, v1: UUID, v2: UUID) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/versions/compare`, {
      params: { v1, v2 }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to compare versions:', error);
    throw error;
  }
};

// Permissions API
export const getPermissions = async (tenantId: UUID) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/permissions`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    throw error;
  }
};

export const getUserPermission = async (tenantId: UUID, userId: UUID) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/permissions/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user permission:', error);
    throw error;
  }
};

export const assignRole = async (tenantId: UUID, userId: UUID, roleData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/permissions/${userId}/role`, roleData);
    return response.data;
  } catch (error) {
    console.error('Failed to assign role:', error);
    throw error;
  }
};

export const setSectionPermission = async (tenantId: UUID, userId: UUID, sectionData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/permissions/${userId}/section`, sectionData);
    return response.data;
  } catch (error) {
    console.error('Failed to set section permission:', error);
    throw error;
  }
};

export const setComponentPermission = async (tenantId: UUID, userId: UUID, componentData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/permissions/${userId}/component`, componentData);
    return response.data;
  } catch (error) {
    console.error('Failed to set component permission:', error);
    throw error;
  }
};

export const removePermission = async (tenantId: UUID, userId: UUID) => {
  try {
    const response = await axios.delete(`${API_URL}/${tenantId}/permissions/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to remove permission:', error);
    throw error;
  }
};

export const getAuditLog = async (tenantId: UUID, params?: any) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/audit-log`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch audit log:', error);
    throw error;
  }
};

// Asset Management API
export const getAssets = async (tenantId: UUID, params?: any) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/assets`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    throw error;
  }
};

export const getAsset = async (tenantId: UUID, assetId: UUID) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/assets/${assetId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch asset:', error);
    throw error;
  }
};

export const uploadAsset = async (tenantId: UUID, formData: FormData) => {
  try {
    const response = await axios.post(`${API_URL}/${tenantId}/assets`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to upload asset:', error);
    throw error;
  }
};

export const updateAsset = async (tenantId: UUID, assetId: UUID, assetData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/assets/${assetId}`, assetData);
    return response.data;
  } catch (error) {
    console.error('Failed to update asset:', error);
    throw error;
  }
};

export const deleteAsset = async (tenantId: UUID, assetId: UUID) => {
  try {
    const response = await axios.delete(`${API_URL}/${tenantId}/assets/${assetId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete asset:', error);
    throw error;
  }
};

export const optimizeAsset = async (tenantId: UUID, assetId: UUID) => {
  try {
    const response = await axios.post(`${API_URL}/${tenantId}/assets/${assetId}/optimize`);
    return response.data;
  } catch (error) {
    console.error('Failed to optimize asset:', error);
    throw error;
  }
};

// Banner Management API
export const getBanners = async (tenantId: UUID, params?: any) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/banners`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch banners:', error);
    throw error;
  }
};

export const getBanner = async (tenantId: UUID, bannerId: UUID) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/banners/${bannerId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch banner:', error);
    throw error;
  }
};

export const createBanner = async (tenantId: UUID, bannerData: any) => {
  try {
    const response = await axios.post(`${API_URL}/${tenantId}/banners`, bannerData);
    return response.data;
  } catch (error) {
    console.error('Failed to create banner:', error);
    throw error;
  }
};

export const updateBanner = async (tenantId: UUID, bannerId: UUID, bannerData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/banners/${bannerId}`, bannerData);
    return response.data;
  } catch (error) {
    console.error('Failed to update banner:', error);
    throw error;
  }
};

export const publishBanner = async (tenantId: UUID, bannerId: UUID) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/banners/${bannerId}/publish`);
    return response.data;
  } catch (error) {
    console.error('Failed to publish banner:', error);
    throw error;
  }
};

export const deleteBanner = async (tenantId: UUID, bannerId: UUID) => {
  try {
    const response = await axios.delete(`${API_URL}/${tenantId}/banners/${bannerId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete banner:', error);
    throw error;
  }
};

export const reorderBanners = async (tenantId: UUID, orderData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/banners/order`, orderData);
    return response.data;
  } catch (error) {
    console.error('Failed to reorder banners:', error);
    throw error;
  }
};

// Logo Management API
export const getLogos = async (tenantId: UUID, params?: any) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/logos`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch logos:', error);
    throw error;
  }
};

export const getLogo = async (tenantId: UUID, logoId: UUID) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/logos/${logoId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch logo:', error);
    throw error;
  }
};

export const createLogo = async (tenantId: UUID, logoData: any) => {
  try {
    const response = await axios.post(`${API_URL}/${tenantId}/logos`, logoData);
    return response.data;
  } catch (error) {
    console.error('Failed to create logo:', error);
    throw error;
  }
};

export const updateLogo = async (tenantId: UUID, logoId: UUID, logoData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/logos/${logoId}`, logoData);
    return response.data;
  } catch (error) {
    console.error('Failed to update logo:', error);
    throw error;
  }
};

export const deleteLogo = async (tenantId: UUID, logoId: UUID) => {
  try {
    const response = await axios.delete(`${API_URL}/${tenantId}/logos/${logoId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete logo:', error);
    throw error;
  }
};

export const publishLogo = async (tenantId: UUID, logoId: UUID) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/logos/${logoId}/publish`);
    return response.data;
  } catch (error) {
    console.error('Failed to publish logo:', error);
    throw error;
  }
};

// Component API
export const getComponents = async (tenantId: UUID, params?: any) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/components`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch components:', error);
    throw error;
  }
};

export const getComponent = async (tenantId: UUID, componentId: UUID) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/components/${componentId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch component:', error);
    throw error;
  }
};

export const createComponent = async (tenantId: UUID, componentData: any) => {
  try {
    const response = await axios.post(`${API_URL}/${tenantId}/components`, componentData);
    return response.data;
  } catch (error) {
    console.error('Failed to create component:', error);
    throw error;
  }
};

export const updateComponent = async (tenantId: UUID, componentId: UUID, componentData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/components/${componentId}`, componentData);
    return response.data;
  } catch (error) {
    console.error('Failed to update component:', error);
    throw error;
  }
};

export const deleteComponent = async (tenantId: UUID, componentId: UUID) => {
  try {
    const response = await axios.delete(`${API_URL}/${tenantId}/components/${componentId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete component:', error);
    throw error;
  }
};

export const getPageTemplates = async (tenantId: UUID, params?: any) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/page-templates`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch page templates:', error);
    throw error;
  }
};

export const updatePageLayout = async (tenantId: UUID, pageId: UUID, layoutData: any) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/pages/${pageId}/layout`, layoutData);
    return response.data;
  } catch (error) {
    console.error('Failed to update page layout:', error);
    throw error;
  }
};
