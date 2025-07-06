import React, { useState } from 'react';
import { FiPlus, FiFilter, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        logic: 'and' as const,
        conditions: []
      }
    ]
  );

  // Add a new filter group
  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      logic: 'and' as const,
      conditions: []
    };

    const updatedGroups = [...filterGroups, newGroup];
    setFilterGroups(updatedGroups);
    onChange(updatedGroups);
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
          logic: (group.logic === 'and' ? 'or' : 'and') as 'and' | 'or'
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
        return false;
      case 'date':
        return new Date();
      case 'select':
        return options?.[0]?.value || '';
      case 'multiselect':
        return [];
      default:
        return '';
    }
  };

  return (
    <div className="w-full space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiFilter className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <Badge variant="secondary">
          {filterGroups.reduce((count, group) => count + group.conditions.length, 0)} conditions
        </Badge>
      </div>

      {/* Placeholder for now */}
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">🔍</div>
        <p className="text-gray-600">Filter Builder placeholder</p>
        <p className="text-sm text-gray-500">Team B to implement full dropdown functionality</p>
      </div>

      {/* Filter Groups */}
      <div className="space-y-4">
        {filterGroups.map((group, groupIndex) => (
          <div key={group.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
            {/* Group Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Group {groupIndex + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleGroupLogic(group.id)}
                  className="h-6 px-2 text-xs"
                >
                  {group.logic.toUpperCase()}
                </Button>
              </div>

              {filterGroups.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteFilterGroup(group.id)}
                  className="h-6 w-6 p-0"
                >
                  <FiX className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              {group.conditions.map((condition, conditionIndex) => {
                const field = fields.find(f => f.id === condition.field);
                if (!field) return null;

                return (
                  <FilterCondition
                    key={conditionIndex}
                    value={condition}
                    field={field}
                    onChange={(updatedCondition) =>
                      updateCondition(group.id, conditionIndex, updatedCondition)
                    }
                    onDelete={() => deleteCondition(group.id, conditionIndex)}
                  />
                );
              })}
            </div>

            {/* Add Condition - Simplified for now */}
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  // Add first available field as example
                  const firstField = fields[0];
                  if (firstField) {
                    addCondition(group.id, firstField.id);
                  }
                }}
              >
                <FiPlus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Filter Group */}
      <Button
        variant="outline"
        onClick={addFilterGroup}
        className="w-full"
      >
        <FiPlus className="h-4 w-4 mr-2" />
        Add Filter Group
      </Button>
    </div>
  );
};

export default FilterBuilder;
