import React from 'react';
import {
  Box,
  Flex,
  Text,
  Heading,
  Badge,
  Stack,
  HStack,
  Grid,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { FiInfo, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import TrendChart, { ChartType } from './TrendChart';

interface ComparisonSeries {
  key: string;
  name: string;
  color: string;
}

interface ComparisonPeriod {
  id: string;
  name: string;
  data: Array<Record<string, any>>;
  total?: number;
  previousTotal?: number;
  percentChange?: number;
}

interface ComparisonChartProps {
  title: string;
  description?: string;
  metric: string;
  metricName: string;
  metricFormatFn?: (value: number) => string;
  periods: ComparisonPeriod[];
  xAxisKey: string;
  series: ComparisonSeries[];
  type?: ChartType;
  height?: number;
  loading?: boolean;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  title,
  description,
  metric,
  metricName,
  metricFormatFn = (value) => value.toLocaleString(),
  periods,
  xAxisKey,
  series,
  type = 'line',
  height = 250,
  loading = false,
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const highlightBg = useColorModeValue('blue.50', 'blue.900');
  
  // Calculate color schemes for badges
  const getPercentChangeBadge = (percentChange?: number) => {
    if (percentChange === undefined || percentChange === 0) {
      return {
        colorScheme: 'gray',
        icon: null,
        text: '0%',
      };
    }
    
    const isPositive = percentChange > 0;
    const absoluteChange = Math.abs(percentChange);
    
    return {
      colorScheme: isPositive ? 'green' : 'red',
      icon: isPositive ? FiArrowUp : FiArrowDown,
      text: `${isPositive ? '+' : '-'}${absoluteChange.toFixed(1)}%`,
    };
  };

  return (
    <Box
      bg={cardBg}
      p={4}
      borderRadius="lg"
      boxShadow="sm"
      border="1px"
      borderColor={borderColor}
    >
      {/* Header */}
      <Flex justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Heading as="h3" size="sm" mb={1}>
            {title}
          </Heading>
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
      </Flex>

      {/* Summary Stats */}
      {periods.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: periods.length }} spacing={4} mb={6}>
          {periods.map((period) => {
            const badge = getPercentChangeBadge(period.percentChange);
            
            return (
              <Stat key={period.id} p={3} bg={highlightBg} borderRadius="md">
                <StatLabel fontSize="xs">{period.name}</StatLabel>
                <StatNumber fontSize="xl">{metricFormatFn(period.total ?? 0)}</StatNumber>
                {period.previousTotal !== undefined && (
                  <HStack spacing={1}>
                    <StatHelpText mb={0}>
                      vs. {metricFormatFn(period.previousTotal)}
                    </StatHelpText>
                    <Badge colorScheme={badge.colorScheme} variant="subtle">
                      <HStack spacing={1}>
                        {badge.icon && <Icon as={badge.icon} boxSize="10px" />}
                        <Text>{badge.text}</Text>
                      </HStack>
                    </Badge>
                  </HStack>
                )}
              </Stat>
            );
          })}
        </SimpleGrid>
      )}

      {/* Charts */}
      <SimpleGrid columns={{ base: 1, md: periods.length }} spacing={6}>
        {periods.map((period) => (
          <TrendChart
            key={period.id}
            title={period.name}
            data={period.data}
            xAxisKey={xAxisKey}
            series={series}
            type={type}
            height={height}
            loading={loading}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default ComparisonChart;
