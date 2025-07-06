import React from 'react';
import { Badge } from '@/components/ui/badge';
// If you do not have a Tooltip primitive, use a fallback or remove this import.
// import { Tooltip } from '@/components/ui/tooltip';
import { FiInfo, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import TrendChart from './TrendChart';
import type { ChartType } from './TrendChart';

interface ComparisonSeries {
  key: string;
  name: string;
  color: string;
}

interface ComparisonPeriod {
  id: string;
  name: string;
  data: Array<Record<string, any>>;
  total?: number;
  previousTotal?: number;
  percentChange?: number;
}

interface ComparisonChartProps {
  title: string;
  description?: string;
  metric: string;
  metricName: string;
  metricFormatFn?: (value: number) => string;
  periods: ComparisonPeriod[];
  xAxisKey: string;
  series: ComparisonSeries[];
  type?: ChartType;
  height?: number;
  loading?: boolean;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  title,
  description,
  metric,
  metricName,
  metricFormatFn = (value) => value.toLocaleString(),
  periods,
  xAxisKey,
  series,
  type = 'line',
  height = 250,
  loading = false,
}) => {
  // Calculate badge color and icon for percent change
  type BadgeVariant = 'default' | 'outline' | 'success' | 'warning' | 'secondary' | 'destructive' | 'info' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | undefined;
  const getPercentChangeBadge = (percentChange?: number): { color: BadgeVariant; icon: React.ReactNode; text: string } => {
    if (percentChange === undefined || percentChange === 0) {
      return {
        color: 'secondary',
        icon: null,
        text: '0%',
      };
    }
    const isPositive = percentChange > 0;
    const absoluteChange = Math.abs(percentChange);
    return {
      color: isPositive ? 'success' : 'destructive', // shadcn/ui badge color
      icon: isPositive ? <FiArrowUp className="inline w-3 h-3" /> : <FiArrowDown className="inline w-3 h-3" />,
      text: `${isPositive ? '+' : '-'}${absoluteChange.toFixed(1)}%`,
    };
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-base font-semibold mb-1">{title}</div>
          {description && (
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <span>{description}</span>
              <span className="ml-1 align-middle" title={description}>
                <FiInfo className="inline w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {periods.length > 0 && (
        <div
          className={`grid gap-4 mb-6 ${periods.length > 1 ? `md:grid-cols-${periods.length}` : ''}`}
          style={periods.length > 1 ? { gridTemplateColumns: `repeat(${periods.length}, minmax(0, 1fr))` } : {}}
        >
          {periods.map((period) => {
            const badge = getPercentChangeBadge(period.percentChange);
            return (
              <div
                key={period.id}
                className="p-3 bg-blue-50 dark:bg-blue-900 rounded-md flex flex-col gap-1"
              >
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{period.name}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {metricFormatFn(period.total ?? 0)}
                </div>
                {period.previousTotal !== undefined && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      vs. {metricFormatFn(period.previousTotal)}
                    </span>
                    <Badge variant={badge.color} className="flex items-center gap-1 px-2 py-0.5 text-xs">
                      {badge.icon}
                      <span>{badge.text}</span>
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      <div
        className={`grid gap-6 ${periods.length > 1 ? `md:grid-cols-${periods.length}` : ''}`}
        style={periods.length > 1 ? { gridTemplateColumns: `repeat(${periods.length}, minmax(0, 1fr))` } : {}}
      >
        {periods.map((period) => (
          <TrendChart
            key={period.id}
            title={period.name}
            data={period.data}
            xAxisKey={xAxisKey}
            series={series}
            type={type}
            height={height}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
};


export default ComparisonChart;
