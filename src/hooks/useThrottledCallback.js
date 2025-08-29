import { useCallback, useRef } from 'react';

// High-performance throttled callback hook
export const useThrottledCallback = (callback, delay = 100, deps = []) => {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      // Execute immediately if enough time has passed
      callback(...args);
      lastRun.current = now;
    } else {
      // Schedule for later execution
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      const remaining = delay - (now - lastRun.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastRun.current = Date.now();
      }, remaining);
    }
  }, [callback, delay, ...deps]);
};

// Debounced callback for search/input fields
export const useDebouncedCallback = (callback, delay = 300, deps = []) => {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay, ...deps]);
};

// Animation frame callback for smooth animations
export const useAnimationFrameCallback = (callback, deps = []) => {
  const rafRef = useRef(null);

  return useCallback((...args) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      callback(...args);
    });
  }, [callback, ...deps]);
};