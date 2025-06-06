"use client";

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AppFile } from '../../lib/api/files.service';
import { FileItem } from '../files/FileItem';
import { AxiosError } from 'axios';

interface ChatContextSelectorProps {
  files: AppFile[];
  selectedFileIds: string[];
  onSave: (fileIds: string[]) => Promise<void>;
}

export const ChatContextSelector: React.FC<ChatContextSelectorProps> = ({
  files,
  selectedFileIds,
  onSave,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedFileIds);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileToggle = (fileId: string) => {
    setSelectedIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onSave(selectedIds);
    } catch (error: unknown) {
      let errorMessage = 'Failed to update context. Please try again.';
      if (error instanceof AxiosError && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      console.error('Failed to update context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold text-primary mb-4">Select Context Files</h3>
      
      {error && (
        <div className="p-3 mb-4 bg-red bg-opacity-10 border border-red rounded-md text-red text-sm">
          {error}
        </div>
      )}
      
      <p className="text-gray-600 mb-4">
        Select the files you want the AI to use as context for this chat session:
      </p>
      
      {files.length === 0 ? (
        <p className="text-gray-500 italic">No files available.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              isSelected={selectedIds.includes(file.id)}
              onSelect={() => handleFileToggle(file.id)}
              showActions={false}
            />
          ))}
        </div>
      )}
      
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          isLoading={isLoading}
        >
          Save Context
        </Button>
      </div>
    </Card>
  );
};
