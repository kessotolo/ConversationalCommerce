import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Add other shadcn/ui primitives as needed

import { FiFilter, FiRefreshCw, FiCalendar, FiChevronRight, FiMaximize2, FiMenu } from 'react-icons/fi';
import type { DateRange } from '../DateRangeSelector';
import type { FilterGroup } from '../filters/FilterBuilder';
import MobileDateRangePicker from './MobileDateRangePicker';
import MobileFilterDrawer from './MobileFilterDrawer';

export interface MetricDefinition {
  id: string;
  name: string;
  description?: string;
  format?: (value: any) => string;
  icon?: React.ElementType;
  color?: string;
}

interface MobileAnalyticsDashboardProps {
  title: string;
  metrics: MetricDefinition[];
  initialDateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  initialFilters?: FilterGroup[];
  onFiltersChange?: (filters: FilterGroup[]) => void;
  showFilters?: boolean;
  isLoading?: boolean;
  error?: string | null;
  analyticsData?: any[];
  isRealTime?: boolean;
}

const MobileAnalyticsDashboard: React.FC<MobileAnalyticsDashboardProps> = ({
  title,
  metrics,
  initialDateRange,
  onDateRangeChange,
  initialFilters = [],
  onFiltersChange,
  showFilters = true,
  isLoading = false,
  error = null,
  analyticsData = [],
  isRealTime = false,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>(metrics[0]?.id || '');
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [filters, setFilters] = useState<FilterGroup[]>(initialFilters);

  // Drawer controls (custom state)
  const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [isDateRangeDrawerOpen, setDateRangeDrawerOpen] = useState(false);
  const [isMenuDrawerOpen, setMenuDrawerOpen] = useState(false);

  // Handle date range change
  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    onDateRangeChange(newRange);
    setDateRangeDrawerOpen(false);
  };

  // Handle filter change
  const handleFiltersChange = (newFilters: FilterGroup[]) => {
    setFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
    setFilterDrawerOpen(false);
  };

  // Format date range for display
  const formatDateRangeDisplay = () => {
    if (dateRange.label) {
      return dateRange.label;
    }

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = dateRange.startDate.toLocaleDateString(undefined, options);
    const end = dateRange.endDate.toLocaleDateString(undefined, options);
    return `${start} - ${end}`;
  };

  // Count active filters
  const activeFilterCount = filters.reduce(
    (count, group) => count + group.conditions.length,
    0
  );

  return (
    <div className="w-full">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          aria-label="Open menu"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          onClick={() => setMenuDrawerOpen(true)}
        >
          <FiMenu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold truncate max-w-[60%]">{title}</h1>
        <button
          aria-label="Refresh data"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-60"
          disabled={isLoading}
        >
          <FiRefreshCw className={isLoading ? 'animate-spin w-5 h-5' : 'w-5 h-5'} />
        </button>
      </header>

      {/* Filters bar */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDateRangeDrawerOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm"
        >
          <FiCalendar className="w-4 h-4" />
          {formatDateRangeDisplay()}
        </Button>

        {showFilters && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilterDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm"
          >
            <FiFilter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-full px-2 py-0.5 text-xs font-semibold">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}

        {isRealTime && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded-full px-2 py-0.5 text-xs font-semibold">
            Live
          </Badge>
        )}
      </div>

      {/* Error message if any */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Content placeholder */}
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">📊</div>
          <p className="text-gray-600">Mobile Analytics Dashboard</p>
          <p className="text-sm text-gray-500">Metrics and charts will be displayed here</p>
        </div>
      </div>

      {/* Date Range Drawer */}
      {isDateRangeDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setDateRangeDrawerOpen(false)}>
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-lg p-4" onClick={(e) => e.stopPropagation()}>
            <MobileDateRangePicker
              dateRange={dateRange}
              onChange={handleDateRangeChange}
            />
          </div>
        </div>
      )}

      {/* Filter Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setFilterDrawerOpen(false)}>
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-lg p-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <MobileFilterDrawer
              filters={filters}
              onChange={handleFiltersChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAnalyticsDashboard;
