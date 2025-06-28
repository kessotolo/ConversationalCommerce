import type { Entity, UUID } from '@/modules/core/models/base';

export interface Violation extends Entity {
  type: string;
  severity: string;
  action: string;
  status: string;
  reason?: string;
  details?: unknown;
  start_at: string;
  end_at?: string;
  user_id?: UUID;
  detection_id?: UUID;
}

export interface ViolationStats {
  total: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_action: Record<string, number>;
  by_status: Record<string, number>;
}

export interface ViolationTrend {
  date: string;
  count: number;
}
