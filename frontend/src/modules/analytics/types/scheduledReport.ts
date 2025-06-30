import { AnalyticsQuery, AnalyticsExportFormat } from './analytics';

/**
 * Enum for report scheduling frequency
 */
export enum ReportScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual'
}

/**
 * Interface for a scheduled report
 */
export interface ScheduledReport {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  query_params: AnalyticsQuery;
  frequency: ReportScheduleFrequency;
  recipient_emails: string[];
  export_format: AnalyticsExportFormat;
  enabled: boolean;
  next_run_date: string;
  last_run_date?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for creating a new scheduled report
 */
export interface ScheduledReportCreate {
  name: string;
  description?: string;
  query_params: AnalyticsQuery;
  frequency: ReportScheduleFrequency;
  recipient_emails: string[];
  export_format: AnalyticsExportFormat;
  enabled: boolean;
  next_run_date: string;
}

/**
 * Interface for updating an existing scheduled report
 */
export interface ScheduledReportUpdate {
  name?: string;
  description?: string;
  query_params?: AnalyticsQuery;
  frequency?: ReportScheduleFrequency;
  recipient_emails?: string[];
  export_format?: AnalyticsExportFormat;
  enabled?: boolean;
  next_run_date?: string;
}
