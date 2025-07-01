"use client";

import React, { useState, useEffect, useRef, DragEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FilesService, AppFile } from '../../lib/api/files.service';
import dynamic from 'next/dynamic';
import PDFViewerManager from '../../lib/pdf-viewer-manager';
import { toast } from 'react-hot-toast'; // Add this import for toast notifications

// Dynamically import the PDF viewer to avoid SSR issues
// const PdfViewer = dynamic(
//   () => import('../ui/pdf-express').then(mod => ({ default: mod.PdfViewer })),
//   { ssr: false }
// );

// Import the dedicated extractor component
const PdfExtractor = dynamic(
  () => import('../ui/pdf-express-extractor').then(mod => ({ default: mod.PdfExtractor })),
  { ssr: false }
);

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

interface FileUploaderProps {
  courseId: string;
  onFileUploaded?: (newFiles: AppFile[]) => void;
  folderId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
  onExtractionComplete?: (fileId: string) => void; // New prop to handle extraction completion
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  courseId, 
  onFileUploaded, 
  folderId, 
  isOpen = false, 
  onClose,
  onExtractionComplete
}) => {
  // Convert props to state to ensure component properly handles open/close
  const [isModalOpen, setIsModalOpen] = useState(isOpen);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Store the current folder ID in component state to ensure it's not lost
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(folderId || null);
  const [textContent, setTextContent] = useState({
    name: '',
    content: '',
    showTextInput: false,
  });
  // Track upload progress with current file index and total count
  const [uploadProgress, setUploadProgress] = useState({
    currentFileIndex: 0,
    totalFiles: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for hidden file viewer functionality
  const [extractionState, setExtractionState] = useState<{
    fileId: string | null;
    fileUrl: string | null;
    isExtracting: boolean;
    completed: boolean;
  }>({
    fileId: null,
    fileUrl: null,
    isExtracting: false,
    completed: false
  });
  
  // Track changes to isOpen prop
  useEffect(() => {
    setIsModalOpen(isOpen);
  }, [isOpen]);
  
  // Track changes to folderId prop
  useEffect(() => {
    if (folderId !== undefined) {
      console.log('FileUploader: Updated folder ID to:', folderId);
      setCurrentFolderId(folderId);
    }
  }, [folderId]);
  
  // Clean up text extraction when component unmounts
  useEffect(() => {
    return () => {
      // Cancel any in-progress text extraction and log cleanup
      console.log('FileUploader unmounting, cleaning up text extraction state');
      setExtractionState({
        fileId: null,
        fileUrl: null,
        isExtracting: false,
        completed: false
      });
    };
  }, []);
  
  // Handle modal close
  const handleClose = () => {
    setIsModalOpen(false);
    if (onClose) onClose();
  };

  // Update handleTextExtractionComplete to handle success and failure
  const handleTextExtractionComplete = async (success: boolean) => {
    console.log('Text extraction completed, success:', success, 'for fileId:', extractionState.fileId);
    
    try {
      // Update extraction state
      setExtractionState(prev => ({
        ...prev,
        isExtracting: false,
        completed: true
      }));
      
      // Show user feedback
      if (success) {
        console.log('Text extraction was successful!');
        toast.success('Text extraction completed successfully');
        
        // Call the parent component's onExtractionComplete handler if provided
        if (onExtractionComplete && extractionState.fileId) {
          onExtractionComplete(extractionState.fileId);
        }
      } else {
        console.warn('Text extraction failed. The file will still be available but search functionality might be limited.');
        toast.error('Text extraction failed. Search functionality might be limited.', { duration: 6000 });
      }
      
      // Close modal regardless of extraction result, but with a slight delay
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('Error during extraction completion cleanup:', error);
      handleClose(); // Close on error
    }
  };

  // Validate file types (allow only PDF, DOCX, TXT)
  const validateFiles = (filesToValidate: File[]): { valid: File[], invalid: File[] } => {
    const validTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'text/plain'
    ];
    
    const valid: File[] = [];
    const invalid: File[] = [];
    
    filesToValidate.forEach(file => {
      if (validTypes.includes(file.type)) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    });
    
    return { valid, invalid };
  };

  // Handle uploading a single file and update progress
  const uploadSingleFile = async (file: File, currentIndex: number, totalFiles: number): Promise<AppFile> => {
    // Update progress to show which file we're currently processing
    setUploadProgress({
      currentFileIndex: currentIndex + 1, // +1 for human-readable counting (1-based instead of 0-based)
      totalFiles: totalFiles
    });
    
    try {
      // Determine file type and call appropriate API
      let uploadedFile: AppFile;
      
      if (file.type === 'application/pdf') {
        uploadedFile = await FilesService.uploadPdfFile(courseId, file, currentFolderId);
        
        // Set up PDF extraction if needed
        if (uploadedFile && uploadedFile.id && uploadedFile.path) {
          console.log('Setting up PDF extraction for:', uploadedFile.id);
          
          // Construct the file URL using the path from the uploaded file
          const fileUrl = `https://storage.googleapis.com/lecsum-ai-files/${uploadedFile.path}`;
          
          // Set state to trigger extraction
          setExtractionState({
            fileId: uploadedFile.id,
            fileUrl: fileUrl,
            isExtracting: true,
            completed: false
          });
          
          console.log('PDF extraction will begin for:', fileUrl);
        }
        
        return uploadedFile;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return FilesService.uploadDocxFile(courseId, file, currentFolderId);
      } else if (file.type === 'text/plain') {
        return FilesService.uploadTextFile(courseId, file, currentFolderId);
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (errRaw) {
      const err = errRaw as ApiError;
      console.error(`Upload error for ${file.name}:`, err);
      throw err;
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setError(null);
    
    // Validate file types
    const { valid, invalid } = validateFiles(files);
    
    if (invalid.length > 0) {
      const invalidFileNames = invalid.map(f => f.name).join(', ');
      setError(`The following files have unsupported formats: ${invalidFileNames}. Only PDF, DOCX, and TXT files are accepted.`);
      
      if (valid.length === 0) {
        setIsUploading(false);
        return;
      }
    }
    
    try {
      console.log(`Uploading ${valid.length} files to folder:`, currentFolderId);
      
      // Initialize upload progress with total file count
      setUploadProgress({
        currentFileIndex: 0,
        totalFiles: valid.length
      });
      
      // Upload files sequentially to avoid overwhelming the server
      const uploadedAppFiles: AppFile[] = [];
      let hasPdfToExtract = false;
      
      for (let i = 0; i < valid.length; i++) {
        const newFile = await uploadSingleFile(valid[i], i, valid.length);
        uploadedAppFiles.push(newFile);
        
        // Check if this is a PDF file that needs extraction
        if (valid[i].type === 'application/pdf' && newFile && !newFile.textExtracted) {
          hasPdfToExtract = true;
        }
      }
      
      if (onFileUploaded) onFileUploaded(uploadedAppFiles);
      
      // Only close the modal if we're not extracting text
      // This is the key change - don't close immediately for PDFs that need extraction
      if (!extractionState.isExtracting || !hasPdfToExtract) {
        console.log('No text extraction in progress, closing modal immediately');
        handleClose();
      } else {
        console.log('Text extraction in progress, modal will stay open until extraction completes');
      }
    } catch (errRaw) {
      const err = errRaw as ApiError;
      console.error('Upload error:', err, 'Folder ID was:', currentFolderId);
      setError(err.response?.data?.message || err.message || 'Failed to upload one or more files. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset progress
      setUploadProgress({
        currentFileIndex: 0,
        totalFiles: 0
      });
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.name || !textContent.content) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      console.log('Creating text content in folder:', currentFolderId); // Debug log
      const newTextFile = await FilesService.saveTextContent(
        courseId,
        textContent.name,
        textContent.content,
        currentFolderId
      );
      
      setTextContent({
        name: '',
        content: '',
        showTextInput: false,
      });
      
      if (onFileUploaded) onFileUploaded([newTextFile]);
    } catch (err) {
      console.error('Error creating text content:', err);
      setError('Failed to create text content');
    } finally {
      setIsUploading(false);
    }
  };

  // Update if !isModalOpen condition to ensure we only render one extractor instance
  if (!isModalOpen) {
    // If we're still extracting text, render the extractor even when modal is closed
    if (extractionState.isExtracting && extractionState.fileId && extractionState.fileUrl) {
      console.log('Rendering extractor for file:', extractionState.fileId);
      return (
        <div className="hidden-extractor-wrapper" style={{ 
          position: 'fixed', 
          left: '-9999px',
          width: '800px',
          height: '600px',
          overflow: 'hidden',
        }}>
          <PdfExtractor
            key={`extractor-${extractionState.fileId}-${Date.now()}`}
            fileId={extractionState.fileId}
            fileUrl={extractionState.fileUrl}
            onExtractionComplete={handleTextExtractionComplete}
            onExtractionProgress={(progress) => {
              console.log('Text extraction progress:', progress);
            }}
          />
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto relative">
          <button 
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700" 
            onClick={handleClose}
            disabled={isUploading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
      
        {!textContent.showTextInput ? (
          <div>
            <h2 className="text-lg font-semibold text-[var(--primary)] mb-4">
              Upload {folderId ? 'to Folder' : 'Course Files'}
            </h2>
            
            <div 
              className={`border-2 border-dashed ${isDragging ? 'border-[var(--primary)]' : 'border-gray-300'} rounded-lg p-8 mb-4 text-center`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e: DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                
                const droppedFiles = Array.from(e.dataTransfer.files);
                if (droppedFiles.length > 0) {
                  handleFileUpload(droppedFiles);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="cursor-pointer">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    ></path>
                  </svg>
                  <div className="text-lg font-medium">Drag and drop files here, or click to select</div>
                  <div className="text-sm text-gray-500">Supported file types: PDF, DOCX, TXT (max 5MB)</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  multiple
                  disabled={isUploading}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(Array.from(e.target.files));
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-gray-500 mb-2">or</div>
              <Button
                variant="white-outline"
                onClick={() => setTextContent({ ...textContent, showTextInput: true })}
                disabled={isUploading}
              >
                Enter Text Directly
              </Button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {isUploading && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--primary)] border-t-transparent"></div>
                <div className="mt-2 text-gray-600">Uploading files...</div>
                {uploadProgress.totalFiles > 0 && (
                  <div className="mt-2 text-sm text-gray-500">
                    Uploading file {uploadProgress.currentFileIndex} of {uploadProgress.totalFiles}
                  </div>
                )}
                {extractionState.isExtracting && (
                  <div className="mt-2 text-sm text-gray-500">
                    Extracting text from PDF file...
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-[var(--primary)] mb-4">
              Enter Text Content
            </h2>
            
            <form onSubmit={handleTextSubmit}>
              <div className="mb-4">
                <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
                  File Name
                </label>
                <Input
                  id="fileName"
                  value={textContent.name}
                  onChange={(e) => setTextContent({ ...textContent, name: e.target.value })}
                  disabled={isUploading}
                  placeholder="Enter a name for your text file"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  id="content"
                  value={textContent.content}
                  onChange={(e) => setTextContent({ ...textContent, content: e.target.value })}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  rows={8}
                  placeholder="Enter your text content here"
                  required
                ></textarea>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={isUploading}
                >
                  Save Text
                </Button>
                <Button
                  type="button"
                  variant="orange"
                  onClick={() => setTextContent({ ...textContent, showTextInput: false })}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              {isUploading && (
                <div className="mt-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--primary)] border-t-transparent"></div>
                  <div className="mt-2 text-gray-600">Saving...</div>
                </div>
              )}              </form>
          </div>
        )}
      </div>
    </div>
    
    {/* Render the extractor if needed - but not twice! */}
    {extractionState.isExtracting && extractionState.fileId && extractionState.fileUrl && !isModalOpen && (
      <div className="hidden-extractor-wrapper" style={{ 
        position: 'fixed', 
        left: '-9999px',
        width: '800px',
        height: '600px',
      }}>
        <PdfExtractor
          key={`extractor-${extractionState.fileId}`}
          fileId={extractionState.fileId}
          fileUrl={extractionState.fileUrl}
          onExtractionComplete={handleTextExtractionComplete}
          onExtractionProgress={(progress) => {
            console.log('Text extraction progress:', progress);
          }}
        />
      </div>
    )}
    </>
  );
};