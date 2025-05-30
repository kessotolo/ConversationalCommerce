import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

interface WebSocketHook {
    lastMessage: WebSocketEvent | null;
    sendMessage: (message: any) => void;
    isConnected: boolean;
}

interface WebSocketEvent {
    data: string;
    type: string;
}

export const useWebSocket = (url: string): WebSocketHook => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null);
    const [isConnected, setIsConnected] = useState(false);

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
                    setLastMessage(event);
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

    const sendMessage = useCallback((message: any) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }, [socket]);

    return { lastMessage, sendMessage, isConnected };
};