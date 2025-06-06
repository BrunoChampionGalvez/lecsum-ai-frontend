"use client";
import { MainLayout } from '../../../../components/ui/MainLayout';
import { Button } from '../../../../components/ui/Button';
import Link from 'next/link';
import React from 'react';
import { useChatContext } from '../../../../lib/chat/ChatContext';
import { toast } from 'react-hot-toast';

import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import { StudyFlipCard } from '../../../../components/ui/StudyFlipCard';

import { DecksService, Deck } from '../../../../lib/api/decks.service';
import { AxiosError } from 'axios';

export default function StudyFlashcardsPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = React.use(params);
  
  // Get chat context for Ask Lecsi functionality
  const { 
    setIsSidebarOpen,
    setCreateNewSession,
    hasActiveSession,
    setInputValueExternal,
    addMaterialToChat
  } = useChatContext();
  
  const [deckName, setDeckName] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [flashcards, setFlashcards] = React.useState<{ front: string; back: string; id?: string }[]>([]);
  const [current, setCurrent] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [score, setScore] = React.useState<(boolean | null)[]>([]);
  const [confettiShown, setConfettiShown] = React.useState(false);
  const [deck, setDeck] = React.useState<Deck | null>(null);

  const handleFlip = () => setFlipped(f => !f);
  const handleNext = () => {
    setCurrent(c => (c + 1) % flashcards.length);
    setFlipped(false);
  };
  const handlePrev = () => {
    setCurrent(c => (c - 1 + flashcards.length) % flashcards.length);
    setFlipped(false);
  };
  
  // Function to handle Ask Lecsi button click for individual flashcard
  const handleAskLecsi = () => {
    if (flashcards.length === 0 || current >= flashcards.length) return;
    
    const currentCard = flashcards[current];
    
    // Construct the message text
    const messageText = `Hi Lecsi! Please consider specifically the following information from a flashcard to respond to this message:

Front: ${currentCard.front}

Back: ${currentCard.back}

`;
    
    // Directly set the input value in the chat using the external setter
    // This will trigger auto-scrolling since it's an external change
    setInputValueExternal(messageText);
    
    // Open the chat sidebar
    setIsSidebarOpen(true);
    
    // Ensure there's an active session or create one
    if (!hasActiveSession) {
      setCreateNewSession(true);
    }

    handleAskLecsiDeck();
    
    // Notify the user
    toast.success('Flashcard content added to chat input', {
      duration: 3000,
    });
  };
  
  // Function to handle Ask Lecsi button click for the entire deck
  const handleAskLecsiDeck = () => {
    if (!deck) {
      toast.error('Deck information not available');
      return;
    }
    
    // Create a material object for the flashcard deck
    const deckMaterial = {
      id: deck.id,
      displayName: deck.name.replace(/ /g, '_'),
      type: 'flashcardDeck' as const, // Type assertion to fix TypeScript error
      originalName: deck.name,
      courseId: deck.courseId
    };
    
    // Add the deck to the chat context
    const added = addMaterialToChat(deckMaterial);
    
    // Open the chat sidebar
    setIsSidebarOpen(true);
    
    // Ensure there's an active session or create one
    if (!hasActiveSession) {
      setCreateNewSession(true);
    }
    
    if (added) {
      // Notify the user when successful
      toast.success(`Deck "${deck.name}" added to chat context`, {
        duration: 3000,
      });
    } else {
      // Notify if the deck was already in the context (using warning since info isn't available)
      toast.success(`Deck "${deck.name}" is already in chat context`, {
        duration: 3000,
        icon: '⚠️', // Use a warning icon instead
      });
    }
  };
  const handleMark = (gotItRight: boolean) => {
    setScore(s => {
      const updated = [...s];
      updated[current] = gotItRight;
      return updated;
    });
  };
  const correctCount = score.filter(x => x === true).length;
  const percentCorrect = flashcards.length > 0 ? (correctCount / flashcards.length) * 100 : 0;

  React.useEffect(() => {
    if (!confettiShown && percentCorrect >= 90) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.7 },
        zIndex: 9999,
        scalar: 1.2,
      });
      setConfettiShown(true);
    }
    if (percentCorrect < 90 && confettiShown) {
      setConfettiShown(false);
    }
  }, [percentCorrect, confettiShown]);

  React.useEffect(() => {
    async function fetchDeckAndFlashcards() {
      setLoading(true);
      try {
        const deckData = await DecksService.getById(deckId);
        setDeckName(deckData.name);
        setDeck(deckData); // Store the deck object for the Ask Lecsi functionality
        
        const flashcardsData = await import('../../../../lib/api/flashcards.service').then(mod => mod.FlashcardsService.getFlashcardsByDeck(deckId));
        setFlashcards(flashcardsData);
        setScore(Array(flashcardsData.length).fill(null));
      } catch (error: unknown) {
        console.error('Error fetching deck and flashcards:', error);
        if (error instanceof AxiosError && error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else if (error instanceof Error) {
          toast.error(error.message || 'Failed to load deck and flashcards');
        } else {
          toast.error('An unknown error occurred while loading deck and flashcards');
        }
        setDeckName('Deck Not Found');
        setFlashcards([]);
        setDeck(null);
        setScore([]);
      } finally {
        setLoading(false);
      }
    }
    fetchDeckAndFlashcards();
  }, [deckId]);

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto mt-10">
        <div className='flex justify-between'>
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary)] mb-2">
              {loading ? 'Loading Deck...' : `Study Deck: ${deckName}`}
            </h1>
            <div className="mb-4 text-lg font-semibold text-[var(--primary)]">Score: {correctCount} of {flashcards.length} correct</div>
          </div>
          <Button 
            variant="white-outline"
            className='h-10'
            onClick={handleAskLecsiDeck}
            disabled={!deck}
          >
            Ask Lecsi 💡
          </Button>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading flashcards...</div>
        ) : flashcards.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No flashcards in this deck yet.<br />
            <Link href={`/flashcards/${deckId}/edit`} className="inline-block mt-4">
              <Button variant="primary">Add Flashcards</Button>
            </Link>
          </div>
        ) : (
          <>
            <StudyFlipCard
              flipped={flipped}
              onFlip={handleFlip}
              front={
                <div className="w-full text-lg text-gray-700">
                  <ReactMarkdown>{flashcards[current].front}</ReactMarkdown>
                </div>
              }
              back={
                <div className="w-full text-lg text-gray-700">
                  <ReactMarkdown>{flashcards[current].back}</ReactMarkdown>
                </div>
              }
              handleAskLecsi={handleAskLecsi}
              handleMark={handleMark}
            />
            <div className="flex justify-between items-center gap-4 mb-6">
              <Button variant="primary" onClick={handlePrev}>Previous</Button>
              <span className="text-sm text-gray-500">Card {current + 1} of {flashcards.length}</span>
              <Button variant="primary" onClick={handleNext}>Next</Button>
            </div>
          </>
        )}
        <Link href="/flashcards">
          <Button variant="orange-outline">Back to Decks</Button>
        </Link>
      </div>
    </MainLayout>
  );
}
