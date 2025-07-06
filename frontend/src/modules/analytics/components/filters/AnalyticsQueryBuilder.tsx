import React, { useState, useEffect } from 'react';
import { FiPlus, FiX, FiBarChart, FiLayers, FiFilter, FiSettings } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FilterBuilder from './FilterBuilder';
import type { FilterGroup, FilterField } from './FilterBuilder';

interface AnalyticsQuery {
  metrics: string[];
  dimensions: string[];
  date_range: {
    start_date: string;
    end_date: string;
  };
  filters: Record<string, any>;
  sort_by: string;
  sort_desc: boolean;
  limit: number;
}

interface AnalyticsQueryBuilderProps {
  initialQuery: AnalyticsQuery;
  onChange: (query: AnalyticsQuery) => void;
}

interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
}

interface DimensionDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
}

const AnalyticsQueryBuilder: React.FC<AnalyticsQueryBuilderProps> = ({
  initialQuery,
  onChange
}) => {
  const [query, setQuery] = useState<AnalyticsQuery>(initialQuery);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'dimensions' | 'filters' | 'settings'>('metrics');

  // Available metrics
  const availableMetrics: MetricDefinition[] = [
    { key: 'revenue', label: 'Revenue', description: 'Total revenue generated', category: 'Financial' },
    { key: 'orders', label: 'Orders', description: 'Number of orders', category: 'Sales' },
    { key: 'conversion_rate', label: 'Conversion Rate', description: 'Percentage of visitors who make a purchase', category: 'Performance' },
    { key: 'average_order_value', label: 'Average Order Value', description: 'Average amount spent per order', category: 'Financial' },
    { key: 'customer_count', label: 'Customer Count', description: 'Number of unique customers', category: 'Customers' },
    { key: 'product_views', label: 'Product Views', description: 'Number of product page views', category: 'Engagement' },
    { key: 'cart_abandonment_rate', label: 'Cart Abandonment Rate', description: 'Percentage of carts left without purchase', category: 'Performance' },
    { key: 'return_rate', label: 'Return Rate', description: 'Percentage of orders returned', category: 'Quality' }
  ];

  // Available dimensions
  const availableDimensions: DimensionDefinition[] = [
    { key: 'date', label: 'Date', description: 'Group by date', category: 'Time' },
    { key: 'product_category', label: 'Product Category', description: 'Group by product category', category: 'Product' },
    { key: 'customer_segment', label: 'Customer Segment', description: 'Group by customer segment', category: 'Customer' },
    { key: 'channel', label: 'Channel', description: 'Group by sales channel', category: 'Channel' },
    { key: 'region', label: 'Region', description: 'Group by geographic region', category: 'Geography' },
    { key: 'device_type', label: 'Device Type', description: 'Group by device type', category: 'Technology' },
    { key: 'traffic_source', label: 'Traffic Source', description: 'Group by traffic source', category: 'Marketing' },
    { key: 'payment_method', label: 'Payment Method', description: 'Group by payment method', category: 'Payment' }
  ];

  // Available filter fields
  const filterFields: FilterField[] = [
    {
      id: 'product_category', name: 'product_category', label: 'Product Category', type: 'select', options: [
        { value: 'electronics', label: 'Electronics' },
        { value: 'clothing', label: 'Clothing' },
        { value: 'books', label: 'Books' }
      ]
    },
    {
      id: 'customer_segment', name: 'customer_segment', label: 'Customer Segment', type: 'select', options: [
        { value: 'new', label: 'New Customers' },
        { value: 'returning', label: 'Returning Customers' },
        { value: 'vip', label: 'VIP Customers' }
      ]
    },
    { id: 'order_value', name: 'order_value', label: 'Order Value', type: 'number' },
    { id: 'order_date', name: 'order_date', label: 'Order Date', type: 'date' },
    { id: 'is_mobile', name: 'is_mobile', label: 'Mobile Order', type: 'boolean' }
  ];

  // Update local state when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Update parent when query changes
  const updateQuery = (updatedQuery: AnalyticsQuery) => {
    setQuery(updatedQuery);
    onChange(updatedQuery);
  };

  // Add metric to query
  const addMetric = (metricKey: string) => {
    if (!query.metrics.includes(metricKey)) {
      const updatedQuery = {
        ...query,
        metrics: [...query.metrics, metricKey]
      };
      updateQuery(updatedQuery);
    }
  };

  // Remove metric from query
  const removeMetric = (metricKey: string) => {
    const updatedQuery = {
      ...query,
      metrics: query.metrics.filter(m => m !== metricKey)
    };
    updateQuery(updatedQuery);
  };

  // Add dimension to query
  const addDimension = (dimensionKey: string) => {
    if (!query.dimensions.includes(dimensionKey)) {
      const updatedQuery = {
        ...query,
        dimensions: [...query.dimensions, dimensionKey]
      };
      updateQuery(updatedQuery);
    }
  };

  // Remove dimension from query
  const removeDimension = (dimensionKey: string) => {
    const updatedQuery = {
      ...query,
      dimensions: query.dimensions.filter(d => d !== dimensionKey)
    };
    updateQuery(updatedQuery);
  };

  // Handle filter changes
  const handleFilterChange = (groups: FilterGroup[]) => {
    setFilterGroups(groups);
    const updatedQuery = {
      ...query,
      filters: { groups }
    };
    updateQuery(updatedQuery);
  };

  // Get metric label
  const getMetricLabel = (key: string): string => {
    const metric = availableMetrics.find(m => m.key === key);
    return metric?.label || key;
  };

  // Get dimension label
  const getDimensionLabel = (key: string): string => {
    const dimension = availableDimensions.find(d => d.key === key);
    return dimension?.label || key;
  };

  // Group metrics by category
  const groupedMetrics = availableMetrics.reduce((acc, metric) => {
    const category = metric.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(metric);
    return acc;
  }, {} as Record<string, MetricDefinition[]>);

  // Group dimensions by category
  const groupedDimensions = availableDimensions.reduce((acc, dimension) => {
    const category = dimension.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(dimension);
    return acc;
  }, {} as Record<string, DimensionDefinition[]>);

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiBarChart className="h-5 w-5" />
            Analytics Query Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                active={activeTab === 'metrics'}
                onClick={() => setActiveTab('metrics')}
                className="flex items-center gap-2"
              >
                <FiBarChart className="h-4 w-4" />
                Metrics
              </TabsTrigger>
              <TabsTrigger
                active={activeTab === 'dimensions'}
                onClick={() => setActiveTab('dimensions')}
                className="flex items-center gap-2"
              >
                <FiLayers className="h-4 w-4" />
                Dimensions
              </TabsTrigger>
              <TabsTrigger
                active={activeTab === 'filters'}
                onClick={() => setActiveTab('filters')}
                className="flex items-center gap-2"
              >
                <FiFilter className="h-4 w-4" />
                Filters
              </TabsTrigger>
              <TabsTrigger
                active={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-2"
              >
                <FiSettings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {activeTab === 'metrics' && (
              <TabsContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Selected Metrics</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {query.metrics.length > 0 ? (
                      query.metrics.map((metric) => (
                        <Badge key={metric} variant="default" className="flex items-center gap-1">
                          {getMetricLabel(metric)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeMetric(metric)}
                          >
                            <FiX className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No metrics selected</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">Available Metrics</h3>
                  <div className="space-y-4">
                    {Object.entries(groupedMetrics).map(([category, metrics]) => (
                      <div key={category}>
                        <h4 className="text-xs font-medium text-gray-600 mb-2">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {metrics.map((metric) => (
                            <div
                              key={metric.key}
                              className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{metric.label}</p>
                                <p className="text-xs text-gray-500">{metric.description}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addMetric(metric.key)}
                                disabled={query.metrics.includes(metric.key)}
                              >
                                <FiPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}

            {activeTab === 'dimensions' && (
              <TabsContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Selected Dimensions</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {query.dimensions.length > 0 ? (
                      query.dimensions.map((dimension) => (
                        <Badge key={dimension} variant="secondary" className="flex items-center gap-1">
                          {getDimensionLabel(dimension)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeDimension(dimension)}
                          >
                            <FiX className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No dimensions selected</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">Available Dimensions</h3>
                  <div className="space-y-4">
                    {Object.entries(groupedDimensions).map(([category, dimensions]) => (
                      <div key={category}>
                        <h4 className="text-xs font-medium text-gray-600 mb-2">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {dimensions.map((dimension) => (
                            <div
                              key={dimension.key}
                              className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{dimension.label}</p>
                                <p className="text-xs text-gray-500">{dimension.description}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addDimension(dimension.key)}
                                disabled={query.dimensions.includes(dimension.key)}
                              >
                                <FiPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}

            {activeTab === 'filters' && (
              <TabsContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Query Filters</h3>
                  <FilterBuilder
                    fields={filterFields}
                    onChange={handleFilterChange}
                    initialFilters={filterGroups}
                  />
                </div>
              </TabsContent>
            )}

            {activeTab === 'settings' && (
              <TabsContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Query Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                      <Select value={query.sort_by} onValueChange={(value) => {
                        const updatedQuery = { ...query, sort_by: value };
                        updateQuery(updatedQuery);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sort field" />
                        </SelectTrigger>
                        <SelectContent>
                          {query.metrics.map((metric) => (
                            <SelectItem key={metric} value={metric}>
                              {getMetricLabel(metric)}
                            </SelectItem>
                          ))}
                          {query.dimensions.map((dimension) => (
                            <SelectItem key={dimension} value={dimension}>
                              {getDimensionLabel(dimension)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Sort Direction</label>
                      <Select value={query.sort_desc ? 'desc' : 'asc'} onValueChange={(value) => {
                        const updatedQuery = { ...query, sort_desc: value === 'desc' };
                        updateQuery(updatedQuery);
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Result Limit</label>
                      <Select value={query.limit.toString()} onValueChange={(value) => {
                        const updatedQuery = { ...query, limit: parseInt(value, 10) };
                        updateQuery(updatedQuery);
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 results</SelectItem>
                          <SelectItem value="25">25 results</SelectItem>
                          <SelectItem value="50">50 results</SelectItem>
                          <SelectItem value="100">100 results</SelectItem>
                          <SelectItem value="500">500 results</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Query Summary</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Metrics:</strong> {query.metrics.length > 0 ? query.metrics.map(getMetricLabel).join(', ') : 'None'}</p>
                    <p><strong>Dimensions:</strong> {query.dimensions.length > 0 ? query.dimensions.map(getDimensionLabel).join(', ') : 'None'}</p>
                    <p><strong>Filters:</strong> {filterGroups.length > 0 ? `${filterGroups.length} filter group(s)` : 'None'}</p>
                    <p><strong>Sort:</strong> {query.sort_by ? `${getMetricLabel(query.sort_by) || getDimensionLabel(query.sort_by)} (${query.sort_desc ? 'desc' : 'asc'})` : 'None'}</p>
                    <p><strong>Limit:</strong> {query.limit} results</p>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsQueryBuilder;
