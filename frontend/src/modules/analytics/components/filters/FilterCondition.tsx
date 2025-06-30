import React from 'react';
import {
  Flex,
  Select,
  Input,
  IconButton,
  Box,
  Checkbox,
  Stack,
  HStack,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiX } from 'react-icons/fi';
import { FilterField, FilterValue } from './FilterBuilder';
import DatePicker from '../DatePicker';

interface FilterConditionProps {
  condition: FilterValue;
  field: FilterField;
  onChange: (updatedCondition: FilterValue) => void;
  onDelete: () => void;
}

// List of operators by field type
const OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_than_equal', label: 'Greater Than or Equal' },
    { value: 'less_than_equal', label: 'Less Than or Equal' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
  ],
  boolean: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
  ],
  date: [
    { value: 'equals', label: 'On' },
    { value: 'not_equals', label: 'Not On' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
  ],
  select: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
  ],
  multiselect: [
    { value: 'in', label: 'Contains Any' },
    { value: 'not_in', label: 'Contains None' },
    { value: 'contains_all', label: 'Contains All' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
  ],
};

const FilterCondition: React.FC<FilterConditionProps> = ({
  condition,
  field,
  onChange,
  onDelete
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const operatorOptions = OPERATORS[field.type] || [];

  // Update operator
  const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOperator = e.target.value;
    // Reset value if needed for certain operators
    let newValue = condition.value;
    
    if (newOperator === 'is_empty' || newOperator === 'is_not_empty') {
      newValue = null;
    } else if (newOperator === 'between' && !Array.isArray(condition.value)) {
      if (field.type === 'number') {
        newValue = [0, 0];
      } else if (field.type === 'date') {
        newValue = [new Date(), new Date()];
      }
    }
    
    onChange({
      ...condition,
      operator: newOperator,
      value: newValue
    });
  };

  // Update value
  const handleValueChange = (newValue: any) => {
    onChange({
      ...condition,
      value: newValue
    });
  };

  // Render value input based on field type and operator
  const renderValueInput = () => {
    // No value input needed for empty/not empty operators
    if (condition.operator === 'is_empty' || condition.operator === 'is_not_empty') {
      return null;
    }
    
    // Handle between operator
    if (condition.operator === 'between') {
      return (
        <HStack spacing={2} flex={1}>
          {renderSingleValueInput(Array.isArray(condition.value) ? condition.value[0] : null, 0)}
          <Text>and</Text>
          {renderSingleValueInput(Array.isArray(condition.value) ? condition.value[1] : null, 1)}
        </HStack>
      );
    }
    
    // All other operators
    return renderSingleValueInput(condition.value);
  };
  
  // Render a single value input based on field type
  const renderSingleValueInput = (value: any, index: number = -1) => {
    const updateValue = (newValue: any) => {
      if (index === -1) {
        handleValueChange(newValue);
      } else {
        const newValues = Array.isArray(condition.value) ? [...condition.value] : [null, null];
        newValues[index] = newValue;
        handleValueChange(newValues);
      }
    };
    
    switch (field.type) {
      case 'string':
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateValue(e.target.value)}
            size="sm"
            flex={index === -1 ? 1 : undefined}
          />
        );
      
      case 'number':
        return (
          <NumberInput
            value={value || 0}
            onChange={(_, valueAsNumber) => updateValue(valueAsNumber)}
            size="sm"
            flex={index === -1 ? 1 : undefined}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        );
      
      case 'boolean':
        return (
          <Checkbox
            isChecked={!!value}
            onChange={(e) => updateValue(e.target.checked)}
          >
            {value ? 'True' : 'False'}
          </Checkbox>
        );
      
      case 'date':
        return (
          <Box flex={index === -1 ? 1 : undefined}>
            <DatePicker
              selected={value ? new Date(value) : new Date()}
              onChange={(date) => updateValue(date)}
              size="sm"
            />
          </Box>
        );
      
      case 'select':
        return (
          <Select
            value={value || ''}
            onChange={(e) => updateValue(e.target.value)}
            size="sm"
            flex={index === -1 ? 1 : undefined}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );
      
      case 'multiselect':
        return (
          <Stack flex={index === -1 ? 1 : undefined}>
            {field.options?.map((option) => (
              <Checkbox
                key={option.value}
                isChecked={Array.isArray(value) ? value.includes(option.value) : false}
                onChange={(e) => {
                  const currentValues = Array.isArray(value) ? [...value] : [];
                  if (e.target.checked) {
                    updateValue([...currentValues, option.value]);
                  } else {
                    updateValue(currentValues.filter(v => v !== option.value));
                  }
                }}
              >
                {option.label}
              </Checkbox>
            ))}
          </Stack>
        );
      
      default:
        return <Input size="sm" placeholder="Value" flex={index === -1 ? 1 : undefined} />;
    }
  };

  return (
    <Flex
      bg={bgColor}
      p={2}
      borderRadius="md"
      alignItems="center"
      gap={2}
    >
      <Text fontWeight="medium" fontSize="sm" minWidth="auto" width="auto">
        {field.label}
      </Text>
      
      <Select
        value={condition.operator}
        onChange={handleOperatorChange}
        size="sm"
        width="auto"
        minWidth="140px"
      >
        {operatorOptions.map(op => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </Select>
      
      {renderValueInput()}
      
      <IconButton
        aria-label="Remove filter"
        icon={<FiX />}
        size="sm"
        variant="ghost"
        onClick={onDelete}
      />
    </Flex>
  );
};

export default FilterCondition;
