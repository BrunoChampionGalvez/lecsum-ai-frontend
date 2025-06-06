import { Metadata } from 'next';
import Link from 'next/link';
import { MainLayout } from '../../../components/ui/MainLayout';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { QuizGeneratorClient } from '../../../components/quizzes/QuizGeneratorClient';

export const metadata: Metadata = {
  title: 'Generate Quiz | LecSum AI',
  description: 'Create AI-powered quizzes from your course materials',
};

export default function GenerateQuizPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="mb-6 flex items-center">
          <Link href="/quizzes">
            <Button variant="secondary" className="mr-4">
              ← Back to Quizzes
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-primary">Generate Quiz</h1>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Quiz Settings</h2>
            
            <p className="text-gray-600 mb-6">
              Create an AI-generated quiz based on your course materials. Select the files you want to include
              and customize the quiz settings below.
            </p>
            
            {/* TODO: Replace with real courseId and files data */}
            <QuizGeneratorClient courseId={"dummy-course-id"} files={[]} />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <h3 className="font-semibold text-primary mb-4">Question Types</h3>
              <div className="space-y-3 text-gray-600">
                <div>
                  <h4 className="font-medium">Multiple Choice</h4>
                  <p className="text-sm">Questions with several options where one or more are correct.</p>
                </div>
                <div>
                  <h4 className="font-medium">True/False</h4>
                  <p className="text-sm">Statements that are either true or false.</p>
                </div>
                <div>
                  <h4 className="font-medium">Short Answer</h4>
                  <p className="text-sm">Questions that require a brief written response.</p>
                </div>
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-primary mb-4">Difficulty Levels</h3>
              <div className="space-y-3 text-gray-600">
                <div>
                  <h4 className="font-medium">Easy</h4>
                  <p className="text-sm">Basic recall of facts and definitions.</p>
                </div>
                <div>
                  <h4 className="font-medium">Medium</h4>
                  <p className="text-sm">Application of concepts and understanding relationships.</p>
                </div>
                <div>
                  <h4 className="font-medium">Hard</h4>
                  <p className="text-sm">Analysis, evaluation, and synthesis of complex ideas.</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-primary mb-4">Tips for Effective Quizzes</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Select files that cover the specific topics you want to test</li>
              <li>Include a mix of question types for comprehensive assessment</li>
              <li>Start with shorter quizzes (5-10 questions) and gradually increase length</li>
              <li>Use the timer option to simulate exam conditions</li>
              <li>Review incorrect answers to identify knowledge gaps</li>
              <li>Generate quizzes regularly to track your progress over time</li>
            </ul>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
