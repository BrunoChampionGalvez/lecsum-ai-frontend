import React from 'react';
import Link from 'next/link';
import { Quiz } from '../../lib/api/quizzes.service';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface QuizCardProps {
  quiz: Quiz;
}

export const QuizCard: React.FC<QuizCardProps> = ({ quiz }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to determine badge color based on score
  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'cyan';
    if (score >= 60) return 'orange';
    return 'primary';
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="mb-2 flex justify-between items-start">
        <h3 className="text-lg font-semibold text-primary">{quiz.title}</h3>
        <Badge 
          variant={
            quiz.difficulty === 'easy' 
              ? 'cyan' 
              : quiz.difficulty === 'moderate' 
                ? 'orange' 
                : 'primary'
          }
        >
          {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
        </Badge>
      </div>
      
      <div className="mb-4 flex-grow">
        <div className="text-sm text-gray-600">
          <div className="mt-2">Questions: {quiz.questionCount}</div>
          <div className="mt-1">Created: {formatDate(quiz.createdAt)}</div>
          
          {quiz.completed && quiz.lastScore !== undefined && (
            <div className="mt-3 flex items-center">
              <span className="mr-2">Score:</span>
              <Badge variant={getScoreBadgeColor(quiz.lastScore)}>
                {quiz.lastScore.toFixed(0)}%
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-auto">
        <Link href={`/quizzes/${quiz.id}`}>
          <Button className="w-full">
            {quiz.completed ? 'Review Quiz' : 'Take Quiz'}
          </Button>
        </Link>
      </div>
    </Card>
  );
};
