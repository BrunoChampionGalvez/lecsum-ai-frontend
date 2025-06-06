import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create New Flashcard Deck | LecSum AI',
  description: 'Create a new deck of flashcards for studying',
};

export default function NewFlashcardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
