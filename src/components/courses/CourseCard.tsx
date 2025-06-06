import React from 'react';
import Link from 'next/link';
import { Course } from '../../lib/api/courses.service';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface CourseCardProps {
  course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const fileCount = course.files?.length || 0;
  const quizCount = course.quizzes?.length || 0;
  const flashcardCount = course.flashcards?.length || 0;

  return (
    <Link href={`/courses/${course.id}`} className="block transition-transform hover:scale-[1.02]">
      <Card className="h-full flex flex-col">
        <div className="mb-2 flex justify-between items-start">
          <h3 className="text-lg font-semibold text-primary">{course.name}</h3>
          {course.isArchived && <Badge variant="gray">Archived</Badge>}
        </div>
        
        <p className="text-gray-600 text-sm mb-4 flex-grow">
          {course.description || 'No description provided.'}
        </p>
        
        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          <Badge variant="orange">
            {fileCount} {fileCount === 1 ? 'File' : 'Files'}
          </Badge>
          <Badge variant="cyan">
            {quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}
          </Badge>
          <Badge variant="primary">
            {flashcardCount} {flashcardCount === 1 ? 'Flashcard' : 'Flashcards'}
          </Badge>
        </div>
        
        <div className="mt-3 text-xs text-gray-500">
          Created: {new Date(course.createdAt).toLocaleDateString()}
        </div>
      </Card>
    </Link>
  );
};
