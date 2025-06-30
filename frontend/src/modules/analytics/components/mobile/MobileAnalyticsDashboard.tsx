import React, { useState } from 'react';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  IconButton,
  Button,
  VStack,
  HStack,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Badge,
  Divider,
  SimpleGrid,
  Skeleton,
  useColorModeValue,
  Icon
} from '@chakra-ui/react';
import { FiFilter, FiRefreshCw, FiCalendar, FiChevronRight, FiMaximize2, FiMenu } from 'react-icons/fi';
import { DateRange } from '../DateRangeSelector';
import { FilterGroup } from '../filters/FilterBuilder';
import MobileDateRangePicker from './MobileDateRangePicker';
import MobileFilterDrawer from './MobileFilterDrawer';
import MobileMetricCard from './MobileMetricCard';
import MobileChart from './MobileChart';
import useRealTimeData from '../../hooks/useRealTimeData';

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
  
  // Drawer controls
  const filterDrawer = useDisclosure();
  const dateRangeDrawer = useDisclosure();
  const menuDrawer = useDisclosure();
  
  // Background colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  
  // Get real-time data if enabled
  const realTimeResults = useRealTimeData({
    metrics: metrics.map(m => m.id),
    enabled: isRealTime,
  });
  
  // Use real-time data if available, otherwise use passed data
  const displayData = isRealTime ? realTimeResults.data : analyticsData;
  const isDataLoading = isRealTime ? realTimeResults.isLoading : isLoading;
  const dataError = isRealTime ? realTimeResults.error : error;
  
  // Handle date range change
  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    onDateRangeChange(newRange);
    dateRangeDrawer.onClose();
  };
  
  // Handle filter change
  const handleFiltersChange = (newFilters: FilterGroup[]) => {
    setFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
    filterDrawer.onClose();
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
    <Box width="100%">
      {/* Header */}
      <Box 
        position="sticky" 
        top={0} 
        zIndex={10} 
        bg={headerBgColor} 
        p={3} 
        borderBottom="1px" 
        borderColor={borderColor}
        width="100%"
      >
        <Flex justifyContent="space-between" alignItems="center" width="100%">
          <IconButton
            aria-label="Open menu"
            icon={<FiMenu />}
            variant="ghost"
            onClick={menuDrawer.onOpen}
          />
          <Heading size="sm" isTruncated maxWidth="60%">
            {title}
          </Heading>
          <IconButton
            aria-label="Refresh data"
            icon={<FiRefreshCw />}
            variant="ghost"
            isLoading={isDataLoading}
            onClick={() => {
              if (isRealTime && realTimeResults.updateQuery) {
                realTimeResults.updateQuery({});
              }
            }}
          />
        </Flex>
      </Box>
      
      {/* Filters bar */}
      <Box p={3} borderBottom="1px" borderColor={borderColor}>
        <HStack spacing={2}>
          <Button
            size="sm"
            leftIcon={<FiCalendar />}
            variant="outline"
            onClick={dateRangeDrawer.onOpen}
            flexShrink={0}
          >
            {formatDateRangeDisplay()}
          </Button>
          
          {showFilters && (
            <Button
              size="sm"
              leftIcon={<FiFilter />}
              variant="outline"
              onClick={filterDrawer.onOpen}
              flexShrink={0}
            >
              Filters
              {activeFilterCount > 0 && (
                <Badge ml={2} colorScheme="blue" borderRadius="full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}
          
          {isRealTime && (
            <Badge 
              colorScheme={realTimeResults.isConnected ? "green" : "red"}
              variant="subtle"
              px={2}
              py={1}
              borderRadius="full"
              fontSize="xs"
            >
              {realTimeResults.isConnected ? "Live" : "Offline"}
            </Badge>
          )}
        </HStack>
      </Box>
      
      {/* Error message if any */}
      {dataError && (
        <Box p={4} bg="red.50" color="red.700" borderRadius="md" mx={3} mt={3}>
          <Text fontSize="sm">{dataError}</Text>
        </Box>
      )}
      
      {/* Metric cards */}
      <Box p={3}>
        <SimpleGrid columns={2} spacing={3}>
          {metrics.map((metric) => (
            <MobileMetricCard
              key={metric.id}
              metric={metric}
              data={displayData}
              isLoading={isDataLoading}
              isSelected={selectedMetric === metric.id}
              onClick={() => setSelectedMetric(metric.id)}
            />
          ))}
        </SimpleGrid>
      </Box>
      
      {/* Selected metric chart */}
      <Box p={3}>
        <Heading size="sm" mb={3}>
          {metrics.find(m => m.id === selectedMetric)?.name || 'Trend'} Over Time
        </Heading>
        <Box
          bg={cardBgColor}
          borderRadius="md"
          overflow="hidden"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <MobileChart
            data={displayData}
            metricKey={selectedMetric}
            isLoading={isDataLoading}
            height={220}
            color={metrics.find(m => m.id === selectedMetric)?.color || "blue.500"}
          />
        </Box>
      </Box>
      
      {/* Mobile date range picker drawer */}
      <Drawer
        isOpen={dateRangeDrawer.isOpen}
        placement="bottom"
        onClose={dateRangeDrawer.onClose}
      >
        <DrawerOverlay />
        <DrawerContent borderTopRadius="md">
          <DrawerHeader borderBottomWidth="1px">Select Date Range</DrawerHeader>
          <DrawerCloseButton />
          <DrawerBody p={4}>
            <MobileDateRangePicker
              initialDateRange={dateRange}
              onChange={handleDateRangeChange}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      
      {/* Filter drawer */}
      <Drawer
        isOpen={filterDrawer.isOpen}
        placement="right"
        size="full"
        onClose={filterDrawer.onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader borderBottomWidth="1px">Filters</DrawerHeader>
          <DrawerCloseButton />
          <DrawerBody p={0}>
            {showFilters && (
              <MobileFilterDrawer
                initialFilters={filters}
                onChange={handleFiltersChange}
                metrics={metrics}
              />
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      
      {/* Menu drawer */}
      <Drawer
        isOpen={menuDrawer.isOpen}
        placement="left"
        onClose={menuDrawer.onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader borderBottomWidth="1px">{title}</DrawerHeader>
          <DrawerCloseButton />
          <DrawerBody p={0}>
            <VStack align="stretch" spacing={0} divider={<Divider />}>
              <Box as="button" p={4} textAlign="left" onClick={menuDrawer.onClose}>
                <HStack justifyContent="space-between">
                  <Text>Overview</Text>
                  <Icon as={FiChevronRight} />
                </HStack>
              </Box>
              <Box as="button" p={4} textAlign="left" onClick={menuDrawer.onClose}>
                <HStack justifyContent="space-between">
                  <Text>Sales</Text>
                  <Icon as={FiChevronRight} />
                </HStack>
              </Box>
              <Box as="button" p={4} textAlign="left" onClick={menuDrawer.onClose}>
                <HStack justifyContent="space-between">
                  <Text>Products</Text>
                  <Icon as={FiChevronRight} />
                </HStack>
              </Box>
              <Box as="button" p={4} textAlign="left" onClick={menuDrawer.onClose}>
                <HStack justifyContent="space-between">
                  <Text>Customers</Text>
                  <Icon as={FiChevronRight} />
                </HStack>
              </Box>
              <Box as="button" p={4} textAlign="left" onClick={menuDrawer.onClose}>
                <HStack justifyContent="space-between">
                  <Text>Traffic</Text>
                  <Icon as={FiChevronRight} />
                </HStack>
              </Box>
              <Box as="button" p={4} textAlign="left" onClick={menuDrawer.onClose}>
                <HStack justifyContent="space-between">
                  <Text>Reports</Text>
                  <Icon as={FiChevronRight} />
                </HStack>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default MobileAnalyticsDashboard;
