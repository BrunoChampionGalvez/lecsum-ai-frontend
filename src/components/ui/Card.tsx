import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  title, 
  children, 
  className,
  footer 
}) => {
  return (
    <div className={clsx('bg-white p-6 rounded-lg shadow-md flex flex-col', className)}>
      {title && (
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-[var(--primary)]">{title}</h3>
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};
