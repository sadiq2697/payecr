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

  // Stable callback creator
  const createStableCallback = useCallback((fn, deps) => {
    return useCallback(fn, deps);
  }, []);

  // Stable value creator
  const createStableValue = useCallback((fn, deps) => {
    return useMemo(fn, deps);
  }, []);

  // Debounced callback
  const createDebouncedCallback = useCallback((fn, delay, deps) => {
    const timeoutRef = useRef(null);
    
    return useCallback((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        fn(...args);
      }, delay);
    }, deps);
  }, []);

  // Throttled callback
  const createThrottledCallback = useCallback((fn, limit, deps) => {
    const inThrottle = useRef(false);
    
    return useCallback((...args) => {
      if (!inThrottle.current) {
        fn(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    }, deps);
  }, []);

  return {
    renderCount: renderCount.current,
    timeSinceLastRender,
    createStableCallback,
    createStableValue,
    createDebouncedCallback,
    createThrottledCallback,
  };
};