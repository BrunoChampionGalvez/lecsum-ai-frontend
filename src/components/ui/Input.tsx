import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-gray-700 font-medium mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'input w-full',
            error && 'border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red)]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-[var(--red)] text-sm">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-gray-500 text-sm">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
