// ============================================
// useChat Hook - Chat state management
// Uses WebSocket for real-time, falls back to polling
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { usePolling } from './usePolling';
import { useWebSocket } from './useWebSocket';
import type { ChatMessage } from '../../types';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  connectionMode: 'websocket' | 'polling' | 'disconnected';
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [usePollingFallback, setUsePollingFallback] = useState(false);
  const conversationIdRef = useRef<string | null>(null);

  // WebSocket connection
  const { 
    isConnected: wsConnected, 
    sendMessage: wsSendMessage,
  } = useWebSocket({
    onMessageComplete: useCallback((requestId: string, message: ChatMessage) => {
      if (requestId === pendingRequestId || !pendingRequestId) {
        setMessages(prev => [...prev, message]);
        setIsLoading(false);
        setPendingRequestId(null);
      }
    }, [pendingRequestId]),
    
    onMessageError: useCallback((requestId: string, errorMsg: string) => {
      if (requestId === pendingRequestId || !pendingRequestId) {
        setError(errorMsg);
        setIsLoading(false);
        setPendingRequestId(null);
      }
    }, [pendingRequestId]),
    
    onMessageReceived: useCallback((requestId: string, conversationId: string) => {
      setPendingRequestId(requestId);
      conversationIdRef.current = conversationId;
    }, []),
  });

  // Track WebSocket availability for fallback
  useEffect(() => {
    // If WebSocket disconnects while we have a pending request, switch to polling
    if (!wsConnected && pendingRequestId && !usePollingFallback) {
      console.log('[Chat] WebSocket disconnected, falling back to polling');
      setUsePollingFallback(true);
    }
  }, [wsConnected, pendingRequestId, usePollingFallback]);

  // Handle poll results (fallback when WebSocket unavailable)
  const handlePollResult = useCallback((result: Awaited<ReturnType<typeof apiClient.pollMessageStatus>>) => {
    if (!result.success) {
      if (result.status === 'not_found') {
        setError('Message request not found');
        setIsLoading(false);
        setPendingRequestId(null);
        setUsePollingFallback(false);
      }
      return;
    }

    if (result.status === 'completed' && result.message) {
      setMessages(prev => [...prev, result.message!]);
      setIsLoading(false);
      setPendingRequestId(null);
      setUsePollingFallback(false);
    } else if (result.status === 'error') {
      setError(result.error || 'An error occurred');
      setIsLoading(false);
      setPendingRequestId(null);
      setUsePollingFallback(false);
    }
    // If still processing, continue polling
  }, []);

  // Set up polling (only active when WebSocket fallback is needed)
  usePolling(
    async () => {
      if (!pendingRequestId) throw new Error('No pending request');
      return apiClient.pollMessageStatus(pendingRequestId);
    },
    handlePollResult,
    {
      enabled: usePollingFallback && !!pendingRequestId,
      interval: 3000,
      onError: (err) => {
        console.error('Polling error:', err);
        setError('Failed to get response');
        setIsLoading(false);
        setPendingRequestId(null);
        setUsePollingFallback(false);
      },
    }
  );

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      if (wsConnected) {
        // Use WebSocket for real-time communication
        wsSendMessage(content.trim(), conversationIdRef.current || undefined);
        // Note: pendingRequestId will be set by onMessageReceived callback
      } else {
        // Fall back to HTTP API with polling
        setUsePollingFallback(true);
        
        const response = await apiClient.sendMessage({
          message: content.trim(),
          conversationId: conversationIdRef.current || undefined,
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to send message');
        }

        // Store conversation ID
        if (response.conversationId) {
          conversationIdRef.current = response.conversationId;
        }

        // Start polling for response
        if (response.requestId) {
          setPendingRequestId(response.requestId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setIsLoading(false);
      setUsePollingFallback(false);
    }
  }, [isLoading, wsConnected, wsSendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = null;
    setError(null);
    setPendingRequestId(null);
    setUsePollingFallback(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Determine connection mode for UI display
  const connectionMode = wsConnected 
    ? 'websocket' 
    : usePollingFallback 
      ? 'polling' 
      : 'disconnected';

  return {
    messages,
    isLoading,
    error,
    isConnected: wsConnected || usePollingFallback,
    connectionMode,
    sendMessage,
    clearMessages,
    clearError,
  };
}
