import React, { useState, useEffect, ReactNode } from 'react';
import { 
  Box, 
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Collapse,
  VStack,
  Text,
  Badge,
  useToast
} from '@chakra-ui/react';
import { FiWifi, FiWifiOff, FiRefreshCw, FiClock } from 'react-icons/fi';
import mobileOptimizationService from '../../../services/MobileOptimizationService';

interface OfflineDataHandlerProps<T> {
  children: (data: T[], isOffline: boolean) => ReactNode;
  fetchData: () => Promise<T[]>;
  localStorageKey: string;
  expiryHours?: number;
  pollingInterval?: number;
  placeholderComponent?: React.ReactNode;
  allowManualRefresh?: boolean;
  notifyOnUpdate?: boolean;
}

/**
 * OfflineDataHandler component
 * 
 * Handles data fetching with offline support:
 * - Attempts to fetch live data when online
 * - Falls back to cached data when offline
 * - Stores data with timestamps
 * - Handles data expiration
 * - Shows appropriate offline indicators and refresh options
 * - Optimizes for mobile and low-end devices
 * 
 * @example
 * <OfflineDataHandler
 *   fetchData={fetchAnalyticsData}
 *   localStorageKey="analytics-dashboard-data"
 * >
 *   {(data, isOffline) => <AnalyticsDashboard data={data} isOffline={isOffline} />}
 * </OfflineDataHandler>
 */
function OfflineDataHandler<T>({
  children,
  fetchData,
  localStorageKey,
  expiryHours = 24,
  pollingInterval = 0,
  placeholderComponent = null,
  allowManualRefresh = true,
  notifyOnUpdate = true,
}: OfflineDataHandlerProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const toast = useToast();

  // Network status handler
  useEffect(() => {
    const handleNetworkChange = () => {
      const networkStatus = mobileOptimizationService.getNetworkStatus();
      setIsOffline(!networkStatus.online || mobileOptimizationService.shouldUseOfflineMode());
      
      // Show offline alert when going offline
      if (!networkStatus.online) {
        setShowOfflineAlert(true);
      }
    };
    
    // Initial check
    handleNetworkChange();
    
    // Listen for changes
    mobileOptimizationService.addEventListener('network', handleNetworkChange);
    
    return () => {
      mobileOptimizationService.removeEventListener('network', handleNetworkChange);
    };
  }, []);
  
  // Cache expiration check
  const isCacheExpired = (timestamp: string): boolean => {
    const cachedTime = new Date(timestamp).getTime();
    const currentTime = new Date().getTime();
    const expiryTime = expiryHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    return currentTime - cachedTime > expiryTime;
  };
  
  // Load cached data
  const loadCachedData = (): boolean => {
    try {
      const cachedDataString = localStorage.getItem(localStorageKey);
      
      if (cachedDataString) {
        const { data: cachedData, timestamp } = JSON.parse(cachedDataString);
        
        if (cachedData && Array.isArray(cachedData) && timestamp) {
          if (!isCacheExpired(timestamp)) {
            setData(cachedData);
            setLastUpdated(new Date(timestamp));
            return true;
          } else {
            console.log('Cached data expired, fetching fresh data');
          }
        }
      }
      return false;
    } catch (err) {
      console.error('Error loading cached data:', err);
      return false;
    }
  };
  
  // Save data to cache
  const cacheData = (fetchedData: T[]) => {
    try {
      const timestamp = new Date().toISOString();
      localStorage.setItem(
        localStorageKey,
        JSON.stringify({ data: fetchedData, timestamp })
      );
      setLastUpdated(new Date(timestamp));
    } catch (err) {
      console.error('Error caching data:', err);
    }
  };
  
  // Fetch live data
  const fetchLiveData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    
    try {
      const fetchedData = await fetchData();
      
      setData(fetchedData);
      cacheData(fetchedData);
      
      if (!silent && notifyOnUpdate) {
        toast({
          title: "Data updated",
          description: "Latest data has been loaded",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error fetching data:', err);
      
      // Only set error if we don't have cached data to fall back on
      if (!loadCachedData()) {
        setError('Could not fetch data. Please try again later.');
      }
      
      return false;
    } finally {
      if (!silent) setIsLoading(false);
    }
  };
  
  // Handle initial data loading
  useEffect(() => {
    const initialLoad = async () => {
      if (isOffline) {
        // Try to load cached data when offline
        if (!loadCachedData()) {
          setError('No cached data available while offline');
        }
        setIsLoading(false);
      } else {
        // Try to fetch live data when online
        if (!await fetchLiveData()) {
          // Attempt to load from cache as fallback
          loadCachedData();
        }
      }
    };
    
    initialLoad();
  }, [isOffline]);
  
  // Set up polling if specified
  useEffect(() => {
    if (pollingInterval <= 0 || isOffline) return;
    
    const pollerId = setInterval(() => {
      if (!isOffline) {
        fetchLiveData(true); // Silent refresh
      }
    }, pollingInterval * 1000);
    
    return () => clearInterval(pollerId);
  }, [pollingInterval, isOffline]);
  
  // Format time since last update
  const formatTimeSince = (date: Date): string => {
    if (!date) return '';
    
    const minutes = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    if (isOffline) {
      toast({
        title: "You're offline",
        description: "Cannot refresh data while offline",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    fetchLiveData();
  };
  
  if (isLoading && !data.length) {
    return <>{placeholderComponent || 'Loading...'}</>;
  }
  
  return (
    <Box position="relative">
      <Collapse in={showOfflineAlert && isOffline} animateOpacity>
        <Alert 
          status="warning" 
          variant="solid" 
          mb={4}
          borderRadius="md"
          alignItems="flex-start"
        >
          <AlertIcon />
          <Box flex="1">
            <AlertTitle display="flex" alignItems="center">
              <FiWifiOff style={{ marginRight: '8px' }} />
              Offline Mode
            </AlertTitle>
            <AlertDescription fontSize="sm">
              You're viewing cached data from {lastUpdated ? formatTimeSince(lastUpdated) : 'a previous session'}.
              {isOffline && <Text mt={2}>Reconnect to get the latest updates.</Text>}
            </AlertDescription>
            {allowManualRefresh && (
              <Button 
                size="sm" 
                leftIcon={<FiRefreshCw />} 
                mt={2} 
                onClick={() => setShowOfflineAlert(false)}
              >
                Dismiss
              </Button>
            )}
          </Box>
        </Alert>
      </Collapse>
      
      <Box mb={4}>
        <VStack align="stretch" spacing={0}>
          {error && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Box 
            py={2} 
            px={3}
            display="flex" 
            justifyContent="space-between" 
            alignItems="center" 
            borderRadius="md" 
            bg={isOffline ? "orange.50" : "blue.50"} 
            color={isOffline ? "orange.800" : "blue.800"}
            borderWidth="1px"
            borderColor={isOffline ? "orange.200" : "blue.200"}
          >
            <Box display="flex" alignItems="center">
              {isOffline ? (
                <FiWifiOff style={{ marginRight: '8px' }} />
              ) : (
                <FiWifi style={{ marginRight: '8px' }} />
              )}
              <Text fontSize="sm" fontWeight="medium">
                {isOffline ? 'Offline' : 'Online'}
                <Badge ml={2} colorScheme={isOffline ? "orange" : "green"} variant="subtle">
                  {isOffline ? 'Cached Data' : 'Live Data'}
                </Badge>
              </Text>
            </Box>
            
            <Box display="flex" alignItems="center">
              {lastUpdated && (
                <Text fontSize="xs" mr={3} display="flex" alignItems="center">
                  <FiClock style={{ marginRight: '4px' }} />
                  {formatTimeSince(lastUpdated)}
                </Text>
              )}
              
              {allowManualRefresh && (
                <Button 
                  size="xs" 
                  leftIcon={<FiRefreshCw />}
                  onClick={handleRefresh}
                  isDisabled={isOffline || isLoading}
                  isLoading={isLoading}
                >
                  Refresh
                </Button>
              )}
            </Box>
          </Box>
        </VStack>
      </Box>
      
      {children(data, isOffline)}
    </Box>
  );
}

export default OfflineDataHandler;
