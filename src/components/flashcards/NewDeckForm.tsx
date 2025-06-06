"use client";

import React from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DecksService } from '../../lib/api/decks.service';
import { useSubscriptionLimits } from '../../hooks/useSubscriptionLimits';

import { CoursesService, Course } from '../../lib/api/courses.service';

export function NewDeckForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [courseId, setCourseId] = React.useState('');
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [loadingCourses, setLoadingCourses] = React.useState(true);
  
  // Get subscription limits
  const { 
    canCreateFlashcards, 
    remaining,
    isActive,
    refresh: refreshSubscriptionLimits 
  } = useSubscriptionLimits();

  React.useEffect(() => {
    CoursesService.getAllCourses()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate subscription limits
    if (!canCreateFlashcards) {
      toast.error('You have reached your flashcard generation limit for this billing period.');
      return;
    }
    
    // Check if subscription is active
    if (!isActive) {
      toast.error('Your subscription is inactive. Please renew to continue using this feature.');
      return;
    }
    
    if (!name.trim()) {
      toast.error('Please enter a deck name');
      return;
    }
    if (!courseId) {
      toast.error('Please select a course for this deck');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const newDeck = await DecksService.create({
        name: name.trim(),
        description: description.trim(),
        courseId
      });
      
      toast.success('Deck created successfully!');
      router.push(`/flashcards/${newDeck.id}/edit`);
      
      // Refresh subscription limits after successful creation
      refreshSubscriptionLimits();
    } catch (err: any) {
      console.error('Error creating deck:', err);
      toast.error(err.response?.data?.message || 'Failed to create deck');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold text-[var(--primary)] mb-6">Create New Flashcard Deck</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Deck Name*
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="e.g., Biology Terms"
            required
            disabled={disabled}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
            Course*
          </label>
          <select
            id="course"
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            required
            disabled={loadingCourses || disabled}
          >
            <option value="">{loadingCourses ? 'Loading courses...' : 'Select a course'}</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="Briefly describe what this deck is for..."
            disabled={disabled}
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="orange"
            onClick={() => router.push('/flashcards')}
            disabled={isSubmitting || disabled}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={disabled}>
            Create Deck
          </Button>
        </div>
      </form>
    </Card>
  );
}
