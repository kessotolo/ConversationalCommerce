import type { Draftable } from '@/modules/core/models/base';
import type { PaginatedResult } from '@/modules/core/models/pagination';

export interface Draft extends Draftable {
  name: string;
  description: string;
  changes: Record<string, unknown>;
  // status is inherited from Draftable
}

export type DraftList = PaginatedResult<Draft>;

export interface CreateDraftRequest {
  name: string;
  description: string;
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
  total: number;
}
