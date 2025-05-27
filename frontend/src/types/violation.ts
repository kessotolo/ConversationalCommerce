export interface Violation {
    id: string;
    type: string;
    severity: string;
    action: string;
    status: string;
    reason?: string;
    details?: any;
    start_at: string;
    end_at?: string;
    user_id?: string;
    detection_id?: string;
    created_at: string;
    updated_at: string;
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