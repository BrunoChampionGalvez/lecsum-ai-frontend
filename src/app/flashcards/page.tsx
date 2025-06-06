import { Metadata } from 'next';
import { Suspense } from 'react';
import { FlashcardsList } from '../../components/flashcards/FlashcardsList';

export const metadata: Metadata = {
  title: 'Flashcards | LecSum AI',
  description: 'Study and review with AI-generated flashcards',
};

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div>Loading flashcards...</div>}>
      <FlashcardsList />
    </Suspense>
  );
}
