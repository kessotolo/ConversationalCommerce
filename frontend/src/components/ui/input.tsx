import * as React from 'react';
import { forwardRef, useId } from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Error state for the input. When true, applies error styling and appropriate ARIA attributes
   */
  error?: boolean;
  
  /**
   * Error message to be exposed to screen readers
   */
  errorMessage?: string;
  
  /**
   * Icon to display inside the input field
   */
  icon?: React.ReactNode;
  
  /**
   * Position of the icon (left or right)
   */
  iconPosition?: 'left' | 'right';
  
  /**
   * Whether the input is currently loading/processing
   */
  loading?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    error, 
    errorMessage,
    icon,
    iconPosition = 'left',
    loading,
    id: propId,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    // Generate unique IDs for accessibility
    const generatedId = useId();
    const id = propId || `input-${generatedId}`;
    const errorId = `${id}-error`;
    
    // Combine aria-describedby values
    const combinedAriaDescribedBy = error && errorMessage 
      ? `${errorId} ${ariaDescribedBy || ''}`.trim()
      : ariaDescribedBy;
      
    return (
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </span>
        )}
        
        <input
          id={id}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error 
              ? 'border-red-500 focus-visible:ring-red-500' 
              : 'border-gray-300 focus-visible:ring-gray-950',
            icon && iconPosition === 'left' && 'pl-10',
            icon && iconPosition === 'right' && 'pr-10',
            loading && 'pr-10',
            className,
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={combinedAriaDescribedBy}
          ref={ref}
          {...props}
        />
        
        {icon && iconPosition === 'right' && !loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </span>
        )}
        
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" 
                 role="status" aria-label="Loading">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        )}
        
        {error && errorMessage && (
          <div id={errorId} className="sr-only" role="alert">
            {errorMessage}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
