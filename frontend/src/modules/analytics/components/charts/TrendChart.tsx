import React, { useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  Heading,
  useColorModeValue,
  Spinner,
  Select,
  Icon,
  Tooltip,
  HStack,
} from '@chakra-ui/react';
import { FiInfo } from 'react-icons/fi';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

export type ChartType = 'line' | 'bar' | 'area';

interface TrendChartProps {
  data: Array<Record<string, any>>;
  xAxisKey: string;
  series: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  title?: string;
  description?: string;
  height?: number;
  loading?: boolean;
  type?: ChartType;
  stacked?: boolean;
  compareWith?: string;
  onCompareChange?: (compareValue: string) => void;
  compareOptions?: Array<{
    value: string;
    label: string;
  }>;
}

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  xAxisKey,
  series,
  title,
  description,
  height = 300,
  loading = false,
  type = 'line',
  stacked = false,
  compareWith,
  onCompareChange,
  compareOptions,
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const gridColor = useColorModeValue('gray.100', 'gray.700');

  // Format numbers for display in tooltip
  const formatValue = (value: number): string => {
    if (value === null || value === undefined) return 'N/A';
    
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    
    return value.toLocaleString();
  };

  // Custom tooltip component for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg={cardBg}
          p={3}
          borderRadius="md"
          boxShadow="md"
          border="1px solid"
          borderColor={borderColor}
        >
          <Text fontWeight="bold" mb={2}>
            {label}
          </Text>
          {payload.map((entry: any, index: number) => (
            <Flex key={`tooltip-item-${index}`} mb={1} alignItems="center">
              <Box
                w={3}
                h={3}
                borderRadius="full"
                bg={entry.color}
                mr={2}
              />
              <Text fontSize="sm">
                {entry.name}: <strong>{formatValue(entry.value)}</strong>
              </Text>
            </Flex>
          ))}
        </Box>
      );
    }
    return null;
  };

  // Render the appropriate chart type
  const renderChart = () => {
    const chartProps = {
      data,
      margin: { top: 10, right: 30, left: 20, bottom: 40 },
    };

    switch (type) {
      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            {series.map((s, index) => (
              <Bar
                key={`bar-${s.key}`}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                stackId={stacked ? 'stack' : index}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            {series.map((s) => (
              <Area
                key={`area-${s.key}`}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                stroke={s.color}
                fillOpacity={0.2}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </AreaChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: borderColor }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            {series.map((s) => (
              <Line
                key={`line-${s.key}`}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <Box
      bg={cardBg}
      p={4}
      borderRadius="lg"
      boxShadow="sm"
      border="1px"
      borderColor={borderColor}
      position="relative"
    >
      {/* Header */}
      <Flex justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          {title && (
            <Heading as="h3" size="sm" mb={1}>
              {title}
            </Heading>
          )}
          {description && (
            <HStack spacing={1}>
              <Text color={textColor} fontSize="sm">
                {description}
              </Text>
              <Tooltip label={description} placement="top">
                <span>
                  <Icon as={FiInfo} color={textColor} boxSize={3} />
                </span>
              </Tooltip>
            </HStack>
          )}
        </Box>
        {compareOptions && onCompareChange && (
          <Select
            size="xs"
            width="auto"
            value={compareWith}
            onChange={(e) => onCompareChange(e.target.value)}
          >
            {compareOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Flex>

      {/* Chart */}
      <Box height={`${height}px`} position="relative">
        {loading ? (
          <Flex
            height="100%"
            alignItems="center"
            justifyContent="center"
          >
            <Spinner color="blue.500" />
          </Flex>
        ) : data.length === 0 ? (
          <Flex
            height="100%"
            alignItems="center"
            justifyContent="center"
            color={textColor}
          >
            <Text>No data available</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
};

export default TrendChart;
