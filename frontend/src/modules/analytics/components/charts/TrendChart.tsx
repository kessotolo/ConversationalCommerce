import React, { useMemo } from 'react';

import { FiInfo } from 'react-icons/fi';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  Tooltip as RechartsTooltip,
} from 'recharts';

export type ChartType = 'line' | 'bar' | 'area';

interface TrendChartProps {
  data: Array<Record<string, any>>;
  xAxisKey: string;
  series: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  title?: string;
  description?: string;
  height?: number;
  loading?: boolean;
  type?: ChartType;
  stacked?: boolean;
  compareWith?: string;
  onCompareChange?: (compareValue: string) => void;
  compareOptions?: Array<{
    value: string;
    label: string;
  }>;
}

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  xAxisKey,
  series,
  title,
  description,
  height = 300,
  loading = false,
  type = 'line',
  stacked = false,
  compareWith,
  onCompareChange,
  compareOptions,
}) => {
  const cardBg = 'bg-white dark:bg-gray-800';
  const borderColor = 'border-gray-200 dark:border-gray-700';
  const textColor = 'text-gray-600 dark:text-gray-400';
  const gridColor = '#e5e7eb'; // Tailwind gray-100

  // Format numbers for display in tooltip
  const formatValue = (value: number): string => {
    if (value === null || value === undefined) return 'N/A';

    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }

    return value.toLocaleString();
  };

  // Custom tooltip component for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-md shadow-md border ${cardBg} ${borderColor}`}>
          <span className="font-bold mb-2 block">{label}</span>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-item-${index}`} className="flex items-center mb-1">
              <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
              <span className="text-sm">
                {entry.name}: <strong>{formatValue(entry.value)}</strong>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render the appropriate chart type
  const renderChart = () => {
    const chartProps = {
      data,
      margin: { top: 10, right: 30, left: 20, bottom: 40 },
    };

    switch (type) {
      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            {series.map((s, index) => (
              <Bar
                key={`bar-${s.key}`}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                stackId={stacked ? 'stack' : index}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            {series.map((s) => (
              <Area
                key={`area-${s.key}`}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                stroke={s.color}
                stackId={stacked ? 'stack' : undefined}
                strokeWidth={2}
                fillOpacity={0.15}
              />
            ))}
          </AreaChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            {series.map((s) => (
              <Line
                key={`line-${s.key}`}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative`}>

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          {title && (
            <h3 className="text-base font-semibold mb-1">{title}</h3>
          )}
          {description && (
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <span>{description}</span>
              <span className="ml-1 align-middle" title={description}>
                <FiInfo className="inline w-3 h-3" />
              </span>
            </div>
          )}
        </div>
        {compareOptions && onCompareChange && (
          <select
            className="text-sm px-2 py-1 border rounded"
            value={compareWith}
            onChange={(e) => onCompareChange(e.target.value)}
          >
            {compareOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Chart */ }
      <div className={`h-${height} relative`}>
        {loading ? (
          <div
            className="h-full flex items-center justify-center"
          >
            <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div
            className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400"
          >
            <span>No data available</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TrendChart;
