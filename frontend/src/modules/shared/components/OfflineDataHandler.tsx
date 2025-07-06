import React, { useState, useEffect, ReactNode } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  AlertCircle
} from 'lucide-react';
import mobileOptimizationService from '../../../services/MobileOptimizationService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();

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
        variant: "destructive",
      });
      return;
    }

    fetchLiveData();
  };

  if (isLoading && !data.length) {
    return <>{placeholderComponent || 'Loading...'}</>;
  }

  return (
    <div className="relative">
      <Collapsible open={showOfflineAlert && isOffline}>
        <CollapsibleContent className="mb-4">
          <Alert variant="default" className="border-orange-200 bg-orange-50 text-orange-800">
            <WifiOff className="h-4 w-4" />
            <div className="flex-1">
              <AlertTitle className="flex items-center">
                Offline Mode
              </AlertTitle>
              <AlertDescription className="text-sm">
                You're viewing cached data from {lastUpdated ? formatTimeSince(lastUpdated) : 'a previous session'}.
                {isOffline && <div className="mt-2">Reconnect to get the latest updates.</div>}
              </AlertDescription>
              {allowManualRefresh && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-orange-300 text-orange-800 hover:bg-orange-100"
                  onClick={() => setShowOfflineAlert(false)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              )}
            </div>
          </Alert>
        </CollapsibleContent>
      </Collapsible>

      <div className="mb-4">
        <div className="space-y-0">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div
            className={cn(
              "py-2 px-3 flex justify-between items-center rounded-md border",
              isOffline
                ? "bg-orange-50 text-orange-800 border-orange-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            )}
          >
            <div className="flex items-center">
              {isOffline ? (
                <WifiOff className="h-4 w-4 mr-2" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">
                {isOffline ? 'Offline' : 'Online'}
                <Badge
                  variant={isOffline ? "secondary" : "default"}
                  className={cn(
                    "ml-2",
                    isOffline
                      ? "bg-orange-100 text-orange-700"
                      : "bg-green-100 text-green-700"
                  )}
                >
                  {isOffline ? 'Cached Data' : 'Live Data'}
                </Badge>
              </span>
            </div>

            <div className="flex items-center">
              {lastUpdated && (
                <span className="text-xs mr-3 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimeSince(lastUpdated)}
                </span>
              )}

              {allowManualRefresh && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isOffline || isLoading}
                  className="h-6 px-2 text-xs"
                >
                  {isLoading ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {children(data, isOffline)}
    </div>
  );
}

export default OfflineDataHandler;
