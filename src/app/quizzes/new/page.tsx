"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from '../../../components/ui/MainLayout';
import { Button } from '../../../components/ui/Button';
import Link from 'next/link';
import { QuizzesService } from '../../../lib/api/quizzes.service';
import { useSubscriptionLimits } from '../../../hooks/useSubscriptionLimits';
import { toast } from 'react-hot-toast';
import { AxiosError } from 'axios';

import { CoursesService, Course } from '../../../lib/api/courses.service';

interface QuizQuestion {
  question: string;
  answer: string;
  choices: string[];
}

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([{ question: "", answer: "", choices: ["", ""] }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  
  // Get subscription limits
  const { 
    canCreateQuizQuestions, 
    remaining,
    isActive,
    refresh: refreshSubscriptionLimits 
  } = useSubscriptionLimits();

  // Fetch courses on mount
  useEffect(() => {
    CoursesService.getAllCourses().then(setCourses);
  }, []);

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

  const handleCreate = async () => {
    // Validate subscription limits
    if (!canCreateQuizQuestions) {
      toast.error('You have reached your quiz question generation limit for this billing period.');
      return;
    }
    
    // Check if subscription is active
    if (!isActive) {
      toast.error('Your subscription is inactive. Please renew to continue using this feature.');
      return;
    }
    
    if (!title.trim()) {
      setError('Please enter a title for your quiz');
      return;
    }
    if (!courseId) {
      setError('Please select a course.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const payload = {
        title,
        courseId,
        questions: questions.map(q => ({
          question: q.question,
          correctAnswer: q.answer,
          options: q.choices,
        })),
      };
      const quiz = await QuizzesService.createQuiz(payload); // POST to /quizzes
      // Navigate to the take quiz page
      router.push(`/quizzes/${quiz.id}/take`);
      
      // Refresh subscription limits after successful creation
      refreshSubscriptionLimits();
    } catch (error: unknown) {
      console.error('Failed to create quiz:', error);
      if (error instanceof AxiosError && error.response?.data?.message) {
        toast.error(error.response.data.message);
        setError(error.response.data.message);
      } else if (error instanceof Error) {
        toast.error(error.message || 'Failed to create quiz.');
        setError(error.message || 'Failed to create quiz.');
      } else {
        toast.error('An unknown error occurred while creating the quiz.');
        setError('An unknown error occurred while creating the quiz.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto mt-12 p-2 md:p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--primary)]">Create New Quiz</h1>
        </div>
           {/* Subscription limit warning for quiz questions */}
           {(() => {
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
           <form onSubmit={e => { e.preventDefault(); handleCreate(); }}>
          <div className="mb-6">
            <label className="block font-medium mb-2">Course</label>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-gray-700 bg-white mb-4"
              required
            >
              <option value="" disabled>Select a course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
            <label className="block font-medium mb-2">Quiz Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border rounded px-3 py-2 text-gray-700 bg-white"
              placeholder="Enter quiz title"
              required
            />
          </div>
          <div className="space-y-8 mb-10">
            {questions.map((q, idx) => (
              <div key={idx} className="p-6 border rounded-lg bg-gray-50 mb-6 flex flex-col gap-4 shadow-sm">
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
                  {q.choices.length < 4 && (
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="white-outline"
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
          </div>
          <div className="flex flex-wrap gap-4 mb-12 justify-center">
            {(() => {
            const questionsLeft = Math.max(remaining.quizQuestions - questions.length, 0);
            return (
              <Button type="button" variant="secondary" onClick={handleAddQuestion} disabled={questionsLeft === 0}>Add Question +</Button>
            );
          })()}
            {(() => {
          const questionsLeft = Math.max(remaining.quizQuestions - questions.length, 0);
          return (
            <Button type="submit" variant="primary" isLoading={loading} disabled={questionsLeft === 0}>Create Quiz</Button>
          );
        })()}
          </div>
        </form>
        {error && <div className="text-center text-red-500 mb-4">{error}</div>}
        <div className="flex justify-center">
          <Link href="/quizzes">
            <Button variant="outline">Back to Quizzes</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
