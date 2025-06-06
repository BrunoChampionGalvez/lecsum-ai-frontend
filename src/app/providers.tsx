'use client';

import React from 'react';
import { AuthProvider } from '../lib/auth/AuthContext';
import { ChatProvider } from '../lib/chat/ChatContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </AuthProvider>
  );
}
