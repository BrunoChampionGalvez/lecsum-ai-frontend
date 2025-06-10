"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, APIFile } from '../../lib/api/types';
import { PaginationOptions, PaginatedFilesResponse } from '../../lib/api/files.service';
import { PaginatedFolderResponse } from '../../lib/api/folders.service';
import { useChatContext } from '@/lib/chat/ChatContext';
import { MentionedMaterial } from '@/lib/api/chat.service';
import { Button } from '../ui/Button';
import { FoldersService } from '../../lib/api/folders.service';
import { FilesService, AppFile } from '../../lib/api/files.service';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';

// Skeleton loader for the FolderTree
export const FolderTreeSkeleton: React.FC = () => {
  // Generate random widths for skeleton items to create a more natural look
  const randomWidth = () => {
    const sizes = ['60%', '70%', '80%', '90%']; 
    return sizes[Math.floor(Math.random() * sizes.length)];
  };
  
  // Create skeleton folders and files
  const renderSkeletonFolder = (depth: number = 0, count: number = 3) => {
    return Array(count).fill(0).map((_, i) => (
      <div key={`folder-skeleton-${depth}-${i}`} className="mb-2 pl-4" style={{ marginLeft: `${depth * 16}px` }}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 animate-pulse rounded"></div>
          <div 
            className="h-5 bg-gray-200 animate-pulse rounded" 
            style={{ width: randomWidth() }}
          ></div>
        </div>
        {i === 0 && depth < 1 && (
          <div className="mt-2">
            {renderSkeletonFolder(depth + 1, 2)}
            {renderSkeletonFile(depth + 1, 3)}
          </div>
        )}
      </div>
    ));
  };
  
  const renderSkeletonFile = (depth: number = 0, count: number = 4) => {
    return Array(count).fill(0).map((_, i) => (
      <div 
        key={`file-skeleton-${depth}-${i}`} 
        className="flex items-center gap-2 mb-2 pl-4" 
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div className="w-4 h-4 bg-gray-200 animate-pulse rounded"></div>
        <div 
          className="h-5 bg-gray-200 animate-pulse rounded" 
          style={{ width: randomWidth() }}
        ></div>
      </div>
    ));
  };

  return (
    <div className="py-2">
      {renderSkeletonFolder(0, 3)}
      {renderSkeletonFile(0, 4)}
    </div>
  );
};

interface FolderTreeProps {
  courseId: string;
  rootFolders: Folder[];
  files: APIFile[];
  onFileClick: (file: APIFile) => void;
  onRefresh: () => void;
  onUploadToFolder: (folderId: string) => void;
  onRootFolderCreated?: (newFolder: Folder) => void; // For adding new root folders
  newlyAddedFile?: AppFile | null; // For adding a new file to a folder's content
  onFileProcessed?: (fileId: string) => void; // Callback after processing newlyAddedFile
}

export const FolderTree: React.FC<FolderTreeProps> = ({ 
  courseId,
  rootFolders, 
  files, 
  onFileClick,
  onRefresh,
  onUploadToFolder,
  onRootFolderCreated,
  newlyAddedFile,
  onFileProcessed
}) => {
  // Define type for cached folder contents result
  interface FolderContentsCache {
    folders: Folder[];
    files: APIFile[];
    totalFolders: number;
    totalFiles: number;
  }

  // API call cache to prevent redundant requests
  const apiCache = useRef<Record<string, { data: FolderContentsCache; timestamp: number }>>({});
  const CACHE_TTL_MS = 10000; // 10 seconds cache TTL
  // Get chat context for Ask Lecsi functionality
  const { 
    addMaterialToChat, 
    setIsSidebarOpen, 
    setCreateNewSession, 
    hasActiveSession 
  } = useChatContext();
  // Basic state for folder operations
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [folderContents, setFolderContents] = useState<Record<string, { folders: Folder[], files: APIFile[] }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [newFolderName, setNewFolderName] = useState<Record<string, string>>({});
  const [showNewFolderInput, setShowNewFolderInput] = useState<Record<string, boolean>>({});
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{type: 'folder' | 'file', id: string} | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [hoverTimeouts, setHoverTimeouts] = useState<Record<string, NodeJS.Timeout>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Modal states
  const [showFileDeleteModal, setShowFileDeleteModal] = useState(false);
  const [showFolderDeleteModal, setShowFolderDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string>('');

  // Function to handle showing the new subfolder input and expanding the parent
  const handleShowNewSubfolderInput = async (folderId: string) => {
    // 1. Ensure the folder is expanded
    if (!expandedFolders[folderId]) {
      // If not expanded, call toggleFolder which handles fetching contents and setting expanded state
      // We don't necessarily need to await toggleFolder here if showing input immediately is fine,
      // but awaiting ensures content is loaded if that's a dependency for input placement/visibility.
      await toggleFolder(folderId); 
    }
    // 2. Show the new folder input
    setShowNewFolderInput(prev => ({ ...prev, [folderId]: true }));
    // Focus the input field after it's rendered
    setTimeout(() => {
      const inputElement = document.getElementById(`new-folder-input-${folderId}`);
      inputElement?.focus();
    }, 0);
  };

  useEffect(() => {
    if (newlyAddedFile && newlyAddedFile.folderId) {
      const parentFolderId = newlyAddedFile.folderId;

      const apiFile: APIFile = {
        id: newlyAddedFile.id,
        name: newlyAddedFile.name,
        type: newlyAddedFile.type,
        size: newlyAddedFile.size,
        folderId: newlyAddedFile.folderId,
        createdAt: newlyAddedFile.createdAt,
        updatedAt: newlyAddedFile.updatedAt,
        url: `/uploads/${newlyAddedFile.path}` // Assuming AppFile has a 'path' property
      };

      setFolderContents(prevContents => {
        const currentParentContents = prevContents[parentFolderId] || { folders: [], files: [] };
        if (currentParentContents.files.some(f => f.id === apiFile.id)) {
          return prevContents; // Avoid duplicates
        }
        return {
          ...prevContents,
          [parentFolderId]: {
            ...currentParentContents,
            files: [...currentParentContents.files, apiFile].sort((a, b) => a.name.localeCompare(b.name))
          }
        };
      });

      if (!expandedFolders[parentFolderId]) {
        setExpandedFolders(prevExpanded => ({
          ...prevExpanded,
          [parentFolderId]: true
        }));
      }
      
      if (onFileProcessed) {
        onFileProcessed(newlyAddedFile.id);
      }
    }
  }, [newlyAddedFile, expandedFolders, onFileProcessed, setFolderContents, setExpandedFolders]);

  // Helper function to handle folder auto-expansion on hover during drag
  const handleFolderHover = (folderId: string) => {
    // Clear any existing timeouts for this folder
    if (hoverTimeouts[folderId]) {
      clearTimeout(hoverTimeouts[folderId]);
    }
    
    // Set a new timeout to expand the folder after a short delay (500ms)
    const timeout = setTimeout(async () => {
      if (isDragging && !expandedFolders[folderId]) {
        await toggleFolder(folderId);
      }
    }, 500);
    
    setHoverTimeouts({ ...hoverTimeouts, [folderId]: timeout });
  };

  // Clean up timeouts on component unmount
  useEffect(() => {
    return () => {
      Object.values(hoverTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [hoverTimeouts]);

  // Handle the actual move operation after a successful drop
  const handleItemMove = async (itemType: 'folder' | 'file', itemId: string, targetFolderId: string | null) => {
    try {
      if (itemType === 'folder') {
        // Don't allow dropping a folder into itself or its children
        if (itemId === targetFolderId) {
          toast.error('Cannot move a folder into itself');
          return;
        }
        
        // Check if target folder is a child of the dragged folder (prevents circular references)
        let currentFolder = targetFolderId;
        while (currentFolder) {
          const folder = rootFolders.find(f => f.id === currentFolder);
          if (folder?.parentId === itemId) {
            toast.error('Cannot move a folder into its child folder');
            return;
          }
          currentFolder = folder?.parentId || null;
        }
        
        await FoldersService.moveFolder(itemId, targetFolderId);
        toast.success('Folder moved successfully');
      } else {
        await FilesService.moveFile(itemId, targetFolderId);
        toast.success('File moved successfully');
      }
      
      // First, clear all folder content caches to force fresh data fetching
      setFolderContents({});
      
      // Then trigger the parent component's refresh to get fresh data from the API
      // This is crucial to get the updated file lists with correct folder IDs
      onRefresh();
      
      // Wait a short time to ensure the parent's API calls complete
      setTimeout(() => {
        // If the target folder is expanded, we need to manually re-fetch its contents
        if (targetFolderId && expandedFolders[targetFolderId]) {
          console.log('Force re-expanding target folder:', targetFolderId);
          
          // First close it - this is visual only as we've already cleared the contents cache
          setExpandedFolders(prev => ({
            ...prev,
            [targetFolderId]: false
          }));
          
          // Then re-open it after a brief delay
          setTimeout(() => {
            // Re-expand the folder to trigger a fresh data fetch
            setExpandedFolders(prev => ({
              ...prev,
              [targetFolderId]: true
            }));

            // Force a direct fetch of folder content after a short delay
            setTimeout(async () => {
              try {
                // Directly fetch fresh data from APIs with pagination
                const paginationOptions: PaginationOptions = { page: 1, limit: 50 };
                const freshFolders = await FoldersService.getFolderContents(targetFolderId, paginationOptions);
                
                // Get files directly from the folder instead of filtering from all course files
                // This is critical because the backend only returns files with no folder ID in getFilesByCourse
                const folderFilesData = await FilesService.getFilesByFolder(targetFolderId, paginationOptions);
                
                // Convert AppFile from the service to APIFile format
                const folderFiles = folderFilesData.files.map((file: AppFile) => ({
                  id: file.id,
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  folderId: file.folderId,
                  createdAt: file.createdAt,
                  updatedAt: file.updatedAt,
                  url: file.path // Use path as URL for compatibility
                } as APIFile));
                
                console.log(`Direct refresh after move: found ${folderFiles.length} files (of ${folderFilesData.total} total) in folder ${targetFolderId}`);
                
                // Directly update folder contents with fresh API data
                setFolderContents(prev => ({
                  ...prev,
                  [targetFolderId]: {
                    folders: freshFolders.folders.filter(folder => folder.parentId === targetFolderId),
                    files: folderFiles // Now properly typed as APIFile[]
                  }
                }));
              } catch (error) {
                console.error('Error during direct folder content refresh:', error);
              }
            }, 200);
          }, 100);
        }
      }, 100);
    } catch (error) {
      console.error('Error moving item', error);
      toast.error('Failed to move item');
    }
  };

  // Handle adding a folder to the chat context
  const handleAskLecsiFolderClick = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent folder expansion when clicking Ask Lecsi button
    
    if (!folder) return;
    
    // Create a material object for the folder
    const folderPath = folder.name.replace(/ /g, '_');
    const folderMaterial: MentionedMaterial = {
      id: folder.id,
      displayName: folderPath,
      type: 'folder',
      originalName: folder.name,
      courseId: courseId
    };
    
    // Add the folder to the chat context (returns true if added, false if already exists)
    const materialAdded = addMaterialToChat(folderMaterial);
    
    // If the folder was already in the context, show a message and return early
    if (materialAdded === false) {
      toast.error(`${folder.name} is already added to the chat context`);
      // Still ensure the sidebar is open
      setIsSidebarOpen(true);
      return;
    }
    
    // Set flag to create a new session ONLY if there isn't an active one
    if (!hasActiveSession) {
      console.log('No active session found, will create a new one');
      setCreateNewSession(true);
    } else {
      console.log('Using existing active session for folder context');
    }
    
    // Show appropriate feedback to the user based on whether we're using an existing session
    if (hasActiveSession) {
      toast.success(`Added ${folder.name} to the current chat session`);
    } else {
      toast.success(`Created new chat session with ${folder.name}`);
    }
  };

  // Handle adding a file to the chat context
  const handleAskLecsiFileClick = (file: APIFile, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent default file click action
    
    if (!file) return;
    
    // Create a material object for the file
    const filePath = file.name.replace(/ /g, '_');
    const fileMaterial: MentionedMaterial = {
      id: file.id,
      displayName: filePath,
      type: 'file',
      originalName: file.name,
      courseId: courseId
    };
    
    // Add the file to the chat context (returns true if added, false if already exists)
    const materialAdded = addMaterialToChat(fileMaterial);
    
    // If the file was already in the context, show a message and return early
    if (materialAdded === false) {
      toast.error(`${file.name} is already added to the chat context`);
      // Still ensure the sidebar is open
      setIsSidebarOpen(true);
      return;
    }
    
    // Set flag to create a new session ONLY if there isn't an active one
    if (!hasActiveSession) {
      console.log('No active session found, will create a new one');
      setCreateNewSession(true);
    } else {
      console.log('Using existing active session for file context');
    }
    
    // Show appropriate feedback to the user based on whether we're using an existing session
    if (hasActiveSession) {
      toast.success(`Added ${file.name} to the current chat session`);
    } else {
      toast.success(`Created new chat session with ${file.name}`);
    }
  };

  // Create a debounced version of our fetch functions to prevent API hammering
  const debouncedFetch = useCallback(async (folderId: string) => {
    const cacheKey = `folder_${folderId}_contents`;
    const now = Date.now();
    
    // Check if we have a valid cache entry
    if (apiCache.current[cacheKey] && 
        now - apiCache.current[cacheKey].timestamp < CACHE_TTL_MS) {
      console.log(`Using cached data for folder ${folderId}`);
      return apiCache.current[cacheKey].data;
    }
    
    console.log(`Fetching fresh data for folder ${folderId}`);
    try {
      const paginationOptions: PaginationOptions = { page: 1, limit: 50 };
      
      // Use pagination for both API calls - limit to reasonable amounts
      const foldersResponse: PaginatedFolderResponse = await FoldersService.getFolderContents(folderId, paginationOptions);
      const filesResponse: PaginatedFilesResponse = await FilesService.getFilesByFolder(folderId, paginationOptions);
      
      // Process folder contents
      const folders = foldersResponse.folders;
      
      // Convert AppFile from the service to APIFile format
      const apiFiles = filesResponse.files.map((file: AppFile) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        folderId: file.folderId,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        url: file.path // Use path as URL for compatibility
      } as APIFile));
      
      // Store combined result in cache
      const result = { 
        folders: folders.filter(folder => folder.parentId === folderId),
        files: apiFiles,
        totalFolders: foldersResponse.total,
        totalFiles: filesResponse.total
      };
      
      // Update the cache
      apiCache.current[cacheKey] = {
        data: result,
        timestamp: now
      };
      
      return result;
    } catch (error) {
      console.error('Error in debouncedFetch:', error);
      throw error;
    }
  }, []);

  const toggleFolder = async (folderId: string) => {
    if (loading[folderId]) return;
    
    const newExpandedState = !expandedFolders[folderId];
    setExpandedFolders({ ...expandedFolders, [folderId]: newExpandedState });
    
    // Always refresh the folder contents when expanding regardless of existing content
    // This ensures we always have the latest data after drag and drop operations
    if (newExpandedState) {
      try {
        setLoading({ ...loading, [folderId]: true });
        
        // Use our cached/debounced fetch function
        const folderData = await debouncedFetch(folderId);
        
        console.log(`Folder ${folderId} contents: ${folderData.files.length} files, ${folderData.folders.length} subfolders`);
        if (folderData.totalFiles > folderData.files.length || folderData.totalFolders > folderData.folders.length) {
          console.log(`Note: Some items were paginated. Total: ${folderData.totalFiles} files, ${folderData.totalFolders} folders`);
        }
        
        // Update the folder contents with fetched data
        setFolderContents({
          ...folderContents,
          [folderId]: { 
            folders: folderData.folders,
            files: folderData.files
          }
        });
      } catch (error) {
        console.error('Error fetching folder contents', error);
        toast.error('Failed to load folder contents');
      } finally {
        setLoading({ ...loading, [folderId]: false });
      }
    }
  };

  // Show delete file modal
  const showDeleteFileModal = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent file click action
    setItemToDelete(fileId);
    setShowFileDeleteModal(true);
  };

  // Show delete folder modal
  const showDeleteFolderModal = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent folder expansion
    setItemToDelete(folderId);
    setShowFolderDeleteModal(true);
  };

  // Handle deleting a file
  const handleDeleteFile = async () => {
    const fileId = itemToDelete;
    try {
      setDeleting(true);
      await FilesService.deleteFile(fileId);
      
      // Update local state
      // Find which folder this file belongs to
      const folderId = Object.keys(folderContents).find(key => 
        folderContents[key]?.files?.some(file => file.id === fileId)
      );

      if (folderId) {
        // Remove file from folder contents
        setFolderContents(prev => ({
          ...prev,
          [folderId]: {
            ...prev[folderId],
            files: prev[folderId].files.filter(file => file.id !== fileId)
          }
        }));
      } else {
        // This is a root-level file, so trigger refresh
        onRefresh();
      }
      
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeleting(false);
      setShowFileDeleteModal(false);
    }
  };

  // Handle deleting a folder
  const handleDeleteFolder = async () => {
    const folderId = itemToDelete;
    try {
      setDeleting(true);
      await FoldersService.deleteFolder(folderId);
      
      // Update local state
      // Check if it's a root folder
      const isRootFolder = rootFolders.some(folder => folder.id === folderId);
      
      if (isRootFolder) {
        // Let parent component handle refresh for root folders
        onRefresh();
      } else {
        // Find parent folder to update its contents
        const parentFolderId = Object.keys(folderContents).find(key => 
          folderContents[key]?.folders?.some(folder => folder.id === folderId)
        );

        if (parentFolderId) {
          // Remove folder from parent contents
          setFolderContents(prev => ({
            ...prev,
            [parentFolderId]: {
              ...prev[parentFolderId],
              folders: prev[parentFolderId].folders.filter(folder => folder.id !== folderId)
            }
          }));
        }
      }
      
      // Also remove the folder from expandedFolders and its contents from folderContents
      setExpandedFolders(prev => {
        const updated = { ...prev };
        delete updated[folderId];
        return updated;
      });
      
      setFolderContents(prev => {
        const updated = { ...prev };
        delete updated[folderId];
        return updated;
      });
      
      toast.success('Folder deleted successfully');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    } finally {
      setDeleting(false);
      setShowFolderDeleteModal(false);
    }
  };

  const handleCreateFolder = async (parentId?: string) => {
    const folderKey = parentId || 'root';
    const name = newFolderName[folderKey]?.trim();
    
    if (!name) {
      toast.error('Folder name cannot be empty');
      return;
    }
    
    try {
      setCreatingFolder(true);
      const data = { name, parentId };
      const newlyCreatedFolder = await FoldersService.createFolder(courseId, data);
      
      // Clear the input and hide it
      setNewFolderName({ ...newFolderName, [folderKey]: '' });
      setShowNewFolderInput({ ...showNewFolderInput, [folderKey]: false });
      
      // Instead of onRefresh(), update state locally
      if (newlyCreatedFolder) {
        if (parentId) {
          // It's a subfolder, update folderContents
          setFolderContents(prevContents => {
            const parentContent = prevContents[parentId] || { folders: [], files: [] };
            // Ensure the new folder isn't already added (e.g., by a quick re-render/fetch)
            const folderExists = parentContent.folders.some(f => f.id === newlyCreatedFolder.id);
            if (folderExists) return prevContents;

            return {
              ...prevContents,
              [parentId]: {
                ...parentContent,
                folders: [...parentContent.folders, newlyCreatedFolder].sort((a, b) => a.name.localeCompare(b.name))
              }
            };
          });
          // Ensure the parent folder is expanded to show the new subfolder
          if (!expandedFolders[parentId]) {
            setExpandedFolders(prevExpanded => ({ ...prevExpanded, [parentId]: true }));
          }
        } else {
          // It's a root folder. Call the new prop function.
          if (onRootFolderCreated) {
            onRootFolderCreated(newlyCreatedFolder);
          } else {
            // Fallback to full refresh if the prop isn't provided (should not happen with proper setup)
            console.warn("onRootFolderCreated prop not provided to FolderTree. Falling back to onRefresh.");
            onRefresh();
          }
        }
      }
      
      toast.success('Folder created successfully');
    } catch (err) {
      console.error('Error creating folder:', err);
      toast.error('Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const renderFolderContents = (folderId: string) => {
    if (!expandedFolders[folderId]) {
      return null;
    }

    const { folders = [], files = [] } = folderContents[folderId] || { folders: [], files: [] };

    return (
      <div 
        className="pl-6 border-l-2 border-gray-200 mt-1 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          maxHeight: '1000px', // Large value to ensure animation works properly
          opacity: 1,
          transform: 'translateY(0)'
        }}
      >
        {/* Folders section - vertical layout with spacing */}
        <div className="space-y-3 mt-3">
          {folders.map(folder => renderFolder(folder))}
        </div>
        
        {/* Files section - vertical layout with spacing */}
        <div className="space-y-3 mt-3">
          {files.map(file => renderFile(file))}
        </div>
        
        {/* New folder input for this level */}
        {showNewFolderInput[folderId] && (
          <div className="flex items-center my-2">
            <input
              type="text"
              className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              placeholder="Folder name"
              value={newFolderName[folderId] || ''}
              onChange={(e) => setNewFolderName({ ...newFolderName, [folderId]: e.target.value })}
              onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (creatingFolder) return; // Prevent multiple submissions
                    handleCreateFolder(folderId);
                  }
                }}
              autoFocus
            />
            <Button 
              size="sm" 
              className="ml-2" 
              onClick={() => handleCreateFolder(folderId)}
              isLoading={creatingFolder}
            >
              Create
            </Button>
            <Button 
              size="sm" 
              variant="white-outline" 
              className="ml-1"
              onClick={() => setShowNewFolderInput({ ...showNewFolderInput, [folderId]: false })}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderFolder = (folder: Folder) => {
    const isExpanded = expandedFolders[folder.id] || false;
    const isLoading = loading[folder.id] || false;
    const isDropTarget = dropTarget === folder.id;
    const isDraggingThis = isDragging && draggedItem?.type === 'folder' && draggedItem?.id === folder.id;

    return (
      <div key={folder.id} className="flex flex-col">
        <div className="relative group">
          <div 
            className={`flex items-center cursor-pointer py-2 px-3 rounded-lg border ${isDropTarget ? 'border-[var(--primary)] bg-blue-50' : 'border-gray-200 bg-white'} shadow-sm w-[350px] h-[50px] transition-all duration-150 transform ${!isDraggingThis && 'hover:scale-105 hover:shadow-md'} ${isDraggingThis ? 'opacity-50' : ''} group/folder`}
            onClick={() => toggleFolder(folder.id)}
            title={folder.name}
            draggable={true}
            onDragStart={(e) => {
              e.stopPropagation();
              setDraggedItem({ type: 'folder', id: folder.id });
              setIsDragging(true);
              // Set the drag image and data
              e.dataTransfer.setData('application/json', JSON.stringify({ type: 'folder', id: folder.id }));
              // For better UX, you can set a custom drag image
              const dragImage = document.createElement('div');
              dragImage.textContent = folder.name;
              dragImage.className = 'bg-white p-2 rounded shadow text-sm font-medium';
              document.body.appendChild(dragImage);
              e.dataTransfer.setDragImage(dragImage, 0, 0);
              setTimeout(() => document.body.removeChild(dragImage), 0);
            }}
            onDragEnd={() => {
              setDraggedItem(null);
              setDropTarget(null);
              setIsDragging(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedItem && draggedItem.id !== folder.id) {
                setDropTarget(folder.id);
                handleFolderHover(folder.id);
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedItem && draggedItem.id !== folder.id) {
                setDropTarget(folder.id);
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dropTarget === folder.id) {
                setDropTarget(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDropTarget(null);
              
              if (!draggedItem) return;
              
              // Ensure we're not dropping on ourselves
              if (draggedItem.type === 'folder' && draggedItem.id === folder.id) return;
              
              // Handle the move operation
              handleItemMove(draggedItem.type, draggedItem.id, folder.id);
            }}
          >
            <div className="flex-1 flex items-center overflow-hidden">
              {isLoading ? (
                <div className="w-5 h-5 mr-2 flex-shrink-0 animate-spin rounded-full border-2 border-solid border-[var(--primary)] border-t-transparent" style={{ boxSizing: 'border-box' }} />
              ) : (
                <button 
                  className={`text-gray-500 mr-1 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              )}
              <div className="text-[var(--primary)] mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              
              {/* Text container with fixed width */}
              <div className="flex-1 overflow-hidden">
                <span className="text-sm font-medium truncate block max-w-[100px]">{folder.name}</span>
              </div>
            </div>
            
            {/* Other folder action buttons */}
              <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover/folder:opacity-100 transition-opacity duration-200">
              {/* Create subfolder button */}
              <button 
                className="p-1 text-gray-500 hover:text-[var(--primary)] hover:bg-gray-100 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowNewSubfolderInput(folder.id);
                }}
                title="Create Subfolder"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  <line x1="12" y1="11" x2="12" y2="17"></line>
                  <line x1="9" y1="14" x2="15" y2="14"></line>
                </svg>
              </button>
              
              {/* Upload to folder button */}
              <button
                className="p-1 text-gray-500 hover:text-[var(--primary)] hover:bg-gray-100 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadToFolder(folder.id);
                }}
                title="Upload to Folder"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </button>

              {/* Delete folder button */}
              <button 
                className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full"
                onClick={(e) => showDeleteFolderModal(folder.id, e)}
                title="Delete Folder"
                disabled={deleting}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>

              {/* Ask Lecsi button container */}
              <div className="flex-shrink-0 opacity-0 group-hover/folder:opacity-100 transition-opacity duration-200 mr-1">
                <Button 
                  variant="white-outline" 
                  size="sm"
                  onClick={(e) => handleAskLecsiFolderClick(folder, e)}
                  className="text-xs whitespace-nowrap"
                >
                  Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
                </Button>
              </div>
              
            </div>
          </div>
        </div>
        
        {renderFolderContents(folder.id)}
        
        
      </div>
    );
  };

  const renderFile = (file: APIFile) => {
    // Determine file icon based on file type
    const getFileIcon = () => {
      switch (file.type) {
        case 'pdf':
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M9 15h6"></path>
              <path d="M9 11h6"></path>
            </svg>
          );
        case 'docx':
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
          );
        default:
          return (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          );
      }
    };

    const isDraggingThis = isDragging && draggedItem?.type === 'file' && draggedItem?.id === file.id;
    
    return (
      <div 
        key={file.id} 
        className={`flex items-center py-2 px-3 cursor-pointer rounded-lg border border-gray-200 shadow-sm bg-white w-[350px] h-[50px] transition-all duration-150 transform ${!isDraggingThis && 'hover:scale-105 hover:shadow-md'} ${isDraggingThis ? 'opacity-50' : ''} group/file`}
        onClick={() => onFileClick(file)}
        title={file.name}
        draggable={true}
        onDragStart={(e) => {
          e.stopPropagation();
          setDraggedItem({ type: 'file', id: file.id });
          setIsDragging(true);
          e.dataTransfer.setData('application/json', JSON.stringify({ type: 'file', id: file.id }));
          // Set custom drag image
          const dragImage = document.createElement('div');
          dragImage.textContent = file.name;
          dragImage.className = 'bg-white p-2 rounded shadow text-sm font-medium';
          document.body.appendChild(dragImage);
          e.dataTransfer.setDragImage(dragImage, 0, 0);
          setTimeout(() => document.body.removeChild(dragImage), 0);
        }}
        onDragEnd={() => {
          setDraggedItem(null);
          setDropTarget(null);
          setIsDragging(false);
        }}
      >
        <div className="flex-1 flex items-center overflow-hidden">
          <div className="flex-shrink-0 mr-2">
            {getFileIcon()}
          </div>
          {/* Text container with fixed width that changes on hover */}
          <div className="flex-1 overflow-hidden transition-[width] duration-0">
            <span className="text-sm font-medium truncate block w-full">{file.name}</span>
          </div>
          {/* Button container with actions */}
          <div className="flex-shrink-0 flex items-center space-x-2 opacity-0 group-hover/file:opacity-100 transition-opacity duration-200 pointer-events-none group-hover/file:pointer-events-auto">
            {/* Delete file button */}
            <button
              className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full"
              onClick={(e) => showDeleteFileModal(file.id, e)}
              title="Delete File"
              disabled={deleting}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
            
            <Button 
              variant="white-outline" 
              size="sm"
              onClick={(e) => handleAskLecsiFileClick(file, e)}
              className="text-xs"
            >
              Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* File Delete Confirmation Modal */}
      <Modal
        isOpen={showFileDeleteModal}
        onClose={() => setShowFileDeleteModal(false)}
        title="Delete File"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowFileDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteFile}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-gray-700">Are you sure you want to delete this file?</p>
        <p className="text-gray-500 text-sm mt-2">This action cannot be undone.</p>
      </Modal>

      {/* Folder Delete Confirmation Modal */}
      <Modal
        isOpen={showFolderDeleteModal}
        onClose={() => setShowFolderDeleteModal(false)}
        title="Delete Folder"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowFolderDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteFolder}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-gray-700">Are you sure you want to delete this folder?</p>
        <p className="text-gray-700 font-semibold">All files and subfolders inside will also be deleted.</p>
        <p className="text-gray-500 text-sm mt-2">This action cannot be undone.</p>
      </Modal>
      
      {/* Display folders and files in a vertical layout with drop zone for root level */}
      <div 
        className={`flex flex-col space-y-3 mb-4 p-3 rounded-lg ${dropTarget === 'root' ? 'bg-blue-50 border border-[var(--primary)]' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedItem && !dropTarget) {
            setDropTarget('root');
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (draggedItem) {
            setDropTarget('root');
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          // Check if we're really leaving the root area, not just entering a child
          if (!e.currentTarget.contains(e.relatedTarget as Node) && dropTarget === 'root') {
            setDropTarget(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDropTarget(null);
          
          if (!draggedItem) return;
          
          // Move the item to the root level (null parent)
          handleItemMove(draggedItem.type, draggedItem.id, null);
        }}
      >
        {/* Root folders section */}
        <div className="space-y-3">
          {rootFolders.map(folder => renderFolder(folder))}
        </div>
        
        {/* Root files section - only show files that don't have a folderId */}
        <div className="flex flex-col gap-3">
          {files.filter(file => !file.folderId).sort((a, b) => a.name.localeCompare(b.name)).map(file => renderFile(file))}
        </div>
      </div>
      
      {/* New folder input at root level */}
      {showNewFolderInput['root'] && (
        <div className="flex items-center my-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <input
            type="text"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            placeholder="New folder name"
            value={newFolderName['root'] || ''}
            onChange={(e) => setNewFolderName({ ...newFolderName, root: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <Button 
            size="sm" 
            className="ml-2" 
            onClick={() => handleCreateFolder()}
            isLoading={creatingFolder}
          >
            Create
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            className="ml-1"
            onClick={() => setShowNewFolderInput({ ...showNewFolderInput, root: false })}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
