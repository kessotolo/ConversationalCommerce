import { useState, useEffect, useCallback } from 'react';
import type { WebSocketMessage } from '@/modules/core';

// WebSocket hook for type-safe message payloads
export interface WebSocketHook {
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: WebSocketMessage) => void;
  isConnected: boolean;
}

export const useWebSocket = (url: string): WebSocketHook => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Only create WebSocket in browser environment and with valid URL
    if (typeof window !== 'undefined' && url) {
      try {
        const ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as WebSocketMessage;
            // Validate that it's a proper WebSocketMessage with type field
            if (payload && typeof payload === 'object' && 'type' in payload) {
              setLastMessage(payload);
            } else {
              console.warn('Received malformed WebSocket message:', payload);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        setSocket(ws);

        return () => {
          ws.close();
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        return () => {};
      }
    }

    return () => {};
  }, [url]);

  // Unused message handler removed
  // const sendMessage = useCallback(...);
      } else if (socket) {
        console.warn('WebSocket is not open. Message not sent:', message);
      } else {
        console.warn('WebSocket not initialized. Message not sent:', message);
      }
    },
    [socket],
  );

  return { lastMessage, sendMessage, isConnected };
};
