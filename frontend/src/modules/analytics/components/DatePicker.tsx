import React, { useState } from 'react';
import { format, isValid, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  dateFormat?: string;
  showTimeSelect?: boolean;
  timeFormat?: string;
  timeIntervals?: number;
  minDate?: Date;
  maxDate?: Date;
  isClearable?: boolean;
  placeholderText?: string;
  className?: string;
  disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  selected,
  onChange,
  dateFormat = 'MM/dd/yyyy',
  showTimeSelect = false,
  timeFormat = 'HH:mm',
  timeIntervals = 15,
  minDate,
  maxDate,
  isClearable = true,
  placeholderText = 'Select date...',
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());
  const [timeValue, setTimeValue] = useState(
    selected ? format(selected, 'HH:mm') : '00:00'
  );

  // Format display date
  const getDisplayDate = () => {
    if (!selected || !isValid(selected)) return '';
    return format(selected, dateFormat + (showTimeSelect ? ` ${timeFormat}` : ''));
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    let finalDate = date;

    // If time selection is enabled, preserve the time
    if (showTimeSelect && selected) {
      const timeParts = timeValue.split(':');
      const hours = parseInt(timeParts[0] || '0', 10);
      const minutes = parseInt(timeParts[1] || '0', 10);
      finalDate = new Date(date);
      finalDate.setHours(hours, minutes);
    }

    onChange(finalDate);
    if (!showTimeSelect) {
      setIsOpen(false);
    }
  };

  // Handle time change
  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    if (selected) {
      const timeParts = newTime.split(':');
      const hours = parseInt(timeParts[0] || '0', 10);
      const minutes = parseInt(timeParts[1] || '0', 10);
      const newDate = new Date(selected);
      newDate.setHours(hours, minutes);
      onChange(newDate);
    }
  };

  // Clear the date
  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add padding days from previous month
    const startDay = start.getDay();
    const paddingDays = [];
    for (let i = 0; i < startDay; i++) {
      const paddingDate = new Date(start);
      paddingDate.setDate(paddingDate.getDate() - (startDay - i));
      paddingDays.push(paddingDate);
    }

    // Add padding days from next month
    const endDay = end.getDay();
    const endPaddingDays = [];
    for (let i = endDay + 1; i < 7; i++) {
      const paddingDate = new Date(end);
      paddingDate.setDate(paddingDate.getDate() + (i - endDay));
      endPaddingDays.push(paddingDate);
    }

    return [...paddingDays, ...days, ...endPaddingDays];
  };

  // Generate time options
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += timeIntervals) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  return (
    <div className={cn('w-full relative', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={getDisplayDate()}
              placeholder={placeholderText}
              readOnly
              disabled={disabled}
              className={cn(
                'cursor-pointer',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              onClick={() => !disabled && setIsOpen(true)}
            />
            <FiCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                className="h-8 w-8 p-0"
              >
                <FiChevronLeft className="h-4 w-4" />
              </Button>

              <h2 className="text-sm font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>

              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                className="h-8 w-8 p-0"
              >
                <FiChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {/* Day headers */}
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div
                  key={day}
                  className="h-8 w-8 flex items-center justify-center text-xs font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {generateCalendarDays().map((date, index) => {
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isSelected = selected && isSameDay(date, selected);
                const isDisabled = isDateDisabled(date);
                const isTodayDate = isToday(date);

                return (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => !isDisabled && handleDateSelect(date)}
                    disabled={isDisabled}
                    className={cn(
                      'h-8 w-8 p-0 text-xs',
                      !isCurrentMonth && 'text-gray-400',
                      isSelected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                      isTodayDate && !isSelected && 'bg-accent text-accent-foreground',
                      isDisabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {date.getDate()}
                  </Button>
                );
              })}
            </div>

            {/* Time Selection */}
            {showTimeSelect && (
              <div className="border-t pt-4">
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Time
                </label>
                <select
                  value={timeValue}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {generateTimeOptions().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div>
                {isClearable && selected && (
                  <Button size="sm" variant="ghost" onClick={handleClear}>
                    Clear
                  </Button>
                )}
              </div>

              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                variant="outline"
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePicker;
