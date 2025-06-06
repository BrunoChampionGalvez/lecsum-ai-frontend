"use client";

import { MainLayout } from '../ui/MainLayout';
import { CourseDeleteModal } from './CourseDeleteModal';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import Link from 'next/link';
import React from 'react';
import { toast } from 'react-hot-toast';
import { Course, CoursesService, UpdateCourseData } from '../../lib/api/courses.service';
import { useChatContext } from '../../lib/chat/ChatContext';
import { MentionedMaterial } from '../../lib/api/chat.service';

export function CoursesList() {
  const [deletingCourseId, setDeletingCourseId] = React.useState<string | null>(null);
  const { addMaterialToChat, setIsSidebarOpen, setCreateNewSession, hasActiveSession } = useChatContext();

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [selectedCourse, setSelectedCourse] = React.useState<Course | null>(null);

  const handleDeleteCourse = (course: Course) => {
    setSelectedCourse(course);
    setDeleteModalOpen(true);
  };

  const handleCourseDeleted = async () => {
    if (!selectedCourse) return;
    setDeletingCourseId(selectedCourse.id);
    try {
      await CoursesService.deleteCourse(selectedCourse.id);
      setCourses(prev => prev.filter(c => c.id !== selectedCourse.id));
      setDeleteModalOpen(false);
      setSelectedCourse(null);
    } catch (e) {
      toast.error('Failed to delete course.');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const [courses, setCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editedName, setEditedName] = React.useState('');
  const [editedDescription, setEditedDescription] = React.useState('');
  
  const handleAskLecsi = (course: Course) => {
    // Create a material object for the course
    const courseMaterial: MentionedMaterial = {
      id: course.id,
      displayName: course.name.replace(/ /g, '_'),
      type: 'course',
      originalName: course.name,
      courseId: course.id
    };
    
    // Add the course to the chat context (returns true if added, false if already exists)
    const materialAdded = addMaterialToChat(courseMaterial);
    
    // If the course was already in the context, show a message and return early
    if (materialAdded === false) {
      toast.error(`${course.name} is already added to the chat context`);
      // Still ensure the sidebar is open
      setIsSidebarOpen(true);
      return;
    }
    
    // Set flag to create a new session ONLY if there isn't an active one
    if (!hasActiveSession) {
      console.log('No active session found, will create a new one');
      setCreateNewSession(true);
    } else {
      console.log('Using existing active session for course context');
    }
    
    // Show appropriate feedback to the user based on whether we're using an existing session
    if (hasActiveSession) {
      toast.success(`Added ${course.name} to the current chat session`);
    } else {
      toast.success(`Created new chat session with ${course.name}`);
    }
  };

  const handleStartEditing = (course: Course) => {
    setEditingCourseId(course.id);
    setEditedName(course.name);
    setEditedDescription(course.description || '');
  };

  const handleCancelEditing = () => {
    setEditingCourseId(null);
    setEditedName('');
    setEditedDescription('');
  };

  const handleSaveChanges = async (courseId: string) => {
    if (!editedName.trim()) {
      toast.error('Course name cannot be empty');
      return;
    }
    
    try {
      setIsSaving(true);
      const updateData: UpdateCourseData = {
        name: editedName,
        description: editedDescription
      };
      
      await CoursesService.updateCourse(courseId, updateData);
      
      // Update local courses state
      setCourses(prev => prev.map(course => {
        if (course.id === courseId) {
          return {
            ...course,
            name: editedName,
            description: editedDescription
          };
        }
        return course;
      }));
      
      setEditingCourseId(null);
      toast.success('Course updated successfully');
    } catch (err: any) {
      console.error('Error updating course:', err);
      toast.error(err.response?.data?.message || 'Failed to update course');
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        const fetchedCourses = await CoursesService.getAllCourses();
        setCourses(fetchedCourses);
        setError(null);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary)]">Your Courses</h1>
            <p className="text-gray-600 mt-1">
              Manage your courses and study materials
            </p>
          </div>
          <Link href="/courses/new">
            <Button variant="primary">Create New Course</Button>
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">
            <p>{error}</p>
            <Button 
              variant="secondary" 
              className="mt-4" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : courses.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-500 mb-4">You don't have any courses yet.</p>
            <Link href="/courses/new">
              <Button variant="primary">Create Your First Course</Button>
            </Link>
          </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow relative">
                {editingCourseId === course.id ? (
                  <>
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full p-2 text-lg font-semibold mb-2 border-b border-[var(--primary)] focus:outline-none bg-transparent"
                      placeholder="Course name"
                      autoFocus
                    />
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full p-2 text-gray-600 mb-4 border border-gray-200 rounded min-h-[80px] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      placeholder="Course description"
                    />
                    <div className="flex justify-end gap-2 mb-4">
                      <Button 
                        size="sm" 
                        variant="primary"
                        onClick={() => handleSaveChanges(course.id)}
                        isLoading={isSaving}
                      >
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="white-outline"
                        onClick={handleCancelEditing}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-[var(--primary)]">{course.name}</h3>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleStartEditing(course)}
                          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                          aria-label="Edit course"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
                          aria-label="Delete course"
                          onClick={() => handleDeleteCourse(course)}
                          type="button"
                          disabled={deletingCourseId === course.id}
                        >
                          {deletingCourseId === course.id ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 animate-spin">
                              <line x1="12" y1="2" x2="12" y2="6" />
                              <line x1="12" y1="18" x2="12" y2="22" />
                              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                              <line x1="2" y1="12" x2="6" y2="12" />
                              <line x1="18" y1="12" x2="22" y2="12" />
                              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">{course.description || 'No description provided.'}</p>
                  </>
                )}
                <div className="mt-auto pt-4 flex justify-between">
                  <span className="text-sm text-gray-500">
                    {course.files?.length || 0} files
                  </span>
                  <div className="flex gap-2">
                    {!editingCourseId && (
                      <>
                        <Link href={`/courses/${course.id}`}>
                          <Button size="sm" variant="primary">View Course</Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="white-outline"
                          onClick={() => handleAskLecsi(course)}
                        >
                          Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </MainLayout>
      <CourseDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        courseId={selectedCourse?.id || ''}
        courseName={selectedCourse?.name || ''}
        onDeleted={handleCourseDeleted}
      />
    </ProtectedRoute>
  );
}
