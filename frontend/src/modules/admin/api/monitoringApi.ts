import type { UUID } from '@/modules/core/models/base';
import { fetchWithRetry } from '@/modules/core/utils/network';

/**
 * Activity event interface matching backend schema
 */
export interface ActivityEvent {
  id: UUID;
  user_id: string;
  tenant_id: UUID;
  action: string;
  resource_type: string;
  resource_id: string;
  details: {
    path?: string;
    method?: string;
    status_code?: number;
    duration?: number;
    ip_address?: string;
    user_agent?: string;
    [key: string]: unknown;
  };
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  user_name?: string;
}

/**
 * System metrics interface matching backend schema
 */
export interface SystemMetrics {
  active_users: number;
  high_severity_count: number;
  total_activities: number;
  error_rate: number;
}

/**
 * Paginated activity events response
 */
export interface PaginatedActivitiesResponse {
  items: ActivityEvent[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Monitoring API service for admin dashboard
 * Provides methods to fetch activity logs and system metrics
 * Following the modular monolith architecture pattern
 */
export const monitoringApi = {
  /**
   * Get activity events with pagination
   * @param token - Authentication token
   * @param offset - Offset for pagination 
   * @param limit - Number of items per page
   * @param timeRange - Time range for filtering (1h, 24h, 7d, 30d)
   * @param filterType - Filter type (all, high, alerts, errors)
   * @returns Paginated activities response
   */
  getActivities: async (
    token: string,
    offset = 0,
    limit = 20,
    timeRange = '24h',
    filterType = 'all'
  ): Promise<PaginatedActivitiesResponse> => {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('offset', offset.toString());
    params.append('limit', limit.toString());
    params.append('time_range', timeRange);
    params.append('filter_type', filterType);

    try {
      // Use fetchWithRetry for network resilience
      const res = await fetchWithRetry(
        `/api/v1/activities?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        { retries: 3, retryDelay: 1000 }
      );
      
      if (!res.ok) {
        throw new Error(await getErrorMsg(res));
      }
      
      // Properly type the API response
      const data = await res.json() as {
        items: Array<{
          id: UUID;
          user_id: string;
          tenant_id: UUID;
          action: string;
          resource_type: string;
          resource_id: string;
          severity: 'low' | 'medium' | 'high';
          timestamp: string;
          user_name?: string;
          details: Record<string, unknown>;
        }>;
        total: number;
        limit: number;
        offset: number;
      };
      
      return {
        items: data.items.map((item) => ({
          ...item,
          // No need for userName mapping as we've standardized on user_name
        })),
        total: data.total,
        limit: data.limit,
        offset: data.offset
      };
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      // Return empty result with pagination info during failure
      return {
        items: [],
        total: 0,
        limit,
        offset
      };
    }
  },
  
  /**
   * Get system metrics for dashboard
   * @param token - Authentication token
   * @param timeRange - Time range for metrics calculation (1h, 24h, 7d, 30d)
   * @returns System metrics data
   */
  getSystemMetrics: async (
    token: string,
    timeRange = '24h'
  ): Promise<SystemMetrics> => {
    try {
      // Use fetchWithRetry for network resilience
      const res = await fetchWithRetry(
        `/api/v1/metrics?time_range=${timeRange}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        { retries: 3, retryDelay: 1000 }
      );
      
      if (!res.ok) {
        throw new Error(await getErrorMsg(res));
      }
      
      return await res.json();
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      // Return zero values during failure
      return {
        active_users: 0,
        high_severity_count: 0,
        total_activities: 0,
        error_rate: 0
      };
    }
  },

  /**
   * Log an activity (useful for client-side logging)
   * @param token - Authentication token
   * @param activity - Activity data to log
   */
  logActivity: async (
    token: string,
    activity: {
      tenant_id: UUID;
      action: string;
      resource_type: string;
      resource_id: string;
      severity?: 'low' | 'medium' | 'high';
      details?: Record<string, unknown>;
    }
  ): Promise<{ status: string; message: string }> => {
    try {
      // Use fetchWithRetry for network resilience
      const res = await fetchWithRetry(
        '/api/v1/admin/activities/log',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(activity),
        },
        { retries: 2, retryDelay: 500 }
      );
      
      if (!res.ok) {
        throw new Error(await getErrorMsg(res));
      }
      
      return await res.json();
    } catch (error) {
      console.error('Failed to log activity:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
};

// --- Helper to extract error message from fetch Response ---
async function getErrorMsg(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.detail || data.message || res.statusText;
  } catch {
    return res.statusText;
  }
}

// Create memory cache for activities to improve offline resilience
const activityCache = {
  getFromCache: <T>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(`activity_cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
      return null;
    } catch {
      return null;
    }
  },
  
  saveToCache: <T>(key: string, data: T): void => {
    try {
      localStorage.setItem(`activity_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache activities:', error);
    }
  }
};
