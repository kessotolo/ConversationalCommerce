import React from 'react';

interface CardSkeletonProps {
  lines?: number;
  hasHeading?: boolean;
  hasAction?: boolean;
  className?: string;
}

/**
 * Skeleton loader for card components
 * 
 * Displays animated loading state for card-based UI
 * Includes proper ARIA attributes for accessibility
 */
export function CardSkeleton({
  lines = 3,
  hasHeading = true,
  hasAction = false,
  className = ''
}: CardSkeletonProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow p-6 animate-pulse ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading content"
    >
      {hasHeading && (
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
      )}
      
      <div className="space-y-3">
        {Array(lines).fill(0).map((_, index) => (
          <div 
            key={`skeleton-line-${index}`} 
            className={`h-4 bg-gray-200 rounded ${index === lines - 1 ? 'w-1/2' : 'w-full'}`}
          ></div>
        ))}
      </div>
      
      {hasAction && (
        <div className="mt-4 flex justify-end">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        </div>
      )}
      
      <span className="sr-only">Loading...</span>
    </div>
  );
}
