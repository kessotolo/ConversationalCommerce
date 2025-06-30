import React, { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  HStack,
  Text,
  VStack,
  IconButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  Divider,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { FiPlus, FiX, FiChevronDown, FiFilter } from 'react-icons/fi';
import { FilterGroup, FilterValue, FilterField } from '../filters/FilterBuilder';
import MobileFilterCondition from './MobileFilterCondition';
import { MetricDefinition } from './MobileAnalyticsDashboard';

interface MobileFilterDrawerProps {
  initialFilters: FilterGroup[];
  onChange: (filters: FilterGroup[]) => void;
  metrics: MetricDefinition[];
}

// Common filter fields based on metrics
const getFilterFields = (metrics: MetricDefinition[]): FilterField[] => {
  const fields: FilterField[] = [
    {
      id: 'date',
      name: 'date',
      label: 'Date',
      type: 'date',
      category: 'Time',
    },
    {
      id: 'customer_id',
      name: 'customer_id',
      label: 'Customer',
      type: 'string',
      category: 'User',
    },
    {
      id: 'product_id',
      name: 'product_id',
      label: 'Product',
      type: 'string',
      category: 'Products',
    },
    {
      id: 'order_id',
      name: 'order_id',
      label: 'Order',
      type: 'string',
      category: 'Orders',
    },
    {
      id: 'payment_method',
      name: 'payment_method',
      label: 'Payment Method',
      type: 'select',
      category: 'Payments',
      options: [
        { value: 'credit_card', label: 'Credit Card' },
        { value: 'paypal', label: 'PayPal' },
        { value: 'stripe', label: 'Stripe' },
        { value: 'cash', label: 'Cash' },
      ],
    },
    {
      id: 'device_type',
      name: 'device_type',
      label: 'Device Type',
      type: 'select',
      category: 'Traffic',
      options: [
        { value: 'desktop', label: 'Desktop' },
        { value: 'mobile', label: 'Mobile' },
        { value: 'tablet', label: 'Tablet' },
      ],
    },
    {
      id: 'channel',
      name: 'channel',
      label: 'Marketing Channel',
      type: 'select',
      category: 'Marketing',
      options: [
        { value: 'organic', label: 'Organic Search' },
        { value: 'paid', label: 'Paid Search' },
        { value: 'social', label: 'Social Media' },
        { value: 'email', label: 'Email' },
        { value: 'direct', label: 'Direct' },
        { value: 'referral', label: 'Referral' },
      ],
    },
  ];
  
  // Add metric-specific filter fields
  metrics.forEach(metric => {
    fields.push({
      id: metric.id,
      name: metric.id,
      label: metric.name,
      type: 'number',
      category: 'Metrics',
    });
  });
  
  return fields;
};

// Group filter fields by category
const groupFieldsByCategory = (fields: FilterField[]): Record<string, FilterField[]> => {
  const categories: Record<string, FilterField[]> = {};
  
  fields.forEach(field => {
    const category = field.category || 'General';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(field);
  });
  
  return categories;
};

const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  initialFilters,
  onChange,
  metrics,
}) => {
  const [filters, setFilters] = useState<FilterGroup[]>(initialFilters.length > 0 
    ? initialFilters 
    : [{ id: `group-${Date.now()}`, logic: 'and', conditions: [] }]
  );
  
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bgColor = useColorModeValue('white', 'gray.800');
  const filterFields = getFilterFields(metrics);
  const fieldCategories = groupFieldsByCategory(filterFields);
  
  // Toggle filter group logic (AND/OR)
  const toggleGroupLogic = (groupId: string) => {
    const updatedFilters = filters.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          logic: group.logic === 'and' ? 'or' : 'and'
        };
      }
      return group;
    });
    
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };
  
  // Add a new filter group
  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      logic: 'and',
      conditions: []
    };
    
    const updatedFilters = [...filters, newGroup];
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };
  
  // Delete a filter group
  const deleteFilterGroup = (groupId: string) => {
    const updatedFilters = filters.filter(group => group.id !== groupId);
    
    // Ensure at least one filter group exists
    if (updatedFilters.length === 0) {
      updatedFilters.push({
        id: `group-${Date.now()}`,
        logic: 'and',
        conditions: []
      });
    }
    
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };
  
  // Add a condition to a filter group
  const addCondition = (groupId: string, fieldId: string) => {
    const field = filterFields.find(f => f.id === fieldId);
    if (!field) return;
    
    const newCondition: FilterValue = {
      field: field.id,
      operator: getDefaultOperator(field.type),
      value: getDefaultValue(field.type, field.options)
    };
    
    const updatedFilters = filters.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [...group.conditions, newCondition]
        };
      }
      return group;
    });
    
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };
  
  // Update a condition
  const updateCondition = (groupId: string, index: number, updatedCondition: FilterValue) => {
    const updatedFilters = filters.map(group => {
      if (group.id === groupId) {
        const updatedConditions = [...group.conditions];
        updatedConditions[index] = updatedCondition;
        
        return {
          ...group,
          conditions: updatedConditions
        };
      }
      return group;
    });
    
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };
  
  // Delete a condition
  const deleteCondition = (groupId: string, index: number) => {
    const updatedFilters = filters.map(group => {
      if (group.id === groupId) {
        const updatedConditions = [...group.conditions];
        updatedConditions.splice(index, 1);
        
        return {
          ...group,
          conditions: updatedConditions
        };
      }
      return group;
    });
    
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };
  
  // Get default operator based on field type
  const getDefaultOperator = (fieldType: string): string => {
    switch (fieldType) {
      case 'string':
        return 'contains';
      case 'number':
        return 'equals';
      case 'boolean':
        return 'equals';
      case 'date':
        return 'equals';
      case 'select':
      case 'multiselect':
        return 'in';
      default:
        return 'equals';
    }
  };
  
  // Get default value based on field type
  const getDefaultValue = (fieldType: string, options?: { value: string; label: string }[]): any => {
    switch (fieldType) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return true;
      case 'date':
        return new Date();
      case 'select':
        return options && options.length > 0 ? options[0].value : '';
      case 'multiselect':
        return [];
      default:
        return '';
    }
  };
  
  return (
    <Box>
      <VStack spacing={4} align="stretch" p={4}>
        <Text>
          Create filters to segment your analytics data. Add multiple filter groups for OR logic between groups.
        </Text>
        
        {/* Filter groups */}
        <Accordion allowMultiple defaultIndex={Array.from({ length: filters.length }, (_, i) => i)}>
          {filters.map((group, groupIndex) => (
            <AccordionItem 
              key={group.id}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="md"
              mb={3}
            >
              <AccordionButton p={3}>
                <HStack flex="1" justify="space-between">
                  <HStack>
                    <Badge
                      colorScheme="blue"
                      px={2}
                      py={1}
                      borderRadius="md"
                      cursor="pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupLogic(group.id);
                      }}
                    >
                      {group.logic === 'and' ? 'AND' : 'OR'}
                    </Badge>
                    <Text>
                      {groupIndex === 0 ? 'Where' : group.logic === 'and' ? 'And where' : 'Or where'}
                    </Text>
                  </HStack>
                  
                  {filters.length > 1 && (
                    <IconButton
                      aria-label="Remove filter group"
                      icon={<FiX />}
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFilterGroup(group.id);
                      }}
                    />
                  )}
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              
              <AccordionPanel pb={4}>
                <VStack spacing={3} align="stretch">
                  {/* Filter conditions */}
                  {group.conditions.map((condition, index) => {
                    const field = filterFields.find(f => f.id === condition.field);
                    if (!field) return null;
                    
                    return (
                      <MobileFilterCondition
                        key={`${group.id}-condition-${index}`}
                        condition={condition}
                        field={field}
                        onChange={(updatedCondition) => updateCondition(group.id, index, updatedCondition)}
                        onDelete={() => deleteCondition(group.id, index)}
                      />
                    );
                  })}
                  
                  {/* Add condition button */}
                  <Menu placement="bottom-end">
                    <MenuButton 
                      as={Button}
                      leftIcon={<FiPlus />}
                      rightIcon={<FiChevronDown />}
                      size="sm"
                      variant="outline"
                    >
                      Add Filter
                    </MenuButton>
                    <MenuList maxH="300px" overflow="auto">
                      {Object.entries(fieldCategories).map(([category, fields]) => (
                        <React.Fragment key={category}>
                          <Text px={3} py={1} fontSize="xs" fontWeight="bold" color="gray.500">
                            {category}
                          </Text>
                          {fields.map(field => (
                            <MenuItem
                              key={field.id}
                              onClick={() => addCondition(group.id, field.id)}
                            >
                              {field.label}
                            </MenuItem>
                          ))}
                          <Divider my={1} />
                        </React.Fragment>
                      ))}
                    </MenuList>
                  </Menu>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
        
        {/* Add filter group button */}
        <Button
          leftIcon={<FiFilter />}
          size="md"
          variant="outline"
          onClick={addFilterGroup}
        >
          Add Filter Group
        </Button>
      </VStack>
      
      {/* Apply button - fixed at bottom */}
      <Box 
        position="sticky" 
        bottom={0} 
        p={4} 
        bg={bgColor} 
        borderTop="1px" 
        borderColor={borderColor}
      >
        <Button 
          colorScheme="blue" 
          size="lg" 
          width="100%"
          onClick={() => onChange(filters)}
        >
          Apply Filters
        </Button>
      </Box>
    </Box>
  );
};

export default MobileFilterDrawer;
