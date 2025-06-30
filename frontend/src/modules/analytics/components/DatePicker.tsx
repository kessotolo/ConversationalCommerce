import React, { forwardRef, useState } from 'react';
import {
  Input,
  InputProps,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Box,
  useColorModeValue,
  Button,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { format, isValid } from 'date-fns';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiCalendar } from 'react-icons/fi';

// Custom CSS for the date picker to match Chakra UI styling
const datePickerStyles = `
  .react-datepicker {
    font-family: inherit;
    border-radius: 0.375rem;
    border: 1px solid var(--chakra-colors-gray-200);
    background-color: var(--chakra-colors-white);
  }
  .react-datepicker-wrapper {
    width: 100%;
  }
  .react-datepicker__header {
    background-color: var(--chakra-colors-gray-100);
    border-bottom: 1px solid var(--chakra-colors-gray-200);
  }
  .react-datepicker__current-month {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .react-datepicker__day--selected,
  .react-datepicker__day--in-range,
  .react-datepicker__day--keyboard-selected {
    background-color: var(--chakra-colors-blue-500);
    color: white;
  }
  .react-datepicker__day--in-selecting-range {
    background-color: var(--chakra-colors-blue-400);
  }
  .react-datepicker__day:hover {
    background-color: var(--chakra-colors-gray-200);
  }
  .react-datepicker__day--disabled {
    color: var(--chakra-colors-gray-300);
  }
  .react-datepicker__navigation {
    top: 8px;
  }
  .react-datepicker__navigation--previous {
    border-right-color: var(--chakra-colors-gray-400);
  }
  .react-datepicker__navigation--next {
    border-left-color: var(--chakra-colors-gray-400);
  }
`;

interface DatePickerProps extends Omit<InputProps, 'onChange'> {
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
  ...restProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Custom input component to use with react-datepicker
  const CustomInput = forwardRef<HTMLInputElement, any>(({ value, onClick }, ref) => (
    <Input
      ref={ref}
      value={value}
      onClick={(e) => {
        onClick(e);
        setIsOpen(true);
      }}
      placeholder={placeholderText}
      readOnly
      rightIcon={<Icon as={FiCalendar} />}
      {...restProps}
    />
  ));
  
  // Format display date
  const getDisplayDate = () => {
    if (!selected || !isValid(selected)) return '';
    return format(selected, dateFormat + (showTimeSelect ? ` ${timeFormat}` : ''));
  };
  
  // Handle date change
  const handleDateChange = (date: Date | null) => {
    onChange(date);
    if (date) setIsOpen(false);
  };
  
  // Clear the date
  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  return (
    <>
      <style>{datePickerStyles}</style>
      <Box width="100%" position="relative">
        <ReactDatePicker
          selected={selected}
          onChange={handleDateChange}
          customInput={<CustomInput />}
          dateFormat={dateFormat + (showTimeSelect ? ` ${timeFormat}` : '')}
          showTimeSelect={showTimeSelect}
          timeFormat={timeFormat}
          timeIntervals={timeIntervals}
          minDate={minDate}
          maxDate={maxDate}
          open={isOpen}
          onClickOutside={() => setIsOpen(false)}
          popperProps={{
            strategy: 'fixed',
          }}
          popperContainer={({ children }) => (
            <Popover
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              placement="bottom-start"
              closeOnBlur={true}
              isLazy
            >
              <PopoverContent 
                border="1px solid"
                borderColor={borderColor}
                bg={bgColor}
                boxShadow="lg"
              >
                <PopoverBody padding={0}>
                  {children}
                  {isClearable && selected && (
                    <HStack p={2} justifyContent="flex-end" borderTop="1px solid" borderColor={borderColor}>
                      <Button size="xs" onClick={handleClear} variant="ghost">
                        Clear
                      </Button>
                    </HStack>
                  )}
                </PopoverBody>
              </PopoverContent>
            </Popover>
          )}
        />
      </Box>
    </>
  );
};

export default DatePicker;
