import { TenantScoped } from '@core/models/base';

export enum RuleSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}

export interface RuleCondition {
    field: string;
    operator: string;
    value: any;
    duration_seconds?: number;
}

export interface Rule extends TenantScoped {
    name: string;
    description: string;
    severity: RuleSeverity;
    conditions: RuleCondition[];
    enabled: boolean;
}
