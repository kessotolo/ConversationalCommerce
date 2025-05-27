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

export interface Rule {
    id: string;
    name: string;
    description: string;
    tenant_id: string;
    severity: RuleSeverity;
    conditions: RuleCondition[];
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface Activity {
    id: string;
    user_id: string;
    tenant_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    details: {
        path: string;
        method: string;
        status_code: number;
        duration: number;
        ip_address: string;
        user_agent: string;
    };
    timestamp: string;
}