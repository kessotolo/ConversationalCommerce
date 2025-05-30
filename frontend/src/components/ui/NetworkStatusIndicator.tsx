import * as React from 'react';
import { useNetworkStatus } from '@/contexts/NetworkStatusContext';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export interface NetworkStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showDetails = false,
  className = '',
}) => {
  const { isOnline, connectionQuality, lastOnline } = useNetworkStatus();
  
  // Don't show anything if connection is good
  if (isOnline && connectionQuality === 'good' && !showDetails) {
    return null;
  }

  const formatLastOnline = () => {
    if (!lastOnline) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastOnline.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${className} ${
      !isOnline 
        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' 
        : connectionQuality === 'poor'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
    }`}>
      {!isOnline ? (
        <>
          <WifiOff size={16} />
          <span>Offline</span>
          {showDetails && lastOnline && (
            <span className="text-xs ml-1">Last online: {formatLastOnline()}</span>
          )}
        </>
      ) : connectionQuality === 'poor' ? (
        <>
          <AlertTriangle size={16} />
          <span>Poor Connection</span>
        </>
      ) : (
        <>
          <Wifi size={16} />
          <span>Online</span>
        </>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
