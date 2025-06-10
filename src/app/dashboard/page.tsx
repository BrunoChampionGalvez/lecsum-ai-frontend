"use client";

import Link from 'next/link';
import { MainLayout } from '../../components/ui/MainLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useChatContext } from '../../lib/chat/ChatContext';

// Metadata must be in a server component
// For client components, we can set title directly

// This is a client component to handle authentication
export default function DashboardPage() {
  const { setIsSidebarOpen } = useChatContext();
  
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--primary)]">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome to LecSum AI, your intelligent study companion
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/courses" className="block">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4 text-[var(--primary)]">
                <svg className="h-8 w-8 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
                <h2 className="text-xl font-semibold">Courses</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Organize your study materials by course. Upload files, create flashcards and quizzes,
                and test your knowledge.
              </p>
              <div className="mt-auto">
                <Button>Manage Courses</Button>
              </div>
            </Card>
          </Link>

          <Link href="/flashcards" className="block">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4 text-[var(--orange)]">
                <svg className="h-8 w-8 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 12H4V7h16v10zM8 15h8v2H8v-2zm0-4h8v2H8v-2zm0-4h8v2H8V7z"></path>
                </svg>
                <h2 className="text-xl font-semibold">Flashcards</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Generate AI-powered flashcards from your course materials. 
                Study with Q&A or Cloze-style cards.
              </p>
              <div className="mt-auto">
                <Button>Study Flashcards</Button>
              </div>
            </Card>
          </Link>

          <Link href="/quizzes" className="block">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4 text-[var(--cyan)]">
                <svg className="h-8 w-8 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"></path>
                </svg>
                <h2 className="text-xl font-semibold">Quizzes</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Test your knowledge with AI-generated quizzes. Track your progress 
                and identify areas for improvement.
              </p>
              <div className="mt-auto">
                <Button>Take Quizzes</Button>
              </div>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center mb-4 text-[var(--primary)]">
              <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 4v7H5.17l-.59.59-.58.58V4h11m1-2H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm5 4h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1z"></path>
              </svg>
              <h2 className="text-lg font-semibold">Lecsi 👩🏻‍🦰 - AI Chat Assistant</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Ask questions about your study materials and get instant answers from our
              AI assistant, Lecsi. Create multiple chat sessions for different topics.
            </p>
            <Button variant='primary' onClick={() => setIsSidebarOpen(true)}>Start Chatting</Button>
          </Card>

          <Card>
            <div className="flex items-center mb-4 text-[var(--orange)]">
              <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z"></path>
              </svg>
              <h2 className="text-lg font-semibold">Get Started</h2>
            </div>
            <div className="space-y-2 text-gray-600">
              <p>1. Create a course and upload your study materials</p>
              <p>2. Generate flashcards or quizzes from your materials</p>
              <p>3. Ask questions of your materials to the AI assistant anytime</p>
            </div>
            <div className="mt-4">
              <Link href="/courses/new">
                <Button>Create Your First Course</Button>
              </Link>
            </div>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
