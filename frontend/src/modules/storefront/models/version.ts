

export interface Version extends Entity {
  storefront_config_id: UUID;
  version_number: number;
  created_by: UUID;
  change_summary: string;
  change_description: string;
  tags: string[];
  configuration_snapshot: Record<string, any>;
}

export type VersionList = PaginatedResult<Version>;

export interface VersionDiff {
  differences: Record<string, any>;
  version1: UUID;
  version2: UUID;
}
