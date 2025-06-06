"use client";

import Link from 'next/link';
import { LoginForm } from '../../components/auth/LoginForm';
import { PublicRoute } from '../../components/auth/PublicRoute';

// Metadata must be in a server component

export default function LoginPage() {
  return (
    <PublicRoute>
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--primary)]">LecSum AI</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>
        
        <LoginForm />
        
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don&apos;t have an account?{' '}
            <Link 
              href="/signup" 
              className="text-[var(--primary)] font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
    </PublicRoute>
  );
}
