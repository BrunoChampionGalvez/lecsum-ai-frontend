"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
}



export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Courses', href: '/courses' },
    { name: 'Flashcards', href: '/flashcards' },
    { name: 'Quizzes', href: '/quizzes' }
  ];

  const isActiveLink = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[var(--primary)] text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Logo */}
            <Link href="/dashboard" className="text-xl font-bold">
              LecSum AI
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-[var(--orange-light)] ${
                  isActiveLink(item.href)
                    ? 'relative text-white after:content-[""] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-white after:rounded after:transition-all after:duration-200 hover:after:bg-[var(--orange-light)]'
                    : ''
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className='w-0.5 h-6 bg-white'></div>
            <Link href="/subscription" className="text-sm font-medium transition-colors hover:text-[var(--orange-light)]">
              Subscription
            </Link>
          </nav>
          
          {/* User Menu */}
          <div className="relative flex items-center">
            <button
              type="button"
              className="flex items-center space-x-2 focus:outline-none cursor-pointer hover:text-[var(--orange-light)]"
              onClick={() => logout()}
            >
              <span className="text-sm hidden sm:inline-block">
                {user?.firstName || user?.email}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[var(--primary-dark)] text-white p-4">
          <nav className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium py-2 px-3 rounded ${
                  isActiveLink(item.href) ? 'bg-[var(--primary)] text-[var(--orange)]' : 'hover:bg-[var(--primary)]'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>


      {/* Footer */}
      <footer className="bg-[var(--primary)] text-white py-4">
        <div className="container mx-auto px-4 text-center text-sm">
          &copy; {new Date().getFullYear()} LecSum AI - All rights reserved.
        </div>
      </footer>
    </div>
  );
};
