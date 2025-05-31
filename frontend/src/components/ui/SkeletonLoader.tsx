import { FC } from 'react';
import { DataTableSkeleton, FormSkeleton, OrderCardSkeleton, ProductCardSkeleton, Skeleton, SkeletonProps } from '@/components/ui/SkeletonLoader';
import { CSSProperties, FC } from 'react';import * as React from 'react';

export interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  circle?: boolean;
  count?: number;
  inline?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  height,
  width,
  circle = false,
  count = 1,
  inline = false,
}) => {
  const baseStyle: React.CSSProperties = {
    height: height,
    width: width,
    borderRadius: circle ? '50%' : '0.25rem',
    display: inline ? 'inline-block' : 'block',
  };

  const skeletons = Array(count).fill(0).map((_, i) => (
    <div
      key={i}
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${className}`}
      style={{
        ...baseStyle,
        marginBottom: i !== count - 1 ? '0.5rem' : 0,
      }}
      aria-hidden="true"
    />
  ));

  return <>{skeletons}</>;
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-3">
      <Skeleton height={180} className="w-full rounded-md" />
      <Skeleton height={20} width="70%" />
      <Skeleton height={16} width="40%" />
      <div className="flex justify-between items-center">
        <Skeleton height={24} width={80} />
        <Skeleton height={36} width={36} circle />
      </div>
    </div>
  );
};

export const OrderCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton height={20} width="40%" />
        <Skeleton height={20} width="20%" />
      </div>
      <Skeleton height={16} width="60%" />
      <div className="space-y-2">
        <Skeleton height={12} width="100%" />
        <Skeleton height={12} width="80%" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton height={24} width={100} />
        <Skeleton height={32} width={80} className="rounded-full" />
      </div>
    </div>
  );
};

export const DataTableSkeleton: React.FC<{ rowCount?: number; columnCount?: number }> = ({
  rowCount = 5,
  columnCount = 4,
}) => {
  return (
    <div className="w-full overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="bg-gray-50 dark:bg-gray-800 p-4">
        <div className="flex justify-between items-center">
          <Skeleton height={24} width={200} />
          <Skeleton height={36} width={120} className="rounded-md" />
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-100 dark:bg-gray-800">
          {Array(columnCount).fill(0).map((_, i) => (
            <Skeleton key={i} height={20} />
          ))}
        </div>
        
        {Array(rowCount).fill(0).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4">
            {Array(columnCount).fill(0).map((_, colIndex) => (
              <Skeleton key={colIndex} height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const FormSkeleton: React.FC<{ fieldCount?: number }> = ({ fieldCount = 4 }) => {
  return (
    <div className="space-y-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <Skeleton height={32} width="50%" />
      <div className="space-y-4">
        {Array(fieldCount).fill(0).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton height={16} width="30%" />
            <Skeleton height={40} width="100%" className="rounded-md" />
          </div>
        ))}
      </div>
      <div className="pt-4 flex justify-end">
        <Skeleton height={44} width={120} className="rounded-md" />
      </div>
    </div>
  );
};

export default Skeleton;
