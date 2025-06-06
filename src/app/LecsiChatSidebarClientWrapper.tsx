"use client";
import React, { useEffect, useState } from "react";
import { LecsiChatSidebar } from "../components/chat/LecsiChatSidebar";
import { usePathname } from "next/navigation";
import { useAuthWatcher } from "../lib/auth/useAuthWatcher";

// List of paths where the chat sidebar should never be shown
const PROTECTED_PATHS = [
  "/", // Landing page
  "/auth/login", // Login page
  "/auth/signup", // Signup page
  "/signin", // Alternate signin routes
  "/signup", // Alternate signup routes
  "/reset-password", // Password reset
  "/verify-email" // Email verification
];

export default function LecsiChatSidebarClientWrapper() {
  const pathname = usePathname();
  const { isAuthenticated, isInitialized } = useAuthWatcher();
  const [shouldShow, setShouldShow] = useState(false);

  // Check if current path is in the protected list or starts with one of the protected paths
  const isProtectedPath = PROTECTED_PATHS.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // Combined effect to handle authentication state and pathname changes
  useEffect(() => {
    console.log("[Sidebar] Auth state:", isAuthenticated, "Path:", pathname, "Protected:", isProtectedPath);
    
    // Only show when: 
    // 1. Authentication is initialized
    // 2. User is authenticated
    // 3. Not on a protected path
    const showSidebar = isInitialized && isAuthenticated && !isProtectedPath;
    
    console.log("[Sidebar] Should show:", showSidebar);
    setShouldShow(showSidebar);
  }, [isAuthenticated, pathname, isInitialized, isProtectedPath]);

  // Don't render anything if not initialized, not authenticated, or on a protected path
  if (!isInitialized || !isAuthenticated || isProtectedPath) {
    return null;
  }
  
  return <LecsiChatSidebar />;
}
