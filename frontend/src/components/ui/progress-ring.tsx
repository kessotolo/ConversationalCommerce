import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
    progress: number; // 0-100
    size?: 'sm' | 'md' | 'lg' | 'xl';
    thickness?: 'thin' | 'normal' | 'thick';
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    showPercentage?: boolean;
    animated?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export function ProgressRing({
    progress,
    size = 'md',
    thickness = 'normal',
    color = 'primary',
    showPercentage = true,
    animated = true,
    className,
    children
}: ProgressRingProps) {
    const sizeClasses = {
        sm: { width: 60, height: 60, text: 'text-xs' },
        md: { width: 80, height: 80, text: 'text-sm' },
        lg: { width: 120, height: 120, text: 'text-base' },
        xl: { width: 160, height: 160, text: 'text-lg' }
    };

    const thicknessValues = {
        thin: 2,
        normal: 4,
        thick: 6
    };

    const colorClasses = {
        primary: 'stroke-[#6C9A8B]',
        success: 'stroke-green-500',
        warning: 'stroke-yellow-500',
        danger: 'stroke-red-500',
        info: 'stroke-blue-500'
    };

    const { width, height, text } = sizeClasses[size];
    const strokeWidth = thicknessValues[thickness];
    const radius = (width - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className={cn('relative inline-flex items-center justify-center', className)}>
            <svg
                width={width}
                height={height}
                className="transform -rotate-90"
                viewBox={`0 0 ${width} ${height}`}
            >
                {/* Background circle */}
                <circle
                    cx={width / 2}
                    cy={height / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    className="text-gray-200"
                />

                {/* Progress circle */}
                <circle
                    cx={width / 2}
                    cy={height / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={cn(
                        colorClasses[color],
                        animated && 'transition-all duration-500 ease-in-out'
                    )}
                />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
                {children || (showPercentage && (
                    <span className={cn('font-semibold text-gray-700', text)}>
                        {Math.round(progress)}%
                    </span>
                ))}
            </div>
        </div>
    );
}