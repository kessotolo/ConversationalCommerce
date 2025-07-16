import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './Toast/ToastContext';

// For tracking outgoing network requests
const originalFetch = window.fetch;

/**
 * NetworkStatusIndicator component
 * 
 * Displays the current network status (online/offline) with appropriate styling and accessibility
 * Designed for African markets with potentially unreliable internet connections
 * Features:
 * - Visual indicator for offline status
 * - Connection quality measurement
 * - Automatic reconnection attempts
 * - Toast notifications for status changes
 * - Screen reader announcements
 * - Keyboard accessibility
 */

type ConnectionQuality = 'good' | 'medium' | 'poor' | 'offline';
type DataSavingMode = 'off' | 'low' | 'high';

interface NetworkStatusIndicatorProps {
  /** Always show the indicator, even when online */
  showAlways?: boolean;
  /** Show the detailed panel by default */
  showDetails?: boolean;
}

export function NetworkStatusIndicator({ 
  showAlways = false,
  showDetails: initialShowDetails = false 
}: NetworkStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const [showDetails, setShowDetails] = useState(initialShowDetails);
  const [pingTime, setPingTime] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [failedRequests, setFailedRequests] = useState(0);
  const [dataSavingMode, setDataSavingMode] = useState<DataSavingMode>('off');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const checkingRef = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { showToast } = useToast();
  
  // Override the fetch API to monitor network requests
  useEffect(() => {
    window.fetch = async (...args) => {
      // Track pending requests
      setPendingRequests(prev => prev + 1);
      
      try {
        const response = await originalFetch(...args);
        setPendingRequests(prev => Math.max(0, prev - 1));
        return response;
      } catch (error) {
        setPendingRequests(prev => Math.max(0, prev - 1));
        setFailedRequests(prev => prev + 1);
        throw error;
      }
    };
    
    // Restore original fetch on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Check connection quality by measuring response time to a small endpoint
  const checkConnectionQuality = useCallback(async () => {
    if (checkingRef.current || !isOnline) return;
    
    checkingRef.current = true;
    try {
      const startTime = Date.now();
      // Use a tiny endpoint or image to test connection speed
      const response = await fetch('/api/ping', { 
        method: 'HEAD',
        // Add cache busting to prevent browser cache
        headers: { 'Cache-Control': 'no-cache, no-store' },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const endTime = Date.now();
        const latency = endTime - startTime;
        setPingTime(latency);
        
        // Determine connection quality based on latency
        if (latency < 300) {
          setConnectionQuality('good');
        } else if (latency < 1000) {
          setConnectionQuality('medium');
        } else {
          setConnectionQuality('poor');
        }
      } else {
        setConnectionQuality('poor');
      }
    } catch (error) {
      // If fetch fails but navigator.onLine is true, we have poor connection
      if (navigator.onLine) {
        setConnectionQuality('poor');
      } else {
        setConnectionQuality('offline');
      }
    } finally {
      checkingRef.current = false;
    }
  }, [isOnline]);
  
  // Handle connection status change
  const handleConnectionChange = useCallback((online: boolean) => {
    setIsOnline(online);
    setConnectionQuality(online ? 'medium' : 'offline'); // Initial assumption until quality check
    
    if (online) {
      // Show toast when coming back online
      showToast('Your internet connection has been restored', 'success');
      // Check quality after a short delay to let connection stabilize
      setTimeout(checkConnectionQuality, 2000);
    } else {
      showToast('You are now offline. Some features may be limited.', 'warning', 0); // No auto-dismiss
      setPingTime(null);
    }
    
    // Announce for screen readers using ARIA live region
    const announcement = document.getElementById('network-status-announcement');
    if (announcement) {
      announcement.textContent = online 
        ? 'Your internet connection has been restored' 
        : 'You are now offline. Some features may be limited.';
    }
  }, [checkConnectionQuality, showToast]);

  // Manual reconnection attempt
  const attemptReconnection = useCallback(() => {
    if (!isOnline) {
      setRetryCount(prev => prev + 1);
      showToast('Attempting to reconnect...', 'info');
      
      // Try to fetch a small resource to force reconnection
      fetch('/api/ping', { 
        method: 'HEAD',
        headers: { 'Cache-Control': 'no-cache, no-store' },
        cache: 'no-store'
      })
        .then(() => {
          // If successful, we're back online even if the browser hasn't detected it yet
          if (!navigator.onLine) {
            // Force an online state if successful but navigator still says offline
            handleConnectionChange(true);
          }
        })
        .catch(() => {
          // Still offline
          showToast('Unable to connect. Please check your network settings.', 'error');
        });
    }
  }, [isOnline, handleConnectionChange, showToast]);

  // Initialize and set up event listeners
  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      checkConnectionQuality();
    }
    
    // Add event listeners for online/offline events
    const handleOnline = () => handleConnectionChange(true);
    const handleOffline = () => handleConnectionChange(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set up periodic connection quality checks when online
    const interval = setInterval(() => {
      if (isOnline) {
        checkConnectionQuality();
      }
    }, 60000); // Check every minute
    
    // Create a hidden live region for screen reader announcements
    const liveRegion = document.createElement('div');
    liveRegion.id = 'network-status-announcement';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.padding = '0';
    liveRegion.style.margin = '-1px';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    liveRegion.style.whiteSpace = 'nowrap';
    liveRegion.style.border = '0';
    document.body.appendChild(liveRegion);
    
    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (liveRegion.parentNode) {
        document.body.removeChild(liveRegion);
      }
    };
  }, [checkConnectionQuality, handleConnectionChange, isOnline]);
  
  // Helper function to get color based on connection quality
  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'good': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'offline': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Toggle data saving mode
  const toggleDataSavingMode = () => {
    const nextMode = dataSavingMode === 'off' ? 'low' : dataSavingMode === 'low' ? 'high' : 'off';
    setDataSavingMode(nextMode);
    
    // Store user preference
    try {
      localStorage.setItem('dataSavingMode', nextMode);
    } catch (e) {
      // Ignore storage errors
    }
    
    // Show toast with the new mode
    const messages = {
      'off': 'Data saving mode disabled',
      'low': 'Low data saving mode enabled',
      'high': 'High data saving mode enabled'
    };
    
    showToast(messages[nextMode], 'info');
  };

  // Load data saving preference
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('dataSavingMode') as DataSavingMode;
      if (savedMode && ['off', 'low', 'high'].includes(savedMode)) {
        setDataSavingMode(savedMode);
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // Helper function to get status text
  const getStatusText = () => {
    switch (connectionQuality) {
      case 'good': return 'Good connection';
      case 'medium': return 'Moderate connection';
      case 'poor': return 'Poor connection';
      case 'offline': return 'You are offline';
      default: return 'Checking connection...';
    }
  };
  
  // Don't show anything when online to reduce visual noise, unless showAlways is true
  if (isOnline && !showAlways) {
    return null;
  }
  
  return (
    <div 
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-4 z-50 flex flex-col rounded-md shadow-lg border ${getQualityColor()} transition-all duration-300 ${showDetails ? 'w-64' : 'w-auto'}`}
    >
      {/* Main status bar */}
      <div 
        className="flex items-center justify-between w-full px-4 py-2 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
        onKeyDown={(e) => e.key === 'Enter' && setShowDetails(!showDetails)}
        tabIndex={0}
        aria-expanded={showDetails}
        aria-controls="network-details-panel"
        aria-label={`${getStatusText()}. Click to ${showDetails ? 'hide' : 'show'} network details`}
      >
        {/* Connection icon based on status */}
        {isOnline ? (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            {connectionQuality === 'good' || connectionQuality === 'medium' ? (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.143 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" 
              />
            ) : (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 13h.01M12 18h.01M12 21a9 9 0 100-18 9 9 0 000 18z" 
              />
            )}
          </svg>
        ) : (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" 
            />
          </svg>
        )}
        
        {/* Status text */}
        <span className="flex-grow">{getStatusText()}</span>
        
        {/* Toggle arrow */}
        <svg 
          className={`h-4 w-4 transition-transform duration-200 ${showDetails ? 'transform rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {/* Details panel */}
      {showDetails && (
        <div 
          id="network-details-panel" 
          className="border-t px-4 py-3 space-y-3 text-sm"
          role="region"
          aria-label="Network connection details"
        >
          {/* Connection details */}
          <div className="mb-3">
            {pingTime !== null && isOnline && (
              <p className="text-sm mb-1">Response time: {pingTime}ms</p>
            )}
            <p className="text-sm mb-1">Status: {isOnline ? 'Connected' : 'Disconnected'}</p>
            {!isOnline && (
              <p className="text-sm">Retries: {retryCount}</p>
            )}
          </div>
          
          {/* Network activity */}
          <div className="flex justify-between">
            <span>Pending requests:</span>
            <span>{pendingRequests}</span>
          </div>
          
          {/* Failed requests */}
          <div className="flex justify-between">
            <span>Failed requests:</span>
            <span>{failedRequests}</span>
          </div>
          
          {/* Data saving mode */}
          <div className="flex justify-between items-center">
            <span>Data saving mode:</span>
            <button
              onClick={toggleDataSavingMode}
              className={`px-2 py-1 rounded text-xs font-medium ${
                dataSavingMode === 'off' ? 'bg-gray-100 text-gray-800' :
                dataSavingMode === 'low' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}
              aria-label={`Data saving mode: ${dataSavingMode}. Click to change.`}
            >
              {dataSavingMode === 'off' ? 'Off' : dataSavingMode === 'low' ? 'Low' : 'High'}
            </button>
          </div>
          
          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <button
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 focus:outline-none"
              onClick={checkConnectionQuality}
              aria-label="Check connection status"
            >
              Refresh
            </button>
            
            {!isOnline && (
              <button
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 focus:outline-none"
                onClick={attemptReconnection}
                aria-label="Try to reconnect to the internet"
              >
                Try to reconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
