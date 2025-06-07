"use client";

import React, { useState, useEffect } from 'react';

// Using Modal component instead of Dialog
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CoursesService, Course } from '../../lib/api/courses.service';
import { FoldersService } from '../../lib/api/folders.service';
import { FilesService } from '../../lib/api/files.service';
import { useSubscriptionLimits } from '../../hooks/useSubscriptionLimits';
import { Folder, APIFile } from '../../lib/api/types';
// Removing Tabs dependency as it's not used in this component
import { toast } from 'react-hot-toast';
import { FlashcardsService, FlashcardType, DifficultyLevel } from '../../lib/api/flashcards.service';
import { useRouter } from 'next/navigation';

interface FlashcardGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses?: Course[];
  skipCourseSelection?: boolean;
}

// Define the steps in the generation process
type Step = 'course-selection' | 'content-selection' | 'generation-settings';

// Interface for selected items
interface SelectedItems {
  courseId: string | null;
  folders: string[];
  files: string[];
}

// Generation settings interface
interface GenerationSettings {
  count: number;
  difficulty: DifficultyLevel;
  types: FlashcardType[];
  deckName: string;
}

export const FlashcardGenerationModal: React.FC<FlashcardGenerationModalProps> = ({
  isOpen,
  onClose,
  courses: initialCourses,
  skipCourseSelection = false
}) => {
  // State for multi-step process
  const [currentStep, setCurrentStep] = useState<Step>('course-selection');
  
  // State for data
  const [courses, setCourses] = useState<Course[]>(initialCourses || []);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<APIFile[]>([]);
  const [folderContents, setFolderContents] = useState<Record<string, { folders: Folder[], files: APIFile[] }>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // State for selection
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({
    courseId: null,
    folders: [],
    files: []
  });
  
  // State for settings
  const [settings, setSettings] = useState<GenerationSettings>({
    count: 10,
    difficulty: DifficultyLevel.MODERATE,
    types: [FlashcardType.QA],
    deckName: ''
  });
  
  // Get subscription limits
  const { 
    canCreateFlashcards, 
    remaining, 
    isActive,
    refresh: refreshSubscriptionLimits 
  } = useSubscriptionLimits();
  
  // State for loading states
  const [loading, setLoading] = useState<{
    courses: boolean;
    content: boolean;
    generating: boolean;
  }>({
    courses: false,
    content: false,
    generating: false
  });
  
  const router = useRouter();

  // Reset the modal state when opened
  useEffect(() => {
    if (isOpen) {
      console.log('FlashcardGenerationModal: Modal opened, initialCourses:', initialCourses);
      
      // Reset settings
      setSettings({
        count: 10,
        difficulty: DifficultyLevel.MODERATE,
        types: [FlashcardType.QA],
        deckName: ''
      });
      
      // Reset selected items but preserve courseId if auto-selected
      setSelectedItems({
        courseId: null,
        folders: [],
        files: []
      });
      
      // Check courses state
      if (initialCourses) {
        console.log('FlashcardGenerationModal: initialCourses provided:', initialCourses.length, 'courses');
        setCourses(initialCourses);
        
        // Auto-select the course and skip to content selection if explicitly told to skip AND only one course is provided
        if (skipCourseSelection && initialCourses.length === 1) {
          console.log('FlashcardGenerationModal: Auto-selecting the only course:', initialCourses[0].id);
          setSelectedItems(prev => ({
            ...prev,
            courseId: initialCourses[0].id
          }));
          setCurrentStep('content-selection');
          // Fetch content for the auto-selected course
          fetchCourseContent(initialCourses[0].id);
        } else {
          setCurrentStep('course-selection');
        }
      } else {
        console.log('FlashcardGenerationModal: No initialCourses provided, will fetch');
        setCurrentStep('course-selection');
      }
      
      // Only fetch courses if we don't have them already
      if (!initialCourses || initialCourses.length === 0) {
        console.log('FlashcardGenerationModal: Calling fetchCourses()');
        fetchCourses();
      }
    }
  }, [isOpen, initialCourses, skipCourseSelection]);

  // Fetch courses for the first step
  const fetchCourses = async () => {
    console.log('FlashcardGenerationModal.fetchCourses: Starting to fetch courses');
    // Check authentication status
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('FlashcardGenerationModal.fetchCourses: Authentication token not found in localStorage');
      toast.error('Authentication issue - please try logging in again');
      return;
    }
    console.log('FlashcardGenerationModal.fetchCourses: Auth token exists:', token ? 'Yes' : 'No');
    
    try {
      setLoading(prevState => ({ ...prevState, courses: true }));
      
      // Try a direct API call with fetch to debug
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/courses`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('FlashcardGenerationModal.fetchCourses: Direct fetch response status:', response.status);
        if (!response.ok) {
          console.error('FlashcardGenerationModal.fetchCourses: Direct fetch failed:', response.statusText);
        } else {
          const directData = await response.json();
          console.log('FlashcardGenerationModal.fetchCourses: Direct fetch data:', directData);
        }
      } catch (fetchError) {
        console.error('FlashcardGenerationModal.fetchCourses: Direct fetch error:', fetchError);
      }
      
      // Normal API call through service
      console.log('FlashcardGenerationModal.fetchCourses: Calling CoursesService.getAllCourses()');
      const coursesData = await CoursesService.getAllCourses();
      console.log('FlashcardGenerationModal.fetchCourses: Courses data received:', coursesData);
      
      if (Array.isArray(coursesData) && coursesData.length === 0) {
        console.warn('FlashcardGenerationModal.fetchCourses: Empty courses array returned');
      }
      
      setCourses(coursesData);
    } catch (error) {
      console.error('FlashcardGenerationModal.fetchCourses: Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(prevState => ({ ...prevState, courses: false }));
    }
  };

  // Fetch content for the selected course
  const fetchCourseContent = async (courseId: string) => {
    try {
      setLoading(prevState => ({ ...prevState, content: true }));
      
      // Fetch root folders for this course
      const foldersData = await FoldersService.getFoldersByCourseid(courseId);
      setFolders(foldersData);
      
      // Fetch files for this course
      const filesData = await FilesService.getFilesByCourse(courseId);
      // Convert AppFile to APIFile
      const apiFiles = filesData.map(file => ({
        id: file.id,
        name: file.name,
        url: `/uploads/${file.path}`,
        size: file.size,
        type: file.type,
        folderId: file.folderId || undefined,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      }));
      setFiles(apiFiles);
      
    } catch (error) {
      console.error('Error fetching course content:', error);
      toast.error('Failed to load course content');
    } finally {
      setLoading(prevState => ({ ...prevState, content: false }));
    }
  };

  // Handle course selection
  const handleCourseSelect = (courseId: string) => {
    setSelectedItems({
      courseId,
      folders: [],
      files: []
    });
    fetchCourseContent(courseId);
    setCurrentStep('content-selection');
  };

  // Handle folder toggle (expand/collapse)
  const toggleFolder = async (folderId: string) => {
    // Toggle expanded state
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
    
    // If we're expanding and don't have contents yet, fetch them
    if (!expandedFolders[folderId] && !folderContents[folderId]) {
      try {
        // Fetch subfolders
        const subfolders = await FoldersService.getFolderContents(folderId);
        
        // Fetch files in this folder
        const folderFiles = await FilesService.getFilesByFolder(folderId);
        // Convert to APIFile format
        const apiFiles = folderFiles.map(file => ({
          id: file.id,
          name: file.name,
          url: `/uploads/${file.path}`,
          size: file.size,
          type: file.type,
          folderId: file.folderId || undefined,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt
        }));
        
        // Update folder contents
        setFolderContents(prev => ({
          ...prev,
          [folderId]: {
            folders: subfolders,
            files: apiFiles
          }
        }));
      } catch (error) {
        console.error('Error fetching folder contents:', error);
        toast.error('Failed to load folder contents');
      }
    }
  };

  // Handle item selection (files and folders)
  const handleItemSelect = (type: 'folder' | 'file', id: string, selected: boolean) => {
    if (type === 'folder') {
      if (selected) {
        setSelectedItems(prev => ({
          ...prev,
          folders: [...prev.folders, id]
        }));
      } else {
        setSelectedItems(prev => ({
          ...prev,
          folders: prev.folders.filter(folderId => folderId !== id)
        }));
      }
    } else {
      if (selected) {
        setSelectedItems(prev => ({
          ...prev,
          files: [...prev.files, id]
        }));
      } else {
        setSelectedItems(prev => ({
          ...prev,
          files: prev.files.filter(fileId => fileId !== id)
        }));
      }
    }
  };

  // Handle generation settings change
  const handleSettingsChange = (key: keyof GenerationSettings, value: GenerationSettings[keyof GenerationSettings]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle flashcard generation
  const handleGenerateFlashcards = async () => {
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
    
    if (!selectedItems.courseId) {
      toast.error('Please select a course');
      return;
    }
    
    if (selectedItems.folders.length === 0 && selectedItems.files.length === 0) {
      toast.error('Please select at least one folder or file');
      return;
    }
    
    if (settings.types.length === 0) {
      toast.error('Please select at least one flashcard type');
      return;
    }
    
    if (!settings.deckName.trim()) {
      toast.error('Please enter a name for your flashcard deck');
      return;
    }
    
    try {
      setLoading(prevState => ({ ...prevState, generating: true }));
      
      // Call the API to generate flashcards
      // The backend API expects fileIds, not folderIds, so we need to fetch all files in the selected folders
      const allFileIds = [...selectedItems.files];
      
      // Eliminate duplicates
      const uniqueFileIds = [...new Set(allFileIds)];
      
      await FlashcardsService.generateFlashcards({
        fileIds: uniqueFileIds,
        courseId: selectedItems.courseId || '',
        difficulty: settings.difficulty,
        types: settings.types,
        deckName: settings.deckName.trim() || 'Generated Flashcards',
        flashcardCount: settings.count,
        folderIds: selectedItems.folders,
      });
      
      toast.success('Flashcards generated successfully!');
      onClose();
      
      // Generate returns the deck, so we can navigate to it
      // Go to flashcards page with refresh flag
      router.push('/flashcards?refresh=true');
      
      // Refresh subscription limits after successful generation
      refreshSubscriptionLimits();
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast.error('Failed to generate flashcards');
    } finally {
      setLoading(prevState => ({ ...prevState, generating: false }));
    }
  };

  // Helper to count total selected items
  const getTotalSelectedCount = () => {
    return selectedItems.folders.length + selectedItems.files.length;
  };

  // Render the step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 'course-selection':
        return renderCourseSelection();
      case 'content-selection':
        return renderContentSelection();
      case 'generation-settings':
        return renderGenerationSettings();
      default:
        return null;
    }
  };

  // Render the course selection step
  const renderCourseSelection = () => {
    return (
      <div className="py-4">
        <h3 className="text-lg font-semibold mb-4">Select a Course</h3>
        
        {loading.courses ? (
          <div className="flex justify-center py-8">
            <div className="spinner" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No courses found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {courses.map(course => (
              <div 
                key={course.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedItems.courseId === course.id ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-gray-200 hover:border-[var(--primary)]'
                }`}
                onClick={() => handleCourseSelect(course.id)}
              >
                <h4 className="font-medium">{course.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{course.description || 'No description'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render the content selection step
  const renderContentSelection = () => {
    return (
      <div className="py-4">
        <h3 className="text-lg font-semibold mb-4">Select Content</h3>
        
        {loading.content ? (
          <div className="flex justify-center py-8">
            <div className="spinner" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4 w-full overflow-hidden h-[400px]">
            {/* Content browser */}
            <div className="md:w-1/2 border rounded-lg p-4 h-full overflow-y-auto">
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search files and folders..."
                  className="w-full p-2 border border-gray-300 rounded-md text-base"
                />
              </div>
              
              {/* Folder tree with checkboxes */}
              <div className="space-y-2 overflow-x-hidden">
                {folders.map(folder => renderFolderWithCheckbox(folder))}
                
                {/* Root files (not in any folder) */}
                {files.filter(file => !file.folderId).map(file => renderFileWithCheckbox(file))}
              </div>
            </div>
            
            {/* Selection preview */}
            <div className="md:w-1/2 border rounded-lg p-4 h-full overflow-y-auto">
              <h4 className="font-medium mb-3 text-base">Selected Items ({getTotalSelectedCount()})</h4>
              
              {getTotalSelectedCount() === 0 ? (
                <p className="text-base text-gray-500">No items selected</p>
              ) : (
                <div className="space-y-2 overflow-x-hidden">
                  {/* Selected folders */}
                  {selectedItems.folders.map(folderId => {
                    const folder = folders.find(f => f.id === folderId) || 
                      Object.values(folderContents).flatMap(content => 
                        content.folders.find(f => f.id === folderId)
                      ).filter(Boolean)[0];
                    
                    return folder ? (
                      <div key={folder.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div className="flex items-center overflow-hidden">
                          <svg className="flex-shrink-0 w-4 h-4 mr-1 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="text-xs truncate">{folder.name}</span>
                        </div>
                        <button 
                          className="flex-shrink-0 ml-1 text-red-500 hover:text-red-700"
                          onClick={() => handleItemSelect('folder', folder.id, false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : null;
                  })}
                  
                  {/* Selected files */}
                  {selectedItems.files.map(fileId => {
                    const file = files.find(f => f.id === fileId) || 
                      Object.values(folderContents).flatMap(content => 
                        content.files.find(f => f.id === fileId)
                      ).filter(Boolean)[0];
                    
                    return file ? (
                      <div key={file.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div className="flex items-center overflow-hidden">
                          <svg className="flex-shrink-0 w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="text-xs truncate">{file.name}</span>
                        </div>
                        <button 
                          className="flex-shrink-0 ml-1 text-red-500 hover:text-red-700"
                          onClick={() => handleItemSelect('file', file.id, false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  className="w-full"
                  disabled={getTotalSelectedCount() === 0}
                  onClick={() => setCurrentStep('generation-settings')}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render the generation settings step
  const renderGenerationSettings = () => {
    return (
      <div className="py-4">
        <h3 className="text-lg font-semibold mb-4">Generation Settings</h3>
        
        <div className="space-y-6">
          {/* Deck Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deck Name
            </label>
            <input
              type="text"
              value={settings.deckName}
              onChange={(e) => handleSettingsChange('deckName', e.target.value)}
              placeholder="Enter a name for your flashcard deck"
              className="w-full p-2 border border-gray-300 rounded-md text-base"
            />
          </div>
          {/* Number of flashcards */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Number of Flashcards
            </label>
            {/* New structure for icon and always-visible text */}
            <div className="flex items-start text-xs text-gray-600 mt-1 mb-2">
              <svg className="w-4 h-4 text-blue-500 mr-1.5 flex-shrink-0 mt-[1px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="8" r="1" fill="currentColor"/>
              </svg>
              <span>
                Note: If the information from the files you selected is not enough to generate the selected number of flashcards, a smaller number of flashcards will be automatically generated.
              </span>
            </div>
            {remaining.flashcards < 5 ? (
              <div className="px-4 py-2 mb-2 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                You only have {remaining.flashcards} flashcard{remaining.flashcards !== 1 ? 's' : ''} remaining. At least 5 flashcards are needed to generate a deck.
              </div>
            ) : null}
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="5"
                max={Math.min(30, remaining.flashcards)}
                step="5"
                value={settings.count > remaining.flashcards ? remaining.flashcards : settings.count}
                onChange={(e) => handleSettingsChange('count', parseInt(e.target.value))}
                className="flex-1"
                disabled={remaining.flashcards < 5}
              />
              <span className="font-medium">{settings.count > remaining.flashcards ? remaining.flashcards : settings.count}</span>
            </div>
          </div>
          
          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                className={`p-2 border rounded-md ${
                  settings.difficulty === DifficultyLevel.EASY 
                    ? 'bg-green-100 border-green-500 text-green-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleSettingsChange('difficulty', DifficultyLevel.EASY)}
              >
                Easy
              </button>
              <button
                className={`p-2 border rounded-md ${
                  settings.difficulty === DifficultyLevel.MODERATE 
                    ? 'bg-yellow-100 border-yellow-500 text-yellow-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleSettingsChange('difficulty', DifficultyLevel.MODERATE)}
              >
                Medium
              </button>
              <button
                className={`p-2 border rounded-md ${
                  settings.difficulty === DifficultyLevel.HARD 
                    ? 'bg-red-100 border-red-500 text-red-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleSettingsChange('difficulty', DifficultyLevel.HARD)}
              >
                Hard
              </button>
            </div>
          </div>
          
          {/* Flashcard types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flashcard Types
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="type-term-definition"
                  checked={settings.types.includes(FlashcardType.QA)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleSettingsChange('types', [...settings.types, FlashcardType.QA]);
                    } else {
                      handleSettingsChange('types', settings.types.filter(t => t !== FlashcardType.QA));
                    }
                  }}
                  className="h-4 w-4 text-[var(--primary)] border-gray-300 rounded"
                />
                <label htmlFor="type-term-definition" className="ml-2 block text-sm text-gray-700">
                  Question-Answer
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="type-question-answer"
                  checked={settings.types.includes(FlashcardType.CLOZE)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleSettingsChange('types', [...settings.types, FlashcardType.CLOZE]);
                    } else {
                      handleSettingsChange('types', settings.types.filter(t => t !== FlashcardType.CLOZE));
                    }
                  }}
                  className="h-4 w-4 text-[var(--primary)] border-gray-300 rounded"
                />
                <label htmlFor="type-question-answer" className="ml-2 block text-sm text-gray-700">
                  Cloze (Fill in the blank)
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Recursive function to render a folder with a checkbox
  const renderFolderWithCheckbox = (folder: Folder) => {
    const isExpanded = expandedFolders[folder.id] || false;
    const isSelected = selectedItems.folders.includes(folder.id);
    const hasContents = folderContents[folder.id];
    
    return (
      <div key={folder.id} className="select-none w-full">
        <div className="flex items-center py-1 w-full">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleItemSelect('folder', folder.id, e.target.checked)}
            className="flex-shrink-0 mr-1 h-4 w-4 text-[var(--primary)] border-gray-300 rounded"
          />
          
          <button
            onClick={() => toggleFolder(folder.id)}
            className="flex items-center w-full overflow-hidden hover:bg-gray-50 rounded p-1"
          >
            <svg
              className={`flex-shrink-0 w-4 h-4 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            
            <svg
              className="flex-shrink-0 w-4 h-4 mr-1 text-[var(--primary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            
            <span className="truncate text-sm">{folder.name}</span>
          </button>
        </div>
        
        {isExpanded && (
          <div className="pl-6 w-full overflow-hidden">
            {hasContents ? (
              <>
                {/* Render subfolders */}
                {hasContents.folders.map(subfolder => renderFolderWithCheckbox(subfolder))}
                
                {/* Render files */}
                {hasContents.files.map(file => renderFileWithCheckbox(file))}
              </>
            ) : (
              <div className="py-2 text-xs text-gray-500">Loading...</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render a file with a checkbox
  const renderFileWithCheckbox = (file: APIFile) => {
    const isSelected = selectedItems.files.includes(file.id);
    
    let icon;
    if (file.type.includes('pdf')) {
      icon = (
        <svg className="flex-shrink-0 w-4 h-4 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      );
    } else if (file.type.includes('doc')) {
      icon = (
        <svg className="flex-shrink-0 w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      );
    } else {
      icon = (
        <svg className="flex-shrink-0 w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    }
    
    return (
      <div key={file.id} className="flex items-center py-1 pl-6 w-full overflow-hidden">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => handleItemSelect('file', file.id, e.target.checked)}
          className="flex-shrink-0 mr-1 h-4 w-4 text-[var(--primary)] border-gray-300 rounded"
        />
        
        <div className="flex items-center w-full overflow-hidden hover:bg-gray-50 rounded p-1">
          {icon}
          <span className="truncate text-sm">{file.name}</span>
          <span className="flex-shrink-0 ml-1 text-sm text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} widthClass="max-w-[80%] w-full">
      <div className="max-h-[85vh] overflow-y-auto bg-white rounded-lg shadow-lg p-6 relative">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--primary)]">Generate Flashcards with AI</h2>
        </div>
        {/* Step indicator */}
        <div className="flex justify-between items-center my-4 px-2">
          <div className="flex-1 flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'course-selection' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--primary-light)] border-[var(--primary)] border-2 text-[var(--primary)]'
            }`}>
              1
            </div>
            <div className={`h-1 flex-1 ${
              currentStep === 'course-selection' ? 'bg-gray-300' : 'bg-[var(--primary)]'
            }`}></div>
          </div>
          
          <div className="flex-1 flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'content-selection' ? 'bg-[var(--primary)] text-white' : 
              currentStep === 'generation-settings' ? 'border-[var(--primary)] border-2 bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <div className={`h-1 flex-1 ${
              currentStep === 'generation-settings' ? 'bg-[var(--primary)]' : 'bg-gray-300'
            }`}></div>
          </div>
          
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'generation-settings' ? 'bg-[var(--primary)] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
          </div>
        </div>
        
        {/* Step content */}
        {renderStepContent()}
        
        {/* Action buttons */}
        <div className="flex justify-between mt-6 mb-2">
          {currentStep !== 'course-selection' ? (
            <Button 
              variant="white-outline"
              onClick={() => setCurrentStep(currentStep === 'generation-settings' ? 'content-selection' : 'course-selection')}
            >
              Back
            </Button>
          ) : (
            <div></div>
          )}
          
          {currentStep === 'generation-settings' && (
            <Button
              onClick={handleGenerateFlashcards}
              isLoading={loading.generating}
              disabled={(selectedItems.folders.length === 0 && selectedItems.files.length === 0) || 
                       settings.types.length === 0 || 
                       !settings.deckName.trim() || 
                       remaining.flashcards < 5}
              title={remaining.flashcards < 5 ? "You need at least 5 available flashcards to generate a deck" : "Generate flashcard deck with AI"}
            >
              Generate Flashcards
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
