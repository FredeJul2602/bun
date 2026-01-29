// ============================================
// useChat Hook - Chat state management
// Encapsulates chat logic with polling
// ============================================

import { useState, useCallback, useRef } from 'react';
import { apiClient } from '../api/apiClient';
import { usePolling } from './usePolling';
import type { ChatMessage } from '../../types';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  // Handle poll results
  const handlePollResult = useCallback((result: Awaited<ReturnType<typeof apiClient.pollMessageStatus>>) => {
    if (!result.success) {
      if (result.status === 'not_found') {
        setError('Message request not found');
        setIsLoading(false);
        setPendingRequestId(null);
      }
      return;
    }

    if (result.status === 'completed' && result.message) {
      setMessages(prev => [...prev, result.message!]);
      setIsLoading(false);
      setPendingRequestId(null);
    } else if (result.status === 'error') {
      setError(result.error || 'An error occurred');
      setIsLoading(false);
      setPendingRequestId(null);
    }
    // If still processing, continue polling
  }, []);

  // Set up polling (3 second interval)
  usePolling(
    async () => {
      if (!pendingRequestId) throw new Error('No pending request');
      return apiClient.pollMessageStatus(pendingRequestId);
    },
    handlePollResult,
    {
      enabled: !!pendingRequestId,
      interval: 3000,
      onError: (err) => {
        console.error('Polling error:', err);
        setError('Failed to get response');
        setIsLoading(false);
        setPendingRequestId(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = null;
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearError,
  };
}
