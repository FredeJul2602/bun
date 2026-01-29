// ============================================
// usePolling Hook - 3 second interval polling
// Follows Observer pattern for state updates
// ============================================

import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function usePolling<T>(
  pollFn: () => Promise<T>,
  onResult: (result: T) => void,
  options: UsePollingOptions = {}
): {
  start: () => void;
  stop: () => void;
  isPolling: boolean;
} {
  const { interval = 3000, enabled = true, onError } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  const poll = useCallback(async () => {
    try {
      const result = await pollFn();
      onResult(result);
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [pollFn, onResult, onError]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    
    isPollingRef.current = true;
    // Poll immediately
    poll();
    // Then poll at interval
    intervalRef.current = setInterval(poll, interval);
  }, [poll, interval]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return stop;
  }, [enabled, start, stop]);

  return {
    start,
    stop,
    isPolling: isPollingRef.current,
  };
}
