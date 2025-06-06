import React from 'react';
import { QuizQuestion as QuizQuestionType } from '../../lib/api/quizzes.service';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  isReview: boolean;
  onSelectAnswer: (answer: string) => void;
  onShowSource?: (fileId: string, excerpt: string) => void;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  isReview,
  onSelectAnswer,
  onShowSource,
}) => {
  const handleShowSource = () => {
    if (question.sourceMaterial && onShowSource) {
      onShowSource(
        question.sourceMaterial.fileId,
        question.sourceMaterial.excerpt
      );
    }
  };

  const getOptionClassName = (option: string) => {
    const baseClass = 'p-3 border rounded-md mb-2 cursor-pointer transition-colors';
    
    if (!isReview) {
      // When taking the quiz
      return `${baseClass} ${
        selectedAnswer === option
          ? 'border-primary bg-sky-light'
          : 'border-gray-200 hover:border-primary'
      }`;
    } else {
      // Review mode - show correct/incorrect
      if (option === question.correctAnswer) {
        return `${baseClass} border-cyan bg-cyan bg-opacity-10`;
      } else if (selectedAnswer === option && option !== question.correctAnswer) {
        return `${baseClass} border-red bg-red bg-opacity-10`;
      } else {
        return `${baseClass} border-gray-200`;
      }
    }
  };

  return (
    <Card className="mb-6">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-500">
          Question {questionNumber} of {totalQuestions}
        </h3>
        
        {isReview && question.isCorrect !== undefined && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            question.isCorrect ? 'bg-cyan text-white' : 'bg-red text-white'
          }`}>
            {question.isCorrect ? 'Correct' : 'Incorrect'}
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <p className="text-lg font-medium text-primary">{question.question}</p>
      </div>
      
      <div className="mb-6">
        {question.options.map((option, index) => (
          <div
            key={index}
            className={getOptionClassName(option)}
            onClick={() => !isReview && onSelectAnswer(option)}
          >
            <div className="flex items-start">
              <div className="mr-2 mt-0.5">
                <div className="h-5 w-5 rounded-full border border-gray-400 flex items-center justify-center">
                  {['A', 'B', 'C', 'D'][index]}
                </div>
              </div>
              <div>{option}</div>
            </div>
          </div>
        ))}
      </div>
      
      {isReview && (
        <div className="mb-4">
          <h4 className="font-medium text-primary mb-2">Correct Answer:</h4>
          <p>{question.correctAnswer}</p>
        </div>
      )}
      
      {question.sourceMaterial && (
        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={handleShowSource}
          >
            View Source
          </Button>
        </div>
      )}
    </Card>
  );
};
