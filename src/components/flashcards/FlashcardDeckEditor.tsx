"use client";

import React from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MainLayout } from '../ui/MainLayout';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { DecksService } from '../../lib/api/decks.service';
import { Flashcard, FlashcardsService, FlashcardType, DifficultyLevel } from '../../lib/api/flashcards.service';

interface FlashcardDeckEditorProps {
  deckId: string;
}

import { useRouter } from 'next/navigation';
import { useSubscriptionLimits } from '../../hooks/useSubscriptionLimits';

export function FlashcardDeckEditor({ deckId }: FlashcardDeckEditorProps) {
  const [deck, setDeck] = React.useState<{ id: string; name: string; description?: string; courseId: string }>({ id: '', name: '', description: '', courseId: '' });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [flashcards, setFlashcards] = React.useState<Flashcard[]>([]);
  const [editMode, setEditMode] = React.useState(false);
  const [editedName, setEditedName] = React.useState('');
  const [editedDescription, setEditedDescription] = React.useState('');
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const router = useRouter();
  const { remaining } = useSubscriptionLimits();

  React.useEffect(() => {
    async function fetchDeckAndFlashcards() {
      setLoading(true);
      try {
        // Fetch the deck and its flashcards
        const deckResponse = await DecksService.getById(deckId);
        setDeck(deckResponse);
        setEditedName(deckResponse.name);
        setEditedDescription(deckResponse.description || '');
        
        // Get flashcards for this deck using API client
        const flashcardsData = await FlashcardsService.getFlashcardsByDeck(deckId);
        setFlashcards(flashcardsData || []);
      } catch (e) {
        console.error('Error fetching deck data:', e);
        toast.error('Failed to load deck data');
      } finally {
        setLoading(false);
      }
    }
    fetchDeckAndFlashcards();
  }, [deckId]);

  const handleCardChange = (idx: number, side: 'front' | 'back', value: string) => {
    setFlashcards(cards => {
      const updated = [...cards];
      updated[idx] = { ...updated[idx], [side]: value };
      return updated;
    });
  };

  const handleAddCard = () => {
    // Create a new flashcard with default values
    const newCard: Partial<Flashcard> = {
      front: '',
      back: '',
      type: FlashcardType.QA,
      difficulty: DifficultyLevel.MODERATE,
      deckId: deckId,
    };
    setFlashcards(cards => [...cards, newCard as Flashcard]);
  };

  const handleRemoveCard = (idx: number) => {
    const cardToRemove = flashcards[idx];
    // If the card has an ID, it exists in the database and should be deleted
    if (cardToRemove.id) {
      if (confirm('Are you sure you want to delete this flashcard?')) {
        FlashcardsService.deleteFlashcardFromDeck(deckId, cardToRemove.id)
          .then(() => {
            toast.success('Flashcard deleted');
            setFlashcards(cards => cards.filter((_, i) => i !== idx));
          })
          .catch((err: any) => {
            console.error('Error deleting flashcard:', err);
            toast.error('Failed to delete flashcard');
          });
      }
    } else {
      // If it doesn't have an ID, it's a new card that hasn't been saved yet
      setFlashcards(cards => cards.filter((_, i) => i !== idx));
    }
  };

  const handleSave = async () => {
    if (flashcards.some(card => !card.front || !card.back)) {
      toast.error('All cards must have content on both sides');
      return;
    }

    setSaving(true);
    try {
      // Save all flashcards (manual save: create or update directly)
      const promises = flashcards.map(card => {
        if (card.id) {
          // Update existing card
          return FlashcardsService.updateFlashcard(deckId, card.id, card);
        } else {
          // Create new card
          return FlashcardsService.addFlashcardToDeck(deckId, {
            ...card,
            deckId: deck.id,
            courseId: deck.courseId,
          });
        }
      });

      await Promise.all(promises);
      toast.success('Flashcards saved successfully');
      router.push('/flashcards');
    } catch (err) {
      console.error('Error saving flashcards:', err);
      toast.error('Failed to save some flashcards');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDeck = async () => {
    if (!editedName.trim()) {
      toast.error('Deck name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await DecksService.update(deckId, {
        name: editedName,
        description: editedDescription,
      });
      
      setDeck(prev => ({
        ...prev,
        name: editedName,
        description: editedDescription,
      }));
      
      setEditMode(false);
      toast.success('Deck updated successfully');
    } catch (err) {
      console.error('Error updating deck:', err);
      toast.error('Failed to update deck');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSave();
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="max-w-2xl mx-auto mt-10">
          <div className="mb-6">
            {editMode ? (
              <Card className="p-4 mb-6">
                <h2 className="text-lg font-semibold text-[var(--primary)] mb-4">Edit Deck Details</h2>
                <div className="mb-4">
                  <label htmlFor="deckName" className="block text-sm font-medium text-gray-700 mb-1">Deck Name</label>
                  <input
                    id="deckName"
                    type="text"
                    value={editedName}
                    onChange={e => setEditedName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    placeholder="Deck name"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="deckDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="deckDescription"
                    value={editedDescription}
                    onChange={e => setEditedDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded min-h-[80px] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    placeholder="Description"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="secondary" 
                    type="button" 
                    onClick={() => setEditMode(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    type="button" 
                    onClick={handleUpdateDeck}
                    isLoading={saving}
                  >
                    Save Changes
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="flex items-center">
                    <h1 className="text-2xl font-bold text-[var(--primary)]">
                      {loading ? 'Loading Deck...' : deck.name}
                    </h1>
                    <button
                      onClick={() => setEditMode(true)}
                      className="ml-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Edit deck"
                      type="button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  </div>
                  {deck.description && (
                    <p className="text-gray-600 mt-1">{deck.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="white-outline" 
                    className="text-sm border border-[var(--primary)]" 
                    onClick={() => { toast.success('Lecsi AI assistant would appear here'); }}
                    type="button"
                  >
                    Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <h2 className="text-xl font-semibold text-[var(--primary)] mb-4">Flashcards</h2>
          {/* Subscription limit warning for flashcards */}
          {(() => {
            const cardsLeft = Math.max(remaining.flashcards - flashcards.length, 0);
            if (cardsLeft === 0) {
              return (
                <div className="px-4 py-2 mb-4 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                  You have reached your flashcard limit for this billing period. You cannot add more cards.
                </div>
              );
            }
            if (cardsLeft <= 3) {
              return (
                <div className="px-4 py-2 mb-4 text-sm text-yellow-800 bg-yellow-50 rounded-md border border-yellow-200">
                  You can only add {cardsLeft} more flashcard{cardsLeft === 1 ? '' : 's'}.
                </div>
              );
            }
            return null;
          })()}

          
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Flashcards editing section */}
              {flashcards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No flashcards in this deck yet. Add your first card!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {flashcards.map((card, idx) => (
                    <Card key={card.id || `new-card-${idx}`} className="p-4 relative">
                      <button 
                        onClick={() => handleRemoveCard(idx)}
                        type="button"
                        className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                        aria-label="Remove card"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                      <div className="mb-4">
                        <label htmlFor={`front-${idx}`} className="block text-sm font-medium text-gray-700 mb-1">Front</label>
                        <textarea
                          id={`front-${idx}`}
                          value={card.front}
                          onChange={(e) => handleCardChange(idx, 'front', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-h-[120px]"
                          placeholder="Front side content"
                          required
                        ></textarea>
                      </div>
                      <div>
                        <label htmlFor={`back-${idx}`} className="block text-sm font-medium text-gray-700 mb-1">Back</label>
                        <textarea
                          id={`back-${idx}`}
                          value={card.back}
                          onChange={(e) => handleCardChange(idx, 'back', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-h-[120px]"
                          placeholder="Back side content"
                          required
                        ></textarea>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              
              <div className="flex justify-center flex-wrap gap-2 mb-8">
                {(() => {
                  const cardsLeft = Math.max(remaining.flashcards - flashcards.length, 0);
                  return (
                    <Button type="button" variant="orange" onClick={handleAddCard} disabled={cardsLeft === 0}>Add Card</Button>
                  );
                })()}
                <Button type="submit" variant="primary" isLoading={saving}>Save Cards</Button>
              </div>
            </form>
          )}
          <Link href="/flashcards">
            <Button variant="outline">Back to Decks</Button>
          </Link>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
