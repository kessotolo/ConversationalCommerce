import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SystemHealth {
  timestamp: string;
  overall_status: 'healthy' | 'warning' | 'critical';
  components: {
    cpu: {
      status: 'healthy' | 'warning' | 'critical';
      usage_percent: number;
    };
    memory: {
      status: 'healthy' | 'warning' | 'critical';
      usage_percent: number;
    };
    disk: {
      status: 'healthy' | 'warning' | 'critical';
      usage_percent: number;
    };
    database: {
      status: 'healthy' | 'warning' | 'critical';
      connections: number;
    };
    cache: {
      status: 'healthy' | 'warning' | 'critical';
      hit_rate: number;
    };
  };
}

export interface MetricsSnapshot {
  current: {
    system: {
      cpu_usage: number;
      memory_usage_percent: number;
      disk_usage_percent: number;
      process_count: number;
    };
    application: {
      active_users_total: number;
      active_users_by_tenant: Record<string, number>;
      active_sessions: number;
    };
  };
  history: {
    cpu: Array<{ timestamp: string; value: number }>;
    memory: Array<{ timestamp: string; value: number }>;
    disk: Array<{ timestamp: string; value: number }>;
    active_users: Array<{ timestamp: string; value: number }>;
    requests_per_minute: Array<{ timestamp: string; value: number }>;
    error_rate: Array<{ timestamp: string; value: number }>;
  };
}

export interface SystemInfo {
  platform: string;
  platform_release: string;
  platform_version: string;
  architecture: string;
  processor: string;
  hostname: string;
  python_version: string;
  cpu_count: number;
  cpu_usage_percent: number;
  memory: {
    total: number;
    available: number;
    used: number;
    percent: number;
  };
  disk: Record<string, {
    total: number;
    used: number;
    free: number;
    percent: number;
    fstype: string;
    opts: string;
  }>;
  network: {
    interfaces: Array<{
      name: string;
      isup: boolean;
      duplex: string;
      speed: number;
      mtu: number;
      addresses: Array<{
        address: string;
        netmask: string;
        broadcast: string;
        ptp: string;
        family: string;
      }>;
    }>;
    connections: number;
  };
  boot_time: number;
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'active' | 'resolved';
}

export interface AlertsResponse {
  total: number;
  alerts: Alert[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'threshold' | 'anomaly' | 'rate_of_change';
  threshold?: {
    operator: '>' | '<' | '>=' | '<=' | '=';
    value: number;
    duration_seconds: number;
  };
  anomaly?: {
    sensitivity: 'low' | 'medium' | 'high';
  };
  rate_of_change?: {
    direction: 'increase' | 'decrease';
    percent: number;
    time_period_minutes: number;
  };
  severity: 'info' | 'warning' | 'critical';
  actions: string[];
  enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AlertTarget {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'sms';
  destination: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EscalationStep {
  id: string;
  step_number: number;
  targets: string[]; // IDs of alert targets
  wait_minutes: number;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  severity_levels: Array<'info' | 'warning' | 'critical'>;
  steps: EscalationStep[];
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AlertRulesResponse {
  total: number;
  rules: AlertRule[];
}

const MONITORING_API = `${API_URL}/api/admin/monitoring`;

export const monitoringService = {
  getSystemHealth: async (): Promise<SystemHealth> => {
    const response = await axios.get(`${MONITORING_API}/health`, { withCredentials: true });
    return response.data;
  },
  
  getMetrics: async (): Promise<MetricsSnapshot> => {
    const response = await axios.get(`${MONITORING_API}/metrics`, { withCredentials: true });
    return response.data;
  },
  
  getSystemInfo: async (): Promise<SystemInfo> => {
    const response = await axios.get(`${MONITORING_API}/system-info`, { withCredentials: true });
    return response.data;
  },
  
  getAlerts: async (severity?: string, limit = 50, offset = 0): Promise<AlertsResponse> => {
    const params = { severity, limit, offset };
    const response = await axios.get(`${MONITORING_API}/alerts`, {
      params,
      withCredentials: true,
    });
    return response.data;
  },
  
  getAlertRules: async (tenant_id?: string): Promise<AlertRule[]> => {
    const params = tenant_id ? { tenant_id } : {};
    const response = await axios.get(`${MONITORING_API}/alert-rules`, {
      params,
      withCredentials: true,
    });
    return response.data.rules || [];
  },
  
  getAlertRule: async (id: string): Promise<AlertRule> => {
    const response = await axios.get(`${MONITORING_API}/alert-rules/${id}`, { withCredentials: true });
    return response.data;
  },
  
  createAlertRule: async (rule: Omit<AlertRule, 'id'>): Promise<AlertRule> => {
    const response = await axios.post(`${MONITORING_API}/alert-rules`, rule, { withCredentials: true });
    return response.data;
  },
  
  updateAlertRule: async (id: string, rule: AlertRule): Promise<AlertRule> => {
    const response = await axios.put(`${MONITORING_API}/alert-rules/${id}`, rule, { withCredentials: true });
    return response.data;
  },
  
  deleteAlertRule: async (id: string): Promise<void> => {
    await axios.delete(`${MONITORING_API}/alert-rules/${id}`, { withCredentials: true });
    return;
  },
  
  // Alert Target Management
  getAlertTargets: async (): Promise<AlertTarget[]> => {
    const response = await axios.get(`${MONITORING_API}/alert-targets`, { withCredentials: true });
    return response.data.targets || [];
  },
  
  getAlertTarget: async (id: string): Promise<AlertTarget> => {
    const response = await axios.get(`${MONITORING_API}/alert-targets/${id}`, { withCredentials: true });
    return response.data;
  },
  
  createAlertTarget: async (target: Omit<AlertTarget, 'id'>): Promise<AlertTarget> => {
    const response = await axios.post(`${MONITORING_API}/alert-targets`, target, { withCredentials: true });
    return response.data;
  },
  
  updateAlertTarget: async (id: string, target: AlertTarget): Promise<AlertTarget> => {
    const response = await axios.put(`${MONITORING_API}/alert-targets/${id}`, target, { withCredentials: true });
    return response.data;
  },
  
  deleteAlertTarget: async (id: string): Promise<void> => {
    await axios.delete(`${MONITORING_API}/alert-targets/${id}`, { withCredentials: true });
    return;
  },
  
  // Escalation Policy Management
  getEscalationPolicies: async (): Promise<EscalationPolicy[]> => {
    const response = await axios.get(`${MONITORING_API}/escalation-policies`, { withCredentials: true });
    return response.data.policies || [];
  },
  
  getEscalationPolicy: async (id: string): Promise<EscalationPolicy> => {
    const response = await axios.get(`${MONITORING_API}/escalation-policies/${id}`, { withCredentials: true });
    return response.data;
  },
  
  createEscalationPolicy: async (policy: Omit<EscalationPolicy, 'id'>): Promise<EscalationPolicy> => {
    const response = await axios.post(`${MONITORING_API}/escalation-policies`, policy, { withCredentials: true });
    return response.data;
  },
  
  updateEscalationPolicy: async (id: string, policy: EscalationPolicy): Promise<EscalationPolicy> => {
    const response = await axios.put(`${MONITORING_API}/escalation-policies/${id}`, policy, { withCredentials: true });
    return response.data;
  },
  
  deleteEscalationPolicy: async (id: string): Promise<void> => {
    await axios.delete(`${MONITORING_API}/escalation-policies/${id}`, { withCredentials: true });
    return;
  },
};
