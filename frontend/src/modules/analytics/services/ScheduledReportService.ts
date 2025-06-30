import { ApiService } from '../../../services/ApiService';
import { ScheduledReport, ScheduledReportCreate, ScheduledReportUpdate } from '../types/scheduledReport';

/**
 * Service for managing scheduled analytics reports
 */
export class ScheduledReportService {
  private static BASE_URL = '/api/analytics/reports/scheduled';
  
  /**
   * Get all scheduled reports
   * @param skip Number of items to skip
   * @param limit Maximum number of items to return
   * @returns List of scheduled reports
   */
  static async getAll(skip: number = 0, limit: number = 100): Promise<{
    data: ScheduledReport[];
    count: number;
    skip: number;
    limit: number;
  }> {
    const response = await ApiService.get(
      `${this.BASE_URL}?skip=${skip}&limit=${limit}`
    );
    return response.data;
  }
  
  /**
   * Get a scheduled report by ID
   * @param reportId The ID of the report to get
   * @returns The scheduled report
   */
  static async getById(reportId: number): Promise<ScheduledReport> {
    const response = await ApiService.get(`${this.BASE_URL}/${reportId}`);
    return response.data.data;
  }
  
  /**
   * Create a new scheduled report
   * @param report The report to create
   * @returns The created report
   */
  static async create(report: ScheduledReportCreate): Promise<ScheduledReport> {
    const response = await ApiService.post(this.BASE_URL, report);
    return response.data.data;
  }
  
  /**
   * Update an existing scheduled report
   * @param reportId The ID of the report to update
   * @param report The updated report data
   * @returns The updated report
   */
  static async update(reportId: number, report: ScheduledReportUpdate): Promise<ScheduledReport> {
    const response = await ApiService.put(`${this.BASE_URL}/${reportId}`, report);
    return response.data.data;
  }
  
  /**
   * Delete a scheduled report
   * @param reportId The ID of the report to delete
   * @returns Success indicator
   */
  static async delete(reportId: number): Promise<boolean> {
    const response = await ApiService.delete(`${this.BASE_URL}/${reportId}`);
    return response.data.success;
  }
  
  /**
   * Run a scheduled report immediately
   * @param reportId The ID of the report to run
   * @returns Success message
   */
  static async runNow(reportId: number): Promise<{ message: string }> {
    const response = await ApiService.post(`${this.BASE_URL}/run/${reportId}`);
    return response.data.data;
  }
}
