import type { Entity, UUID } from '@/modules/core/models/base';
import type { PaginatedResult } from '@/modules/core/models/pagination';

export interface Version extends Entity {
  storefront_config_id: UUID;
  version_number: number;
  created_by: UUID;
  change_summary: string;
  change_description: string;
  tags: string[];
  configuration_snapshot: Record<string, unknown>;
  differences: Record<string, unknown>;
}

export type VersionList = PaginatedResult<Version>;

export interface VersionDiff {
  /**
   * Key-value map of differences between versions. Use unknown for dynamic data.
   */
  differences: Record<string, unknown>;
  version1: UUID;
  version2: UUID;
}
