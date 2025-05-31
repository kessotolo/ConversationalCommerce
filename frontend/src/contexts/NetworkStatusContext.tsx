import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

export interface NetworkStatusContextType {
  isOnline: boolean;
  lastOnline: Date | null;
  connectionQuality: 'good' | 'poor' | 'unknown';
}

export const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  lastOnline: null,
  connectionQuality: 'unknown',
});

export interface NetworkStatusProviderProps {
  children: React.ReactNode;
}

export const NetworkStatusProvider: React.FC<NetworkStatusProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastOnline, setLastOnline] = useState<Date | null>(isOnline ? new Date() : null);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  
  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    // Test connection quality by measuring fetch response time
    const testConnectionQuality = async () => {
      if (!navigator.onLine) {
        setConnectionQuality('unknown');
        return;
      }
      
      try {
        const startTime = Date.now();
        // Use a small request to test connection speed
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch('/api/ping', {
          method: 'HEAD',
          signal: controller.signal,
          // Avoid caching
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });
        
        clearTimeout(timeoutId);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Determine connection quality based on response time
        if (responseTime < 1000) {
          setConnectionQuality('good');
        } else {
          setConnectionQuality('poor');
        }
      } catch (err) {
        // If fetch fails, assume poor connection
        setConnectionQuality('poor');
      }
    };
    
    // Test connection quality immediately and then every 30 seconds when online
    const qualityInterval = setInterval(() => {
      if (navigator.onLine) {
        testConnectionQuality();
      }
    }, 30000);
    
    // Run quality test when coming back online
    const runQualityTestOnReconnect = () => {
      if (navigator.onLine) {
        testConnectionQuality();
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('online', runQualityTestOnReconnect);
    window.addEventListener('offline', handleOffline);
    
    // Initial connection quality test
    testConnectionQuality();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('online', runQualityTestOnReconnect);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityInterval);
    };
  }, []);
  
  return (
    <NetworkStatusContext.Provider value={{ isOnline, lastOnline, connectionQuality }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkStatus = () => useContext(NetworkStatusContext);
