import type { TenantScoped } from '@/modules/core/models/base';

export enum RuleSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface RuleCondition<T = unknown> {
  field: string;
  operator: string;
  value: T;
  duration_seconds?: number;
}

export interface Rule<T = unknown> extends TenantScoped {
  name: string;
  description: string;
  severity: RuleSeverity;
  conditions: RuleCondition<T>[];
  enabled: boolean;
  value: T;
}
