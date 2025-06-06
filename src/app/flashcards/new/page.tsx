"use client";

import { MainLayout } from '../../../components/ui/MainLayout';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { NewDeckForm } from '../../../components/flashcards/NewDeckForm';
import { useSubscriptionLimits } from '../../../hooks/useSubscriptionLimits';

export default function NewFlashcardDeckPage() {
  const { remaining } = useSubscriptionLimits();
  const reachedLimit = remaining.flashcards <= 0;

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--primary)]">Create New Flashcard Deck</h1>
          <p className="text-gray-600 mt-1">
            Create a new deck to organize your flashcards
          </p>
        </div>
        
        {/* Subscription limit warning and disable logic */}
            <>
              {reachedLimit && (
                <div className="px-4 py-2 mb-4 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                  You have reached your flashcard creation limit for this billing period.
                </div>
              )}
              <NewDeckForm disabled={reachedLimit} />
            </>

      </MainLayout>
    </ProtectedRoute>
  );
}
