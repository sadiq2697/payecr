import { useMemo, useCallback, useRef } from 'react';

/**
 * Performance optimization hook with memoization utilities
 */
export const useOptimizedComponent = (dependencies = []) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  // Track re-renders for debugging
  renderCount.current += 1;
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTime.current;
  lastRenderTime.current = currentTime;
  
  if (__DEV__ && renderCount.current > 1) {
    console.log(
      `Component re-rendered ${renderCount.current} times. ` +
      `Time since last render: ${timeSinceLastRender}ms`
    );
  }

  return {
    renderCount: renderCount.current,
    timeSinceLastRender,
  };
};

/**
 * Debounced callback hook
 */
export const useDebouncedCallback = (fn, delay, dependencies = []) => {
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }, [fn, delay]);
};

/**
 * Throttled callback hook
 */
export const useThrottledCallback = (fn, limit, dependencies = []) => {
  const inThrottle = useRef(false);
  
  return useCallback((...args) => {
    if (!inThrottle.current) {
      fn(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [fn, limit]);
};