"use client";

import { useState, useEffect } from 'react';

/**
 * Custom hook to watch for authentication state changes including
 * those that might happen during client-side navigation
 */
export function useAuthWatcher() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check authentication state immediately
    checkAuthState();
    
    // Set up interval to poll for auth changes - this ensures we catch changes
    // even if they happen during client-side navigation
    const interval = setInterval(checkAuthState, 500);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
    
    function checkAuthState() {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      const authenticated = !!(token && user);
      
      if (authenticated !== isAuthenticated || !isInitialized) {
        console.log("[Auth Watcher] Auth state changed:", authenticated);
        setIsAuthenticated(authenticated);
        setIsInitialized(true);
      }
    }
  }, [isAuthenticated, isInitialized]);

  return { isAuthenticated, isInitialized };
}
