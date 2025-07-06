import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FilterField, FilterValue } from './FilterBuilder';
import DatePicker from '../DatePicker';

interface FilterConditionProps {
  field: FilterField;
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  onDelete: () => void;
}

const FilterCondition: React.FC<FilterConditionProps> = ({
  field,
  value,
  onChange,
  onDelete
}) => {
  // Get available operators based on field type
  const getOperators = (fieldType: string) => {
    switch (fieldType) {
      case 'string':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'starts_with', label: 'Starts with' },
          { value: 'ends_with', label: 'Ends with' },
          { value: 'not_equals', label: 'Not equals' }
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'greater_than_or_equal', label: 'Greater than or equal' },
          { value: 'less_than_or_equal', label: 'Less than or equal' }
        ];
      case 'boolean':
        return [
          { value: 'equals', label: 'Is' }
        ];
      case 'date':
        return [
          { value: 'equals', label: 'On' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'between', label: 'Between' }
        ];
      case 'select':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' }
        ];
      case 'multiselect':
        return [
          { value: 'in', label: 'In' },
          { value: 'not_in', label: 'Not in' }
        ];
      default:
        return [{ value: 'equals', label: 'Equals' }];
    }
  };

  // Handle operator change
  const handleOperatorChange = (operator: string) => {
    onChange({
      ...value,
      operator
    });
  };

  // Handle value change
  const handleValueChange = (newValue: any) => {
    onChange({
      ...value,
      value: newValue
    });
  };

  // Render value input based on field type
  const renderValueInput = () => {
    switch (field.type) {
      case 'string':
        return (
          <Input
            type="text"
            value={value.value as string}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value.value as number}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            placeholder="Enter number"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`checkbox-${field.id}`}
              checked={value.value as boolean}
              onChange={(e) => handleValueChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`checkbox-${field.id}`} className="text-sm font-medium text-gray-700">
              {value.value ? 'True' : 'False'}
            </label>
          </div>
        );

      case 'date':
        return (
          <DatePicker
            selected={value.value as Date}
            onChange={(date) => handleValueChange(date)}
            placeholderText="Select date"
          />
        );

      case 'select':
        return (
          <Select value={value.value as string} onValueChange={handleValueChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = (value.value as string[]) || [];
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`multiselect-${field.id}-${option.value}`}
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter(v => v !== option.value);
                    handleValueChange(newValues);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`multiselect-${field.id}-${option.value}`} className="text-sm font-medium text-gray-700">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={value.value as string}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
      {/* Field name */}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-gray-700">{field.label}</span>
      </div>

      {/* Operator */}
      <div className="min-w-0 flex-1">
        <Select value={value.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getOperators(field.type).map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Value */}
      <div className="min-w-0 flex-1">
        {renderValueInput()}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        ×
      </Button>
    </div>
  );
};

export default FilterCondition;
