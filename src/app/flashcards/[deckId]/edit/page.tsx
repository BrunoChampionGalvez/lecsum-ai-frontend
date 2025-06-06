import { Metadata } from 'next';
import { FlashcardDeckEditor } from '../../../../components/flashcards/FlashcardDeckEditor';

export const metadata: Metadata = {
  title: 'Edit Flashcard Deck | LecSum AI',
  description: 'Edit your flashcard deck and manage your flashcards',
};

// Server component that handles the route params
export default async function EditFlashcardsPage({ params }: { params: { deckId: string } }) {
  const awaitedParams = await params;
  return <FlashcardDeckEditor deckId={awaitedParams.deckId} />;
}
