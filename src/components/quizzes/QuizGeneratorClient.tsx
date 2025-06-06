"use client";

import React from "react";
import { QuizGenerator } from "./QuizGenerator";
import { AppFile } from '../../lib/api/files.service';

// You may need to pass courseId and files as props or fetch them here, depending on your app's data flow
interface QuizGeneratorClientProps {
  courseId: string;
  files: AppFile[];
}

export const QuizGeneratorClient: React.FC<QuizGeneratorClientProps> = ({ courseId, files }) => {
  const handleGenerated = () => {
    // Handle post-generation logic, e.g., redirect, show a message, etc.
  };

  return (
    <QuizGenerator courseId={courseId} files={files} onGenerated={handleGenerated} />
  );
};
