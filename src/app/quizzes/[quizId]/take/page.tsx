"use client";
import { MainLayout } from '../../../../components/ui/MainLayout';
import { Button } from '../../../../components/ui/Button';
import Link from 'next/link';
import React from 'react';
import { useChatContext } from '../../../../lib/chat/ChatContext';
import { toast } from 'react-hot-toast';
import { QuizzesService, Quiz } from '../../../../lib/api/quizzes.service';

export default function TakeQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = React.use(params);
  
  // Get chat context for Ask Lecsi functionality
  const { 
    isSidebarOpen,
    setIsSidebarOpen,
    setCreateNewSession,
    hasActiveSession,
    setInputValueExternal,
    addMaterialToChat
  } = useChatContext();
  
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [current, setCurrent] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<{ questionId: string; answer: string }[]>([]);
  const [score, setScore] = React.useState<number>(0);
  const [finished, setFinished] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchQuiz() {
      setLoading(true);
      try {
        const data = await QuizzesService.getQuizById(quizId);
        setQuiz(data);
        setError(null);
      } catch (err) {
        setError('Failed to load quiz.');
      } finally {
        setLoading(false);
      }
    }
    fetchQuiz();
  }, [quizId]);

  const handleSelect = (choice: string) => setSelected(choice);

  const handleNext = () => {
    if (!quiz || !quiz.questions) return;
    const q = quiz.questions[current];
    setAnswers(prev => [...prev, { questionId: q.id, answer: selected ?? '' }]);
    setSelected(null);
    if (current + 1 < quiz.questions.length) {
      setCurrent(c => c + 1);
    } else {
      handleSubmit([...answers, { questionId: q.id, answer: selected ?? '' }]);
    }
  };

  const handleSubmit = async (allAnswers: { questionId: string; answer: string }[]) => {
    if (!quiz) return;
    try {
      const result = await QuizzesService.submitQuizAnswers(quiz.id, { answers: allAnswers });
      setScore(result.lastScore ?? 0);
      setFinished(true);
    } catch (err) {
      setError('Failed to submit answers.');
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setFinished(false);
  };
  
  // Function to handle Ask Lecsi button click for quiz questions
  const handleAskLecsi = () => {
    if (!quiz || !quiz.questions || current >= quiz.questions.length) return;
    
    const currentQuestion = quiz.questions[current];
    
    // Get all the choices for the question (making sure to include the correct answer)
    const choices = Array.isArray(currentQuestion.options) ? [...currentQuestion.options] : [];
    if (!choices.includes(currentQuestion.correctAnswer)) {
      choices.push(currentQuestion.correctAnswer);
    }
    
    // Construct the message text with numbered choices
    let messageText = `Hi Lecsi! Please consider the following information from a quiz question specifically to respond to this message:

Question: ${currentQuestion.question}

Correct answer: ${currentQuestion.correctAnswer}

Choices:
`;
    
    // Add numbered choices
    choices.forEach((choice, index) => {
      messageText += `${index + 1}. ${choice}\n`;
    });
    
    messageText += '\n';
    
    // Directly set the input value in the chat using the external setter
    // This will trigger auto-scrolling since it's an external change
    setInputValueExternal(messageText);
    
    // Open the chat sidebar
    setIsSidebarOpen(true);
    
    // Ensure there's an active session or create one
    if (!hasActiveSession) {
      setCreateNewSession(true);
    }

    handleAskLecsiQuiz();
    
    // Notify the user
    toast.success('Quiz question added to chat input', {
      duration: 3000,
    });
  };
  
  // Function to handle Ask Lecsi button click for the entire quiz
  const handleAskLecsiQuiz = () => {
    if (!quiz) {
      toast.error('Quiz information not available');
      return;
    }
    
    // Create a material object for the quiz
    const quizMaterial = {
      id: quiz.id,
      displayName: quiz.title.replace(/ /g, '_'),
      type: 'quiz' as 'quiz', // Type assertion to fix TypeScript error
      originalName: quiz.title,
      courseId: quiz.courseId
    };
    
    // Add the quiz to the chat context
    const added = addMaterialToChat(quizMaterial);
    
    // Open the chat sidebar
    setIsSidebarOpen(true);
    
    // Ensure there's an active session or create one
    if (!hasActiveSession) {
      setCreateNewSession(true);
    }
    
    if (added) {
      // Notify the user when successful
      toast.success(`Quiz "${quiz.title}" added to chat context`, {
        duration: 3000,
      });
    } else {
      // Notify if the quiz was already in the context
      toast.success(`Quiz "${quiz.title}" is already in chat context`, {
        duration: 3000,
        icon: '⚠️', // Use a warning icon
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-xl mx-auto mt-10 text-center text-gray-500">Loading quiz...</div>
      </MainLayout>
    );
  }
  if (error) {
    return (
      <MainLayout>
        <div className="max-w-xl mx-auto mt-10 text-center text-red-500">{error}</div>
      </MainLayout>
    );
  }
  if (!quiz || !quiz.questions) {
    return (
      <MainLayout>
        <div className="max-w-xl mx-auto mt-10 text-center text-gray-400">Quiz not found.</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto mt-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            Take Quiz: {quiz.title}
          </h1>
          <Button 
            variant="white-outline"
            className="h-10"
            onClick={handleAskLecsiQuiz}
          >
            Ask Lecsi 💡
          </Button>
        </div>
        {finished ? (
          <div className="text-center">
            <div className="text-lg mb-4">Quiz Finished!</div>
            <div className="text-xl font-bold mb-4">Score: {score} / {quiz.questions.length} ({score ? (score / quiz.questions.length * 100) : 0}%)</div>
            <Button variant="primary" onClick={handleRestart}>Restart</Button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <div className="text-lg font-semibold mb-2">Question {current + 1} of {quiz.questions.length}</div>
              </div>
              <Button
                variant="white-outline"
                className="h-8 text-xs mb-2"
                onClick={handleAskLecsi}
              >
                Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
              </Button>
              <div className="mb-4 text-gray-700">{quiz.questions[current].question}</div>
              <div className="flex flex-col gap-2">
                {(() => {
                  // Ensure the correct answer is present and shuffle options
                  const q = quiz.questions[current];
                  let choices = Array.isArray(q.options) ? [...q.options] : [];
                  if (!choices.includes(q.correctAnswer)) {
                    choices.push(q.correctAnswer);
                  }
                  // Shuffle choices for fairness
                  for (let i = choices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [choices[i], choices[j]] = [choices[j], choices[i]];
                  }
                  return choices.map((choice: string) => (
                    <Button
                      key={choice}
                      variant={selected === choice ? "primary" : "white-outline"}
                      className="w-full"
                      onClick={() => handleSelect(choice)}
                    >
                      {choice}
                    </Button>
                  ));
                })()}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="white-outline"
                className="flex-1"
                onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0}
              >
                Previous
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleNext}
                disabled={selected == null}
              >
                {current + 1 === quiz.questions.length ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        )}
        <div className="mt-8">
          <Link href="/quizzes">
            <Button variant="white-outline">Back to Quizzes</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
