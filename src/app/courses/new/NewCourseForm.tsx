'use client';

import dynamic from 'next/dynamic';

// Import the client component with SSR disabled
const CourseFormClient = dynamic(
  () => import('./CourseFormClient'),
  { ssr: false }
);

export default function NewCourseForm() {
  return <CourseFormClient />;
}
