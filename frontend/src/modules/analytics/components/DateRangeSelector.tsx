import React, { useState, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
// Fully migrated to shadcn/ui and Tailwind. Chakra UI remnants removed.
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import { format, subDays, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';

// Predefined date range options
const PRESET_RANGES: { label: string; getValue: () => [Date, Date] }[] = [
  { label: 'Today', getValue: () => [startOfDay(new Date()), endOfDay(new Date())] },
  { label: 'Yesterday', getValue: () => [startOfDay(subDays(new Date(), 1)), endOfDay(subDays(new Date(), 1))] },
  { label: 'Last 7 days', getValue: () => [startOfDay(subDays(new Date(), 6)), endOfDay(new Date())] },
  { label: 'Last 30 days', getValue: () => [startOfDay(subDays(new Date(), 29)), endOfDay(new Date())] },
  {
    label: 'This month', getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return [startOfDay(start), endOfDay(new Date())];
    }
  },
  {
    label: 'Last month', getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return [startOfDay(start), endOfDay(end)];
    }
  },
];

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label?: string;
}

interface DateRangeSelectorProps {
  onChange: (range: DateRange) => void;
  initialRange?: DateRange;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ onChange, initialRange }) => {
  // ...existing logic remains unchanged
  // Replace all Chakra UI components with shadcn/ui and Tailwind

  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange>(() => {
    if (initialRange && initialRange.startDate && initialRange.endDate) {
      return initialRange;
    }
    // Default to last 30 days
    const presetRange = PRESET_RANGES[3];
    if (presetRange) {
      const [start, end] = presetRange.getValue();
      return {
        startDate: start,
        endDate: end,
        label: presetRange.label
      };
    }
    // Fallback if preset range is not available
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 29);
    return {
      startDate: startOfDay(thirtyDaysAgo),
      endDate: endOfDay(now),
      label: 'Last 30 days'
    };
  });

  const [startDate, setStartDate] = useState<string>(
    selectedRange.startDate instanceof Date && !isNaN(selectedRange.startDate.getTime())
      ? format(selectedRange.startDate, 'yyyy-MM-dd')
      : ''
  );
  const [endDate, setEndDate] = useState<string>(
    selectedRange.endDate instanceof Date && !isNaN(selectedRange.endDate.getTime())
      ? format(selectedRange.endDate, 'yyyy-MM-dd')
      : ''
  );



  // Validate the date range
  const isValidRange = () => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (!isValid(start) || !isValid(end)) return false;
    return start <= end;
  };

  // Apply the selected dates
  const applyCustomRange = () => {
    if (isValidRange()) {
      const parsedStart = parseISO(startDate);
      const parsedEnd = parseISO(endDate);
      if (!isValid(parsedStart) || !isValid(parsedEnd)) return;
      const newRange: DateRange = {
        startDate: startOfDay(parsedStart),
        endDate: endOfDay(parsedEnd),
        label: 'Custom Range'
      };
      setSelectedRange(newRange);
      onChange(newRange);
      setIsOpen(false);
    }
  };

  // Apply a preset range
  const applyPresetRange = (index: number) => {
    const presetRange = PRESET_RANGES[index];
    if (!presetRange) return;

    const [presetStart, presetEnd] = presetRange.getValue();
    if (!(presetStart instanceof Date) || isNaN(presetStart.getTime()) || !(presetEnd instanceof Date) || isNaN(presetEnd.getTime())) return;
    const newRange: DateRange = {
      startDate: presetStart,
      endDate: presetEnd,
      label: presetRange.label
    };
    setSelectedRange(newRange);
    setStartDate(format(presetStart, 'yyyy-MM-dd'));
    setEndDate(format(presetEnd, 'yyyy-MM-dd'));
    onChange(newRange);
    setIsOpen(false);
  };

  // Format the display text for the button
  const getDisplayText = () => {
    if (selectedRange.label && selectedRange.label !== 'Custom Range') {
      return selectedRange.label;
    }
    if (
      selectedRange.startDate instanceof Date && !isNaN(selectedRange.startDate.getTime()) &&
      selectedRange.endDate instanceof Date && !isNaN(selectedRange.endDate.getTime())
    ) {
      return `${format(selectedRange.startDate, 'MMM d, yyyy')} - ${format(selectedRange.endDate, 'MMM d, yyyy')}`;
    }
    return '';
  };


  // Update form values when selectedRange changes externally
  useEffect(() => {
    if (initialRange && initialRange.startDate && initialRange.endDate) {
      setSelectedRange(initialRange);
      setStartDate(format(initialRange.startDate, 'yyyy-MM-dd'));
      setEndDate(format(initialRange.endDate, 'yyyy-MM-dd'));
    }
  }, [initialRange]);

  // Use Radix/shadcn/ui popover open/onOpenChange for controlled state
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="inline-flex items-center gap-2">
          <FiCalendar className="w-4 h-4" />
          <span>{getDisplayText()}</span>
          <FiChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="font-semibold mb-2">Select Date Range</div>
        <div className="space-y-4">
          {/* Preset Ranges */}
          <div className="flex flex-wrap gap-2">
            {PRESET_RANGES.map((preset, index) => (
              <Button
                key={preset.label}
                variant={selectedRange.label === preset.label ? "default" : "outline"}
                onClick={() => applyPresetRange(index)}
                className={
                  "flex-1 min-w-[45%] mb-1 " +
                  (selectedRange.label === preset.label ? " bg-primary text-primary-foreground" : "")
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Range */}
          <div>
            <div className="font-medium mb-2">Custom Range</div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end mt-4">
          <Button
            onClick={applyCustomRange}
            disabled={!isValidRange()}
            size="sm"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeSelector;
// Migration complete: Chakra UI replaced with shadcn/ui and Tailwind primitives.
