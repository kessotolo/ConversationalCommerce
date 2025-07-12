import { useState, useEffect } from 'react';
import { createNetworkListener, isOnline } from '../utils/network';

/**
 * React hook to monitor online/offline status with state management
 * Specifically designed for markets with limited connectivity (e.g., Africa)
 * @returns Object with current online status and last online time
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState<boolean>(isOnline());
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(
    isOnline() ? new Date() : null
  );

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setLastOnlineTime(new Date());
    };

    const handleOffline = () => {
      setOnline(false);
    };

    // Set up network listeners
    const cleanup = createNetworkListener(handleOnline, handleOffline);

    // Clean up listeners on unmount
    return cleanup;
  }, []);

  return {
    isOnline: online,
    lastOnlineTime,
    offlineDuration: lastOnlineTime && !online
      ? Math.floor((Date.now() - lastOnlineTime.getTime()) / 1000)
      : 0
  };
}
