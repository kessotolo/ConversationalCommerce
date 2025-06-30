import { AxiosInstance } from 'axios';
import { format } from 'date-fns';
import { createApiClient } from '../../../core/api/apiClient';

export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  sortBy?: string;
  sortDesc?: boolean;
  limit?: number;
  offset?: number;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeHeaders: boolean;
}

export class AnalyticsService {
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = createApiClient();
  }

  /**
   * Get analytics data based on query parameters
   * @param query AnalyticsQuery object
   * @returns Promise with analytics data
   */
  async getAnalyticsData(query: AnalyticsQuery) {
    const formattedQuery = {
      ...query,
      dateRange: {
        startDate: format(query.dateRange.startDate, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        endDate: format(query.dateRange.endDate, 'yyyy-MM-dd\'T\'HH:mm:ss')
      }
    };

    return this.apiClient.post('/api/analytics/query', formattedQuery);
  }

  /**
   * Get analytics data in real-time mode for dashboard
   * @param query AnalyticsQuery object
   * @returns Promise with real-time analytics data
   */
  async getRealTimeAnalytics(query: AnalyticsQuery) {
    const formattedQuery = {
      ...query,
      dateRange: {
        startDate: format(query.dateRange.startDate, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        endDate: format(query.dateRange.endDate, 'yyyy-MM-dd\'T\'HH:mm:ss')
      },
      realTime: true
    };

    return this.apiClient.post('/api/analytics/real-time', formattedQuery);
  }

  /**
   * Export analytics data in specified format
   * @param query AnalyticsQuery object
   * @param options Export options
   * @returns Promise with blob data
   */
  async exportAnalytics(query: AnalyticsQuery, options: ExportOptions) {
    const formattedQuery = {
      ...query,
      dateRange: {
        startDate: format(query.dateRange.startDate, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        endDate: format(query.dateRange.endDate, 'yyyy-MM-dd\'T\'HH:mm:ss')
      },
      format: options.format,
      includeHeaders: options.includeHeaders
    };

    return this.apiClient.post('/api/analytics/export', formattedQuery, {
      responseType: 'blob'
    });
  }

  /**
   * Save an analytics report
   * @param name Report name
   * @param description Report description
   * @param query AnalyticsQuery object
   * @param visualizationType Type of visualization
   * @param visualizationConfig Configuration for visualization
   * @returns Promise with saved report
   */
  async saveReport(
    name: string,
    description: string,
    query: AnalyticsQuery,
    visualizationType: string,
    visualizationConfig: Record<string, any>
  ) {
    const reportData = {
      name,
      description,
      reportType: 'custom',
      filters: query.filters || {},
      metrics: query.metrics,
      dimensions: query.dimensions || [],
      dateRange: {
        startDate: format(query.dateRange.startDate, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        endDate: format(query.dateRange.endDate, 'yyyy-MM-dd\'T\'HH:mm:ss')
      },
      visualizationType,
      visualizationConfig
    };

    return this.apiClient.post('/api/analytics/reports', reportData);
  }

  /**
   * Get saved reports
   * @param reportType Optional filter by report type
   * @param isScheduled Optional filter by scheduled status
   * @returns Promise with list of reports
   */
  async getReports(reportType?: string, isScheduled?: boolean) {
    let url = '/api/analytics/reports';
    const params: Record<string, any> = {};
    
    if (reportType) {
      params.reportType = reportType;
    }
    
    if (isScheduled !== undefined) {
      params.isScheduled = isScheduled;
    }
    
    return this.apiClient.get(url, { params });
  }

  /**
   * Get report details by ID
   * @param reportId Report ID
   * @returns Promise with report details
   */
  async getReportById(reportId: number) {
    return this.apiClient.get(`/api/analytics/reports/${reportId}`);
  }

  /**
   * Update an existing report
   * @param reportId Report ID
   * @param updateData Data to update
   * @returns Promise with updated report
   */
  async updateReport(reportId: number, updateData: Record<string, any>) {
    return this.apiClient.put(`/api/analytics/reports/${reportId}`, updateData);
  }

  /**
   * Delete a report
   * @param reportId Report ID
   * @returns Promise with deletion status
   */
  async deleteReport(reportId: number) {
    return this.apiClient.delete(`/api/analytics/reports/${reportId}`);
  }

  /**
   * Schedule a report for regular delivery
   * @param reportId Report ID
   * @param scheduleConfig Schedule configuration
   * @returns Promise with scheduled report
   */
  async scheduleReport(reportId: number, scheduleConfig: Record<string, any>) {
    return this.apiClient.post(`/api/analytics/reports/${reportId}/schedule`, scheduleConfig);
  }
}

export default AnalyticsService;
