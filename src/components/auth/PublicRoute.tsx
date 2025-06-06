'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import { AuthService } from '../../lib/api/auth.service';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute component
 * 
 * Modified behavior: The landing page (/) is always accessible first.
 * For login and signup pages, authenticated users are still redirected to dashboard
 * after backend token validation.
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isLandingPage = currentPath === '/';
  const isLoginPage = currentPath === '/login';
  const isSignupPage = currentPath === '/signup';

  // This ensures we only run client-side code after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Skip redirect for landing page - we always want to show the landing page first
    if (isLandingPage) {
      return;
    }
    
    // Only redirect login/signup pages if we have a user and haven't redirected yet
    if ((isLoginPage || isSignupPage) && user && isClient && !isLoading && !hasRedirected) {
      console.log('Authenticated user detected on login/signup page, redirecting to dashboard');
      setHasRedirected(true);
      router.push('/dashboard');
    }
  }, [user, isLoading, router, isClient, isLandingPage, isLoginPage, isSignupPage, hasRedirected]);

  // If we're still on the server or loading, show a spinner
  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  // If on a non-landing page and user is authenticated, show loading until redirect
  // Landing page will always show content regardless of auth status
  if (!isLandingPage && user) {
    return null;
  }

  // User is not authenticated, render children (the public content)
  return <>{children}</>;
};
