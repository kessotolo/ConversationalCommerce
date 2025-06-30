import React, { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  SimpleGrid,
  Text,
  VStack,
  Input,
  FormControl,
  FormLabel,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { format, subDays, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import { DateRange } from '../DateRangeSelector';

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

interface MobileDateRangePickerProps {
  initialDateRange: DateRange;
  onChange: (range: DateRange) => void;
}

const MobileDateRangePicker: React.FC<MobileDateRangePickerProps> = ({
  initialDateRange,
  onChange
}) => {
  const [startDate, setStartDate] = useState<string>(
    format(initialDateRange.startDate, 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(initialDateRange.endDate, 'yyyy-MM-dd')
  );
  
  const activeButtonBg = useColorModeValue('blue.500', 'blue.300');
  const activeButtonColor = useColorModeValue('white', 'gray.900');
  
  // Apply preset range
  const applyPresetRange = (presetIndex: number) => {
    const [presetStart, presetEnd] = PRESET_RANGES[presetIndex].getValue();
    
    setStartDate(format(presetStart, 'yyyy-MM-dd'));
    setEndDate(format(presetEnd, 'yyyy-MM-dd'));
    
    onChange({
      startDate: presetStart,
      endDate: presetEnd,
      label: PRESET_RANGES[presetIndex].label
    });
  };
  
  // Apply custom date range
  const applyCustomRange = () => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (isValid(start) && isValid(end) && start <= end) {
      onChange({
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: 'Custom Range'
      });
    }
  };
  
  // Check if a preset range is selected
  const isPresetSelected = (presetIndex: number): boolean => {
    const [presetStart, presetEnd] = PRESET_RANGES[presetIndex].getValue();
    
    if (!initialDateRange.label) {
      return false;
    }
    
    if (initialDateRange.label === PRESET_RANGES[presetIndex].label) {
      return true;
    }
    
    return false;
  };
  
  return (
    <VStack spacing={5} width="100%">
      {/* Preset ranges */}
      <Box width="100%">
        <Text fontWeight="medium" mb={2}>
          Preset Ranges
        </Text>
        <SimpleGrid columns={2} spacing={3}>
          {PRESET_RANGES.map((preset, index) => (
            <Button
              key={preset.label}
              onClick={() => applyPresetRange(index)}
              size="md"
              variant={isPresetSelected(index) ? "solid" : "outline"}
              colorScheme="blue"
              width="100%"
              height="48px"
              _hover={{ bg: isPresetSelected(index) ? activeButtonBg : 'transparent' }}
            >
              {preset.label}
            </Button>
          ))}
        </SimpleGrid>
      </Box>
      
      <Divider />
      
      {/* Custom date range */}
      <Box width="100%">
        <Text fontWeight="medium" mb={2}>
          Custom Range
        </Text>
        <Stack spacing={4}>
          <FormControl>
            <FormLabel>Start Date</FormLabel>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="md"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>End Date</FormLabel>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="md"
            />
          </FormControl>
          
          <Button
            colorScheme="blue"
            size="md"
            onClick={applyCustomRange}
            isDisabled={!isValid(parseISO(startDate)) || !isValid(parseISO(endDate)) || parseISO(startDate) > parseISO(endDate)}
          >
            Apply Custom Range
          </Button>
        </Stack>
      </Box>
    </VStack>
  );
};

export default MobileDateRangePicker;
