"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { MainLayout } from '../../../../components/ui/MainLayout';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { ProtectedRoute } from '../../../../components/auth/ProtectedRoute';
import { CourseForm } from '../../../../components/courses/CourseForm';
import { Course, CoursesService, UpdateCourseData } from '../../../../lib/api/courses.service';
import { AxiosError } from 'axios';

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    async function fetchCourse() {
      try {
        setLoading(true);
        const fetchedCourse = await CoursesService.getCourseById(id);
        setCourse(fetchedCourse);
        document.title = `Edit ${fetchedCourse.name} | LecSum AI`;
      } catch (err: unknown) {
        console.error('Error fetching course:', err);
        if (err instanceof AxiosError && err.response?.data?.message) {
          setError(err.response.data.message);
        } else if (err instanceof Error) {
          setError(err.message || 'Failed to load course');
        } else {
          setError('Failed to load course');
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchCourse();
  }, [id]);
  
  const handleSubmit = async (data: UpdateCourseData) => {
    try {
      setIsSubmitting(true);
      await CoursesService.updateCourse(id, data);
      toast.success('Course updated successfully!');
      router.push(`/courses/${id}`);
      router.refresh();
    } catch (err: unknown) {
      console.error('Error updating course:', err);
      if (err instanceof AxiosError && err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err instanceof Error) {
        toast.error(err.message || 'Failed to update course');
      } else {
        toast.error('Failed to update course');
      }
      throw err; // Let the form component handle the error
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    router.back();
  };
  
  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }
  
  if (error || !course) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-red-500 text-xl font-semibold mb-4">
              {error || 'Course not found'}
            </div>
            <Link href="/courses">
              <Button variant="primary">Back to Courses</Button>
            </Link>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }
  
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="mb-6 flex items-center">
          <Link href={`/courses/${id}`}>
            <Button variant="secondary" className="mr-4">
              ← Back to Course
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Edit Course</h1>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-[var(--primary)] mb-4">Course Details</h2>
          
          <CourseForm 
            initialData={course}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </Card>
      </MainLayout>
    </ProtectedRoute>
  );
}
