import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './Toast/ToastContext';

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

export function NetworkStatusIndicator({ showAlways = false }: { showAlways?: boolean }) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const [showDetails, setShowDetails] = useState(false);
  const [pingTime, setPingTime] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const checkingRef = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { showToast } = useToast();
  
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
      
      {/* Detailed panel */}
      {showDetails && (
        <div 
          id="network-details-panel"
          className="p-3 border-t border-opacity-30"
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
          
          {/* Actions */}
          <div className="flex space-x-2">
            {!isOnline && (
              <button
                onClick={attemptReconnection}
                className="text-xs px-2 py-1 bg-white bg-opacity-30 hover:bg-opacity-50 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label="Attempt to reconnect to the internet"
              >
                Reconnect
              </button>
            )}
            
            <button
              onClick={checkConnectionQuality}
              className="text-xs px-2 py-1 bg-white bg-opacity-30 hover:bg-opacity-50 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              aria-label="Check your internet connection quality"
            >
              Test Connection
            </button>
            
            <button
              onClick={() => setShowDetails(false)}
              className="text-xs px-2 py-1 bg-white bg-opacity-30 hover:bg-opacity-50 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              aria-label="Hide network details"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
