"use client";

import Link from 'next/link';
import { SignupForm } from '../../components/auth/SignupForm';
import { PublicRoute } from '../../components/auth/PublicRoute';

// Metadata must be in a server component

export default function SignupPage() {
  return (
    <PublicRoute>
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--primary)]">LecSum AI</h1>
          <p className="text-gray-600 mt-2">Create a new account</p>
        </div>
        
        <SignupForm />
        
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="text-[var(--primary)] font-medium hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
    </PublicRoute>
  );
}
