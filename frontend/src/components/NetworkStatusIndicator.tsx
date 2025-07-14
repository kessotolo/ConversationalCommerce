import React, { useState, useEffect } from 'react';

/**
 * NetworkStatusIndicator component
 * 
 * Displays the current network status (online/offline) with appropriate styling and accessibility
 * Designed for African markets with potentially unreliable internet connections
 */
export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    
    // Add event listeners for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (isOnline) {
    // Don't show anything when online to reduce visual noise
    return null;
  }
  
  return (
    <div 
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md shadow-md"
    >
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
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
      <span>You are currently offline. Some features may be unavailable.</span>
    </div>
  );
}
