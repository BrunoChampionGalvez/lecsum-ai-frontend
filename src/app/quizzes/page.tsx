"use client";

import { MainLayout } from '../../components/ui/MainLayout';
import { useSubscriptionLimits } from '../../hooks/useSubscriptionLimits';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useChatContext } from '../../lib/chat/ChatContext';
import { MentionedMaterial } from '../../lib/api/chat.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { QuizzesGenerationModal } from '../../components/quizzes/QuizzesGenerationModal';
import { Modal } from '../../components/ui/Modal';

import React from 'react';
import { QuizzesService, Quiz } from '../../lib/api/quizzes.service';
import { CoursesService, Course } from '../../lib/api/courses.service';

export default function QuizzesPage() {
  // Get chat context for Ask Lecsi functionality
  const { 
    addMaterialToChat, 
    setIsSidebarOpen, 
    setCreateNewSession, 
    hasActiveSession 
  } = useChatContext();
  
  const [deletingQuizId, setDeletingQuizId] = React.useState<string | null>(null);
  const [quizToDelete, setQuizToDelete] = React.useState<Quiz | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  // Function to add a quiz to the chat context
  const handleAskLecsi = (quiz: Quiz) => {
    if (!quiz) return;
    
    // Create a material object for the quiz
    const quizMaterial: MentionedMaterial = {
      id: quiz.id,
      displayName: quiz.title.replace(/ /g, '_'),
      type: 'quiz',
      originalName: quiz.title,
      courseId: quiz.courseId
    };
    
    // Add the quiz to the chat context (returns true if added, false if already exists)
    const materialAdded = addMaterialToChat(quizMaterial);
    
    // If the quiz was already in the context, show a message and return early
    if (materialAdded === false) {
      toast.error(`${quiz.title} is already added to the chat context`);
      // Still ensure the sidebar is open
      setIsSidebarOpen(true);
      return;
    }
    
    // Set flag to create a new session ONLY if there isn't an active one
    if (!hasActiveSession) {
      console.log('No active session found, will create a new one');
      setCreateNewSession(true);
    } else {
      console.log('Using existing active session for quiz context');
    }
    
    // Show appropriate feedback to the user based on whether we're using an existing session
    if (hasActiveSession) {
      toast.success(`Added ${quiz.title} to the current chat session`);
    } else {
      toast.success(`Created new chat session with ${quiz.title}`);
    }
  };

  // Function to initiate quiz deletion process
  const confirmDeleteQuiz = (quiz: Quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteModal(true);
  };
  
  // Function to handle actual deletion after confirmation
  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    
    setDeletingQuizId(quizToDelete.id);
    try {
      await QuizzesService.deleteQuiz(quizToDelete.id);
      setQuizzes(prev => prev.filter(q => q.id !== quizToDelete.id));
      toast.success(`Quiz "${quizToDelete.title}" deleted successfully`);
    } catch (e) {
      toast.error('Failed to delete quiz.');
      console.error('Error deleting quiz:', e);
    } finally {
      setDeletingQuizId(null);
      setQuizToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const [courses, setCourses] = React.useState<Course[]>([]);

  React.useEffect(() => {
    async function fetchCourses() {
      console.log('QuizzesPage: Starting courses fetch');
      // Check authentication status
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('QuizzesPage: Authentication token not found in localStorage');
        toast.error('Authentication issue - please try logging in again');
        return;
      }
      console.log('QuizzesPage: Auth token exists:', token ? 'Yes' : 'No');
      
      try {
        const fetchedCourses = await CoursesService.getAllCourses();
        console.log('QuizzesPage: Courses fetched successfully:', fetchedCourses);
        if (Array.isArray(fetchedCourses) && fetchedCourses.length === 0) {
          console.warn('QuizzesPage: No courses returned from API (empty array)');
        }
        setCourses(fetchedCourses as Course[]);
      } catch (err) {
        console.error('QuizzesPage: Error fetching courses:', err);
        toast.error('Failed to load courses. Please check console for details.');
      }
    }
    fetchCourses();
  }, []);
  const [quizzes, setQuizzes] = React.useState<Quiz[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showGenerationModal, setShowGenerationModal] = React.useState(false);

  // Inline quiz title editing state
  const [editingQuizId, setEditingQuizId] = React.useState<string | null>(null);
  const [editedQuizTitle, setEditedQuizTitle] = React.useState('');
  const [savingQuizTitle, setSavingQuizTitle] = React.useState(false);

  // Function to fetch all decks with their flashcard counts
    const fetchQuizzes = React.useCallback(async () => {
      try {
        setLoading(true);
        const fetchedQuizzes = await QuizzesService.getAll();
        setQuizzes(fetchedQuizzes as Quiz[]);
        setError(null);
      } catch (err) {
        console.error('Error fetching decks:', err);
        setError('Failed to load flashcard decks. Please try again later.');
      } finally {
        setLoading(false);
      }
    }, []);

  const handleEditQuizTitle = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setEditedQuizTitle(quiz.title);
  };

  const handleCancelEditQuizTitle = () => {
    setEditingQuizId(null);
    setEditedQuizTitle('');
  };

  // Function to show the AI generation modal
  // Add subscription limit check
  const { remaining } = useSubscriptionLimits();

  const showGenerateWithAiModal = () => {
    setShowGenerationModal(true);
  };

  const handleSaveQuizTitle = async (quiz: Quiz) => {
    if (!editedQuizTitle.trim() || editedQuizTitle === quiz.title) {
      setEditingQuizId(null);
      setEditedQuizTitle('');
      return;
    }
    setSavingQuizTitle(true);
    try {
      // Questions are required by updateQuiz API, pass through unchanged
      // Always fetch the latest quiz object to ensure all fields are present
      const latestQuiz = await QuizzesService.getQuizById(quiz.id);
      await QuizzesService.updateQuiz(quiz.id, {
        ...latestQuiz,
        title: editedQuizTitle,
      });
      setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, title: editedQuizTitle } : q));
      setEditingQuizId(null);
      setEditedQuizTitle('');
    } catch (e) {
      alert('Failed to update quiz title.');
    } finally {
      setSavingQuizTitle(false);
    }
  };

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const fetchedCourses = await CoursesService.getAllCourses();
        setCourses(fetchedCourses);
        // Fetch quizzes for all courses
        const quizzesArr = await Promise.all(
          fetchedCourses.map(course => QuizzesService.getQuizzesByCourse(course.id))
        );
        setQuizzes(quizzesArr.flat());
        setError(null);
      } catch (err) {
        setError('Failed to load quizzes.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary)]">Quizzes</h1>
            <p className="text-gray-600 mt-1">
              Test your knowledge with AI-generated quizzes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={showGenerateWithAiModal} 
              variant="white-outline" 
              disabled={remaining.quizQuestions === 0}
              title={remaining.quizQuestions === 0 ? "You've reached your quiz question limit" : "Generate quiz with AI"}
            >
              Generate with AI 💡
            </Button>
            <Link href="/quizzes/new">
              <Button>Create New Quiz</Button>
            </Link>
          </div>
        </div>
        {remaining.quizQuestions === 0 && (
            <div className="px-4 py-2 w-max mb-4 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
              You have reached your quiz question limit for this billing period. You cannot generate more quiz questions.
            </div>
          )}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading quizzes...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : quizzes.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 flex items-center justify-center text-center p-8">
              <div>
                <div className="text-gray-400 text-4xl mb-2">+</div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--primary)]">Create New Quiz</h3>
                <p className="text-gray-500 mb-4">Generate a quiz from your course materials</p>
                <Link href="/quizzes/new">
                  <Button>Create Quiz</Button>
                </Link>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 flex items-center justify-center text-center p-8">
              <div>
                <div className="text-gray-400 text-4xl mb-2">+</div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--primary)]">Create New Quiz</h3>
                <p className="text-gray-500 mb-4">Generate a quiz from your course materials</p>
                <Link href="/quizzes/new">
                  <Button>Create Quiz</Button>
                </Link>
              </div>
            </Card>
            {quizzes.map(quiz => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow relative">
                <div className="absolute top-3 right-3 flex gap-1 z-10">
                  <button
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Edit quiz"
                    onClick={() => handleEditQuizTitle(quiz)}
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button
                    className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
                    aria-label={`Delete quiz ${quiz.title}`}
                    onClick={() => confirmDeleteQuiz(quiz)}
                    type="button"
                    disabled={deletingQuizId === quiz.id}
                  >
                    {deletingQuizId === quiz.id ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 animate-spin">
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold mr-3">
                    {quiz.title ? quiz.title[0] : 'Q'}
                  </div>
                   {editingQuizId === quiz.id ? (
                    <div className="flex flex-col gap-1 w-full">
                      <input
                        type="text"
                        value={editedQuizTitle}
                        onChange={e => setEditedQuizTitle(e.target.value)}
                        className="border-b border-[var(--primary)] px-2 py-1 text-lg font-semibold focus:outline-none bg-white rounded w-full min-w-[90px]"
                        autoFocus
                      />
                      <span className="text-xs text-gray-500">{courses.find(c => c.id === quiz.courseId)?.name || 'Unknown Course'}</span>
                      <div className="flex gap-1 mt-1">
                        <Button size="sm" variant="primary" onClick={() => handleSaveQuizTitle(quiz)} isLoading={savingQuizTitle}>Save</Button>
                        <Button size="sm" variant="white-outline" onClick={handleCancelEditQuizTitle} disabled={savingQuizTitle}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-[var(--primary)]">{quiz.title}</span>
                      <span className="text-xs text-gray-500">{courses.find(c => c.id === quiz.courseId)?.name || 'Unknown Course'}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>{quiz.questionCount} questions</span>
                  <div className="flex items-center">
                    {quiz.aiGenerated && (
                      <div className="flex items-center gap-1 text-[var(--orange)] bg-[var(--primary-light)] py-0.5 px-1 rounded-full mr-2">
                        <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="48" height="48" fill="white" fillOpacity="0.01"/>
                          <path d="M19.036 44.0001C18.0561 40.8045 16.5778 38.4222 14.6011 36.8532C11.636 34.4997 6.92483 35.9624 5.18458 33.5349C3.44433 31.1073 6.40382 26.6431 7.44234 24.009C8.48086 21.375 3.46179 20.4436 4.04776 19.6958C4.43842 19.1973 6.97471 17.7587 11.6567 15.3801C12.987 7.79346 17.9008 4.00014 26.3982 4.00014C39.1441 4.00014 44 14.8061 44 21.679C44 28.552 38.1201 35.9563 29.7441 37.5528C28.9951 38.6436 30.0754 40.7927 32.9848 44.0001" stroke="#000000" strokeWidth="4.66685" strokeLinecap="round" strokeLinejoin="round"/>
                          <path fillRule="evenodd" clipRule="evenodd" d="M19.4997 14.5C18.8464 17.0342 19.0408 18.8138 20.0829 19.8385C21.125 20.8633 22.9011 21.5334 25.4112 21.8489C24.8417 25.1176 25.5361 26.6511 27.4942 26.4493C29.4524 26.2475 30.6289 25.4338 31.0239 24.0083C34.0842 24.8684 35.7428 24.1486 35.9997 21.8489C36.3852 18.3993 34.525 15.6475 33.7624 15.6475C32.9997 15.6475 31.0239 15.5547 31.0239 14.5C31.0239 13.4452 28.7159 12.8493 26.6329 12.8493C24.5499 12.8493 25.8035 11.4452 22.9432 12C21.0363 12.3698 19.8885 13.2031 19.4997 14.5Z" fill="#FFA07A" stroke="#000000" strokeWidth="4" strokeLinejoin="round"/>
                          <path d="M30.5002 25.5001C29.4833 26.1311 28.0878 27.1804 27.5002 28.0001C26.0313 30.0496 24.8398 31.2975 24.5791 32.6082" stroke="#000000" strokeWidth="4" strokeLinecap="round"/>
                        </svg>
                        <span className="text-xs font-medium">AI Generated</span>
                      </div>
                    )}
                    <span>Last score: {quiz.lastScore != null ? (quiz.lastScore / quiz.questionCount * 100).toFixed(0) + '%' : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex space-x-2">
                    <Link href={`/quizzes/${quiz.id}/take`} className="flex-1">
                      <Button variant="primary" className="w-full">Take Quiz</Button>
                    </Link>
                    <Link href={`/quizzes/${quiz.id}`} className="flex-1">
                      <Button variant="orange" className="w-full">Edit</Button>
                    </Link>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleAskLecsi(quiz)}
                  >
                    Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        {/* Quizzes Generation Modal */}
        <QuizzesGenerationModal 
          isOpen={showGenerationModal} 
          onClose={() => {
            setShowGenerationModal(false);
            fetchQuizzes(); // Refetch decks when modal closes
          }}
          courses={courses}
        />
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirm Quiz Deletion"
          widthClass="max-w-md"
          footer={
            <div className="flex justify-end space-x-2 w-full">
              <Button
                variant="white-outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={!!deletingQuizId}
              >
                Cancel
              </Button>
              <Button
                variant="orange"
                onClick={handleDeleteQuiz}
                isLoading={!!deletingQuizId}
                disabled={!!deletingQuizId}
              >
                Delete
              </Button>
            </div>
          }
        >
          <div className="py-4 text-center">
            {quizToDelete && (
              <>
                <p>Are you sure you want to delete the quiz <span className="text-[var(--primary)] font-semibold">{quizToDelete.title}</span>?</p>
                <p className="text-red-500 font-semibold mt-2">All questions in this quiz will be permanently deleted.</p>
              </>
            )}
          </div>
        </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}

