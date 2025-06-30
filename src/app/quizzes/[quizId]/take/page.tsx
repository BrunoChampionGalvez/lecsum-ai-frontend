"use client";
import { MainLayout } from '../../../../components/ui/MainLayout';
import { Button } from '../../../../components/ui/Button';
import Link from 'next/link';
import React from 'react';
import { useChatContext } from '../../../../lib/chat/ChatContext';
import { toast } from 'react-hot-toast';
import { QuizzesService, Quiz } from '../../../../lib/api/quizzes.service';
import { AxiosError } from 'axios';
import confetti from 'canvas-confetti';

// Updated CSS for animations and feedback effects - using more visible colors
const answerStyles = {
  correctAnswer: '!bg-green-200 !border-green-500',
  incorrectAnswer: '!bg-red-200 !border-red-500',
  wrongAnimation: 'wrong-shake',
  answerIcon: 'absolute inset-0 flex items-center justify-center pointer-events-none text-3xl',
  checkmarkAnimation: 'checkmark-animation',
};

// Animation keyframes with improved settings - make wrong-shake animation more pronounced and faster
const keyframes = `
  @keyframes checkmark-animation {
    0% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(1.5); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes wrong-shake {
    0% { transform: translateX(0); }
    15% { transform: translateX(10px); }
    30% { transform: translateX(-10px); }
    45% { transform: translateX(10px); }
    60% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
    90% { transform: translateX(-5px); }
    100% { transform: translateX(0); }
  }
`;

// Update the circle animation to use a more accurate calculation
const circleAnimation = `
  @keyframes grow-progress {
    from { 
      stroke-dasharray: 0 283; 
      stroke-dashoffset: 283;
    }
    to { 
      stroke-dasharray: var(--score-percent) 283; 
      stroke-dashoffset: 283;
    }
  }
`;

// Define an interface for storing question state
interface QuestionState {
  questionId: string;
  selected: string | null;
  answerRevealed: boolean;
  isWrong: boolean;
}

export default function TakeQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = React.use(params);
  
  // Get chat context for Ask Lecsi functionality
  const { 
    setIsSidebarOpen,
    setCreateNewSession,
    hasActiveSession,
    setInputValueExternal,
    addMaterialToChat
  } = useChatContext();
  
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [current, setCurrent] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [score, setScore] = React.useState<number>(0);
  const [finished, setFinished] = React.useState(false);
  // New state variables for feedback effects
  const [answerRevealed, setAnswerRevealed] = React.useState(false);
  // New state to track question responses (for memory between navigation)
  const [questionStates, setQuestionStates] = React.useState<QuestionState[]>([]);
  // Add state for confetti
  // Add window dimensions for confetti

  // Memoized shuffled choices for current question
  const shuffledChoices = React.useMemo(() => {
    if (!quiz?.questions || current >= quiz.questions.length) return [];
    
    const q = quiz.questions[current];
    const choices = Array.isArray(q.options) ? [...q.options] : [];
    if (!choices.includes(q.correctAnswer)) {
      choices.push(q.correctAnswer);
    }
    // Shuffle choices for fairness - but only when current question changes
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
  }, [current, quiz?.questions]);

  React.useEffect(() => {
    async function fetchQuiz() {
      try {
        const data = await QuizzesService.getQuizById(quizId);
        setQuiz(data);
      } catch (error: unknown) {
        let errorMessage = 'Failed to load quiz.';
        if (error instanceof AxiosError && error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        toast.error(errorMessage);
        console.error('Failed to load quiz:', error);
      } finally {
      }
    }
    fetchQuiz();
  }, [quizId]);

  // Effect to load previously answered question state when navigating
  React.useEffect(() => {
    if (!quiz?.questions || quiz.questions.length === 0) return;
    
    const currentQuestion = quiz.questions[current];
    const existingState = questionStates.find(
      state => state.questionId === currentQuestion.id
    );
    
    if (existingState) {
      // Restore previous answer state
      setSelected(existingState.selected);
      setAnswerRevealed(existingState.answerRevealed);
    } else {
      // Reset state for new questions
      setAnswerRevealed(false);
      setSelected(null);
    }
  }, [current, quiz?.questions, questionStates]);

  // Modify handleSelect to ensure we get immediate visual feedback
  const handleSelect = (choice: string) => {
    if (answerRevealed) return; // Prevent selection after answer is revealed
    
    setSelected(choice);
    setAnswerRevealed(true);
    
    // Check if choice is correct
    if (quiz?.questions && current < quiz.questions.length) {
      const currentQuestion = quiz.questions[current];
      const isCorrect = choice === currentQuestion.correctAnswer;
      
      // Store the answer state for this question
      setQuestionStates(prevStates => {
        // Remove previous state for this question if it exists
        const filteredStates = prevStates.filter(
          state => state.questionId !== currentQuestion.id
        );
        
        // Add the new state
        return [
          ...filteredStates,
          {
            questionId: currentQuestion.id,
            selected: choice,
            answerRevealed: true,
            isWrong: !isCorrect
          }
        ];
      });
      
      // Add a small delay to make the feedback more noticeable
      setTimeout(() => {
        // This is just to trigger a re-render and ensure animations play properly
        setAnswerRevealed(true);
      }, 50);
    }
  };

  const handleNext = () => {
    if (!quiz || !quiz.questions || !answerRevealed) return;
    
    if (current + 1 < quiz.questions.length) {
      setCurrent(c => c + 1);
    } else {
      // Get all answers, including any that might have been updated
      const allAnswers = questionStates.map(state => ({
        questionId: state.questionId,
        answer: state.selected ?? ''
      }));
      
      handleSubmit(allAnswers);
    }
  };

  const handleSubmit = async (allAnswers: { questionId: string; answer: string }[]) => {
    if (!quiz) return;
    try {
      // Ensure all answers are provided
      if (allAnswers.length !== quiz.questions?.length) {
        toast.error('Please answer all questions before submitting.');
        return;
      }
      const result = await QuizzesService.submitQuizAnswers(quiz.id, { answers: allAnswers });
      // Set score first, then set finished flag
      setScore(result.lastScore ?? 0);
      setFinished(true); // This will trigger the effect above
      
      // Log the result for debugging
      console.log('Quiz submitted:', result);
      console.log('Score:', result.lastScore, 'of', quiz.questions?.length);
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

  const handleRestart = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setAnswerRevealed(false);
    setQuestionStates([]); // Clear all stored question states
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
      type: 'quiz' as const, // Use const assertion
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

  // Calculate correct answers so far
  const correctCount = React.useMemo(() => {
    if (!quiz?.questions) return 0;
    return questionStates.reduce((acc, state) => {
      const q = quiz.questions?.find(q => q.id === state.questionId);
      if (q && state.selected === q.correctAnswer) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [questionStates, quiz?.questions]);

  const answeredCount = questionStates.length;
  const percent = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  
  // Function to get performance message based on score percentage
  const getPerformanceMessage = () => {
    if (!quiz?.questions) return '';
    const percentage = (score / quiz.questions.length) * 100;
    
    if (percentage >= 90) return 'Excellent job! 🏆';
    if (percentage >= 75) return 'Great work! 👏';
    if (percentage >= 60) return 'Good effort! 👍';
    if (percentage >= 40) return 'Keep practicing! 📚';
    return 'Don\'t give up! 💪';
  };

  // The main problem is in the useEffect that handles confetti
  // Let's replace it with a better implementation
  React.useEffect(() => {
    // Only trigger confetti when the quiz is finished and score is set
    if (finished && quiz?.questions) {
      const scorePercentage = Math.round((score / quiz.questions.length) * 100);
      console.log('Quiz finished with score:', scorePercentage, '%');
      
      if (scorePercentage >= 80) {
        console.log('Triggering confetti!');
        // Add small delay to ensure DOM is ready
        setTimeout(() => {
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6, x: 0.5 },
            colors: ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3'],
            zIndex: 9999,
            disableForReducedMotion: true
          });
          
          // Create another burst after a short delay for more impact
          setTimeout(() => {
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.5, x: 0.3 },
              zIndex: 9999
            });
            
            confetti({
              particleCount: 150, 
              spread: 80,
              origin: { y: 0.5, x: 0.7 },
              zIndex: 9999
            });
          }, 300);
        }, 100);
        
      }
    }
  }, [finished, score, quiz?.questions]); // Important: Include finished and score in dependencies

  // Function to get color based on score percentage
  const getScoreColor = (percent: number) => {
    if (percent >= 80.01) return '#22c55e'; // Green
    if (percent >= 60.01) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  // Update the results display to trigger confetti with a button if needed
  return (
    <MainLayout>
      {/* Add keyframes for animations - make sure they're globally applied */}
      <style jsx global>{`
        ${keyframes}
        ${circleAnimation}
        
        /* Ensure these classes have higher specificity */
        .checkmark-animation {
          animation: checkmark-animation 0.6s forwards;
        }
        
        .wrong-shake {
          animation: wrong-shake 0.5s cubic-bezier(.36,.07,.19,.97) both !important; /* Reduced from 0.8s to 0.5s */
          transform-origin: center;
          backface-visibility: hidden;
          perspective: 1000px;
        }
      `}</style>
      
      <div className="max-w-xl mx-auto mt-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            Take Quiz: {quiz?.title}
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
          <div className="text-center bg-white p-8 rounded-lg shadow-lg transition-all duration-500 ease-in-out">
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
              <p className="text-2xl font-semibold text-[var(--primary)]">
                {getPerformanceMessage()}
              </p>
            </div>
            
            {/* Improved SVG Score Circle */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-48">
                {quiz?.questions && (
                  <>
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
                      
                      {/* Animated progress circle */}
                      {(() => {
                        const scorePercent = (score / quiz.questions.length) * 100;
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
                        {Math.round((score / quiz.questions.length) * 100)}%
                      </div>
                      <div className="text-sm font-medium text-gray-600 mt-1">
                        {score} / {quiz.questions.length}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="primary" 
                className="text-lg py-3 px-8"
                onClick={handleRestart}
              >
                Try Again
              </Button>
              <Link href="/quizzes">
                <Button 
                  variant="white-outline"
                  className="text-lg py-3 px-8"
                >
                  Back to Quizzes
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <div className="text-xl font-semibold mb-2">Question {current + 1} of {quiz?.questions ? quiz.questions.length : 0}</div>
                <div>
                  <span>
                    {/* Add correct/answered fraction and percentage */}
                    <div className="mb-2 text-right text-xl text-gray-700 font-medium">
                      {answeredCount > 0
                        ? <>Correct: {correctCount} / {answeredCount} ({percent}%)</>
                        : <>No questions answered yet</>
                      }
                    </div>
                  </span>
                </div>
              </div>
              <Button
                variant="white-outline"
                className="h-8 text-xs mb-2"
                onClick={handleAskLecsi}
              >
                Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
              </Button>
              <div className="mb-4 text-gray-700">{quiz?.questions ? quiz.questions[current].question : 'No question found'}</div>
              <div className="flex flex-col gap-2">
                {shuffledChoices.map((choice: string) => {
                  const isSelected = selected === choice;
                  const isCorrect = quiz?.questions ? choice === quiz.questions[current].correctAnswer : false;
                  
                  // Enhanced button styling based on answer status
                  let buttonClassNames = "w-full transition-all duration-300";
                  
                  // Only apply feedback styles when answer is revealed
                  if (answerRevealed) {
                    if (isCorrect) {
                      buttonClassNames += ` ${answerStyles.correctAnswer}`;
                    } else if (isSelected) {
                      // Apply the wrong animation directly to the button for incorrect selections
                      buttonClassNames += ` ${answerStyles.incorrectAnswer} ${isSelected && !isCorrect ? answerStyles.wrongAnimation : ''}`;
                    } else {
                      buttonClassNames += ` ${answerStyles.incorrectAnswer}`;
                    }
                  }
                  
                  return (
                    <div key={`${choice}-${current}`} className="relative">
                      <Button
                        variant={isSelected && !answerRevealed ? "primary" : "white-outline"}
                        className={buttonClassNames}
                        onClick={() => handleSelect(choice)}
                        disabled={answerRevealed}
                        style={{ position: 'relative', zIndex: 1 }} // Ensure proper z-index
                      >
                        {choice}
                      </Button>
                      
                      {/* Improved icon display */}
                      {answerRevealed && (
                        <div className={answerStyles.answerIcon}>
                          {isCorrect ? (
                            <span className={`text-green-600 ${isSelected ? answerStyles.checkmarkAnimation : ""}`}>
                              ✓
                            </span>
                          ) : (
                            <span className="text-red-600">
                              ✗
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                disabled={!answerRevealed}
              >
                {current + 1 === (quiz?.questions ? quiz.questions.length : 0) ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        )}
        {!finished && (
          <div className="mt-8">
            <Link href="/quizzes">
              <Button variant="white-outline">Back to Quizzes</Button>
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}