import { useEffect, useState } from "react";
import { APIFile, Folder } from "@/lib/api/types";
import { FilesService } from "@/lib/api/files.service";
import { FoldersService } from "@/lib/api/folders.service";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FolderTree, FolderTreeSkeleton } from "@/components/files/FolderTree";
import { FileUploader } from "@/components/files/FileUploader";

// CourseFiles component for handling files and folders
export const CourseFiles = ({ courseId, folderTreeReady, files, folders, uploadModalOpen, setUploadModalOpen, fetchData }: { courseId: string, folderTreeReady: boolean, files: APIFile[], folders: Folder[], uploadModalOpen: boolean, setUploadModalOpen: (open: boolean) => void, fetchData: () => Promise<void> }) => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [showNewFolderInput, setShowNewFolderInput] = useState<Record<string, boolean>>({});
    const [newFolderName, setNewFolderName] = useState<Record<string, string>>({});

    const handleFileUploaded = async () => {
      setUploadModalOpen(false);
      await fetchData();
    };

  
    const handleCreateFolder = async (parentId?: string) => {
      const folderKey = parentId || 'root';
      const name = newFolderName[folderKey]?.trim();
      
      if (!name) {
        toast.error('Folder name cannot be empty');
        return;
      }
      
      try {
        const data = { name, parentId };
        await FoldersService.createFolder(courseId, data);
        
        // Clear the input and hide it
        setNewFolderName({ ...newFolderName, [folderKey]: '' });
        setShowNewFolderInput({ ...showNewFolderInput, [folderKey]: false });
        
        // Refresh the folder contents
        await fetchData();
        toast.success('Folder created successfully');
      } catch (err) {
        console.error('Error creating folder:', err);
        toast.error('Failed to create folder');
      }
    };
  
    const handleFileClick = (file: APIFile) => {
      window.open(file.url, '_blank');
    };
  
    const handleUploadToFolder = (folderId: string) => {
      console.log('Setting folder ID for upload:', folderId); // Debug log
      setSelectedFolderId(folderId);
      setUploadModalOpen(true);
    };
  
    // Loading is now handled by the parent component
  
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Files and Folders</h3>
          {!showNewFolderInput['root'] ? (
            <div className="flex gap-2">
              <Button 
                variant="white-outline"
                onClick={() => setShowNewFolderInput({ ...showNewFolderInput, root: true })}
              >
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    <path d="M12 10v6m-3-3h6" />
                  </svg>
                  Create Folder
                </div>
              </Button>
              <Button onClick={() => setUploadModalOpen(true)}>
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    ></path>
                  </svg>
                  Upload File
                </div>
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                placeholder="Enter folder name"
                value={newFolderName['root'] || ''}
                onChange={(e) => setNewFolderName({ ...newFolderName, root: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                autoFocus
              />
              <Button 
                onClick={() => handleCreateFolder()}
                size="sm"
              >
                Create
              </Button>
              <Button 
                variant="white-outline" 
                size="sm"
                onClick={() => setShowNewFolderInput({ ...showNewFolderInput, root: false })}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
  
        <div className="border rounded-lg p-4">
          {/* Show skeleton until content is ready */}
          {!folderTreeReady ? (
            <div className="min-h-[300px]">
              <FolderTreeSkeleton />
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No files or folders yet</p>
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="primary"
                  onClick={() => setUploadModalOpen(true)}
                >
                  Upload a file
                </Button>
              </div>
            </div>
          ) : (
            <FolderTree
              courseId={courseId}
              rootFolders={folders}
              files={files}
              onFileClick={handleFileClick}
              onRefresh={fetchData}
              onUploadToFolder={handleUploadToFolder}
            />
          )}
        </div>
  
        <FileUploader
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            // Do not reset the folder ID here as it should be preserved
          }}
          courseId={courseId}
          onFileUploaded={handleFileUploaded}
          folderId={selectedFolderId}
        />
      </div>
    );
  };