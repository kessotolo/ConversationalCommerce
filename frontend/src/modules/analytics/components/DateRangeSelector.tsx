import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Text,
  Flex,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import { format, subDays, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';

// Predefined date range options
const PRESET_RANGES = [
  { label: 'Today', getValue: () => [startOfDay(new Date()), endOfDay(new Date())] },
  { label: 'Yesterday', getValue: () => [startOfDay(subDays(new Date(), 1)), endOfDay(subDays(new Date(), 1))] },
  { label: 'Last 7 days', getValue: () => [startOfDay(subDays(new Date(), 6)), endOfDay(new Date())] },
  { label: 'Last 30 days', getValue: () => [startOfDay(subDays(new Date(), 29)), endOfDay(new Date())] },
  { label: 'This month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [startOfDay(start), endOfDay(new Date())];
  }},
  { label: 'Last month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return [startOfDay(start), endOfDay(end)];
  }},
];

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

interface DateRangeSelectorProps {
  onChange: (range: DateRange) => void;
  initialRange?: DateRange;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ onChange, initialRange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange>(() => {
    if (initialRange) {
      return initialRange;
    }
    // Default to last 30 days
    const defaultRange = PRESET_RANGES[3].getValue();
    return {
      startDate: defaultRange[0],
      endDate: defaultRange[1],
      label: PRESET_RANGES[3].label
    };
  });
  
  const [startDate, setStartDate] = useState<string>(
    format(selectedRange.startDate, 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(selectedRange.endDate, 'yyyy-MM-dd')
  );
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Validate the date range
  const isValidRange = () => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    return isValid(start) && isValid(end) && start <= end;
  };
  
  // Apply the selected dates
  const applyCustomRange = () => {
    if (isValidRange()) {
      const newRange = {
        startDate: startOfDay(parseISO(startDate)),
        endDate: endOfDay(parseISO(endDate)),
        label: 'Custom Range'
      };
      
      setSelectedRange(newRange);
      onChange(newRange);
      setIsOpen(false);
    }
  };
  
  // Apply a preset range
  const applyPresetRange = (index: number) => {
    const [presetStart, presetEnd] = PRESET_RANGES[index].getValue();
    const newRange = {
      startDate: presetStart,
      endDate: presetEnd,
      label: PRESET_RANGES[index].label
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
    
    return `${format(selectedRange.startDate, 'MMM d, yyyy')} - ${format(selectedRange.endDate, 'MMM d, yyyy')}`;
  };
  
  // Update form values when selectedRange changes externally
  useEffect(() => {
    if (initialRange) {
      setSelectedRange(initialRange);
      setStartDate(format(initialRange.startDate, 'yyyy-MM-dd'));
      setEndDate(format(initialRange.endDate, 'yyyy-MM-dd'));
    }
  }, [initialRange]);
  
  return (
    <Popover
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onOpen={() => setIsOpen(true)}
      closeOnBlur={true}
      placement="bottom-end"
    >
      <PopoverTrigger>
        <Button
          rightIcon={<Icon as={FiChevronDown} />}
          leftIcon={<Icon as={FiCalendar} />}
          variant="outline"
          size="md"
          width="auto"
        >
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        boxShadow="lg"
        bg={bgColor}
        borderColor={borderColor}
        width="300px"
      >
        <PopoverHeader fontWeight="semibold">Select Date Range</PopoverHeader>
        <PopoverBody>
          <Stack spacing={4}>
            <ButtonGroup variant="outline" size="sm" isAttached d="flex" flexWrap="wrap">
              {PRESET_RANGES.map((preset, index) => (
                <Button
                  key={preset.label}
                  onClick={() => applyPresetRange(index)}
                  isActive={selectedRange.label === preset.label}
                  mb={2}
                  flexGrow={1}
                  minW="45%"
                >
                  {preset.label}
                </Button>
              ))}
            </ButtonGroup>
            
            <Box pt={2}>
              <Text fontWeight="medium" mb={2}>
                Custom Range
              </Text>
              <Stack>
                <FormControl>
                  <FormLabel fontSize="sm">Start Date</FormLabel>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">End Date</FormLabel>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    size="sm"
                  />
                </FormControl>
              </Stack>
            </Box>
          </Stack>
        </PopoverBody>
        <PopoverFooter>
          <Flex justify="flex-end">
            <Button
              size="sm"
              colorScheme="blue"
              onClick={applyCustomRange}
              isDisabled={!isValidRange()}
            >
              Apply
            </Button>
          </Flex>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeSelector;
