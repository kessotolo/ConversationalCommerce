import { Violation, ViolationStats, ViolationTrend } from '@/components/monitoring/ViolationDashboard';export interface Violation {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'false_positive';
  created_at: string;
  reason: string;
  details: any;
  start_at: string;
  end_at: string;
  user_id: string;
  detection_id: string;
}

export interface ViolationStats {
  total: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  by_status: {
    active: number;
    resolved: number;
    false_positive: number;
  };
}

export interface ViolationTrend {
  date: string;
  count: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}
