// ============================================
// useWebSocket Hook - Real-time chat connection
// Connects to server WebSocket with auto-reconnect
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage } from '../../types';

interface WebSocketMessage {
  type: string;
  connId?: string;
  requestId?: string;
  conversationId?: string;
  message?: ChatMessage;
  error?: string;
}

interface UseWebSocketOptions {
  onMessageComplete?: (requestId: string, message: ChatMessage) => void;
  onMessageError?: (requestId: string, error: string) => void;
  onMessageReceived?: (requestId: string, conversationId: string) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  connectionId: string | null;
  sendMessage: (message: string, conversationId?: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onMessageComplete,
    onMessageError,
    onMessageReceived,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Callbacks refs to avoid stale closures
  const onMessageCompleteRef = useRef(onMessageComplete);
  const onMessageErrorRef = useRef(onMessageError);
  const onMessageReceivedRef = useRef(onMessageReceived);

  useEffect(() => {
    onMessageCompleteRef.current = onMessageComplete;
    onMessageErrorRef.current = onMessageError;
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageComplete, onMessageError, onMessageReceived]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
      
      console.log('[WS] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              setConnectionId(data.connId || null);
              break;
            
            case 'pong':
              // Keep-alive response, no action needed
              break;
            
            case 'message_received':
              if (data.requestId && data.conversationId) {
                onMessageReceivedRef.current?.(data.requestId, data.conversationId);
              }
              break;
            
            case 'message_complete':
              if (data.requestId && data.message) {
                // Convert timestamp string back to Date
                const message: ChatMessage = {
                  ...data.message,
                  timestamp: new Date(data.message.timestamp),
                  skillExecution: data.message.skillExecution ? {
                    ...data.message.skillExecution,
                    executedAt: new Date(data.message.skillExecution.executedAt),
                  } : undefined,
                };
                onMessageCompleteRef.current?.(data.requestId, message);
              }
              break;
            
            case 'message_error':
              if (data.requestId && data.error) {
                onMessageErrorRef.current?.(data.requestId, data.error);
              }
              break;
            
            case 'error':
              console.error('[WS] Server error:', data.error);
              break;
          }
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionId(null);
        clearTimers();

        // Auto-reconnect if enabled and not a clean close
        if (autoReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          setIsReconnecting(true);
          reconnectAttemptsRef.current++;
          console.log(`[WS] Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
    }
  }, [autoReconnect, reconnectInterval, maxReconnectAttempts, clearTimers]);

  const disconnect = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionId(null);
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, [clearTimers, maxReconnectAttempts]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  const sendMessage = useCallback((message: string, conversationId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        message,
        conversationId,
      }));
    } else {
      console.error('[WS] Cannot send message: WebSocket not connected');
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
      }
    };
  }, [connect, clearTimers]);

  return {
    isConnected,
    isReconnecting,
    connectionId,
    sendMessage,
    disconnect,
    reconnect,
  };
}
