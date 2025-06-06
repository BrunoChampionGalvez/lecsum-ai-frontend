import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { LoginCredentials } from '../../lib/api/auth.service';
import { useAuth } from '../../lib/auth/AuthContext';
import { AxiosError } from 'axios';

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const LoginForm: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const formik = useFormik<LoginCredentials>({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError(null);
        // Use the login function from AuthContext which handles navigation and state
        await login(values.email, values.password);
        // No need to navigate here as AuthContext's login will handle it
      } catch (error: unknown) {
        let errorMessage = 'Failed to login. Please check your credentials.';
        if (error instanceof AxiosError && error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        setError(errorMessage);
        console.error('Login failed:', error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-[var(--red)] bg-opacity-10 border border-[var(--red)] rounded-md text-white text-sm text-center">
          {error}
        </div>
      )}
      
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
      />
      
      <div className="pt-2">
        <Button
          type="submit"
          className="w-full"
          isLoading={formik.isSubmitting}
        >
          Log In
        </Button>
      </div>
    </form>
  );
};
