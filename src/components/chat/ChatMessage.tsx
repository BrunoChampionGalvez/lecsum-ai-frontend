import React, { useState, useEffect } from 'react';
import { ChatMessage as ChatMessageType, MessageRole, ChatService } from '../../lib/api/chat.service';
import { Flashcard, FlashcardType, DifficultyLevel } from '../../lib/api/flashcards.service';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { apiClient } from '@/lib/api';

// Import for markdown rendering
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { QuizQuestion } from '@/lib/api/quizzes.service';
import { QuizzesService } from '@/lib/api/quizzes.service';

// Map of reference types to backend reference types
const referenceTypeMap = {
  'file': 'file',
  'flashcardDeck': 'flashcardDeck',
  'quiz': 'quiz',
};

interface ChatMessageProps {
  message: ChatMessageType;
  onClickCitation?: (fileId: string, excerpt: string) => void;
  onShowFile?: (fileId: string, textSnippet: string[]) => void; // Added prop for handling file display
}

interface ReferenceTag {
  type: 'file' | 'flashcardDeck' | 'quiz';
  id: string;
  text?: string[];
  flashcardId?: string;
  questionId?: string;
}

// Flashcard component for displaying in a modal
const FlashcardModal: React.FC<{ 
  flashcard: Flashcard | null; 
  isOpen: boolean; 
  onClose: () => void 
}> = ({ flashcard, isOpen, onClose }) => {
  const [flipped, setFlipped] = useState(false);

  // Reset flip state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setFlipped(false);
    }
  }, [isOpen, flashcard]);

  if (!isOpen || !flashcard) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Flashcard">
      <div className="p-4">
        {/* Card container with perspective */}
        <div 
          className="relative w-full h-64 cursor-pointer"
          onClick={() => setFlipped(!flipped)}
          style={{ perspective: '1000px' }}
        >
          {/* Inner container that rotates */}
          <div 
            className={`relative w-full h-full transition-transform duration-700 ${flipped ? 'rotate-y-180' : ''}`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front face */}
            <div 
              className="absolute w-full h-full rounded-lg flex flex-col bg-white border-2 border-[var(--primary)]"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {/* Main content area - takes all available space minus footer */}
              <div className="flex-1 grid place-items-center overflow-hidden p-6 pb-2">
                {/* Scrollable container that keeps content centered when small */}
                <div className="w-full max-h-full overflow-y-auto self-center">
                  <div className="text-xl font-medium text-center break-words">
                    {flashcard?.front || 'Front side'}
                  </div>
                </div>
              </div>
              {/* Footer - fixed at bottom */}
              <div className="p-2 text-sm text-gray-500 text-center">Click to flip</div>
            </div>
            
            {/* Back face - rotated 180 degrees by default */}
            <div 
              className="absolute w-full h-full rounded-lg flex flex-col bg-[var(--primary-light)] text-[var(--primary-text)] border-2 border-[var(--primary)]"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {/* Main content area - takes all available space minus footer */}
              <div className="flex-1 grid place-items-center overflow-hidden p-6 pb-2">
                {/* Scrollable container that keeps content centered when small */}
                <div className="w-full max-h-full overflow-y-auto self-center">
                  <div className="text-xl font-medium text-center break-words">
                    {flashcard?.back || 'Back side'}
                  </div>
                </div>
              </div>
              {/* Footer - fixed at bottom */}
              <div className="p-2 text-sm opacity-70 text-center">Click to flip</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Quiz question component for displaying in a modal
const QuizQuestionModal: React.FC<{ 
  question: QuizQuestion | null; 
  isOpen: boolean; 
  onClose: () => void 
}> = ({ question, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quiz Question">
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Question:</h3>
          <p className="text-gray-800">{question?.question || 'Question not available'}</p>
        </div>
        
        {question?.options && Array.isArray(question.options) && (
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Options:</h3>
            <ul className="list-disc pl-5">
              {question.options.map((option: string, index: number) => {
                const optionText = option;
                const isCorrect = option === question.correctAnswer;
                
                return (
                  <li key={index} className={isCorrect ? 'text-green-600 font-semibold' : ''}>
                    {optionText} {isCorrect && '✓'}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Correct Answer:</h3>
          <p className={question?.correctAnswer ? 'text-green-600 font-semibold' : 'text-gray-800'}>
            {question?.correctAnswer}
          </p>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ 
  message,
  // onClickCitation, // Removed as it's unused
  onShowFile, // Add the new prop
}) => {
  const [activeFlashcard, setActiveFlashcard] = useState<Flashcard | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuizQuestion | null>(null);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [referencePaths, setReferencePaths] = useState<Record<string, string>>({});
  // State to track which references are currently being fetched
  const [fetchingRefs, setFetchingRefs] = useState<Record<string, boolean>>({});
  const [showMentions, setShowMentions] = useState(false);

  const [loadingFlashcards, setLoadingFlashcards] = useState<Record<string, boolean>>({});
  // State for API-fetched flashcard and question content - store complete flashcard objects
  const [apiFlashcardData, setApiFlashcardData] = useState<Record<string, Flashcard>>({});
  // State to store quiz data - store complete question objects
  const [apiQuizData, setApiQuizData] = useState<Record<string, QuizQuestion>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<Record<string, boolean>>({});
  
  // Function to fetch multiple flashcards in a single batch request
  const fetchFlashcardsContentBatch = async (flashcardIds: string[]) => {
    if (!flashcardIds || flashcardIds.length === 0) return;
    
    // Filter out IDs that we already have in cache
    const idsToFetch = flashcardIds.filter(id => !apiFlashcardData[id]);
    
    if (idsToFetch.length === 0) {
      return;
    }
    
    try {
      
      // Set loading state for all IDs in this batch
      const newLoadingState: Record<string, boolean> = {};
      idsToFetch.forEach(id => {
        newLoadingState[id] = true;
      });
      
      setLoadingFlashcards(prev => ({ ...prev, ...newLoadingState }));
      
      // Make a single batch API call
      const flashcardsData = await apiClient.post('/flashcards/references/batch', { ids: idsToFetch });
      
      // Process the map of flashcards
      if (flashcardsData && typeof flashcardsData === 'object') {
        // Store the complete flashcard objects in our cache
        setApiFlashcardData((prev: Record<string, Flashcard>) => ({
          ...prev,
          ...flashcardsData as Record<string, Flashcard>
        }));
      }
      
      // Clear loading state for all IDs in this batch
      const clearedLoadingState: Record<string, boolean> = {};
      idsToFetch.forEach(id => {
        clearedLoadingState[id] = false;
      });
      
      setLoadingFlashcards(prev => ({ ...prev, ...clearedLoadingState }));
    } catch (error) {
      console.error('Error in batch fetching flashcards:', error);
      
      // Clear loading state for all IDs in this batch on error
      const clearedLoadingState: Record<string, boolean> = {};
      idsToFetch.forEach(id => {
        clearedLoadingState[id] = false;
      });
      
      setLoadingFlashcards(prev => ({ ...prev, ...clearedLoadingState }));
    }
  };
  
  // Legacy method for compatibility - uses batch loading internally
  const fetchFlashcardContentFromApi = async (flashcardId: string) => {
    if (!flashcardId) return;
    
    // Skip if we already have the content
    if (apiFlashcardData[flashcardId]) {
      return;
    }
    
    // Use the batch method for a single ID
    await fetchFlashcardsContentBatch([flashcardId]);
  };
  
  // Function to fetch multiple quiz questions in a single batch request
  const fetchQuestionsContentBatch = async (questionIds: string[]) => {
    if (!questionIds || questionIds.length === 0) return;
    
    // Filter out IDs that we already have in cache
    const idsToFetch = questionIds.filter(id => !apiQuizData[id]);
    
    if (idsToFetch.length === 0) {
      return;
    }
    
    try {
      
      // Set loading state for all IDs in this batch
      const newLoadingState: Record<string, boolean> = {};
      idsToFetch.forEach(id => {
        newLoadingState[id] = true;
      });
      
      setLoadingQuestions(prev => ({ ...prev, ...newLoadingState }));
      
      // Make a single batch API call
      const questionsData = await QuizzesService.getQuestionsBatch(idsToFetch);
      
      // Process the map of questions
      if (questionsData && typeof questionsData === 'object') {
        // Store the complete quiz question objects in our cache
        setApiQuizData((prev: Record<string, QuizQuestion>) => ({
          ...prev,
          ...questionsData
        }));
      }
      
      // Clear loading state for all IDs in this batch
      const clearedLoadingState: Record<string, boolean> = {};
      idsToFetch.forEach(id => {
        clearedLoadingState[id] = false;
      });
      
      setLoadingQuestions(prev => ({ ...prev, ...clearedLoadingState }));
    } catch (error) {
      console.error('Error in batch fetching quiz questions:', error);
      
      // Clear loading state for all IDs in this batch on error
      const clearedLoadingState: Record<string, boolean> = {};
      idsToFetch.forEach(id => {
        clearedLoadingState[id] = false;
      });
      
      setLoadingQuestions(prev => ({ ...prev, ...clearedLoadingState }));
    }
  };
  
  // Legacy method for compatibility - uses batch loading internally
  const fetchQuestionContentFromApi = async (questionId: string) => {
    if (!questionId) return;
    
    // Skip if we already have the content
    if (apiQuizData[questionId]) {
      return;
    }
    
    // Use the batch method for a single ID
    await fetchQuestionsContentBatch([questionId]);
  };

  // Handle showing a flashcard in modal using the cached data if available
  const handleShowFlashcard = async (flashcardId: string) => {
    
    try {
      // First check if we already have this flashcard data cached
      if (apiFlashcardData[flashcardId]) {
        const cachedFlashcard = apiFlashcardData[flashcardId];
        
        setActiveFlashcard(cachedFlashcard);
        
        setShowFlashcardModal(true);
        return;
      }
      
      // If not in cache, fetch it first (this will add it to our cache)
      await fetchFlashcardsContentBatch([flashcardId]);
      
      // Now it should be in the cache
      if (apiFlashcardData[flashcardId]) {
        const fetchedFlashcard = apiFlashcardData[flashcardId] as Flashcard;
        
        setActiveFlashcard(fetchedFlashcard);
      } else {
        // Fallback if for some reason it's still not in cache
        console.warn('Flashcard not in cache after fetching, using direct API call:', flashcardId);
        const flashcard = await apiClient.get<Flashcard>(`/flashcards/${flashcardId}`);
        
        setActiveFlashcard(flashcard);
      }
      
      // Make sure to set the modal visibility to true
      setShowFlashcardModal(true);
      
    } catch (error) {
      console.error('Error displaying flashcard:', error);
      // Even on error, show the modal with an error message
      setActiveFlashcard({
        id: flashcardId,
        front: 'Error',
        back: 'Error loading flashcard content',
        type: FlashcardType.QA, // Placeholder
        difficulty: DifficultyLevel.EASY, // Placeholder
        createdAt: new Date().toISOString(), // Placeholder
        updatedAt: new Date().toISOString(), // Placeholder
        courseId: 'unknown', // Placeholder
      });
      setShowFlashcardModal(true);
    }
  };
  
  // Handle showing a quiz question in modal using cached data if available
  const handleShowQuestion = async (questionId: string) => {
    try {
      // First check if we already have this question data cached
      if (apiQuizData[questionId]) {
        const cachedQuestion = apiQuizData[questionId] as QuizQuestion;
        
        setActiveQuestion({
          id: cachedQuestion.id,
          question: cachedQuestion.question || 'No question content available',
          options: cachedQuestion.options || [],
          correctAnswer: cachedQuestion.correctAnswer || 'No answer content available',
          createdAt: cachedQuestion.createdAt,
          updatedAt: cachedQuestion.updatedAt,
          quizId: cachedQuestion.quizId
        });
        
        setShowQuestionModal(true);
        return;
      }
      
      // Show loading state in the modal
      setActiveQuestion({
        id: questionId,
        question: 'Loading...',
        options: [],
        correctAnswer: '', // Placeholder
        createdAt: new Date().toISOString(), // Placeholder
        updatedAt: new Date().toISOString(), // Placeholder
        quizId: 'unknown' // Placeholder
      });
      setShowQuestionModal(true);
      
      // If not in cache, fetch it (this will add it to our cache)
      await fetchQuestionsContentBatch([questionId]);
      
      // Now it should be in the cache
      if (apiQuizData[questionId]) {
        const fetchedQuestion = apiQuizData[questionId] as QuizQuestion;
        
        setActiveQuestion(fetchedQuestion);
      } else {
        // Fallback if for some reason it's still not in cache
        console.warn('Question not in cache after fetching, using direct API call:', questionId);
        const question = await apiClient.get<QuizQuestion>(`/quizzes/question/${questionId}`);
        
        setActiveQuestion(question);
      }
    } catch (error) {
      console.error('Error in handleShowQuestion:', error);
      setActiveQuestion({
        id: questionId,
        question: 'An error occurred while loading the question',
        options: [],
        correctAnswer: '', // Placeholder
        createdAt: new Date().toISOString(), // Placeholder
        updatedAt: new Date().toISOString(), // Placeholder
        quizId: 'unknown' // Placeholder
      });
    }
  };

  // New function to handle showing a file
  const handleShowFile = (fileId: string, textSnippets: string[]) => {
    if (onShowFile) {
      onShowFile(fileId, textSnippets);
    } else {
      console.warn('onShowFile prop is not provided to ChatMessage component');
    }
  };

  const isUser = message.role === MessageRole.USER;

  // Use refs to track which messages have been processed for reference paths
  
  // Effect to handle fetching reference paths
  useEffect(() => {
    // Find references that need to be fetched (have 'Loading...' paths)
    const refsToFetch = Object.entries(referencePaths)
      .filter(([key, path]) => path === 'Loading...' && !fetchingRefs[key])
      .map(([key]) => {
        // Parse the key back into type and id
        const [type, id] = key.split(':');
        return { type, id, key };
      });

    if (refsToFetch.length === 0) return;
    
    // Mark these references as being fetched
    const newFetchingRefs = { ...fetchingRefs };
    refsToFetch.forEach(ref => {
      newFetchingRefs[ref.key] = true;
    });
    setFetchingRefs(newFetchingRefs);
    
    // Fetch each reference path
    refsToFetch.forEach(async ({ type, id, key }) => {
      try {
        const path = await ChatService.getReferencePath(type, id);
        
        // Update cache and state
        referencePathCache[key] = path;
        setReferencePaths(prev => ({ ...prev, [key]: path }));
      } catch (error) {
        console.error(`[DEBUG-PATH] Error fetching path for ${key}:`, error);
        const fallback = `[Error: ${type} not found]`;
        referencePathCache[key] = fallback;
        setReferencePaths(prev => ({ ...prev, [key]: fallback }));
      } finally {
        // Mark as no longer fetching
        setFetchingRefs(prev => ({ ...prev, [key]: false }));
      }
    });
  }, [referencePaths, fetchingRefs]);
  
  // Parse content into segments preserving the order of text and references
  const parseContentIntoSegments = (content: string): Array<{ type: 'text' | 'reference'; content: string; tag?: ReferenceTag }> => {
    console.log('[CASCADE_DEBUG] parseContentIntoSegments called with content (first 500 chars):', content.substring(0, 500));
    const parts = content.split(/(\[REF\]|\[\/REF\])/);
    const segments: Array<{ type: 'text' | 'reference'; content: string; tag?: ReferenceTag }> = [];
    let inReference = false;
    let currentRefSegment: { type: 'reference'; content: string; tag?: ReferenceTag } | null = null;
    parts.forEach(part => {
      if (part === '[REF]') {
        inReference = true;
        currentRefSegment = { type: 'reference', content: '', tag: undefined };
        segments.push(currentRefSegment);
      } else if (part === '[/REF]') {
        inReference = false;
        if (currentRefSegment) {
          const contentToParse = currentRefSegment.content.trim();
          // Declare jsonStrToParse here to be accessible in catch
          let jsonStrToParse = ""; // Initialize

          try {
            console.log('[CASCADE_DEBUG] Processing [/REF]. Accumulated content (first 100 chars):', `"${contentToParse.substring(0, 100)}"`);
            if (!contentToParse) {
              console.warn('[CASCADE_DEBUG] Reference segment has empty content after trim.');
              currentRefSegment.tag = { type: 'file', id: 'empty_ref_content', text: [] } as ReferenceTag;
            } else {
              jsonStrToParse = contentToParse; // Assign here
              console.log('[CASCADE_DEBUG] Attempting JSON.parse on (first 100 chars):', `"${jsonStrToParse.substring(0, 100)}"`);
              currentRefSegment.tag = JSON.parse(jsonStrToParse);

              if (typeof currentRefSegment.tag !== 'object' || currentRefSegment.tag === null) {
                console.error('[CASCADE_DEBUG] Parsed reference JSON is not an object. Parsed as:', currentRefSegment.tag, "Using string (first 100 chars):", `"${jsonStrToParse.substring(0, 100)}"`);
                currentRefSegment.tag = { type: 'file', id: 'parse_error_non_object', text: [] } as ReferenceTag;
              } else {
                console.log('[CASCADE_DEBUG] JSON.parse successful. Tag:', currentRefSegment.tag);
              }
            }
          } catch (e: unknown) {
            let errorMessage = 'An unknown error occurred during JSON parsing.';
            if (e instanceof Error) {
              errorMessage = e.message;
            } else if (typeof e === 'string') {
              errorMessage = e;
            }
            // jsonStrToParse will hold the content that was attempted, or be an empty string if contentToParse was empty.
            console.error('[CASCADE_DEBUG] JSON.parse FAILED. Error:', errorMessage, "Attempted to parse (first 100 chars):", `"${jsonStrToParse.substring(0, 100)}"`);
            currentRefSegment.tag = { type: 'file', id: 'parse_error', text: [] } as ReferenceTag;
          }
        }
        currentRefSegment = null;
      } else {
        if (inReference && currentRefSegment) {
          currentRefSegment.content += part;
        } else {
          if (segments.length > 0 && segments[segments.length - 1].type === 'text') {
            segments[segments.length - 1].content += part;
          } else {
            segments.push({ type: 'text', content: part });
          }
        }
      }
    });
    return segments;
  };

  // Render content with reference tags
  const renderContentWithReferences = () => {
    if (!message.content) {
      if (message.role === 'ai') {
        return (
          <div className="mt-2 mb-3 p-3 border rounded-md bg-gray-100" key="loading-response">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sm font-medium text-gray-700">Loading response...</div>
            </div>
          </div>
        );
      }
      return <div>No content</div>;
    }
  
    // Parse content into segments preserving original order
    const segments = parseContentIntoSegments(message.content);
  
    return (
      <div className="markdown-content w-full">
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            // Make sure content is properly trimmed but not escaped
            const contentToRender = segment.content.trim();
            return (
              <div key={`text-${index}`} className="prose prose-slate w-full max-w-full break-words overflow-hidden">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Properly handle all list types, especially asterisk bullet points
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ul: ({node: _node, ...props}) => <ul className="list-disc pl-6 my-2 space-y-1" {...props} />,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ol: ({node: _node, ...props}) => <ol className="list-decimal pl-6 my-2 space-y-1" {...props} />,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    li: ({node: _node, ...props}) => <li className="my-1" {...props} />,
                    
                    // Handle code blocks and inline code
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    code: ({ node: _node, className, children, inline, ...htmlProps }: { node?: unknown; className?: string; children?: React.ReactNode; inline?: boolean } & Omit<React.ComponentPropsWithoutRef<'code'>, 'inline'|'children'|'className'|'node'>) => {
                      const isInline = inline || false;
                      return !isInline ? (
                        <pre className="bg-gray-100 rounded p-2 overflow-auto my-2 text-sm">
                          <code className={className} {...htmlProps}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...htmlProps}>
                          {children}
                        </code>
                      );
                    },
                    
                    // Ensure paragraphs and text are properly formatted
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    p: ({node: _node, children, ...props}) => {
                      const textContent = React.Children.toArray(children).join('').trim();
                      if (!textContent) return <br />;
                      return <p className="my-2 break-words" {...props}>{children}</p>;
                    },
                    
                    // Handle headings
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    h1: ({node: _node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    h2: ({node: _node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    h3: ({node: _node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                    
                    // Handle emphasis and strong
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    em: ({node: _node, ...props}) => <em className="italic" {...props} />,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    strong: ({node: _node, ...props}) => <strong className="font-bold" {...props} />,
                  }}
                >
                  {contentToRender}
                </ReactMarkdown>
              </div>
            );
          } else if (segment.type === 'reference') {
            // If we have a complete tag, render the full reference
            if (segment.tag) {
              return renderReferenceTag(segment.tag, index);
            } else {
              // If no tag (streaming in progress), render a placeholder reference style
              return (
                <div key={`ref-streaming-${index}`} className="mt-2 mb-3 p-3 border rounded-md bg-blue-50 border-blue-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-sm font-medium text-blue-700">
                      Loading reference...
                    </div>
                  </div>
                </div>
              );
            }
          }
          return null;
        })}
      </div>
    );
  };

  // Render a reference tag based on its type
  const renderReferenceTag = (tag: ReferenceTag, index: number | string) => {
    const baseClasses = "mt-2 mb-3 p-3 border rounded-md";
    
    // Map frontend reference types to backend types for correct path lookup
    const backendType = referenceTypeMap[tag.type] || tag.type;
    
    // Create the correct cache key based on reference type
    const cacheKey = `${backendType}:${tag.id}`;
    
    // First check the React state for the path
    let displayPath = referencePaths[cacheKey];
    
    // If not in state, check our static cache
    if (!displayPath && referencePathCache[cacheKey]) {
      displayPath = referencePathCache[cacheKey];
      
      // Add to state synchronously (safe since we're not rendering yet)
      setReferencePaths(prev => ({
        ...prev,
        [cacheKey]: displayPath
      }));
    }
    
    // If still not found, mark as Loading and let the useEffect handle fetching
    if (!displayPath) {
      displayPath = 'Loading...';
      
      // Queue this update to occur after render is complete
      setTimeout(() => {
        setReferencePaths(prev => {
          // Only update if it's not already there
          if (!prev[cacheKey]) {
            return { ...prev, [cacheKey]: 'Loading...' };
          }
          return prev;
        });
      }, 0);
    }
    
    const isDeleted = displayPath.includes('Deleted') || displayPath.includes('no longer available');
    const deletedClass = isDeleted ? 'opacity-70' : '';
    
    let isLoading = false;
    
    switch(tag.type) {
      case 'file':
        return (
          <div className='ml-2 flex' key={`ref-${index}`}>
            <div className='mr-2 min-w-[1rem] w-4 flex-shrink-0 h-6 border-l-2 border-b-2 border-blue-200 rounded-bl-md'></div>
            <div className={`${baseClasses} flex-grow bg-blue-50 border-blue-200 border-l-4 ${deletedClass}`}>
              <div className="flex justify-between">
                <div className="text-xs text-blue-500 font-semibold">Source: File</div>
                {isDeleted && <div className="text-xs text-red-500 font-medium">Content no longer available</div>}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {tag.text && <><span className="font-semibold">Reference:</span> {tag.text}</> }
              </div>
              {/* File content snippet already shown above */}
              <div className="text-xs text-gray-500 mt-1"><span className="font-semibold">Path:</span> {displayPath}</div>
              {/* Show file button - pass the content directly */}
              {!isDeleted && tag.id && (
                <div className="mt-2">
                  <Button 
                    variant="light-blue-outline" 
                    size="sm"
                    onClick={() => {
                      handleShowFile(tag.id, tag.text || []);
                    }}
                  >
                    Show File
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'flashcardDeck':
        // Get the flashcard ID
        const flashcardId = tag.flashcardId;
        
        // Get the content from state - either API-fetched content or tag content
        isLoading = flashcardId ? loadingFlashcards[flashcardId] : false;
        
        // If we don't have the flashcard content yet and it's not loading, fetch it now
        if (flashcardId && !apiFlashcardData[flashcardId] && !isLoading) {
          setLoadingFlashcards(prev => ({ ...prev, [flashcardId]: true }));
          fetchFlashcardContentFromApi(flashcardId).then(() => {
            setLoadingFlashcards(prev => ({ ...prev, [flashcardId]: false }));
          });
        }
        
        const flashcardContent = flashcardId && apiFlashcardData[flashcardId] 
          ? apiFlashcardData[flashcardId].back || 'No content available' 
          : null; // Use null instead of a message so we can show loading state
          
        
        
        return (
          <div className='ml-2 flex' key={`ref-${index}`}>
            <div className='mr-2 min-w-[1rem] w-4 flex-shrink-0 h-6 border-l-2 border-b-2 border-green-200 rounded-bl-md'></div>
            <div className={`${baseClasses} flex-grow bg-green-50 border-green-200 border-l-4 ${deletedClass}`}>
              <div className="flex justify-between">
                <div className="text-xs text-green-500 font-semibold">Source: Flashcard Deck</div>
                {isDeleted && <div className="text-xs text-red-500 font-medium">Content no longer available</div>}
              </div>
              <div className="flex flex-col items-start gap-1 mt-1">
                <div className="text-xs text-gray-500"><span className="font-semibold">Deck:</span> {displayPath}</div>
                
                {/* Loading state */}
                {isLoading && (
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="mr-2">Loading flashcard content...</span>
                    <div className="animate-spin h-3 w-3 border-2 border-green-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
                
                {/* Always show flashcard content when available */}
                {!isLoading && flashcardContent && (
                  <div className="text-xs text-gray-700 p-2 bg-white border border-gray-200 rounded max-h-32 overflow-y-auto">
                    <span className="font-semibold">Flashcard Content:</span> {flashcardContent}
                  </div>
                )}
                
                {/* Content is loading or not available yet */}
                {(!isLoading && flashcardContent === null && !isDeleted) && (
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="mr-2">Fetching content...</span>
                    <div className="animate-spin h-3 w-3 border-2 border-green-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
              </div>
              
              {/* Show flashcard button - pass the content directly */}
              {!isDeleted && flashcardId && (
                <div className="mt-2">
                  <Button 
                    variant="green-outline" 
                    size="sm"
                    onClick={() => {
                      handleShowFlashcard(flashcardId);
                    }}
                  >
                    Show Flashcard
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'quiz':
        const questionId = tag.questionId;
        // Get the content from state - either API-fetched content or tag content
        isLoading = questionId ? loadingQuestions[questionId] : false;
        
        // If we don't have the question content yet and it's not loading, fetch it now
        if (questionId && !apiQuizData[questionId] && !isLoading) {
          setLoadingQuestions(prev => ({ ...prev, [questionId]: true }));
          fetchQuestionContentFromApi(questionId).then(() => {
            setLoadingQuestions(prev => ({ ...prev, [questionId]: false }));
          });
        }
        
        const questionContent = questionId && apiQuizData[questionId] 
          ? apiQuizData[questionId].question || 'No question content available' 
          : null; // Use null instead of a message so we can show loading state
          
        
        
        return (
          <div className='ml-2 flex' key={`ref-${index}`}>
            <div className='mr-2 min-w-[1rem] w-4 flex-shrink-0 h-6 border-l-2 border-b-2 border-purple-200 rounded-bl-md'></div>
            <div className={`${baseClasses} flex-grow bg-purple-50 border-purple-200 border-l-4 ${deletedClass}`}>
              <div className="flex justify-between">
                <div className="text-xs text-purple-500 font-semibold">Source: Quiz</div>
                {isDeleted && <div className="text-xs text-red-500 font-medium">Content no longer available</div>}
              </div>
              <div className="flex flex-col items-start gap-1 mt-1">
                <div className="text-xs text-gray-500"><span className="font-semibold">Quiz:</span> {displayPath}</div>
                
                {/* Loading state */}
                {isLoading && (
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="mr-2">Loading quiz content...</span>
                    <div className="animate-spin h-3 w-3 border-2 border-purple-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
                
                {/* Always show quiz content when available */}
                {!isLoading && questionContent && (
                  <div className="text-xs text-gray-700 p-2 bg-white border border-gray-200 rounded max-h-32 overflow-y-auto">
                    <span className="font-semibold">Quiz Content:</span> {questionContent}
                  </div>
                )}
                
                {/* Content is loading or not available yet */}
                {(!isLoading && questionContent === null && !isDeleted) && (
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="mr-2">Fetching content...</span>
                    <div className="animate-spin h-3 w-3 border-2 border-purple-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
              </div>
              
              {/* Show question button */}
              {!isDeleted && tag.questionId && (
                <div className="mt-2">
                  <Button 
                    variant="purple-outline" 
                    size="sm"
                    onClick={() => handleShowQuestion(tag.questionId!)}
                  >
                    Show Question
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return (
          <div className='ml-2 flex' key={`ref-${index}`}>
            <div className='mr-2 min-w-[1rem] w-4 flex-shrink-0 h-6 border-l-2 border-b-2 border-gray-200 rounded-bl-md'></div>
            <div className={`${baseClasses} flex-grow bg-gray-50 border-gray-200 border-l-4`}>
              <div className="text-xs text-gray-500 font-semibold">Source: Unknown</div>
              <div className="text-sm text-gray-600 mt-1">{JSON.stringify(tag)}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-3xl rounded-lg p-3 ${
          isUser 
            ? 'bg-[var(--primary)] text-white' 
            : 'bg-white border border-gray-200'
        }`}>
          {renderContentWithReferences()}
    
          {/* Show "See mentions" dropdown for user messages with selected materials */}
          {isUser && message.selectedMaterials && message.selectedMaterials.length > 0 && (
            <div className="mt-2 mb-1">
              <button 
                onClick={() => setShowMentions(!showMentions)}
                className={`flex items-center text-xs ${isUser ? 'text-[var(--sky-light)]' : 'text-blue-500'} hover:underline focus:outline-none`}
              >
                <span>See mentions</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-3 w-3 ml-1 transition-transform duration-200 ${showMentions ? 'transform rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
    
              {/* Materials dropdown */}
              {showMentions && (
                <div className="mt-1.5 p-2 bg-gray-100 rounded-md">
                  <div className="flex flex-wrap gap-1">
                    {message.selectedMaterials.map(material => (
                      <div 
                        key={material.id} 
                        className="inline-flex items-center bg-[var(--light-blue)] text-[var(--primary)] px-2 py-1 rounded-md text-xs"
                      >
                        <span className="mr-1">
                          {material.type === 'course' && '📚'}
                          {material.type === 'folder' && '📁'}
                          {material.type === 'file' && '📄'}
                          {material.type === 'quiz' && '❓'}
                          {material.type === 'flashcardDeck' && '🔤'}
                        </span>
                        <span>{material.displayName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
    
          <div className={`text-xs mt-1 ${isUser ? 'text-[var(--sky-light)]' : 'text-gray-500'}`}>
            {new Date(message.createdAt).toLocaleTimeString()}
          </div>
        </div>
      </div>
      {/* Modals for flashcards and quiz questions */}
      {activeFlashcard && (
        <FlashcardModal 
          flashcard={activeFlashcard} 
          isOpen={showFlashcardModal} 
          onClose={() => {
            setShowFlashcardModal(false);
          }} 
        />
      )}
      {activeQuestion && (
        <QuizQuestionModal 
          question={activeQuestion} 
          isOpen={showQuestionModal} 
          onClose={() => setShowQuestionModal(false)} 
        />
      )}
    </>
  );

}

// Export the memo'd component to avoid unnecessary rerenders
// Create module-level (global) caches that persist between renders and component instances
// These need to be outside the component to truly persist across renders
const referencePathCache: Record<string, string> = {};

export const ChatMessage = React.memo(ChatMessageComponent, (prev, next) =>
  prev.message.id === next.message.id &&
  prev.message.content === next.message.content &&
  JSON.stringify(prev.message.citations || []) === JSON.stringify(next.message.citations || []) &&
  prev.onClickCitation === next.onClickCitation &&
  prev.onShowFile === next.onShowFile // Add onShowFile to memo comparison
);
