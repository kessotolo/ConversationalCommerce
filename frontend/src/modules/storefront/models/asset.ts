import type { TenantScoped } from '@/modules/core/models/base';
import type { PaginatedResult } from '@/modules/core/models/pagination';

export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  OTHER = 'other',
}

// Define AssetMetadata if possible, otherwise use Record<string, unknown>
export interface AssetMetadata {
  [key: string]: unknown;
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
  metadata: AssetMetadata;
  is_active: boolean;
  is_optimized: boolean;
  usage_count: number;
  usage_locations?: string[]; // Replace with a more specific type if possible
}

export type AssetList = PaginatedResult<Asset>;

export interface UploadAssetRequest {
  file: File;
  name?: string;
  description?: string;
}

export interface AssetResponse {
  asset: Asset;
}

export interface AssetsResponse {
  assets: Asset[];
  total: number;
}
