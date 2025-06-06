"use client";
import React from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { DecksService, Deck } from "../../lib/api/decks.service";
import { QuizzesService, Quiz } from "../../lib/api/quizzes.service";
import { FilesService, AppFile } from "../../lib/api/files.service";
import { FoldersService } from "../../lib/api/folders.service";
import { Folder } from "../../lib/api/types";

interface CourseDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  onDeleted: () => void;
}

export const CourseDeleteModal: React.FC<CourseDeleteModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseName,
  onDeleted,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);
  const [quizzes, setQuizzes] = React.useState<Quiz[]>([]);
  const [decks, setDecks] = React.useState<Deck[]>([]);
  const [files, setFiles] = React.useState<AppFile[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  
  // Confirmation modal states
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<{id: string, type: 'quiz' | 'flashcardDeck' | 'file' | 'folder', name: string} | null>(null);
  
  // Course name verification for bulk delete
  const [courseNameInput, setCourseNameInput] = React.useState('');
  const [showVerification, setShowVerification] = React.useState(false);
  const [initialCanDeleteCourse, setInitialCanDeleteCourse] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setCourseNameInput('');
    setShowVerification(false);
    
    // Fetch all associated data
    const fetchData = async () => {
      try {
        console.log(`Fetching data for course ID: ${courseId}`);
        
        // Get quizzes
        const quizzes = await QuizzesService.getQuizzesByCourse(courseId);
        console.log(`Retrieved ${quizzes.length} quizzes`);
        
        // Get decks
        const allDecks = await DecksService.getAll();
        const courseDecks = allDecks.filter(deck => deck.courseId === courseId);
        console.log(`Retrieved ${courseDecks.length} decks for this course`);
        
        // Get files - this is where we had issues
        console.log(`Fetching files for course ID: ${courseId}`);
        const files = await FilesService.getFilesByCourse(courseId);
        console.log(`Retrieved ${files.length} files:`, files);
        
        // Get folders
        const folders = await FoldersService.getFoldersByCourseid(courseId);
        console.log(`Retrieved ${folders.length} folders`);
        
        // Update state with the retrieved data
        setQuizzes(quizzes);
        setDecks(courseDecks);
        setFiles(files);
        setFolders(folders);
        setInitialCanDeleteCourse(quizzes.length === 0 && decks.length === 0 && files.length === 0 && folders.length === 0);
      } catch (err) {
        console.error('Error fetching course items:', err);
        setError("Failed to fetch related items.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen, courseId]);

  // Item deletion handlers
  const handleConfirmDelete = (id: string, type: 'quiz' | 'flashcardDeck' | 'file' | 'folder', name: string) => {
    setItemToDelete({ id, type, name });
    setConfirmModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    
    try {
      switch (itemToDelete.type) {
        case 'quiz':
          await QuizzesService.deleteQuiz(itemToDelete.id);
          setQuizzes(prev => prev.filter(q => q.id !== itemToDelete.id));
          break;
        case 'flashcardDeck':
          await DecksService.remove(itemToDelete.id);
          setDecks(prev => prev.filter(d => d.id !== itemToDelete.id));
          break;
        case 'file':
          await FilesService.deleteFile(itemToDelete.id);
          setFiles(prev => prev.filter(f => f.id !== itemToDelete.id));
          break;
        case 'folder':
          await FoldersService.deleteFolder(itemToDelete.id);
          
          // Get files - this is where we had issues
          const files = await FilesService.getFilesByCourse(courseId);
          
          // Get folders
          const folders = await FoldersService.getFoldersByCourseid(courseId);
          
          // Update state with the retrieved data
          setFiles(files);
          setFolders(folders);
          break;
      }
    } catch {
      setError(`Failed to delete ${itemToDelete.type}.`);
    } finally {
      setDeleting(false);
      setConfirmModalOpen(false);
      setItemToDelete(null);
    }
  };
  
  // Individual item delete handlers
  const handleDeleteQuiz = (quizId: string, name: string) => {
    handleConfirmDelete(quizId, 'quiz', name);
  };

  const handleDeleteDeck = (deckId: string, name: string) => {
    handleConfirmDelete(deckId, 'flashcardDeck', name);
  };
  
  const handleDeleteFile = (fileId: string, name: string) => {
    handleConfirmDelete(fileId, 'file', name);
  };
  
  const handleDeleteFolder = (folderId: string, name: string) => {
    handleConfirmDelete(folderId, 'folder', name);
  };
  
  // Section delete all handlers
  const [deleteAllConfirm, setDeleteAllConfirm] = React.useState<'quizzes' | 'decks' | 'files' | 'folders' | null>(null);
  
  const handleDeleteAllOfType = async (type: 'quizzes' | 'decks' | 'files' | 'folders') => {
    setDeleting(true);
    setError(null);
    try {
      console.log(`Deleting all ${type}...`);
      
      switch (type) {
        case 'quizzes':
          await Promise.all(quizzes.map(q => QuizzesService.deleteQuiz(q.id)));
          setQuizzes([]);
          break;
          
        case 'decks':
          await Promise.all(decks.map(d => DecksService.remove(d.id)));
          setDecks([]);
          break;
          
        case 'files':
          await Promise.all(files.map(f => FilesService.deleteFile(f.id)));
          setFiles([]);
          break;
          
        case 'folders':
          // For folders, we need to delete in the correct order - first delete all files in folders
          if (files.length > 0) {
            console.log('First deleting all files...');
            // Delete all files first
            await Promise.all(files.map(f => FilesService.deleteFile(f.id)));
            setFiles([]);
          }
          
          // Then delete folders in proper order (children first)
          if (folders.length > 0) {
            console.log('Now deleting folders in proper order...');
            
            // Sort folders - we need to delete child folders before parent folders
            const folderMap = new Map(folders.map(f => [f.id, f]));
            
            // Group folders by level (children first)
            const childFolders = folders.filter(f => f.parentId !== null);
            const rootFolders = folders.filter(f => f.parentId === null);
            
            console.log(`Found ${childFolders.length} child folders and ${rootFolders.length} root folders`);
            
            // First delete all child folders
            if (childFolders.length > 0) {
              console.log('Deleting child folders first...');
              for (const folder of childFolders) {
                try {
                  await FoldersService.deleteFolder(folder.id);
                  console.log(`Successfully deleted child folder: ${folder.name}`);
                } catch (folderErr) {
                  console.error(`Error deleting child folder ${folder.name}:`, folderErr);
                }
              }
            }
            
            // Then delete root folders
            if (rootFolders.length > 0) {
              console.log('Now deleting root folders...');
              for (const folder of rootFolders) {
                try {
                  await FoldersService.deleteFolder(folder.id);
                  console.log(`Successfully deleted root folder: ${folder.name}`);
                } catch (folderErr) {
                  console.error(`Error deleting root folder ${folder.name}:`, folderErr);
                }
              }
            }
          }
          
          // Refresh folders list
          setFolders([]);
          break;
      }
      
      setDeleteAllConfirm(null);
    } catch (err) {
      console.error(`Error deleting all ${type}:`, err);
      setError(`Failed to delete all ${type}. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setDeleting(false);
    }
  };
  
  const confirmDeleteAllOfType = (type: 'quizzes' | 'decks' | 'files' | 'folders') => {
    setDeleteAllConfirm(type);
  };

  const handleInitiateDeleteAll = () => {
    setShowVerification(true);
  };
  
  const handleDeleteAll = async () => {
    if (courseNameInput !== courseName) {
      setError("Please enter the exact course name to proceed.");
      return;
    }
    
    setDeleting(true);
    setError(null);
    try {
      console.log('Deleting all items:');
      console.log('Quizzes:', quizzes.length);
      console.log('Decks:', decks.length);
      console.log('Files:', files.length);
      console.log('Folders:', folders.length);
      
      await Promise.all([
        ...quizzes.map(q => QuizzesService.deleteQuiz(q.id)),
        ...decks.map(d => DecksService.remove(d.id)),
        ...files.map(f => FilesService.deleteFile(f.id)),
        ...folders.map(f => FoldersService.deleteFolder(f.id))
      ]);
      setQuizzes([]);
      setDecks([]);
      setFiles([]);
      setFolders([]);
      setShowVerification(false);
      setCourseNameInput('');
    } catch (err) {
      console.error('Error deleting items:', err);
      setError("Failed to delete all related items.");
    } finally {
      setDeleting(false);
    }
  };

  // Check if there are any related items that need to be deleted before the course can be deleted
  const canDeleteCourse = quizzes.length === 0 && decks.length === 0 && files.length === 0 && folders.length === 0;
  
  // Log the counts of related items for debugging
  React.useEffect(() => {
    if (!loading) {
      console.log('Related items counts:');
      console.log('- Quizzes:', quizzes.length);
      console.log('- Decks:', decks.length);
      console.log('- Files:', files.length);
      console.log('- Folders:', folders.length);
    }
  }, [loading, quizzes.length, decks.length, files.length, folders.length]);

  const renderDeleteConfirmationModal = () => {
    if (!confirmModalOpen || !itemToDelete) return null;
    
    return (
      <Modal
        isOpen={true}
        onClose={() => {
          setConfirmModalOpen(false);
          setItemToDelete(null);
        }}
        title="Confirm Deletion"
        widthClass="max-w-md"
        footer={
          <div className="flex justify-end space-x-2 w-full">
            <Button
              variant="white-outline"
              onClick={() => {
                setConfirmModalOpen(false);
                setItemToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              onClick={handleDeleteConfirmed}
              isLoading={deleting}
              disabled={deleting}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="py-4 text-center">
          {itemToDelete.type === 'folder' 
          ? (
            <>
              <p>Are you sure you want to delete the folder <span className="text-[var(--primary)] font-semibold">{itemToDelete.name}</span>?</p>
              <p className="text-red-500 font-semibold">Everything inside of it will also be deleted.</p>
            </>
          ) 
          : (
            <p>Are you sure you want to delete the {itemToDelete.type} <span className="text-[var(--primary)] font-semibold">{itemToDelete.name}</span>?</p>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Delete Course: ${courseName}`}
        widthClass="max-w-xl"
        footer={
          initialCanDeleteCourse ? (
            <Button variant="orange" onClick={onDeleted} isLoading={deleting}>
              Delete Course
            </Button>
          ) : (
            <Button variant="white-outline" onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
          )
        }
      >
        <div className="max-h-[80vh] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading related course information...</div>
        ) : (
          <>
            {error && <div className="mb-2 text-red-500 text-sm">{error}</div>}
            {(!canDeleteCourse) && (
              <div className="mb-4">
                <p className="mb-2 text-gray-700">
                  This course has related quizzes, flashcard decks, files, and/or folders. Please delete them before deleting the course.
                </p>
                <div>
                  {quizzes.length > 0 && (
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-semibold text-[var(--primary)]">Quizzes</div>
                        <Button 
                          size="sm" 
                          variant="white-outline" 
                          onClick={() => confirmDeleteAllOfType('quizzes')} 
                          disabled={deleting}
                          className="text-red-500 border-red-500 hover:bg-red-50"
                        >
                          Delete All
                        </Button>
                      </div>
                      <ul className="space-y-1">
                        {quizzes.map(q => (
                          <li key={q.id} className="flex justify-between items-center bg-gray-50 rounded px-2 py-1">
                            <span>{q.title}</span>
                            <Button size="sm" variant="orange" isLoading={deleting} onClick={() => handleDeleteQuiz(q.id, q.title)}>
                              Delete
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {decks.length > 0 && (
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-semibold text-[var(--primary)]">Flashcard Decks</div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => confirmDeleteAllOfType('decks')} 
                          disabled={deleting}
                          className="text-red-500 border-red-500 hover:bg-red-50"
                        >
                          Delete All
                        </Button>
                      </div>
                      <ul className="space-y-1">
                        {decks.map(d => (
                          <li key={d.id} className="flex justify-between items-center bg-gray-50 rounded px-2 py-1">
                            <span>{d.name}</span>
                            <Button size="sm" variant="orange" isLoading={deleting} onClick={() => handleDeleteDeck(d.id, d.name)}>
                              Delete
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Always show Files section */}
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-[var(--primary)]">Files {files && files.length > 0 ? `(${files.length})` : ''}</div>
                      {files && files.length > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => confirmDeleteAllOfType('files')} 
                          disabled={deleting}
                          className="text-red-500 border-red-500 hover:bg-red-50"
                        >
                          Delete All
                        </Button>
                      )}
                    </div>
                    {files && files.length > 0 ? (
                      <ul className="space-y-1">
                        {files.map(f => (
                          <li key={f.id} className="flex justify-between items-center bg-gray-50 rounded px-2 py-1">
                            <span className="truncate mr-2">{f.name}</span>
                            <Button size="sm" variant="orange" isLoading={deleting} onClick={() => handleDeleteFile(f.id, f.name)}>
                              Delete
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-500 italic text-sm px-2">No files found</div>
                    )}
                  </div>
                  {/* Always show Folders section */}
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-[var(--primary)]">Folders {folders && folders.length > 0 ? `(${folders.length})` : ''}</div>
                      {folders && folders.length > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => confirmDeleteAllOfType('folders')} 
                          disabled={deleting}
                          className="text-red-500 border-red-500 hover:bg-red-50"
                        >
                          Delete All
                        </Button>
                      )}
                    </div>
                    {folders && folders.length > 0 ? (
                      <ul className="space-y-1">
                        {folders.map(f => (
                          <li key={f.id} className="flex justify-between items-center bg-gray-50 rounded px-2 py-1">
                            <span className="truncate mr-2">{f.name}</span>
                            <Button size="sm" variant="orange" isLoading={deleting} onClick={() => handleDeleteFolder(f.id, f.name)}>
                              Delete
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-500 italic text-sm px-2">No folders found</div>
                    )}
                  </div>
                  
                  {showVerification ? (
                    <div className="mt-4 p-3 border border-red-200 rounded bg-red-50">
                      <p className="text-sm font-medium text-red-700 mb-2">Please type <span className="font-bold">{courseName}</span> to proceed:</p>
                      <input 
                        type="text" 
                        value={courseNameInput}
                        onChange={(e) => setCourseNameInput(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded mb-2"
                        placeholder="Enter course name"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="white-outline"
                          onClick={() => {
                            setShowVerification(false);
                            setCourseNameInput('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="orange"
                          onClick={handleDeleteAll}
                          isLoading={deleting}
                          disabled={courseNameInput !== courseName || deleting}
                        >
                          Confirm Delete All
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleInitiateDeleteAll}
                      isLoading={deleting}
                      className="mt-2"
                      disabled={deleting}
                    >
                      Delete All Related Items
                    </Button>
                  )}
                </div>
              </div>
            )}
            {canDeleteCourse && (
              <div className="py-4 text-[var(--primary)] font-semibold text-center">
                The course does not have any materials anymore. You can delete the course. 
              </div>
            )}
          </>
        )}
        </div>
      </Modal>
      
      {renderDeleteConfirmationModal()}
      
      {/* Confirmation Modal for deleting all items of a specific type */}
      {deleteAllConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteAllConfirm(null)}
          title={`Delete All ${deleteAllConfirm.charAt(0).toUpperCase() + deleteAllConfirm.slice(1)}`}
          widthClass="max-w-md"
          footer={
            <div className="flex justify-end space-x-2 w-full">
              <Button
                variant="white-outline"
                onClick={() => setDeleteAllConfirm(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="orange"
                onClick={() => handleDeleteAllOfType(deleteAllConfirm)}
                isLoading={deleting}
                disabled={deleting}
              >
                Delete All
              </Button>
            </div>
          }
        >
          <p className="py-4 text-center">
            Are you sure you want to delete all {deleteAllConfirm} associated with this course?
            <br />
            <span className="text-sm text-red-500 font-medium">This action cannot be undone.</span>
          </p>
        </Modal>
      )}
    </>
  );
};

export default CourseDeleteModal;
