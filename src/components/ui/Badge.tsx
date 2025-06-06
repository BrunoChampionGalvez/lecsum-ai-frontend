import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  variant?: 'orange' | 'cyan' | 'primary' | 'gray' | 'teal' | 'sky' | 'highlight' | 'red';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'gray', 
  children, 
  className 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'orange':
        return 'bg-white text-[var(--orange)] border border-[var(--orange)]';
      case 'cyan':
        return 'bg-[var(--sky-light)] text-[var(--cyan)]';
      case 'teal':
        return 'bg-[var(--light-blue)] text-[var(--teal)]';
      case 'sky':
        return 'bg-white text-[var(--sky)]';
      case 'highlight':
        return 'bg-[var(--highlight-yellow)] text-[var(--foreground)]';
      case 'red':
        return 'bg-red-100 text-[var(--red)]';
      case 'primary':
        return 'bg-[var(--primary)] text-white';
      case 'gray':
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      getVariantClasses(),
      className
    )}>
      {children}
    </span>
  );
};
