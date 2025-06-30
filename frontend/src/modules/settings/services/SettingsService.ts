import { api } from '@/lib/axios';
import {
  SettingsDomain,
  Setting,
  DomainWithSettings,
  BulkSettingUpdate,
  SettingUpdateResult,
  SettingValidationResult
} from '../models/settings';

/**
 * Service for managing application settings
 */
export class SettingsService {
  /**
   * Get all settings domains
   * @returns List of settings domains
   */
  async getDomains(): Promise<SettingsDomain[]> {
    const response = await api.get<SettingsDomain[]>('/settings/domains');
    return response.data;
  }

  /**
   * Get a settings domain by ID
   * @param id - Domain ID
   * @returns Settings domain
   */
  async getDomain(id: string): Promise<SettingsDomain> {
    const response = await api.get<SettingsDomain>(`/settings/domains/${id}`);
    return response.data;
  }

  /**
   * Get a settings domain by name
   * @param name - Domain name
   * @returns Settings domain
   */
  async getDomainByName(name: string): Promise<SettingsDomain> {
    const response = await api.get<SettingsDomain>(`/settings/domains/name/${name}`);
    return response.data;
  }

  /**
   * Get a settings domain with all its settings
   * @param id - Domain ID
   * @returns Domain with settings
   */
  async getDomainWithSettings(id: string): Promise<DomainWithSettings> {
    const response = await api.get<DomainWithSettings>(`/settings/domains/${id}/settings`);
    return response.data;
  }

  /**
   * Get a settings domain by name with all its settings
   * @param name - Domain name
   * @returns Domain with settings
   */
  async getDomainByNameWithSettings(name: string): Promise<DomainWithSettings> {
    const response = await api.get<DomainWithSettings>(`/settings/domains/name/${name}/settings`);
    return response.data;
  }

  /**
   * Get all settings
   * @param domainId - Optional domain ID to filter by
   * @returns List of settings
   */
  async getSettings(domainId?: string): Promise<Setting[]> {
    const url = domainId ? `/settings/?domain_id=${domainId}` : '/settings/';
    const response = await api.get<Setting[]>(url);
    return response.data;
  }

  /**
   * Get a setting by ID
   * @param id - Setting ID
   * @returns Setting
   */
  async getSetting(id: string): Promise<Setting> {
    const response = await api.get<Setting>(`/settings/${id}`);
    return response.data;
  }

  /**
   * Get a setting by key
   * @param key - Setting key
   * @param domainId - Domain ID
   * @returns Setting
   */
  async getSettingByKey(key: string, domainId: string): Promise<Setting> {
    const response = await api.get<Setting>(`/settings/key/${key}?domain_id=${domainId}`);
    return response.data;
  }

  /**
   * Update a setting
   * @param id - Setting ID
   * @param value - New value
   * @returns Updated setting
   */
  async updateSetting(id: string, value: any): Promise<Setting> {
    const response = await api.patch<Setting>(`/settings/${id}`, { value });
    return response.data;
  }

  /**
   * Bulk update settings
   * @param settings - Key-value pairs of settings to update
   * @param domainName - Optional domain name to scope the update
   * @returns Result of the update operation
   */
  async bulkUpdateSettings(settings: Record<string, any>, domainName?: string): Promise<SettingUpdateResult> {
    const url = domainName ? `/settings/bulk?domain_name=${domainName}` : '/settings/bulk';
    const response = await api.patch<SettingUpdateResult>(url, { settings });
    return response.data;
  }

  /**
   * Get all settings as a dictionary
   * @param domainName - Optional domain name to filter by
   * @returns Dictionary of settings
   */
  async getSettingsAsDict(domainName?: string): Promise<Record<string, any>> {
    const url = domainName ? `/settings/dict?domain_name=${domainName}` : '/settings/dict';
    const response = await api.get<Record<string, any>>(url);
    return response.data;
  }

  /**
   * Validate settings
   * @param values - Values to validate
   * @param domainName - Optional domain name to scope the validation
   * @returns Validation result
   */
  async validateSettings(values: Record<string, any>, domainName?: string): Promise<SettingValidationResult> {
    const url = domainName ? `/settings/validate?domain_name=${domainName}` : '/settings/validate';
    const response = await api.post<SettingValidationResult>(url, { values });
    return response.data;
  }
}
