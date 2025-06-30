import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Select,
  Stack,
  VStack,
  HStack,
  Button,
  Text,
  Tag,
  TagLabel,
  TagCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';

import { AnalyticsQuery } from '../../types/analytics';
import DateRangeSelector, { DateRange } from '../DateRangeSelector';
import FilterBuilder, { FilterGroup } from './FilterBuilder';

// Available metrics
const AVAILABLE_METRICS = [
  { id: 'revenue', name: 'Revenue' },
  { id: 'orders', name: 'Order Count' },
  { id: 'average_order_value', name: 'Average Order Value' },
  { id: 'conversion_rate', name: 'Conversion Rate' },
  { id: 'cart_abandonment_rate', name: 'Cart Abandonment Rate' },
  { id: 'product_views', name: 'Product Views' },
  { id: 'customer_count', name: 'Customer Count' },
  { id: 'new_customers', name: 'New Customers' },
  { id: 'returning_customers', name: 'Returning Customers' },
  { id: 'website_visits', name: 'Website Visits' },
];

// Available dimensions
const AVAILABLE_DIMENSIONS = [
  { id: 'date', name: 'Date' },
  { id: 'hour', name: 'Hour' },
  { id: 'day_of_week', name: 'Day of Week' },
  { id: 'month', name: 'Month' },
  { id: 'quarter', name: 'Quarter' },
  { id: 'year', name: 'Year' },
  { id: 'product_id', name: 'Product' },
  { id: 'product_category', name: 'Product Category' },
  { id: 'customer_id', name: 'Customer' },
  { id: 'device_type', name: 'Device Type' },
  { id: 'payment_method', name: 'Payment Method' },
  { id: 'shipping_method', name: 'Shipping Method' },
  { id: 'region', name: 'Region' },
  { id: 'country', name: 'Country' },
  { id: 'channel', name: 'Marketing Channel' },
];

// Available sort directions
const SORT_DIRECTIONS = [
  { id: 'false', name: 'Ascending' },
  { id: 'true', name: 'Descending' },
];

interface AnalyticsQueryBuilderProps {
  initialQuery: AnalyticsQuery;
  onChange: (query: AnalyticsQuery) => void;
}

const AnalyticsQueryBuilder: React.FC<AnalyticsQueryBuilderProps> = ({ 
  initialQuery, 
  onChange 
}) => {
  const [query, setQuery] = useState<AnalyticsQuery>(initialQuery);
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Update local state when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);
  
  // Handle metric selection
  const handleMetricChange = (metricId: string) => {
    const isSelected = query.metrics.includes(metricId);
    let updatedMetrics;
    
    if (isSelected) {
      // Remove metric
      updatedMetrics = query.metrics.filter(id => id !== metricId);
    } else {
      // Add metric
      updatedMetrics = [...query.metrics, metricId];
    }
    
    const updatedQuery = { ...query, metrics: updatedMetrics };
    setQuery(updatedQuery);
    onChange(updatedQuery);
  };
  
  // Handle dimension selection
  const handleDimensionChange = (dimensionId: string) => {
    const isSelected = query.dimensions.includes(dimensionId);
    let updatedDimensions;
    
    if (isSelected) {
      // Remove dimension
      updatedDimensions = query.dimensions.filter(id => id !== dimensionId);
    } else {
      // Add dimension
      updatedDimensions = [...query.dimensions, dimensionId];
    }
    
    const updatedQuery = { ...query, dimensions: updatedDimensions };
    setQuery(updatedQuery);
    onChange(updatedQuery);
  };
  
  // Handle date range change
  const handleDateRangeChange = (dateRange: DateRange) => {
    const updatedQuery = {
      ...query,
      date_range: {
        start_date: dateRange.startDate.toISOString().split('T')[0],
        end_date: dateRange.endDate.toISOString().split('T')[0],
      },
    };
    setQuery(updatedQuery);
    onChange(updatedQuery);
  };
  
  // Handle filter changes
  const handleFilterChange = (filters: FilterGroup[]) => {
    // Convert FilterGroup[] structure to the format expected by the API
    const filterObject: Record<string, any> = {};
    
    filters.forEach(group => {
      group.conditions.forEach(condition => {
        // Creating a nested structure based on field and operator
        if (!filterObject[condition.field]) {
          filterObject[condition.field] = {};
        }
        filterObject[condition.field][condition.operator] = condition.value;
      });
    });
    
    const updatedQuery = { ...query, filters: filterObject };
    setQuery(updatedQuery);
    onChange(updatedQuery);
  };
  
  // Handle sort by change
  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updatedQuery = { ...query, sort_by: e.target.value };
    setQuery(updatedQuery);
    onChange(updatedQuery);
  };
  
  // Handle sort direction change
  const handleSortDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sortDesc = e.target.value === 'true';
    const updatedQuery = { ...query, sort_desc: sortDesc };
    setQuery(updatedQuery);
    onChange(updatedQuery);
  };
  
  // Handle limit change
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updatedQuery = { ...query, limit: parseInt(e.target.value, 10) };
    setQuery(updatedQuery);
    onChange(updatedQuery);
  };
  
  // Get initial date range for date range selector
  const getInitialDateRange = (): DateRange => {
    return {
      startDate: new Date(query.date_range.start_date),
      endDate: new Date(query.date_range.end_date),
      key: 'selection',
    };
  };
  
  // Format filters for the FilterBuilder
  const getInitialFilters = (): FilterGroup[] => {
    // If no filters, return empty array with one group
    if (!query.filters || Object.keys(query.filters).length === 0) {
      return [{
        id: 'group-1',
        logic: 'and',
        conditions: [],
      }];
    }
    
    // Convert API filter format to FilterGroup[]
    const group: FilterGroup = {
      id: 'group-1',
      logic: 'and',
      conditions: [],
    };
    
    Object.entries(query.filters).forEach(([field, operators]) => {
      Object.entries(operators as Record<string, any>).forEach(([operator, value]) => {
        group.conditions.push({
          field,
          operator,
          value,
        });
      });
    });
    
    return [group];
  };

  return (
    <Box>
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Metrics & Dimensions</Tab>
          <Tab>Filters</Tab>
          <Tab>Date Range</Tab>
          <Tab>Display Options</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Stack spacing={6}>
              {/* Metrics Selection */}
              <Box>
                <Heading size="sm" mb={2}>
                  Metrics
                </Heading>
                <Text fontSize="sm" mb={3} color="gray.500">
                  Select the metrics you want to include in your report.
                </Text>
                
                <Box bg={bgColor} borderRadius="md" p={4} borderWidth="1px" borderColor={borderColor}>
                  <Stack spacing={3}>
                    {AVAILABLE_METRICS.map(metric => (
                      <Button
                        key={metric.id}
                        size="sm"
                        variant={query.metrics.includes(metric.id) ? "solid" : "outline"}
                        colorScheme={query.metrics.includes(metric.id) ? "blue" : "gray"}
                        onClick={() => handleMetricChange(metric.id)}
                      >
                        {metric.name}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              </Box>
              
              {/* Dimensions Selection */}
              <Box>
                <Heading size="sm" mb={2}>
                  Dimensions
                </Heading>
                <Text fontSize="sm" mb={3} color="gray.500">
                  Select the dimensions to group your data by.
                </Text>
                
                <Box bg={bgColor} borderRadius="md" p={4} borderWidth="1px" borderColor={borderColor}>
                  <Stack spacing={3}>
                    {AVAILABLE_DIMENSIONS.map(dimension => (
                      <Button
                        key={dimension.id}
                        size="sm"
                        variant={query.dimensions.includes(dimension.id) ? "solid" : "outline"}
                        colorScheme={query.dimensions.includes(dimension.id) ? "blue" : "gray"}
                        onClick={() => handleDimensionChange(dimension.id)}
                      >
                        {dimension.name}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              </Box>
            </Stack>
          </TabPanel>
          
          <TabPanel>
            <Box>
              <Heading size="sm" mb={2}>
                Filters
              </Heading>
              <Text fontSize="sm" mb={3} color="gray.500">
                Add filters to narrow down your report data.
              </Text>
              
              <FilterBuilder
                initialFilters={getInitialFilters()}
                onChange={handleFilterChange}
              />
            </Box>
          </TabPanel>
          
          <TabPanel>
            <Box>
              <Heading size="sm" mb={2}>
                Date Range
              </Heading>
              <Text fontSize="sm" mb={3} color="gray.500">
                Select the time period for your report data.
              </Text>
              
              <DateRangeSelector
                initialRange={getInitialDateRange()}
                onChange={handleDateRangeChange}
              />
            </Box>
          </TabPanel>
          
          <TabPanel>
            <Stack spacing={6}>
              {/* Sorting */}
              <Box>
                <Heading size="sm" mb={2}>
                  Sorting
                </Heading>
                <Text fontSize="sm" mb={3} color="gray.500">
                  Choose how to sort your report data.
                </Text>
                
                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel>Sort By</FormLabel>
                    <Select value={query.sort_by} onChange={handleSortByChange}>
                      {[...AVAILABLE_METRICS, ...AVAILABLE_DIMENSIONS].map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Direction</FormLabel>
                    <Select 
                      value={query.sort_desc.toString()} 
                      onChange={handleSortDirectionChange}
                    >
                      {SORT_DIRECTIONS.map(direction => (
                        <option key={direction.id} value={direction.id}>
                          {direction.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>
              </Box>
              
              {/* Limit */}
              <Box>
                <Heading size="sm" mb={2}>
                  Row Limit
                </Heading>
                <Text fontSize="sm" mb={3} color="gray.500">
                  Maximum number of rows to include in the report.
                </Text>
                
                <FormControl>
                  <Select value={query.limit.toString()} onChange={handleLimitChange}>
                    <option value="100">100 rows</option>
                    <option value="500">500 rows</option>
                    <option value="1000">1,000 rows</option>
                    <option value="5000">5,000 rows</option>
                    <option value="10000">10,000 rows</option>
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Summary */}
      <Box mt={4} p={4} bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
        <Heading size="sm" mb={3}>Query Summary</Heading>
        
        {query.metrics.length > 0 && (
          <Box mb={3}>
            <Text fontWeight="bold" mb={1}>Metrics:</Text>
            <HStack spacing={2} wrap="wrap">
              {query.metrics.map(metricId => {
                const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                return (
                  <Tag key={metricId} colorScheme="blue" size="md">
                    {metric?.name || metricId}
                  </Tag>
                );
              })}
            </HStack>
          </Box>
        )}
        
        {query.dimensions.length > 0 && (
          <Box mb={3}>
            <Text fontWeight="bold" mb={1}>Dimensions:</Text>
            <HStack spacing={2} wrap="wrap">
              {query.dimensions.map(dimensionId => {
                const dimension = AVAILABLE_DIMENSIONS.find(d => d.id === dimensionId);
                return (
                  <Tag key={dimensionId} colorScheme="green" size="md">
                    {dimension?.name || dimensionId}
                  </Tag>
                );
              })}
            </HStack>
          </Box>
        )}
        
        <Box>
          <Text fontWeight="bold" mb={1}>Date Range:</Text>
          <Text>
            {new Date(query.date_range.start_date).toLocaleDateString()} to {new Date(query.date_range.end_date).toLocaleDateString()}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default AnalyticsQueryBuilder;
