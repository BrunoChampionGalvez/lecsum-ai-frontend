'use client';

import { useState, useEffect } from 'react';
import { FlashcardGenerator } from '../../../components/flashcards/FlashcardGenerator';
import { AppFile } from '../../../lib/api/files.service';

interface FlashcardGenerationClientProps {
  courseId: string;
  initialFiles: AppFile[];
}

export default function FlashcardGenerationClient({ courseId, initialFiles }: FlashcardGenerationClientProps) {
  const [files] = useState<AppFile[]>(initialFiles);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerated = async () => {
    // Handle successful flashcard generation
    console.log('Flashcards generated successfully');
    // Optionally refresh the files list
    await fetchFiles();
  };

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      // You would typically fetch the files from your API here
      // const response = await fetch(`/api/courses/${courseId}/files`);
      // const data = await response.json();
      // setFiles(data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchFiles();
  }, [courseId]);

  if (isLoading) {
    return <div>Loading files...</div>;
  }

  return (
    <FlashcardGenerator 
      courseId={courseId}
      files={files}
      onGenerated={handleGenerated}
    />
  );
}
