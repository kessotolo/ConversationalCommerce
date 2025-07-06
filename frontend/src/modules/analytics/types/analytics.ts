/**
 * Analytics types and interfaces
 */

/**
 * Export format options for analytics data
 */
export enum AnalyticsExportFormat {
    excel = 'excel',
    csv = 'csv',
    json = 'json',
    pdf = 'pdf'
}

/**
 * Date range interface for analytics queries
 */
export interface DateRange {
    start_date: string;
    end_date: string;
}

/**
 * Filter condition for analytics queries
 */
export interface FilterCondition {
    field: string;
    operator: string;
    value: any;
}

/**
 * Filter group for analytics queries
 */
export interface FilterGroup {
    logic: 'and' | 'or';
    conditions: FilterCondition[];
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQuery {
    metrics: string[];
    dimensions: string[];
    filters: Record<string, any>;
    date_range: DateRange;
    sort_by: string;
    sort_desc: boolean;
    limit: number;
}

/**
 * Analytics metric definition
 */
export interface AnalyticsMetric {
    id: string;
    name: string;
    description?: string;
    type: 'number' | 'currency' | 'percentage' | 'count';
    format?: (value: any) => string;
}

/**
 * Analytics dimension definition
 */
export interface AnalyticsDimension {
    id: string;
    name: string;
    description?: string;
    type: 'string' | 'date' | 'number' | 'boolean';
}

/**
 * Analytics data point
 */
export interface AnalyticsDataPoint {
    dimensions: Record<string, any>;
    metrics: Record<string, number>;
    timestamp?: string;
}

/**
 * Analytics response
 */
export interface AnalyticsResponse {
    data: AnalyticsDataPoint[];
    total_rows: number;
    query: AnalyticsQuery;
    generated_at: string;
}

/**
 * Real-time analytics event
 */
export interface RealTimeEvent {
    id: string;
    event_type: string;
    properties: Record<string, any>;
    timestamp: string;
    tenant_id: number;
}

/**
 * Analytics dashboard configuration
 */
export interface DashboardConfig {
    id: string;
    name: string;
    description?: string;
    widgets: DashboardWidget[];
    layout: DashboardLayout;
    filters?: FilterGroup[];
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
    id: string;
    type: 'chart' | 'table' | 'metric' | 'filter';
    title: string;
    query: AnalyticsQuery;
    chart_config?: ChartConfig;
    position: WidgetPosition;
}

/**
 * Chart configuration
 */
export interface ChartConfig {
    type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    x_axis?: string;
    y_axis?: string;
    color_scheme?: string[];
    show_legend?: boolean;
    show_grid?: boolean;
}

/**
 * Widget position and size
 */
export interface WidgetPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
    columns: number;
    row_height: number;
    margin: [number, number];
    padding: [number, number];
}