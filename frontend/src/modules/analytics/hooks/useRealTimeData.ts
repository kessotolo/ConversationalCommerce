import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/modules/core/hooks/useAuth';

interface RealTimeDataOptions {
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  sortBy?: string;
  sortDesc?: boolean;
  limit?: number;
  enabled?: boolean;
}

interface RealTimeData {
  data: any[];
  columns: string[];
  timestamp: string;
}

/**
 * Hook for consuming real-time analytics data via WebSocket
 */
export const useRealTimeData = (options: RealTimeDataOptions) => {
  const { getToken } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
    
  // Track reconnection attempts
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memoize the query parameters to avoid unnecessary reconnections
  const queryParams = JSON.stringify({
    metrics: options.metrics,
    dimensions: options.dimensions || [],
    filters: options.filters || {},
    sortBy: options.sortBy,
    sortDesc: options.sortDesc,
    limit: options.limit || 100,
  });

  // Function to establish WebSocket connection
  const connect = useCallback(async () => {
    // Don't connect if feature is disabled
    if (options.enabled === false) {
      setIsLoading(false);
      return;
    }
    
    try {
      // Clean up existing connection if any
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      
      // Get JWT token for authentication
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Create WebSocket URL with token and query parameters
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/analytics/ws?token=${token}&query=${encodeURIComponent(queryParams)}`;
      
      // Create WebSocket
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;
      
      // Set up WebSocket event listeners
      ws.onopen = () => {
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
        reconnectAttemptRef.current = 0; // Reset reconnection attempts on successful connection
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'update':
              setData(message.data);
              setColumns(message.columns);
              setLastUpdated(new Date());
              break;
              
            case 'error':
              console.error('WebSocket error:', message.message);
              setError(message.message);
              break;
              
            case 'pong':
              // Handle pong response to keep connection alive
              break;
              
            default:
              console.log('Unhandled WebSocket message type:', message.type);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
        setIsConnected(false);
      };
      
      ws.onclose = (event) => {
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000) {
          handleReconnect();
        }
      };
      
      // Set up periodic ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          }));
        }
      }, 30000); // Send ping every 30 seconds
      
      // Clean up ping interval on unmount
      return () => clearInterval(pingInterval);
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setError(error instanceof Error ? error.message : 'Connection error');
      setIsLoading(false);
      handleReconnect();
    }
    return;
  }, [getToken, queryParams, options.enabled]);
  
  // Handle reconnection with exponential backoff
  const handleReconnect = useCallback(() => {
    // Clean up any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Check if we've exceeded max reconnection attempts
    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      setError('Failed to connect after multiple attempts');
      window.alert('Connection failed: Could not establish real-time data connection. Please refresh the page.');
      return;
    }
    
    // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, 16s)
    const delay = Math.pow(2, reconnectAttemptRef.current) * 1000;
    reconnectAttemptRef.current += 1;
    
    // Schedule reconnection
    reconnectTimeoutRef.current = setTimeout(() => {
      if (options.enabled !== false) {
        setIsLoading(true);
        connect();
      }
    }, delay);
  }, [connect, toast, options.enabled]);
  
  // Update WebSocket connection on queryParams change
  useEffect(() => {
    connect();
    
    // Clean up function
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect, queryParams]);
  
  // Function to manually update the query parameters
  const updateQuery = useCallback((newQueryParams: Partial<RealTimeDataOptions>) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'update_query',
        query: {
          metrics: newQueryParams.metrics || options.metrics,
          dimensions: newQueryParams.dimensions || options.dimensions || [],
          filters: newQueryParams.filters || options.filters || {},
          sortBy: newQueryParams.sortBy || options.sortBy,
          sortDesc: newQueryParams.sortDesc ?? options.sortDesc,
          limit: newQueryParams.limit || options.limit || 100,
        },
      }));
    }
  }, [options.dimensions, options.filters, options.limit, options.metrics, options.sortBy, options.sortDesc]);
  
  return {
    data,
    columns,
    isConnected,
    isLoading,
    error,
    lastUpdated,
    updateQuery,
  };
};

export default useRealTimeData;
