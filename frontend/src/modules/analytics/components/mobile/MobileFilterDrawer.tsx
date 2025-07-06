import React, { useState } from 'react';
import { FiPlus, FiX, FiChevronDown, FiFilter } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
      field: fieldId,
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
        return 'equals';
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

  // Get active filter count
  const getActiveFilterCount = (): number => {
    return filters.reduce((count, group) => count + group.conditions.length, 0);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FiFilter className="h-5 w-5" />
          Filters
        </h2>
        <Badge variant="secondary">
          {getActiveFilterCount()} active
        </Badge>
      </div>

      {/* Filter Groups */}
      <div className="space-y-4">
        {filters.map((group, groupIndex) => (
          <Card key={group.id} className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">
                    Group {groupIndex + 1}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleGroupLogic(group.id)}
                    className="h-6 px-2 text-xs"
                  >
                    {group.logic.toUpperCase()}
                  </Button>
                </div>

                {filters.length > 1 && (
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
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Conditions */}
              {group.conditions.map((condition, conditionIndex) => {
                const field = filterFields.find(f => f.id === condition.field);
                if (!field) return null;

                return (
                  <MobileFilterCondition
                    key={conditionIndex}
                    condition={condition}
                    field={field}
                    onChange={(updatedCondition) =>
                      updateCondition(group.id, conditionIndex, updatedCondition)
                    }
                    onDelete={() => deleteCondition(group.id, conditionIndex)}
                  />
                );
              })}

              {/* Add Condition */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <FiPlus className="h-4 w-4" />
                      Add Condition
                    </span>
                    <FiChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-2">
                  <div className="space-y-2">
                    {Object.entries(fieldCategories).map(([category, categoryFields]) => (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-gray-600 mb-1">
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 gap-1">
                          {categoryFields.map((field) => (
                            <Button
                              key={field.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => addCondition(group.id, field.id)}
                              className="justify-start h-8 px-2 text-xs"
                            >
                              {field.label}
                            </Button>
                          ))}
                        </div>
                        {Object.keys(fieldCategories).indexOf(category) < Object.keys(fieldCategories).length - 1 && (
                          <Separator className="mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
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

export default MobileFilterDrawer;
