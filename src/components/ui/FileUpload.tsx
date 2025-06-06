"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { clsx } from 'clsx';

interface FileUploadProps {
  onFilesAccepted: (files: File[]) => void;
  maxSize?: number; // in bytes
  acceptedFileTypes?: string[];
  multiple?: boolean;
  className?: string;
  label?: string;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesAccepted,
  maxSize = 5 * 1024 * 1024, // 5MB default
  acceptedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  multiple = false,
  className,
  label = 'Drag and drop files here, or click to select files',
  error,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAccepted(acceptedFiles);
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragReject, fileRejections } = useDropzone({
    onDrop,
    maxSize,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    multiple,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false),
  });

  const fileError = fileRejections.length > 0
    ? `Invalid file(s): ${fileRejections.map(({ file }) => file.name).join(', ')}`
    : error;

  return (
    <div className="mb-4">
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors',
          dragActive ? 'border-primary bg-sky-light' : 'border-gray-300',
          isDragReject && 'border-red bg-red-50',
          className
        )}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <p className="text-gray-600">{label}</p>
          <p className="text-gray-500 text-sm mt-1">
            Supported file types: PDF, DOCX, TXT (max {Math.round(maxSize / (1024 * 1024))}MB)
          </p>
        </div>
      </div>
      {fileError && <p className="mt-1 text-red text-sm">{fileError}</p>}
    </div>
  );
};
