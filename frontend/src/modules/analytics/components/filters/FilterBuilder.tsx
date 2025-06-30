import React, { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  HStack,
  Flex,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
  Divider,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiPlus, FiFilter, FiChevronDown, FiX } from 'react-icons/fi';
import FilterCondition from './FilterCondition';

export interface FilterField {
  id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  options?: { value: string; label: string }[];
  category?: string;
}

export interface FilterValue {
  field: string;
  operator: string;
  value: any;
}

export interface FilterGroup {
  id: string;
  logic: 'and' | 'or';
  conditions: FilterValue[];
}

interface FilterBuilderProps {
  fields: FilterField[];
  onChange: (filters: FilterGroup[]) => void;
  initialFilters?: FilterGroup[];
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({ 
  fields, 
  onChange,
  initialFilters 
}) => {
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>(
    initialFilters || [
      {
        id: `group-${Date.now()}`,
        logic: 'and',
        conditions: []
      }
    ]
  );
  
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bgColor = useColorModeValue('white', 'gray.700');
  const badgeBg = useColorModeValue('blue.50', 'blue.900');
  const badgeColor = useColorModeValue('blue.700', 'blue.200');
  
  // Add a new filter group
  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      logic: 'and',
      conditions: []
    };
    
    setFilterGroups([...filterGroups, newGroup]);
    onChange([...filterGroups, newGroup]);
  };
  
  // Delete a filter group
  const deleteFilterGroup = (groupId: string) => {
    const updatedGroups = filterGroups.filter(group => group.id !== groupId);
    setFilterGroups(updatedGroups);
    onChange(updatedGroups);
  };
  
  // Toggle logic (AND/OR) for a filter group
  const toggleGroupLogic = (groupId: string) => {
    const updatedGroups = filterGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          logic: group.logic === 'and' ? 'or' : 'and'
        };
      }
      return group;
    });
    
    setFilterGroups(updatedGroups);
    onChange(updatedGroups);
  };
  
  // Add a condition to a filter group
  const addCondition = (groupId: string, fieldId: string) => {
    // Find selected field details
    const selectedField = fields.find(f => f.id === fieldId);
    if (!selectedField) return;
    
    const newCondition: FilterValue = {
      field: selectedField.id,
      operator: getDefaultOperator(selectedField.type),
      value: getDefaultValue(selectedField.type, selectedField.options)
    };
    
    const updatedGroups = filterGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [...group.conditions, newCondition]
        };
      }
      return group;
    });
    
    setFilterGroups(updatedGroups);
    onChange(updatedGroups);
  };
  
  // Update a condition
  const updateCondition = (groupId: string, index: number, updatedCondition: FilterValue) => {
    const updatedGroups = filterGroups.map(group => {
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
    
    setFilterGroups(updatedGroups);
    onChange(updatedGroups);
  };
  
  // Delete a condition
  const deleteCondition = (groupId: string, index: number) => {
    const updatedGroups = filterGroups.map(group => {
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
    
    setFilterGroups(updatedGroups);
    onChange(updatedGroups);
  };
  
  // Group fields by category for the menu
  const getFieldsByCategory = () => {
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
  
  const fieldCategories = getFieldsByCategory();
  
  return (
    <Box>
      <Stack spacing={4}>
        {filterGroups.map((group, groupIndex) => (
          <Box 
            key={group.id}
            p={4}
            border="1px"
            borderColor={borderColor}
            borderRadius="md"
            bg={bgColor}
          >
            <Flex justifyContent="space-between" alignItems="center" mb={3}>
              <HStack>
                <Badge
                  bg={badgeBg}
                  color={badgeColor}
                  fontSize="sm"
                  px={2}
                  py={1}
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => toggleGroupLogic(group.id)}
                >
                  {group.logic === 'and' ? 'AND' : 'OR'}
                </Badge>
                <Text fontSize="sm" fontWeight="medium">
                  {groupIndex === 0 ? 'Where' : group.logic === 'and' ? 'And where' : 'Or where'}
                </Text>
              </HStack>
              
              {filterGroups.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => deleteFilterGroup(group.id)}
                >
                  <Icon as={FiX} />
                </Button>
              )}
            </Flex>
            
            {/* Filter conditions */}
            <Stack spacing={2}>
              {group.conditions.map((condition, index) => {
                const field = fields.find(f => f.id === condition.field);
                return (
                  <FilterCondition
                    key={`${group.id}-condition-${index}`}
                    condition={condition}
                    field={field!}
                    onChange={(updatedCondition) => updateCondition(group.id, index, updatedCondition)}
                    onDelete={() => deleteCondition(group.id, index)}
                  />
                );
              })}
            </Stack>
            
            {/* Add condition button */}
            <Menu closeOnSelect={true}>
              <MenuButton
                as={Button}
                rightIcon={<FiChevronDown />}
                leftIcon={<FiPlus />}
                size="sm"
                mt={3}
                variant="outline"
              >
                Add Filter
              </MenuButton>
              <MenuList>
                {Object.entries(fieldCategories).map(([category, categoryFields]) => (
                  <React.Fragment key={category}>
                    <Text px={3} py={1} fontSize="xs" fontWeight="bold" color="gray.500">
                      {category}
                    </Text>
                    {categoryFields.map(field => (
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
          </Box>
        ))}
        
        {/* Add filter group button */}
        <Button
          leftIcon={<Icon as={FiFilter} />}
          size="sm"
          variant="outline"
          onClick={addFilterGroup}
          alignSelf="flex-start"
        >
          Add Filter Group
        </Button>
      </Stack>
    </Box>
  );
};

export default FilterBuilder;
