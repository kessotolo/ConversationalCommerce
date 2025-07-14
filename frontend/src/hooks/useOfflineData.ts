import { useState, useEffect } from 'react';

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
  /** Manually trigger a refresh of the data */
  refetch: () => Promise<T | null>;
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
  const { storageKey, fetchFn, defaultData, staleTime = 3600000 } = options;
  
  const [data, setData] = useState<T>(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  
  // Load cache data initially
  useEffect(() => {
    loadFromCache();
  }, []);
  
  // Load data from cache
  const loadFromCache = () => {
    try {
      const cachedItem = localStorage.getItem(storageKey);
      
      if (cachedItem) {
        const { data: cachedData, timestamp } = JSON.parse(cachedItem);
        
        // Check if cache is still valid (not stale)
        const isStale = Date.now() - timestamp > staleTime;
        
        if (!isStale) {
          setData(cachedData);
          setIsFromCache(true);
        }
      }
    } catch (err) {
      console.error('Error loading from cache:', err);
      // Silently fail - we'll try to fetch fresh data anyway
    }
  };
  
  // Save data to cache
  const saveToCache = (dataToCache: T) => {
    try {
      const item = {
        data: dataToCache,
        timestamp: Date.now()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(item));
    } catch (err) {
      console.error('Error saving to cache:', err);
      // Silently fail - caching is a best-effort feature
    }
  };
  
  // Fetch fresh data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const freshData = await fetchFn();
      setData(freshData);
      setIsFromCache(false);
      saveToCache(freshData);
      return freshData;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Start fetching data when component mounts
  useEffect(() => {
    // Don't block rendering with async fetch - use cache first approach
    fetchData();
  }, []);
  
  // When network status changes to online, try to fetch fresh data
  useEffect(() => {
    const handleOnline = () => {
      if (isFromCache) {
        fetchData();
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isFromCache]);
  
  return {
    data,
    loading,
    error,
    isFromCache,
    refetch: fetchData
  } as UseOfflineDataResult<T>;
}
