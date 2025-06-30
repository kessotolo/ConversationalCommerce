import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Collapse,
  useDisclosure,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Switch,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { FiBarChart2, FiX, FiRefreshCw } from 'react-icons/fi';
import performanceMonitoring from '../../../utils/PerformanceMonitoring';
import mobileOptimizationService from '../../../services/MobileOptimizationService';

interface PerformanceAuditOverlayProps {
  enabled?: boolean;
}

/**
 * Performance Audit Overlay
 * 
 * A development tool that displays real-time performance metrics
 * for auditing and debugging, especially useful for mobile testing.
 * 
 * NOTE: This should only be used during development/testing and
 * disabled in production builds.
 */
const PerformanceAuditOverlay: React.FC<PerformanceAuditOverlayProps> = ({
  enabled = process.env.NODE_ENV !== 'production',
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });
  const [metrics, setMetrics] = useState<any[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isRecording, setIsRecording] = useState<boolean>(true);

  // Early return if not enabled
  if (!enabled) return null;

  useEffect(() => {
    // Get device info
    setDeviceInfo(mobileOptimizationService.getDeviceInfo());
    
    // Set up metrics listener
    const handleMetricsUpdate = (updatedMetrics: any[]) => {
      if (isRecording) {
        setMetrics(updatedMetrics);
      }
    };
    
    performanceMonitoring.addListener(handleMetricsUpdate);
    
    return () => {
      performanceMonitoring.removeListener(handleMetricsUpdate);
    };
  }, [isRecording]);
  
  // Get color based on rating
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'green';
      case 'needs-improvement': return 'orange';
      case 'poor': return 'red';
      default: return 'gray';
    }
  };
  
  // Format metric value for display
  const formatMetricValue = (name: string, value: number) => {
    if (name === 'CLS') return value.toFixed(3);
    return `${Math.round(value)}ms`;
  };
  
  return (
    <Box
      position="fixed"
      bottom={0}
      right={0}
      zIndex={9999}
      width={isOpen ? "350px" : "auto"}
      bg="gray.800"
      color="white"
      borderTopLeftRadius="md"
      boxShadow="lg"
      opacity={0.9}
      transition="width 0.2s"
    >
      <HStack justifyContent="space-between" p={2}>
        <IconButton
          aria-label="Toggle performance overlay"
          icon={isOpen ? <FiX /> : <FiBarChart2 />}
          size="sm"
          variant="ghost"
          onClick={onToggle}
        />
        
        {!isOpen && (
          <Badge colorScheme="purple" variant="solid">Perf</Badge>
        )}
        
        {isOpen && (
          <>
            <Text fontWeight="bold" fontSize="sm">Performance Audit</Text>
            <HStack>
              <IconButton
                aria-label="Refresh metrics"
                icon={<FiRefreshCw />}
                size="xs"
                variant="ghost"
                onClick={() => performanceMonitoring.clearMetrics()}
              />
              <Switch
                size="sm"
                isChecked={isRecording}
                onChange={() => setIsRecording(!isRecording)}
              />
            </HStack>
          </>
        )}
      </HStack>
      
      <Collapse in={isOpen} animateOpacity>
        <Box p={3} maxH="500px" overflowY="auto">
          {/* Core Web Vitals */}
          <Box mb={4}>
            <Text fontWeight="bold" mb={2}>Core Web Vitals</Text>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th color="gray.300" p={1}>Metric</Th>
                  <Th color="gray.300" p={1} isNumeric>Value</Th>
                  <Th color="gray.300" p={1}>Rating</Th>
                </Tr>
              </Thead>
              <Tbody>
                {['LCP', 'FID', 'CLS'].map(name => {
                  const metric = metrics.find(m => m.name === name);
                  return (
                    <Tr key={name}>
                      <Td p={1}>{name}</Td>
                      <Td p={1} isNumeric>
                        {metric ? formatMetricValue(name, metric.value) : '-'}
                      </Td>
                      <Td p={1}>
                        {metric && (
                          <Badge
                            colorScheme={getRatingColor(metric.rating)}
                            size="sm"
                            variant="subtle"
                          >
                            {metric.rating}
                          </Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
          
          <Divider my={3} />
          
          {/* Custom Performance Metrics */}
          <Box mb={4}>
            <Text fontWeight="bold" mb={2}>Custom Metrics</Text>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th color="gray.300" p={1}>Metric</Th>
                  <Th color="gray.300" p={1} isNumeric>Value</Th>
                  <Th color="gray.300" p={1}>Rating</Th>
                </Tr>
              </Thead>
              <Tbody>
                {metrics
                  .filter(m => !['LCP', 'FID', 'CLS'].includes(m.name))
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 5)
                  .map(metric => (
                    <Tr key={metric.name}>
                      <Td p={1} fontSize="xs">{metric.name}</Td>
                      <Td p={1} isNumeric fontSize="xs">
                        {formatMetricValue(metric.name, metric.value)}
                      </Td>
                      <Td p={1}>
                        <Badge
                          colorScheme={getRatingColor(metric.rating)}
                          size="sm"
                          variant="subtle"
                        >
                          {metric.rating}
                        </Badge>
                      </Td>
                    </Tr>
                  ))
                }
              </Tbody>
            </Table>
          </Box>
          
          <Divider my={3} />
          
          {/* Device Info */}
          <Box>
            <Text fontWeight="bold" mb={2}>Device Info</Text>
            {deviceInfo && (
              <VStack align="flex-start" spacing={1}>
                <Text fontSize="xs">
                  Device: {deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'}
                </Text>
                <Text fontSize="xs">
                  Performance: {deviceInfo.performanceClass}
                  {deviceInfo.isLowEndDevice && (
                    <Badge ml={1} colorScheme="red" size="xs">Low-End</Badge>
                  )}
                </Text>
                <Text fontSize="xs">
                  Screen: {deviceInfo.viewport.width}x{deviceInfo.viewport.height} ({deviceInfo.pixelRatio}x)
                </Text>
                <Text fontSize="xs">
                  Network: {mobileOptimizationService.getNetworkStatus().online ? 'Online' : 'Offline'}
                </Text>
              </VStack>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default PerformanceAuditOverlay;
