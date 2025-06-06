"use client";
import React, { useState } from 'react';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DifficultyLevel } from '../../lib/api/flashcards.service';
import { QuizzesService } from '../../lib/api/quizzes.service';
import { AppFile } from '../../lib/api/files.service';
import { FileItem } from '../files/FileItem';

interface QuizGeneratorProps {
  courseId: string;
  files: AppFile[];
  onGenerated: () => void;
}

export const QuizGenerator: React.FC<QuizGeneratorProps> = ({
  courseId,
  files,
  onGenerated,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [title, setTitle] = useState<string>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MODERATE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileToggle = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    if (questionCount < 1) {
      setError('Please select at least 1 question');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await QuizzesService.generateQuiz({
        courseId,
        fileIds: selectedFiles,
        questionCount,
        difficulty,
        title: title.trim() || undefined,
      });

      onGenerated();
    } catch (errRaw) {
      const err = errRaw as ApiError;
      setError(err.response?.data?.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold text-primary mb-4">Generate Quiz</h3>

      {error && (
        <div className="p-3 mb-4 bg-red bg-opacity-10 border border-red rounded-md text-red text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Input
          label="Quiz Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter quiz title"
          className="mb-4"
        />

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Select Files
          </label>
          {files.length === 0 ? (
            <p className="text-gray-500 italic">No files available. Please upload files first.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.includes(file.id)}
                  onSelect={() => handleFileToggle(file.id)}
                  showActions={false}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Number of Questions
          </label>
          <div className="flex gap-3">
            {[3, 5, 10, 15].map((count) => (
              <button
                key={count}
                type="button"
                className={`px-4 py-2 rounded-md border ${
                  questionCount === count
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                }`}
                onClick={() => setQuestionCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Difficulty Level
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              className={`px-4 py-2 rounded-md border ${
                difficulty === DifficultyLevel.EASY
                  ? 'bg-cyan text-white border-cyan'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-cyan'
              }`}
              onClick={() => setDifficulty(DifficultyLevel.EASY)}
            >
              Easy
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-md border ${
                difficulty === DifficultyLevel.MODERATE
                  ? 'bg-orange text-white border-orange'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-orange'
              }`}
              onClick={() => setDifficulty(DifficultyLevel.MODERATE)}
            >
              Moderate
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-md border ${
                difficulty === DifficultyLevel.HARD
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
              }`}
              onClick={() => setDifficulty(DifficultyLevel.HARD)}
            >
              Hard
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Button
            type="submit"
            isLoading={isGenerating}
            disabled={files.length === 0}
          >
            Generate Quiz
          </Button>
        </div>
      </form>
    </Card>
  );
};
