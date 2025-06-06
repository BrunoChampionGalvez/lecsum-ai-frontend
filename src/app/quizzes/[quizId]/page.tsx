"use client";

import { MainLayout } from '../../../components/ui/MainLayout';
import { Button } from '../../../components/ui/Button';
import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';
import { QuizzesService, Quiz } from '../../../lib/api/quizzes.service';
import { useSubscriptionLimits } from '../../../hooks/useSubscriptionLimits';

export default function EditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const router = useRouter();
  const { quizId } = React.use(params);
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [title, setTitle] = React.useState('');
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState('');
  const [savingTitle, setSavingTitle] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === title) {
      setEditingTitle(false);
      setEditedTitle(title);
      return;
    }
    setSavingTitle(true);
    try {
      if (!quiz) throw new Error('Quiz not loaded');
      await QuizzesService.updateQuiz(quizId, {
        ...quiz,
        title: editedTitle,
        questions: (quiz.questions || []).map((origQ, idx) => ({
          ...origQ,
          question: questions[idx]?.question ?? origQ.question,
          correctAnswer: questions[idx]?.answer ?? origQ.correctAnswer,
          options: questions[idx]?.choices ?? origQ.options,
        })),
      });
      setTitle(editedTitle);
      setEditingTitle(false);
    } catch (e) {
      setError('Failed to update title.');
    } finally {
      setSavingTitle(false);
    }
  };


  React.useEffect(() => {
    async function fetchQuiz() {
      setLoading(true);
      try {
        const data = await QuizzesService.getQuizById(quizId);
        setQuiz(data);
        setTitle(data.title || '');
        setEditedTitle(data.title || '');
        setQuestions(
          data.questions?.map(q => ({
            question: q.question,
            answer: q.correctAnswer,
            choices: q.options
          })) || []
        );
        setError(null);
      } catch (err) {
        setError('Failed to load quiz.');
      } finally {
        setLoading(false);
      }
    }
    fetchQuiz();
  }, [quizId]);

  const handleQuestionChange = (idx: number, field: 'question' | 'answer', value: string) => {
    setQuestions(qs => {
      const updated = [...qs];
      updated[idx][field] = value;
      return updated;
    });
  };
  
  const handleChoiceChange = (qIdx: number, cIdx: number, value: string) => {
    setQuestions(qs => {
      const updated = [...qs];
      updated[qIdx].choices[cIdx] = value;
      return updated;
    });
  };
  
  const handleAddChoice = (questionIdx: number) => {
    setQuestions(prevQuestions => {
      const updatedQuestions = [...prevQuestions];
      // Only add if less than 4 choices (to keep max at 5 including correct answer)
      if (updatedQuestions[questionIdx].choices.length < 4) {
        updatedQuestions[questionIdx] = {
          ...updatedQuestions[questionIdx],
          choices: [...updatedQuestions[questionIdx].choices, '']
        };
      }
      return updatedQuestions;
    });
  };
  
  const handleRemoveChoice = (questionIdx: number, choiceIdx: number) => {
    setQuestions(prevQuestions => {
      const updatedQuestions = [...prevQuestions];
      const currentChoices = updatedQuestions[questionIdx].choices;
      
      // We need at least 1 distractor choice (plus the correct answer makes 2 total)
      if (currentChoices.length > 1) {
        updatedQuestions[questionIdx] = {
          ...updatedQuestions[questionIdx],
          choices: currentChoices.filter((_c: string, idx: number) => idx !== choiceIdx)
        };
      }
      return updatedQuestions;
    });
  };
  
  const handleAddQuestion = () => setQuestions(qs => [...qs, { question: '', answer: '', choices: ['', ''] }]);
  const handleRemoveQuestion = (idx: number) => setQuestions(qs => qs.filter((_, i) => i !== idx));
  const handleSave = async () => {
    try {
      setLoading(true);
      // Prepare payload
      if (!quiz) throw new Error('Quiz not loaded');
      const payload = {
        ...quiz,
        title,
        questions: (quiz.questions || []).map((origQ, idx) => ({
          ...origQ,
          question: questions[idx]?.question ?? origQ.question,
          correctAnswer: questions[idx]?.answer ?? origQ.correctAnswer,
          options: questions[idx]?.choices ?? origQ.options,
        })),
      };
      await QuizzesService.updateQuiz(quizId, payload);
      setError(null);
      router.push('/quizzes');
    } catch (err) {
      setError('Failed to save quiz.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <MainLayout>
      {/* Subscription limit warning for quiz questions */}
      {(() => {
        const { remaining } = useSubscriptionLimits();
        const questionsLeft = Math.max(remaining.quizQuestions - questions.length, 0);
        if (questionsLeft === 0) {
          return (
            <div className="px-4 py-2 mb-4 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
              You have reached your quiz question limit for this billing period. You cannot add more questions.
            </div>
          );
        }
        if (questionsLeft <= 3) {
          return (
            <div className="px-4 py-2 mb-4 text-sm text-yellow-800 bg-yellow-50 rounded-md border border-yellow-200">
              You can only add {questionsLeft} more question{questionsLeft === 1 ? '' : 's'}.
            </div>
          );
        }
        return null;
      })()}
      <div className="max-w-2xl mx-auto mt-12 p-2 md:p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-2 max-w-[calc(100%-12rem)]">
             {editingTitle ? (
               <>
                 <input
                   type="text"
                   value={editedTitle}
                   onChange={e => setEditedTitle(e.target.value)}
                   className="text-2xl font-bold border-b border-[var(--primary)] focus:outline-none bg-transparent px-1 py-0.5 w-auto min-w-[120px]"
                   autoFocus
                 />
                 <Button size="sm" variant="primary" className="ml-1" onClick={handleSaveTitle} isLoading={savingTitle}>Save</Button>
                 <Button size="sm" variant="secondary" className="ml-1" onClick={() => { setEditingTitle(false); setEditedTitle(title); }}>Cancel</Button>
               </>
             ) : (
               <>
                 <h1 className="text-2xl font-bold text-[var(--primary)] mr-1">{title}</h1>
                 <button
                   type="button"
                   className="text-gray-400 hover:text-[var(--primary)] p-1"
                   aria-label="Edit title"
                   onClick={() => setEditingTitle(true)}
                 >
                   {/* Edit Icon SVG from Courses cards */}
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                     <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                     <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                   </svg>
                 </button>
               </>
             )}
           </div>
           <Button 
             variant="white-outline" 
             className="text-sm border border-[var(--primary)]" 
             onClick={() => { alert('Lecsi AI assistance would appear here') }}
           >
             Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
           </Button>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-8 mb-10">
            {questions.map((q, idx) => (
              <div key={idx} className="p-6 border rounded-lg bg-gray-50 mb-6 flex flex-col gap-4 shadow-sm">
                <div className="text-lg font-semibold">Question {idx + 1}</div>
                <div className="flex gap-3 items-start mb-3">
                  <input
                    type="text"
                    value={q.question}
                    onChange={e => handleQuestionChange(idx, 'question', e.target.value)}
                    placeholder="Question"
                    className="flex-1 border rounded px-3 py-2 text-gray-700 bg-white"
                    required
                  />
                  <Button variant="outline" type="button" onClick={() => handleRemoveQuestion(idx)}>-</Button>
                </div>
                <div className="flex flex-col space-y-3 w-full">
                  <div className="relative group w-full">
                    <div className="font-medium text-sm mb-1 text-gray-700">Correct Answer:</div>
                    <input
                      type="text"
                      value={q.answer}
                      onChange={e => handleQuestionChange(idx, 'answer', e.target.value)}
                      placeholder="Correct Answer"
                      className="w-full border rounded px-3 py-2 text-gray-700 bg-white pr-8 focus:ring-2 focus:ring-[var(--primary)]"
                      required
                    />
                  </div>
                  
                  <div className="font-medium text-sm mb-1 text-gray-700">Other Choices:</div>
                  
                  {q.choices.map((c: string, cIdx: number) => (
                    <div key={cIdx} className="relative group w-full flex items-center">
                      <input
                        type="text"
                        value={c}
                        onChange={e => handleChoiceChange(idx, cIdx, e.target.value)}
                        placeholder={`Choice ${cIdx + 2}`}
                        className="w-full border rounded px-3 py-2 text-gray-700 bg-white pr-8 focus:ring-2 focus:ring-[var(--primary)]"
                        required
                      />
                      {/* Show delete button on hover/focus */}
                      {q.choices.length >= 2 && (
                        <button
                          type="button"
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity px-1"
                          title="Remove choice"
                          onClick={e => {
                            e.preventDefault();
                            handleRemoveChoice(idx, cIdx);
                          }}
                          tabIndex={-1}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {/* Add button at the bottom, if less than 4 distractors (5 total choices) */}
                  {q.choices.length < 4 && (
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 px-4"
                        onClick={e => {
                          e.preventDefault();
                          handleAddChoice(idx);
                        }}
                      >
                        Add Choice +
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(() => {
              const { remaining } = useSubscriptionLimits();
              const questionsLeft = Math.max(remaining.quizQuestions - questions.length, 0);
              return (
                <Button type="button" variant="secondary" onClick={handleAddQuestion} disabled={questionsLeft === 0}>Add Question +</Button>
              );
            })()}
            {(() => {
              const { remaining } = useSubscriptionLimits();
              const questionsLeft = Math.max(remaining.quizQuestions - questions.length, 0);
              return (
                <Button type="submit" variant="primary" isLoading={loading} disabled={questionsLeft === 0}>Save</Button>
              );
            })()}
          </div>
        </form>
        <div className="flex justify-center">
          <Link href="/quizzes">
            <Button variant="outline">Back to Quizzes</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
