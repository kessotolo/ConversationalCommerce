import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> { }

export function Card({ className = '', ...props }: CardProps) {
    return (
        <div
            className={`bg-white overflow-hidden shadow rounded-lg ${className}`}
            {...props}
        />
    );
}