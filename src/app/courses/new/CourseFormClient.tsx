'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseForm } from '../../../components/courses/CourseForm';
import { toast } from 'react-hot-toast';
import { CoursesService, CreateCourseData } from '../../../lib/api/courses.service';

export default function CourseFormClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateCourseData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Call the API to create a new course
      await CoursesService.createCourse(data);
      
      // Show success message
      toast.success('Course created successfully!');
      
      // Redirect to courses page on success
      router.push('/courses');
      router.refresh(); // Refresh to update the courses list
    } catch (err: any) {
      console.error('Error creating course:', err);
      setError(err.response?.data?.message || 'Failed to create course. Please try again.');
      toast.error('Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      <CourseForm 
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
