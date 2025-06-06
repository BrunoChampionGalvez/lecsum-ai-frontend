"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { MainLayout } from '../../../components/ui/MainLayout';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';

import { FolderTreeSkeleton } from '@/components/files/FolderTree';
import { CourseDeleteModal } from '../../../components/courses/CourseDeleteModal';
import { FlashcardGenerationModal } from '../../../components/flashcards/FlashcardGenerationModal';
import { QuizzesGenerationModal } from '../../../components/quizzes/QuizzesGenerationModal';
import { APIFile, Folder } from '@/lib/api/types';
import { CoursesService } from '@/lib/api/courses.service';
import { Course, UpdateCourseData } from '../../../lib/api/courses.service';
import { CourseFiles } from '../../../components/courses/CourseFiles';
import { useChatContext } from '@/lib/chat/ChatContext';
import { AxiosError } from 'axios';
import { MentionedMaterial } from '@/lib/api/chat.service';
import { FilesService } from '@/lib/api';
import { FoldersService } from '@/lib/api/folders.service';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  // Get chat context for Ask Lecsi functionality
  const { 
    addMaterialToChat, 
    setIsSidebarOpen, 
    setCreateNewSession, 
    hasActiveSession 
  } = useChatContext();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [folderTreeReady, setFolderTreeReady] = useState(false);
  const [files, setFiles] = useState<APIFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showGenerationFlashcardsModal, setShowGenerationFlashcardsModal] = React.useState(false);
  const [showGenerationQuizzesModal, setShowGenerationQuizzesModal] = React.useState(false);
  
  useEffect(() => {
    async function fetchCourse() {
      try {
        setLoading(true);
        const fetchedCourse = await CoursesService.getCourseById(id);
        setCourse(fetchedCourse);
        setEditedName(fetchedCourse.name);
        setEditedDescription(fetchedCourse.description || '');
        document.title = `${fetchedCourse.name} | LecSum AI`;
      } catch (err: unknown) {
        console.error('Error fetching course:', err);
        if (err instanceof AxiosError && err.response?.data?.message) {
          setError(err.response.data.message);
        } else if (err instanceof Error) {
          setError(err.message || 'Failed to load course details');
        } else {
          setError('Failed to load course details');
        }
        document.title = 'Course Not Found | LecSum AI';
      } finally {
        setLoading(false);
      }
    }
    
    fetchCourse();
  }, [id]);

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };
  
  const handleCourseDeleted = async () => {
    try {
      setIsDeleting(true);
      await CoursesService.deleteCourse(id);
      toast.success('Course deleted successfully');
      router.push('/courses');
      router.refresh();
    } catch (err: unknown) {
      console.error('Error deleting course:', err);
      if (err instanceof AxiosError && err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err instanceof Error) {
        toast.error(err.message || 'Failed to delete course');
      } else {
        toast.error('Failed to delete course');
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    // Reset to original values
    if (course) {
      setEditedName(course.name);
      setEditedDescription(course.description || '');
    }
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!course) return;
    
    try {
      setIsSaving(true);
      const updateData: UpdateCourseData = {
        name: editedName,
        description: editedDescription
      };
      
      await CoursesService.updateCourse(id, updateData);
      
      // Update local course state with new values
      setCourse({
        ...course,
        name: editedName,
        description: editedDescription
      });
      
      setIsEditing(false);
      toast.success('Course updated successfully');
    } catch (err: unknown) {
      console.error('Error updating course:', err);
      if (err instanceof AxiosError && err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err instanceof Error) {
        toast.error(err.message || 'Failed to update course');
      } else {
        toast.error('Failed to update course');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFolderTreeReady(false);
    try {
      // Fetch all files for this course
      const filesData = await FilesService.getFilesByCourse(id);
      // Convert AppFile to APIFile while preserving the original folderId
      // Convert null to undefined to match the APIFile type
      const apiFiles = filesData.map(file => ({
        id: file.id,
        name: file.name,
        url: `/uploads/${file.path}`,
        size: file.size,
        type: file.type,
        folderId: file.folderId || undefined, // Convert null to undefined
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      }));
      setFiles(apiFiles);
      
      // Fetch all root folders for this course
      const foldersData = await FoldersService.getFoldersByCourseid(id);
      setFolders(foldersData);

      // Set loading to false after data is fetched
      setLoading(false);
      
      // Add a slight delay before marking the folder tree as ready
      // This ensures the skeleton remains visible until the DOM is updated
      setTimeout(() => {
        setFolderTreeReady(true);
      }, 500);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      if (error instanceof AxiosError && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error instanceof Error) {
        toast.error(error.message || 'Failed to load files and folders');
      } else {
        toast.error('Failed to load files and folders');
      }
      setLoading(false);
      setFolderTreeReady(true); // Mark as ready even on error to avoid perpetual loading state
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Function to show the AI generation modal
  const showGenerateFlashcardsWithAiModal = () => {
    setShowGenerationFlashcardsModal(true);
  };

  const showGenerateQuizzesWithAiModal = () => {
    setShowGenerationQuizzesModal(true);
  };
  
  // Function to add this course to the chat context
  const handleAskLecsi = () => {
    if (!course) return;
    
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
  

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            
            {/* Grid layout matching the actual course page */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main column */}
              <div className="col-span-2">
                <div className="border rounded-lg p-6">
                  {/* Course Files header skeleton */}
                  <div className="border-b pb-3 mb-3 flex justify-between items-center">
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-200 rounded w-28"></div>
                      <div className="h-8 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  
                  {/* Folder tree skeleton directly embedded */}
                  <FolderTreeSkeleton />
                </div>
              </div>
              
              {/* Sidebar column */}
              <div>
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
            </div>
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/courses">
              <Button variant="orange" className="mr-4">
                ← Back to Courses
              </Button>
            </Link>
            {isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-2xl font-bold border-b-2 border-[var(--primary)] focus:outline-none bg-transparent px-1 py-0.5 min-w-[300px]"
                placeholder="Course name"
                autoFocus
              />
            ) : (
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-[var(--primary)]">{course.name}</h1>
                <button 
                  onClick={handleStartEditing}
                  className="ml-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Edit course"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="primary"
                  onClick={handleSaveChanges}
                  isLoading={isSaving}
                  className="flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg> Save
                </Button>
                <Button
                  variant="white-outline"
                  onClick={handleCancelEditing}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="text-red-500 border-red-500 hover:bg-red-50"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                >
                  Delete Course
                </Button>
                <Button 
                  variant="white-outline" 
                  onClick={handleAskLecsi}
                >
                  Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mb-6">
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="Enter course description"
            />
          </div>
        ) : (
          <div className="mb-6 group relative">
            <p className="text-gray-600">
              {course.description || 'No description provided for this course.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card className="mb-6">
              <div className="min-h-[300px]">
                {/* Only show skeleton in parent during initial loading */}
                {loading ? (
                  <div className="p-4">
                    <div className="border-b pb-3 mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-[var(--primary)]">Course Files</h3>
                      <div className="flex gap-2">
                        <div className="w-28 h-8 bg-gray-200 animate-pulse rounded"></div>
                        <div className="w-28 h-8 bg-gray-200 animate-pulse rounded"></div>
                      </div>
                    </div>
                    <FolderTreeSkeleton />
                  </div>
                ) : (
                  <CourseFiles 
                    key={id} 
                    courseId={id} 
                    folderTreeReady={folderTreeReady} 
                    files={files} 
                    folders={folders} 
                    uploadModalOpen={uploadModalOpen} 
                    setUploadModalOpen={setUploadModalOpen} 
                    fetchData={fetchData}
                  />
                )}
              </div>
            </Card>
          </div>

          <div>
            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-[var(--primary)] mb-4">
                Generate Study Materials with LecSum AI
              </h2>
              <div className="space-y-4">
                <Button className="w-full" onClick={showGenerateFlashcardsWithAiModal}>
                  Create Flashcards
                </Button>
                <Button className="w-full" onClick={showGenerateQuizzesWithAiModal}>
                  Create Quiz
                </Button>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-[var(--primary)] mb-4">
                Course Stats
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>May 19, 2025</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flashcards:</span>
                  <Badge variant="primary">0</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quizzes:</span>
                  <Badge variant="orange">0</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
        {/* Quizzes Generation Modal */}
        {course && (
          <QuizzesGenerationModal
            isOpen={showGenerationQuizzesModal}
            onClose={() => {
              setShowGenerationQuizzesModal(false);
              fetchData(); // Refresh data when modal closes
            }}
            courses={[course]} // Pass current course as the only option
            skipCourseSelection={true} // Skip the course selection step when opened from course page
          />
        )}
        
        {/* Flashcards Generation Modal */}
        {course && (
          <FlashcardGenerationModal
            isOpen={showGenerationFlashcardsModal}
            onClose={() => {
              setShowGenerationFlashcardsModal(false);
              fetchData(); // Refresh data when modal closes
            }}
            courses={[course]} // Pass current course as the only option
            skipCourseSelection={true} // Skip the course selection step when opened from course page
          />
        )}
      </MainLayout>

      {/* Course Delete Modal */}
      {course && (
        <CourseDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          courseId={id}
          courseName={course.name}
          onDeleted={handleCourseDeleted}
        />
      )}
    </ProtectedRoute>
  );
}
