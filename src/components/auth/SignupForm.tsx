import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { RegisterData } from '../../lib/api/auth.service';
import { useAuth } from '../../lib/auth/AuthContext';
import { AxiosError } from 'axios';

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  firstName: Yup.string().optional(),
  lastName: Yup.string().optional(),
});

export const SignupForm: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();

  const formik = useFormik<RegisterData>({
    initialValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError(null);
        // Use the register function from AuthContext which handles navigation and state
        await register(values.email, values.password, values.firstName, values.lastName);
        // No need to navigate here as AuthContext's register will handle it
      } catch (error: unknown) {
        let errorMessage = 'Failed to create account. Please try again.';
        if (error instanceof AxiosError && error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        setError(errorMessage);
        console.error('Signup failed:', error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-[var(--red)] bg-opacity-10 border border-[var(--red)] rounded-md text-[var(--red)] text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          id="firstName"
          name="firstName"
          type="text"
          placeholder="John"
          value={formik.values.firstName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.firstName ? formik.errors.firstName : undefined}
        />
        
        <Input
          label="Last Name"
          id="lastName"
          name="lastName"
          type="text"
          placeholder="Doe"
          value={formik.values.lastName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.lastName ? formik.errors.lastName : undefined}
        />
      </div>
      
      <Input
        label="Email"
        id="email"
        name="email"
        type="email"
        placeholder="your@email.com"
        value={formik.values.email}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.email ? formik.errors.email : undefined}
      />
      
      <Input
        label="Password"
        id="password"
        name="password"
        type="password"
        placeholder="••••••••"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.password ? formik.errors.password : undefined}
        helperText="Must be at least 6 characters"
      />
      
      <div className="pt-2">
        <Button
          type="submit"
          className="w-full"
          isLoading={formik.isSubmitting}
        >
          Create Account
        </Button>
      </div>
    </form>
  );
};
