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

interface FlashcardFeedback {
  flashcardId: string;
  feedback: 'correct' | 'incorrect' | null;
}

// Animation keyframes
const keyframes = `
  @keyframes shake-animation {
    0% { transform: translateX(0); }
    15% { transform: translateX(10px); }
    30% { transform: translateX(-10px); }
    45% { transform: translateX(10px); }
    60% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
    90% { transform: translateX(-5px); }
    100% { transform: translateX(0); }
  }

  @keyframes checkmark-zoom {
    0% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(1.5); }
    100% { opacity: 1; transform: scale(1); }
  }
`;

// Add animation keyframes and feedback styles at the top of the file
const feedbackStyles = {
  correct: '!bg-green-200 !border-green-500 transition-colors duration-300',
  incorrect: '!bg-red-200 !border-red-500 transition-colors duration-300',
  shakeAnimation: 'shake-animation',
  feedbackIcon: 'absolute bottom-4 right-4 text-4xl',
  checkmarkZoom: 'checkmark-zoom-animation',
};

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
  const [finished, setFinished] = React.useState(false);

  // Add state for tracking card feedback
  const [currentFeedback, setCurrentFeedback] = React.useState<'correct' | 'incorrect' | null>(null);
  const [showAnimation, setShowAnimation] = React.useState(false);
  
  // Add state to store feedback for each flashcard
  const [flashcardFeedback, setFlashcardFeedback] = React.useState<FlashcardFeedback[]>([]);
  
  const handleNext = () => {
    setFlipped(false);

    if (current + 1 < flashcards.length) {
      setCurrent(c => c + 1);
    } else {
      // Get all answers from the feedback state
      const allAnswers = flashcardFeedback.map(feedback => ({
        flashcardId: feedback.flashcardId,
        answer: feedback.feedback ?? 'correct'
      }));
      
      // Submit answers and display results
      handleSubmit(allAnswers);
    }
  };

  const handleSubmit = async (allAnswers: { flashcardId: string; answer: 'correct' | 'incorrect' }[]) => {
      if (!deck) return;
      try {
        // Check if there are answers for all flashcards
        if (allAnswers.length < flashcards.length) {
          const missingCount = flashcards.length - allAnswers.length;
          toast.error(`Please answer all ${missingCount} remaining flashcards before submitting.`);
          return;
        }
        
        // Make sure to explicitly set finished state and trigger confetti if needed
        setFinished(true);
        
        // Calculate final score percentage for confetti
        const scorePercentage = flashcards.length > 0 
          ? Math.round((correctCount / flashcards.length) * 100) 
          : 0;
          
        if (scorePercentage >= 90 && !confettiShown) {
          setTimeout(() => {
            confetti({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.7 },
              zIndex: 9999,
              scalar: 1.2,
            });
          }, 500);
          setConfettiShown(true);
        }
      } catch (error: unknown) {
        let errorMessage = 'Failed to submit answers.';
        if (error instanceof AxiosError && error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        toast.error(errorMessage);
        console.error('Failed to submit answers:', error);
      }
    };
  

  const handleFlip = () => setFlipped(f => !f);
  
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
    const currentCardId = flashcards[current].id;
    if (!currentCardId) return;
    
    // Set current feedback for UI updates
    const feedbackType = gotItRight ? 'correct' : 'incorrect';
    setCurrentFeedback(feedbackType);
    setShowAnimation(!gotItRight); // Only show animation for incorrect answers
    
    // Store feedback in persistent state
    setFlashcardFeedback(prev => {
      // Remove previous feedback for this card if exists
      const filteredFeedback = prev.filter(f => f.flashcardId !== currentCardId);
      
      // Add new feedback
      return [
        ...filteredFeedback, 
        { 
          flashcardId: currentCardId, 
          feedback: feedbackType 
        }
      ];
    });

    // Update score
    setScore(s => {
      const updated = [...s];
      updated[current] = gotItRight;
      return updated;
    });
    
    // Reset animation after it completes
    setTimeout(() => {
      setShowAnimation(false);
      // Keep the color feedback visible
    }, 800);
  };
  const correctCount = score.filter(x => x === true).length;
  const percentCorrect = flashcards.length > 0 ? (correctCount / flashcards.length) * 100 : 0;

  React.useEffect(() => {
    if (!confettiShown && percentCorrect >= 90 && finished) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.7 },
        zIndex: 9999,
        scalar: 1.2,
      });
      setConfettiShown(true);
    }
    if (percentCorrect < 90 && confettiShown && finished) {
      setConfettiShown(false);
    }
  }, [percentCorrect, confettiShown, finished]);

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

  // Update effect to restore feedback when changing cards
  React.useEffect(() => {
    // Get the current card's ID
    const currentCardId = flashcards[current]?.id;
    
    if (currentCardId) {
      // Look for previously stored feedback
      const previousFeedback = flashcardFeedback.find(f => f.flashcardId === currentCardId);
      
      // Restore feedback if it exists
      setCurrentFeedback(previousFeedback?.feedback || null);
    } else {
      // Reset if no card ID
      setCurrentFeedback(null);
    }
    
    setShowAnimation(false);
    setFlipped(false); // Reset to front side when changing cards
  }, [current, flashcards, flashcardFeedback]);

  // Add function to handle trying again
  const handleRestart = () => {
    setCurrent(0);
    setFlipped(false);
    setScore(Array(flashcards.length).fill(null));
    setFlashcardFeedback([]);
    setFinished(false);
    setConfettiShown(false);
  };

  // Function to get color based on score percentage - adding this similar to the quiz page
  const getScoreColor = (percent: number) => {
    if (percent >= 80.01) return '#22c55e'; // Green
    if (percent >= 60.01) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <MainLayout>
      {/* Add keyframes for animations */}
      <style jsx global>{`
        ${keyframes}

        .shake-animation {
          animation: shake-animation 0.5s cubic-bezier(.36,.07,.19,.97) both;
          transform-origin: center;
          backface-visibility: hidden;
        }

        .checkmark-zoom-animation {
          animation: checkmark-zoom 0.6s forwards;
        }
      `}</style>
      
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
        ) : finished ? (
          // Results screen
          <div className="text-center bg-white p-8 rounded-lg shadow-lg transition-all duration-500 ease-in-out">
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">Deck Completed!</h2>
              <p className="text-2xl font-semibold text-[var(--primary)]">
                {correctCount >= flashcards.length * 0.9 ? 'Excellent job! 🏆' : 
                 correctCount >= flashcards.length * 0.75 ? 'Great work! 👏' :
                 correctCount >= flashcards.length * 0.6 ? 'Good effort! 👍' :
                 correctCount >= flashcards.length * 0.4 ? 'Keep practicing! 📚' :
                 'Don\'t give up! 💪'}
              </p>
            </div>
            
            {/* SVG Score Circle - just like in the quiz page */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="white"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                  />
                  
                  {/* Progress circle */}
                  {(() => {
                    const scorePercent = (correctCount / flashcards.length) * 100;
                    const circumference = 2 * Math.PI * 45; // ≈ 283
                    const offset = circumference * (1 - scorePercent / 100);
                    
                    return (
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="transparent"
                        stroke={getScoreColor(Math.round(scorePercent))}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        transform="rotate(-90,50,50)"
                        style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                      />
                    );
                  })()}
                </svg>
                
                {/* Percentage text in the middle */}
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <div className="text-4xl font-bold">
                    {Math.round((correctCount / flashcards.length) * 100)}%
                  </div>
                  <div className="text-sm font-medium text-gray-600 mt-1">
                    {correctCount} / {flashcards.length} correct
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="primary" 
                className="text-lg py-3 px-8"
                onClick={handleRestart}
              >
                Study Again
              </Button>
              <Link href="/flashcards">
                <Button 
                  variant="white-outline"
                  className="text-lg py-3 px-8"
                >
                  Back to Decks
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          // Study mode UI
          <>
            <div className={`relative ${showAnimation ? feedbackStyles.shakeAnimation : ''}`}>
              <StudyFlipCard
                flipped={flipped}
                onFlip={handleFlip}
                front={
                  <div className={`w-full text-lg text-gray-700 $`}>
                    <ReactMarkdown>{flashcards[current].front}</ReactMarkdown>
                  </div>
                }
                back={
                  <div className={`w-full text-lg text-gray-700 $`}>
                    <ReactMarkdown>{flashcards[current].back}</ReactMarkdown>
                  </div>
                }
                handleAskLecsi={handleAskLecsi}
                handleMark={handleMark}
                currentFeedback={currentFeedback}
              />
            </div>
            <div className="flex justify-between items-center gap-4 mb-6">
              <Button variant="primary" onClick={handlePrev}>Previous</Button>
              <span className="text-sm text-gray-500">Card {current + 1} of {flashcards.length}</span>
              <Button variant="primary" onClick={handleNext}>
                {current + 1 === flashcards.length ? "Finish" : "Next"}
              </Button>
            </div>
          </>
        )}
        {!finished && (
          <div className="mt-8">
            <Link href="/flashcards">
              <Button variant="orange-outline">Back to Decks</Button>
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
