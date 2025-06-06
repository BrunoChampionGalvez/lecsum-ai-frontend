import { Metadata } from 'next';
import Link from 'next/link';
import { MainLayout } from '../../../components/ui/MainLayout';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import NewCourseForm from './NewCourseForm';

export const metadata: Metadata = {
  title: 'Create Course | LecSum AI',
  description: 'Create a new course',
};

export default function NewCoursePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="mb-6 flex items-center">
          <Link href="/courses">
            <Button variant="orange" className="mr-4">
              ← Back to Courses
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-primary">Create New Course</h1>
        </div>

        <Card className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-primary mb-4">Course Details</h2>
          
          {/* Client component that handles form submission */}
          <NewCourseForm />
        </Card>
      </MainLayout>
    </ProtectedRoute>
  );
}
