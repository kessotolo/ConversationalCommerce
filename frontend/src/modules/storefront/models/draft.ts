import { Draftable } from '@/modules/core/models/base';
import { PaginatedResult } from '@/modules/core/models/pagination';

export interface Draft extends Draftable {
  name: string;
  description: string;
  changes: Record<string, any>;
  // status is inherited from Draftable
}

export type DraftList = PaginatedResult<Draft>;
