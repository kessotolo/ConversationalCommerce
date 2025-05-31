import { TenantScoped, PaginatedResult } from '@core/models/base';

export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  OTHER = 'other'
}

export interface Asset extends TenantScoped {
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  asset_type: AssetType;
  alt_text?: string;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  is_active: boolean;
  is_optimized: boolean;
  usage_count: number;
  usage_locations?: any[];
}

export type AssetList = PaginatedResult<Asset>;
