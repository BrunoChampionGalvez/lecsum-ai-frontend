'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import { AuthService } from '../../lib/api/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [redirectedToLogin, setRedirectedToLogin] = useState(false);

  // This ensures we only run client-side code after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track if we have a user to avoid unnecessary validation
  useEffect(() => {
    if (user) {
      setIsTokenValid(true);
      setIsValidatingToken(false);
    }
  }, [user]);

  // Handle authentication check
  useEffect(() => {
    const validateUserToken = async () => {
      // Skip validation if we're not on client side yet
      if (!isClient) return;
      
      // If we have a user, assume token is valid initially
      // This prevents immediate redirects after login
      if (user) {
        setIsValidatingToken(false);
        setIsTokenValid(true);
        return;
      }
      
      // If we don't have a user and we're not loading, redirect to login
      if (!isLoading && !user && !redirectedToLogin) {
        setRedirectedToLogin(true);
        console.log('No authenticated user found, redirecting to login');
        router.push('/login');
      }
    };

    validateUserToken();
  }, [user, isLoading, router, isClient, redirectedToLogin]);

  // If we're still on the server or loading, show a spinner
  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  // If no user after client-side check, return null (will be redirected in useEffect)
  if (!user) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
};
