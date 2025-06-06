import React from 'react';
import { File, FileType } from '../../lib/api/files.service';
import { Badge } from '../ui/Badge';

interface FileItemProps {
  file: File;
  onSelect?: () => void;
  isSelected?: boolean;
  showActions?: boolean;
  onDelete?: () => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  onSelect,
  isSelected = false,
  showActions = true,
  onDelete,
}) => {
  const fileTypeIcons = {
    [FileType.PDF]: (
      <svg className="w-8 h-8 text-red" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
        <path fill="#FFF" d="M14 3V8H19L14 3Z" />
        <path fill="#FFF" d="M11.5 14.7H10.5V16.5H9.5V11.5H11.8C12.7 11.5 13.6 12.1 13.6 13.1C13.6 14.3 12.7 14.7 11.5 14.7ZM11.5 12.5H10.5V13.7H11.5C11.8 13.7 12.1 13.5 12.1 13.1C12.1 12.7 11.8 12.5 11.5 12.5ZM14.5 16.5V11.5H16.5C18.1 11.5 19.5 12.9 19.5 14C19.5 15.1 18.1 16.5 16.5 16.5H14.5ZM16.5 12.5H15.5V15.5H16.5C17.5 15.5 18.5 14.8 18.5 14C18.5 13.2 17.5 12.5 16.5 12.5Z" />
      </svg>
    ),
    [FileType.DOCX]: (
      <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
        <path fill="#FFF" d="M14 3V8H19L14 3Z" />
        <path fill="#FFF" d="M9.5 16.5V11.5H11.1C12.6 11.5 13.5 12.6 13.5 14C13.5 15.4 12.6 16.5 11.1 16.5H9.5ZM10.5 12.5V15.5H11.1C12 15.5 12.5 14.9 12.5 14C12.5 13.1 12 12.5 11.1 12.5H10.5Z" />
        <path fill="#FFF" d="M14.5 16.5V11.5H15.5V15.5H17.5V16.5H14.5Z" />
      </svg>
    ),
    [FileType.TEXT]: (
      <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
        <path fill="#FFF" d="M14 3V8H19L14 3Z" />
        <path fill="#FFF" d="M8 14H16V15H8V14ZM8 12H16V13H8V12ZM8 16H13V17H8V16Z" />
      </svg>
    ),
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div 
      className={`border rounded-lg p-3 flex items-center ${
        isSelected ? 'border-primary bg-sky-light' : 'border-gray-200 hover:border-primary'
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect}
    >
      <div className="mr-3">
        {fileTypeIcons[file.type]}
      </div>
      
      <div className="flex-grow">
        <div className="font-medium text-primary truncate max-w-xs" title={file.name}>
          {file.name}
        </div>
        <div className="text-xs text-gray-500 flex items-center mt-1 space-x-2">
          <span>{formatFileSize(file.size)}</span>
          <span>•</span>
          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
          <Badge variant={file.type === FileType.PDF ? 'orange' : file.type === FileType.DOCX ? 'primary' : 'gray'}>
            {file.type.toUpperCase()}
          </Badge>
        </div>
      </div>
      
      {showActions && onDelete && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-gray-400 hover:text-red hover:bg-red-50 rounded-full"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
            />
          </svg>
        </button>
      )}
    </div>
  );
};
