'use client';

import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Course, CreateCourseData } from '../../lib/api/courses.service';

interface CourseFormProps {
  initialData?: Course;
  onSubmit: (data: CreateCourseData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Course name is required').max(100, 'Course name must be 100 characters or less'),
  description: Yup.string().max(500, 'Description must be 500 characters or less'),
});

export const CourseForm: React.FC<CourseFormProps> = ({ 
  initialData, 
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik<CreateCourseData>({
    initialValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError(null);
        await onSubmit(values);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to save course. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red bg-opacity-10 border border-red rounded-md text-red text-sm">
          {error}
        </div>
      )}
      
      <Input
        label="Course Name"
        id="name"
        name="name"
        type="text"
        placeholder="Introduction to Biology"
        value={formik.values.name}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.name && formik.errors.name ? formik.errors.name : undefined}
      />
      
      <div className="mb-4">
        <label htmlFor="description" className="block text-gray-700 font-medium mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="input w-full"
          placeholder="Enter course description..."
          value={formik.values.description || ''}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {formik.touched.description && formik.errors.description && (
          <p className="mt-1 text-red text-sm">{formik.errors.description as string}</p>
        )}
      </div>
      
      <div className="flex justify-end space-x-3 pt-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="white-outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting || formik.isSubmitting}
        >
          {initialData ? 'Update Course' : 'Create Course'}
        </Button>
      </div>
    </form>
  );
};
