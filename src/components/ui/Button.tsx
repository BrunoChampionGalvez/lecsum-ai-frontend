import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'orange' | 'teal' | 'white' | 'outline' | 'white-outline' | 'orange-outline' | 'green-outline' | 'purple-outline' | 'light-blue-outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] shadow-sm';
      case 'secondary':
        return 'bg-[var(--sky)] text-[var(--primary)] hover:bg-[var(--sky-light)] shadow-sm';
      case 'orange':
        return 'bg-[var(--orange)] text-white hover:bg-[var(--orange-hover)] shadow-sm';
      case 'teal':
        return 'bg-[var(--teal)] text-white hover:opacity-90 shadow-sm';
      case 'white':
        return 'bg-white text-[var(--primary)] hover:bg-gray-50 border border-gray-200 shadow-sm';
      case 'outline':
        return 'bg-transparent text-[var(--primary)] hover:bg-[var(--light-blue)] border border-[var(--primary)]';
      case 'white-outline':
        return 'bg-white text-[var(--primary)] hover:bg-[var(--light-blue)] border border-[var(--primary)]';
      case 'orange-outline':
        return 'bg-white text-[var(--orange)] hover:bg-[var(--orange-outline)] border border-[var(--orange)]';
      case 'green-outline':
        return 'bg-white text-[var(--green)] hover:bg-[var(--green-outline)] border border-[var(--green)]';
      case 'purple-outline':
        return 'bg-white text-[var(--purple)] hover:bg-[var(--purple-outline)] border border-[var(--purple)]';
      case 'light-blue-outline':
        return 'bg-white text-blue-400 hover:bg-blue-50 border border-blue-400';
      default:
        return 'bg-[var(--sky)] text-[var(--primary)] hover:bg-[var(--sky-light)]';
    }
  };
  
  const sizeClasses = {
    sm: 'text-sm px-3 py-1',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };
  
  return (
    <button
      className={clsx(
        isLoading || disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        getVariantClasses(),
        sizeClasses[size],
        'rounded-md transition-all duration-200 font-medium',
        isLoading && 'opacity-70 cursor-not-allowed',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
};
