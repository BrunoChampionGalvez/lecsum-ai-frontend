import { Metadata } from 'next';
import { CoursesList } from '../../components/courses/CoursesList';

export const metadata: Metadata = {
  title: 'Courses | LecSum AI',
  description: 'Manage your courses and study materials',
};

export default function CoursesPage() {
  return <CoursesList />;
}
