

export interface Draft extends Draftable {
  name: string;
  description: string;
  changes: Record<string, any>;
  // status is inherited from Draftable
}

export type DraftList = PaginatedResult<Draft>;
