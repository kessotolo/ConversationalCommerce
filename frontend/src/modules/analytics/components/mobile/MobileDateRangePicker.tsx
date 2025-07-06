import React, { useState } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isValid } from 'date-fns';
import { FiCalendar, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DatePicker from '../DatePicker';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface MobileDateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

interface PresetRange {
  label: string;
  range: DateRange;
}

const MobileDateRangePicker: React.FC<MobileDateRangePickerProps> = ({
  dateRange,
  onChange,
  className = ''
}) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(dateRange.startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(dateRange.endDate);

  // Preset date ranges
  const presetRanges: PresetRange[] = [
    {
      label: 'Today',
      range: {
        startDate: new Date(),
        endDate: new Date()
      }
    },
    {
      label: 'Yesterday',
      range: {
        startDate: subDays(new Date(), 1),
        endDate: subDays(new Date(), 1)
      }
    },
    {
      label: 'Last 7 days',
      range: {
        startDate: subDays(new Date(), 6),
        endDate: new Date()
      }
    },
    {
      label: 'Last 30 days',
      range: {
        startDate: subDays(new Date(), 29),
        endDate: new Date()
      }
    },
    {
      label: 'This week',
      range: {
        startDate: startOfWeek(new Date()),
        endDate: endOfWeek(new Date())
      }
    },
    {
      label: 'This month',
      range: {
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date())
      }
    },
    {
      label: 'Last month',
      range: {
        startDate: startOfMonth(subMonths(new Date(), 1)),
        endDate: endOfMonth(subMonths(new Date(), 1))
      }
    }
  ];

  // Format date range for display
  const formatDateRange = (range: DateRange): string => {
    if (!range.startDate || !range.endDate) return 'Select date range';

    if (range.startDate.getTime() === range.endDate.getTime()) {
      return format(range.startDate, 'MMM dd, yyyy');
    }

    return `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`;
  };

  // Handle preset selection
  const handlePresetSelect = (preset: PresetRange) => {
    onChange(preset.range);
  };

  // Handle custom date application
  const handleCustomApply = () => {
    if (tempStartDate && tempEndDate) {
      // Ensure start date is before end date
      const startDate = tempStartDate <= tempEndDate ? tempStartDate : tempEndDate;
      const endDate = tempStartDate <= tempEndDate ? tempEndDate : tempStartDate;

      onChange({
        startDate,
        endDate
      });
    }
    setIsCustomOpen(false);
  };

  // Handle custom date cancellation
  const handleCustomCancel = () => {
    setTempStartDate(dateRange.startDate);
    setTempEndDate(dateRange.endDate);
    setIsCustomOpen(false);
  };

  // Check if a preset is currently selected
  const isPresetSelected = (preset: PresetRange): boolean => {
    if (!dateRange.startDate || !dateRange.endDate || !preset.range.startDate || !preset.range.endDate) {
      return false;
    }

    return (
      dateRange.startDate.getTime() === preset.range.startDate.getTime() &&
      dateRange.endDate.getTime() === preset.range.endDate.getTime()
    );
  };

  // Validate custom date range
  const isCustomRangeValid = (): boolean => {
    return tempStartDate !== null && tempEndDate !== null &&
      isValid(tempStartDate) && isValid(tempEndDate);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FiCalendar className="h-5 w-5" />
          Date Range
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Selection Display */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Selected Range</p>
          <p className="font-medium">{formatDateRange(dateRange)}</p>
        </div>

        {/* Preset Ranges */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Quick Select</h4>
          <div className="space-y-1">
            {presetRanges.map((preset) => (
              <Button
                key={preset.label}
                variant={isPresetSelected(preset) ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => handlePresetSelect(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setIsCustomOpen(!isCustomOpen)}
          >
            Custom Range
            {isCustomOpen ? (
              <FiChevronUp className="h-4 w-4" />
            ) : (
              <FiChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isCustomOpen && (
            <div className="space-y-4 pt-2 border-t">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Start Date
                  </label>
                  <DatePicker
                    selected={tempStartDate}
                    onChange={setTempStartDate}
                    placeholderText="Select start date"
                    maxDate={tempEndDate || undefined}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    End Date
                  </label>
                  <DatePicker
                    selected={tempEndDate}
                    onChange={setTempEndDate}
                    placeholderText="Select end date"
                    minDate={tempStartDate || undefined}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCustomCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCustomApply}
                  disabled={!isCustomRangeValid()}
                  className="flex-1"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileDateRangePicker;
