import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    pulse?: boolean;
    badge?: string | number;
    className?: string;
}

export function FloatingActionButton({
    children,
    position = 'bottom-right',
    size = 'md',
    variant = 'primary',
    pulse = false,
    badge,
    className,
    ...props
}: FloatingActionButtonProps) {
    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
        'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    };

    const sizeClasses = {
        sm: 'h-12 w-12 p-3',
        md: 'h-14 w-14 p-4',
        lg: 'h-16 w-16 p-5',
    };

    const variantClasses = {
        primary: 'bg-gradient-to-r from-[#6C9A8B] to-[#5d8a7b] hover:from-[#5d8a7b] hover:to-[#4e7a6a] text-white shadow-lg',
        secondary: 'bg-white border-2 border-[#e6f0eb] hover:border-[#6C9A8B] text-[#6C9A8B] shadow-lg',
        success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg',
        warning: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg',
    };

    return (
        <button
            className={cn(
                'fixed z-50 rounded-full transition-all duration-300 transform',
                'hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-50',
                'shadow-xl hover:shadow-2xl backdrop-blur-sm',
                positionClasses[position],
                sizeClasses[size],
                variantClasses[variant],
                pulse && 'animate-pulse',
                className
            )}
            {...props}
        >
            {/* Main content */}
            <div className="relative flex items-center justify-center w-full h-full">
                {children}

                {/* Badge */}
                {badge && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-medium shadow-md">
                        {badge}
                    </div>
                )}
            </div>

            {/* Ripple effect */}
            <div className="absolute inset-0 rounded-full opacity-0 hover:opacity-20 bg-white transition-opacity duration-300" />
        </button>
    );
}