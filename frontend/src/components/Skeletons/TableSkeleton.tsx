import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  className?: string;
}

/**
 * Skeleton loader for table components
 * 
 * Displays animated loading state for table-based UI
 * Includes proper ARIA attributes for accessibility
 * Optimized for low bandwidth connections
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className = ''
}: TableSkeletonProps) {
  return (
    <div 
      className={`overflow-hidden rounded-lg ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading table data"
    >
      <div className="bg-white shadow">
        <div className="animate-pulse">
          {hasHeader && (
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-2 px-6 py-3">
                {Array(columns).fill(0).map((_, index) => (
                  <div 
                    key={`header-cell-${index}`}
                    className={`h-4 bg-gray-300 rounded col-span-${12 / columns}`}
                  ></div>
                ))}
              </div>
            </div>
          )}
          
          <div className="divide-y divide-gray-200">
            {Array(rows).fill(0).map((_, rowIndex) => (
              <div 
                key={`row-${rowIndex}`}
                className="grid grid-cols-12 gap-2 px-6 py-4"
              >
                {Array(columns).fill(0).map((_, colIndex) => (
                  <div 
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={`h-4 bg-gray-200 rounded col-span-${12 / columns}`}
                    style={{ opacity: 1 - (rowIndex * 0.1) }} // Fade out lower rows slightly
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading table data...</span>
    </div>
  );
}
