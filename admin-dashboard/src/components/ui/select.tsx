import React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
    disabled?: boolean
}

export const Select: React.FC<SelectProps> = ({ children, ...props }) => {
    return <div {...props}>{children}</div>
}

export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <div className="bg-white border rounded-md shadow-lg">{children}</div>
}

export const SelectItem: React.FC<{
    value: string
    children: React.ReactNode
    onSelect?: () => void
}> = ({ children, onSelect }) => {
    return (
        <div
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={onSelect}
        >
            {children}
        </div>
    )
}

export const SelectTrigger: React.FC<{
    className?: string
    children: React.ReactNode
    onClick?: () => void
}> = ({ className, children, onClick }) => {
    return (
        <button
            type="button"
            className={cn(
                'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

export const SelectValue: React.FC<{
    placeholder?: string
    value?: string
}> = ({ placeholder, value }) => {
    return <span>{value || placeholder}</span>
}