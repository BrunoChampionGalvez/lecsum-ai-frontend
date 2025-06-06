"use client";

import React from 'react';
import Link from 'next/link';
import { useChatContext } from '@/lib/chat/ChatContext';
import { MentionedMaterial } from '@/lib/api/chat.service';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MainLayout } from '../ui/MainLayout';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Deck, DecksService } from '../../lib/api/decks.service';
import { Course } from '../../lib/api/courses.service';
import { FlashcardGenerationModal } from './FlashcardGenerationModal';
import { Modal } from '../ui/Modal';
import { useSubscriptionLimits } from '../../hooks/useSubscriptionLimits';

// Extended Deck interface that includes flashcard count
interface DeckWithCount extends Deck {
  flashcardsCount: number;
}

export function FlashcardsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshFlag = searchParams.get('refresh');
  
  // Get chat context for Ask Lecsi functionality
  const { 
    addMaterialToChat, 
    setIsSidebarOpen, 
    setCreateNewSession, 
    hasActiveSession 
  } = useChatContext();
  
  // Get subscription limits
  const { remaining } = useSubscriptionLimits();
  
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [showGenerationModal, setShowGenerationModal] = React.useState(false);

  React.useEffect(() => {
    async function fetchCourses() {
      console.log('FlashcardsList: Starting courses fetch');
      // Check authentication status
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('FlashcardsList: Authentication token not found in localStorage');
        toast.error('Authentication issue - please try logging in again');
        return;
      }
      console.log('FlashcardsList: Auth token exists:', token ? 'Yes' : 'No');
      
      try {
        const fetchedCourses = await import('../../lib/api/courses.service').then(m => m.CoursesService.getAllCourses());
        console.log('FlashcardsList: Courses fetched successfully:', fetchedCourses);
        if (Array.isArray(fetchedCourses) && fetchedCourses.length === 0) {
          console.warn('FlashcardsList: No courses returned from API (empty array)');
        }
        setCourses(fetchedCourses as Course[]);
      } catch (err) {
        console.error('FlashcardsList: Error fetching courses:', err);
        toast.error('Failed to load courses. Please check console for details.');
      }
    }
    fetchCourses();
  }, []);

  const [deletingDeckId, setDeletingDeckId] = React.useState<string | null>(null);
  const [deckToDelete, setDeckToDelete] = React.useState<Deck | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  
  // Function to show the AI generation modal
  const showGenerateWithAiModal = () => {
    setShowGenerationModal(true);
  };

  // Function to initiate deck deletion process
  const confirmDeleteDeck = (deck: Deck) => {
    setDeckToDelete(deck);
    setShowDeleteModal(true);
  };

  // Function to handle actual deletion after confirmation
  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;
    
    setDeletingDeckId(deckToDelete.id);
    try {
      await DecksService.remove(deckToDelete.id);
      setDecks(prev => prev.filter(d => d.id !== deckToDelete.id));
      toast.success(`Flashcard deck "${deckToDelete.name}" deleted successfully`);
    } catch (e) {
      toast.error('Failed to delete flashcard deck.');
      console.error('Error deleting deck:', e);
    } finally {
      setDeletingDeckId(null);
      setDeckToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const [decks, setDecks] = React.useState<Deck[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingDeckId, setEditingDeckId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editedName, setEditedName] = React.useState('');
  const [editedDescription, setEditedDescription] = React.useState('');

  // Function to fetch all decks with their flashcard counts
  const fetchDecks = React.useCallback(async () => {
    try {
      setLoading(true);
      const fetchedDecks = await DecksService.getAll();
      setDecks(fetchedDecks as DeckWithCount[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching decks:', err);
      setError('Failed to load flashcard decks. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch decks on initial load and when refreshFlag changes
  React.useEffect(() => {
    fetchDecks();
    
    // If we came from a redirect with a refresh flag, clear it from the URL
    if (refreshFlag) {
      const newUrl = window.location.pathname;
      router.replace(newUrl);
    }
  }, [fetchDecks, refreshFlag, router]);

  // Add an effect to refetch when the page becomes visible again
  React.useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchDecks();
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchDecks]);

  const handleStartEditing = (deck: Deck) => {
    setEditingDeckId(deck.id);
    setEditedName(deck.name);
    setEditedDescription(deck.description || '');
  };

  const handleCancelEditing = () => {
    setEditingDeckId(null);
    setEditedName('');
    setEditedDescription('');
  };

  // Function to add a flashcard deck to the chat context
  const handleAskLecsi = (deck: Deck) => {
    if (!deck) return;
    
    // Create a material object for the flashcard deck
    const deckMaterial: MentionedMaterial = {
      id: deck.id,
      displayName: deck.name.replace(/ /g, '_'),
      type: 'flashcardDeck',
      originalName: deck.name,
      courseId: deck.courseId
    };
    
    // Add the deck to the chat context (returns true if added, false if already exists)
    const materialAdded = addMaterialToChat(deckMaterial);
    
    // If the deck was already in the context, show a message and return early
    if (materialAdded === false) {
      toast.error(`${deck.name} is already added to the chat context`);
      // Still ensure the sidebar is open
      setIsSidebarOpen(true);
      return;
    }
    
    // Set flag to create a new session ONLY if there isn't an active one
    if (!hasActiveSession) {
      console.log('No active session found, will create a new one');
      setCreateNewSession(true);
    } else {
      console.log('Using existing active session for flashcard deck context');
    }
    
    // Show appropriate feedback to the user based on whether we're using an existing session
    if (hasActiveSession) {
      toast.success(`Added ${deck.name} to the current chat session`);
    } else {
      toast.success(`Created new chat session with ${deck.name}`);
    }
  };

  const handleSaveChanges = async (deckId: string) => {
    if (!editedName.trim()) {
      toast.error('Deck name cannot be empty');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Call the API to update the deck
      await DecksService.update(deckId, {
        name: editedName,
        description: editedDescription
      });
      
      // Update the local state
      setDecks(prev => prev.map(deck => {
        if (deck.id === deckId) {
          return {
            ...deck,
            name: editedName,
            description: editedDescription
          };
        }
        return deck;
      }));
      
      setEditingDeckId(null);
      toast.success('Deck updated successfully');
    } catch (err: any) {
      console.error('Error updating deck:', err);
      toast.error(err.response?.data?.message || 'Failed to update deck');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary)]">Flashcards</h1>
            <p className="text-gray-600 mt-1">
              Study and review with AI-generated flashcards
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={showGenerateWithAiModal} 
              variant="white-outline" 
              disabled={remaining.flashcards === 0}
              title={remaining.flashcards === 0 ? "You've reached your flashcard limit" : "Generate flashcards with AI"}
            >
              Generate with AI 💡
            </Button>
            <Link href="/flashcards/new">
              <Button>Create New Deck</Button>
            </Link>
          </div>
        </div>

        {remaining.flashcards === 0 && (
            <div className="px-4 py-2 mb-4 w-max text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
              You have reached your flashcard limit for this billing period. You cannot generate more flashcards.
            </div>
          )}

        {loading ? (
          <div className="py-10 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">
            <p>{error}</p>
            <Button 
              variant="secondary" 
              className="mt-4" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : decks.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 flex items-center justify-center text-center p-8">
              <div>
                <div className="text-gray-400 text-4xl mb-2">+</div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--primary)]">Create New Deck</h3>
                <p className="text-gray-500 mb-4">Generate flashcards manually</p>
                <Link href="/flashcards/new">
                  <Button>Create Flashcards</Button>
                </Link>
              </div>
            </Card>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 flex items-center justify-center text-center p-8">
                <div>
                  <div className="text-gray-400 text-4xl mb-2">+</div>
                  <h3 className="text-lg font-semibold mb-2 text-[var(--primary)]">Create New Deck</h3>
                  <p className="text-gray-500 mb-4">Generate flashcards manually</p>
                  <Link href="/flashcards/new">
                    <Button>Create Flashcards</Button>
                  </Link>
                </div>
              </Card>
              {decks.map((deck) => (
                <Card key={deck.id} className="hover:shadow-lg transition-shadow">
                  {editingDeckId === deck.id ? (
                    <>
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full p-2 text-lg font-semibold mb-2 border-b border-[var(--primary)] focus:outline-none bg-transparent"
                        placeholder="Deck name"
                        autoFocus
                      />
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full p-2 text-gray-600 mb-4 border border-gray-200 rounded min-h-[80px] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        placeholder="Deck description"
                      />
                      <div className="flex justify-end gap-2 mb-4">
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleSaveChanges(deck.id)}
                          isLoading={isSaving}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="white-outline"
                          onClick={handleCancelEditing}
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center mb-3">
                        <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold mr-3">
                          {deck.name ? deck.name[0] : 'D'}
                        </div>
                        <div className="flex justify-between items-start mb-2 w-full">
                          <h3 className="text-lg font-semibold text-[var(--primary)]">{deck.name}</h3>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => handleStartEditing(deck)}
                              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                              aria-label="Edit deck"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
                              aria-label={`Delete flashcard deck ${deck.name}`}
                              onClick={() => confirmDeleteDeck(deck)}
                              type="button"
                              disabled={deletingDeckId === deck.id}
                            >
                              {deletingDeckId === deck.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 animate-spin">
                                  <line x1="12" y1="2" x2="12" y2="6" />
                                  <line x1="12" y1="18" x2="12" y2="22" />
                                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                                  <line x1="2" y1="12" x2="6" y2="12" />
                                  <line x1="18" y1="12" x2="22" y2="12" />
                                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">{deck.description || 'No description provided.'}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                        <span>{deck.flashcards.length} cards</span>
                        <div className="flex items-center gap-1">
                          {deck.aiGenerated && (
                            <div className="flex items-center gap-1 text-[var(--orange)] bg-[var(--primary-light)] px-2 py-0.5 rounded-full">
                              <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="48" height="48" fill="white" fillOpacity="0.01"/>
                                <path d="M19.036 44.0001C18.0561 40.8045 16.5778 38.4222 14.6011 36.8532C11.636 34.4997 6.92483 35.9624 5.18458 33.5349C3.44433 31.1073 6.40382 26.6431 7.44234 24.009C8.48086 21.375 3.46179 20.4436 4.04776 19.6958C4.43842 19.1973 6.97471 17.7587 11.6567 15.3801C12.987 7.79346 17.9008 4.00014 26.3982 4.00014C39.1441 4.00014 44 14.8061 44 21.679C44 28.552 38.1201 35.9563 29.7441 37.5528C28.9951 38.6436 30.0754 40.7927 32.9848 44.0001" stroke="#000000" strokeWidth="4.66685" strokeLinecap="round" strokeLinejoin="round"/>
                                <path fillRule="evenodd" clipRule="evenodd" d="M19.4997 14.5C18.8464 17.0342 19.0408 18.8138 20.0829 19.8385C21.125 20.8633 22.9011 21.5334 25.4112 21.8489C24.8417 25.1176 25.5361 26.6511 27.4942 26.4493C29.4524 26.2475 30.6289 25.4338 31.0239 24.0083C34.0842 24.8684 35.7428 24.1486 35.9997 21.8489C36.3852 18.3993 34.525 15.6475 33.7624 15.6475C32.9997 15.6475 31.0239 15.5547 31.0239 14.5C31.0239 13.4452 28.7159 12.8493 26.6329 12.8493C24.5499 12.8493 25.8035 11.4452 22.9432 12C21.0363 12.3698 19.8885 13.2031 19.4997 14.5Z" fill="#FFA07A" stroke="#000000" strokeWidth="4" strokeLinejoin="round"/>
                                <path d="M30.5002 25.5001C29.4833 26.1311 28.0878 27.1804 27.5002 28.0001C26.0313 30.0496 24.8398 31.2975 24.5791 32.6082" stroke="#000000" strokeWidth="4" strokeLinecap="round"/>
                              </svg>
                              <span className="text-xs font-medium">AI Generated</span>
                            </div>
                          )}
                          <span>Flashcard deck</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex space-x-2">
                    <Link href={`/flashcards/${deck.id}/study`} className="flex-1">
                      <Button variant="primary" className="w-full">Study</Button>
                    </Link>
                    <Link href={`/flashcards/${deck.id}/edit`} className="flex-1">
                      <Button variant="orange-outline" className="w-full">Edit</Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleAskLecsi(deck)}
                    >
                      Ask Lecsi 💡
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* Flashcard Generation Modal */}
        <FlashcardGenerationModal 
          isOpen={showGenerationModal} 
          onClose={() => {
            setShowGenerationModal(false);
            fetchDecks(); // Refetch decks when modal closes
          }}
          courses={courses}
        />
        
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirm Deck Deletion"
          widthClass="max-w-md"
          footer={
            <div className="flex justify-end space-x-2 w-full">
              <Button
                variant="white-outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={!!deletingDeckId}
              >
                Cancel
              </Button>
              <Button
                variant="orange"
                onClick={handleDeleteDeck}
                isLoading={!!deletingDeckId}
                disabled={!!deletingDeckId}
              >
                Delete
              </Button>
            </div>
          }
        >
          <div className="py-4 text-center">
            {deckToDelete && (
              <>
                <p>Are you sure you want to delete the flashcard deck <span className="text-[var(--primary)] font-semibold">{deckToDelete.name}</span>?</p>
                <p className="text-red-500 font-semibold mt-2">All flashcards in this deck will be permanently deleted.</p>
              </>
            )}
          </div>
        </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}
