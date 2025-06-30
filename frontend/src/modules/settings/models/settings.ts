/**
 * Settings models for the frontend
 */

export interface SettingsDomain {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  isSystem: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  id: string;
  key: string;
  value: any;
  valueType: string;
  domainId: string;
  isEncrypted: boolean;
  isSystem: boolean;
  description?: string;
  defaultValue?: any;
  isRequired: boolean;
  uiComponent?: string;
  uiOrder: number;
  schema?: any;
  validationRules?: any;
  tenantId: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DomainWithSettings extends SettingsDomain {
  settings: Setting[];
}

export interface SettingValidationError {
  key: string;
  error: string;
}

export interface SettingValidationResult {
  valid: boolean;
  errors: SettingValidationError[];
}

export interface BulkSettingUpdate {
  settings: Record<string, any>;
}

export interface SettingUpdateResult {
  updated: Record<string, any>;
}

// UI component types for rendering different setting types
export enum SettingComponentType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  TOGGLE = 'toggle',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  COLOR = 'color',
  IMAGE = 'image',
  PASSWORD = 'password',
  JSON = 'json',
  CODE = 'code',
  RICH_TEXT = 'rich_text',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
}

// Value types for settings
export enum SettingValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
}
