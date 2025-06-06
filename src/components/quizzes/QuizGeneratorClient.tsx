"use client";

import React from "react";
import { QuizGenerator } from "./QuizGenerator";

// You may need to pass courseId and files as props or fetch them here, depending on your app's data flow
interface QuizGeneratorClientProps {
  courseId: string;
  files: any[];
}

export const QuizGeneratorClient: React.FC<QuizGeneratorClientProps> = ({ courseId, files }) => {
  const handleGenerated = () => {
    // Handle post-generation logic, e.g., redirect, show a message, etc.
  };

  return (
    <QuizGenerator courseId={courseId} files={files} onGenerated={handleGenerated} />
  );
};
