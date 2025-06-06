import { Metadata } from 'next';
import Link from 'next/link';
import { MainLayout } from '../../../components/ui/MainLayout';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import FlashcardGenerationClient from './FlashcardGenerationClient';
import { AppFile } from '../../../lib/api/files.service';

export const metadata: Metadata = {
  title: 'Generate Flashcards | LecSum AI',
  description: 'Create AI-powered flashcards from your course materials',
};

// This is a placeholder for the files
const getFiles = (): AppFile[] => [];

export default function GenerateFlashcardsPage() {
  // In a real app, you would get the course ID from the URL or user's context
  const courseId = 'default-course-id'; // Replace with actual course ID retrieval logic
  const files = getFiles();
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="mb-6 flex items-center">
          <Link href="/flashcards">
            <Button variant="secondary" className="mr-4">
              ← Back to Flashcards
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-primary">Generate Flashcards</h1>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Flashcard Settings</h2>
            
            <p className="text-gray-600 mb-6">
              Create AI-generated flashcards based on your course materials. Select the files you want to include
              and customize the generation settings below.
            </p>
            
            <FlashcardGenerationClient 
              courseId={courseId}
              initialFiles={files}
            />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <h3 className="font-semibold text-primary mb-4">Flashcard Types</h3>
              <div className="space-y-3 text-gray-600">
                <div>
                  <h4 className="font-medium">Question & Answer</h4>
                  <p className="text-sm">Classic format with a question on the front and answer on the back.</p>
                </div>
                <div>
                  <h4 className="font-medium">Cloze Deletion</h4>
                  <p className="text-sm">Sentences with key terms removed, testing your ability to fill in the blanks.</p>
                </div>
                <div>
                  <h4 className="font-medium">Term Definition</h4>
                  <p className="text-sm">Term on the front and its definition on the back.</p>
                </div>
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-primary mb-4">Difficulty Levels</h3>
              <div className="space-y-3 text-gray-600">
                <div>
                  <h4 className="font-medium">Easy</h4>
                  <p className="text-sm">Basic concepts and definitions.</p>
                </div>
                <div>
                  <h4 className="font-medium">Medium</h4>
                  <p className="text-sm">Application of concepts and relationships between ideas.</p>
                </div>
                <div>
                  <h4 className="font-medium">Hard</h4>
                  <p className="text-sm">Complex problem-solving and deep understanding.</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-primary mb-4">Tips for Effective Flashcards</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Include specific files that contain key concepts you want to learn</li>
              <li>Mix different difficulty levels to test your knowledge comprehensively</li>
              <li>Use a combination of flashcard types for varied learning</li>
              <li>Generate 10-25 cards per session for manageable study sessions</li>
              <li>Review your flashcards regularly to reinforce learning</li>
            </ul>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
