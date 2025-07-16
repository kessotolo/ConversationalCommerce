import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

/**
 * Options for the useOfflineData hook
 */
interface UseOfflineDataOptions<T> {
  /** Key for storing data in localStorage */
  storageKey: string;
  /** Function to fetch fresh data when online */
  fetchFn: () => Promise<T>;
  /** Default data to use when no cached data exists */
  defaultData: T;
  /** Time in milliseconds before considering cached data stale (default: 1 hour) */
  staleTime?: number;
  /** Function to save/sync data when back online */
  syncFn?: (data: T) => Promise<T>;
  /** Max number of retries for failed fetches */
  maxRetries?: number;
  /** Whether to respect data saving mode from localStorage */
  respectDataSavingMode?: boolean;
}

/**
 * Return type for the useOfflineData hook
 */
interface UseOfflineDataResult<T> {
  /** The data, either from network or from cache */
  data: T;
  /** Whether data is currently being loaded */
  loading: boolean;
  /** Any error that occurred during fetching */
  error: Error | null;
  /** Whether the displayed data is from cache */
  isFromCache: boolean;
  /** Whether there is pending data waiting to be synchronized */
  hasPendingSync: boolean;
  /** Last time data was successfully fetched */
  lastFetchTime: Date | null;
  /** Update the data locally and queue for sync when online */
  updateData: (updater: (currentData: T) => T) => void;
  /** Manually trigger a refresh of the data */
  refetch: () => Promise<T | null>;
  /** Force sync of pending changes */
  syncChanges: () => Promise<boolean>;
}

/**
 * A hook for fetching and storing data with offline support
 * 
 * This hook will:
 * 1. Try to load from cache first (for immediate display)
 * 2. Fetch fresh data in the background when online
 * 3. Fall back to cached data when offline
 * 4. Store successful fetches in the cache for offline use
 * 
 * Designed for African markets with potentially unreliable internet connections
 */
export function useOfflineData<T>(
  options: UseOfflineDataOptions<T>
): UseOfflineDataResult<T> {
  const { 
    storageKey, 
    fetchFn, 
    syncFn, 
    defaultData, 
    staleTime = 3600000,
    maxRetries = 3,
    respectDataSavingMode = true 
  } = options;
  
  const [data, setData] = useState<T>(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  // Load cache data initially
  useEffect(() => {
    loadFromCache();
  }, []);
  
  // Get data saving mode setting
  const getDataSavingMode = useCallback(() => {
    if (!respectDataSavingMode) return 'off';
    try {
      const mode = localStorage.getItem('dataSavingMode');
      return mode === 'low' || mode === 'high' ? mode : 'off';
    } catch (e) {
      return 'off';
    }
  }, [respectDataSavingMode]);

  // Load data from cache
  const loadFromCache = useCallback(() => {
    try {
      const cachedItem = localStorage.getItem(storageKey);
      
      if (cachedItem) {
        const { data: cachedData, timestamp, pendingChanges } = JSON.parse(cachedItem);
        
        // Check if cache is still valid (not stale)
        const isStale = Date.now() - timestamp > staleTime;
        
        if (!isStale || !isOnline) {
          setData(cachedData);
          setIsFromCache(true);
          setLastFetchTime(new Date(timestamp));
          setHasPendingSync(!!pendingChanges);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error loading from cache:', err);
      // Silently fail - we'll try to fetch fresh data anyway
      return false;
    }
  }, [storageKey, staleTime, isOnline, setData, setIsFromCache, setLastFetchTime, setHasPendingSync]);
  
  // Save data to cache
  const saveToCache = useCallback((dataToCache: T, isPendingSync = false) => {
    try {
      const item = {
        data: dataToCache,
        timestamp: Date.now(),
        pendingChanges: isPendingSync
      };
      
      localStorage.setItem(storageKey, JSON.stringify(item));
    } catch (err) {
      console.error('Error saving to cache:', err);
      // Silently fail - caching is a best-effort feature
    }
  }, [storageKey]);
  
  // Update local data and mark as pending sync
  const updateData = useCallback((updater: (currentData: T) => T) => {
    setData(currentData => {
      const newData = updater(currentData);
      // Save with pending sync flag
      saveToCache(newData, true);
      setHasPendingSync(true);
      return newData;
    });
  }, [saveToCache]);

  // Sync changes to the server when back online
  const syncChanges = useCallback(async () => {
    if (!syncFn || !isOnline || !hasPendingSync) {
      return false;
    }

    try {
      setLoading(true);
      const syncedData = await syncFn(data);
      setData(syncedData);
      setHasPendingSync(false);
      saveToCache(syncedData, false);
      return true;
    } catch (err) {
      console.error('Error syncing changes:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [data, isOnline, hasPendingSync, syncFn, saveToCache]);

  // Exponential backoff for retries
  const getRetryDelay = useCallback(() => {
    return Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
  }, [retryCount]);

  // Fetch fresh data with retry capability
  const fetchData = useCallback(async () => {
    // Check data saving mode - don't fetch in high data saving mode
    const dataSavingMode = getDataSavingMode();
    if (dataSavingMode === 'high') {
      // In high data saving mode, only use cache
      const hasValidCache = loadFromCache();
      if (!hasValidCache) {
        setData(defaultData);
        setIsFromCache(true);
      }
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      const freshData = await fetchFn();
      setData(freshData);
      setIsFromCache(false);
      setRetryCount(0);
      setLastFetchTime(new Date());
      saveToCache(freshData, hasPendingSync);
      return freshData;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        // Set timeout for retry
        setTimeout(() => {
          fetchData();
        }, getRetryDelay());
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFn, loadFromCache, defaultData, hasPendingSync, maxRetries, retryCount, getRetryDelay, getDataSavingMode, saveToCache]);
  
  // Track online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // When coming back online, try to sync any pending changes
      if (hasPendingSync && syncFn) {
        syncChanges();
      } else if (isFromCache) {
        // If no pending changes but using cached data, fetch fresh data
        fetchData();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isFromCache, hasPendingSync, syncFn, fetchData, syncChanges]);
  
  // Initial data loading
  useEffect(() => {
    const hasValidCache = loadFromCache();
    
    // If no valid cache or if we're online and data isn't from a low data mode, fetch fresh data
    if (!hasValidCache || (isOnline && getDataSavingMode() !== 'high')) {
      // Debounce initial fetch to avoid hammering server on component remounts
      const debouncedFetch = debounce(() => {
        fetchData();
      }, 300);
      
      debouncedFetch();
      
      return () => {
        debouncedFetch.cancel();
      };
    } else {
      setLoading(false);
      // Return an empty cleanup function for this code path
      return () => {};
    }
  }, [loadFromCache, fetchData, isOnline, getDataSavingMode]);
  
  return {
    data,
    loading,
    error,
    isFromCache,
    hasPendingSync,
    lastFetchTime,
    updateData,
    refetch: fetchData,
    syncChanges
  };
}
