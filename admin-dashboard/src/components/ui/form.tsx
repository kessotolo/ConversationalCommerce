import React from 'react'
import { cn } from '@/lib/utils'

interface FormProps {
    children: React.ReactNode
    className?: string
}

export const Form: React.FC<FormProps> = ({ children, className }) => {
    return <form className={cn('space-y-4', className)}>{children}</form>
}

interface FormFieldProps {
    control?: unknown
    name?: string
    render?: (props: { field: { name: string; value: string; onChange: () => void } }) => React.ReactNode
    children?: React.ReactNode
}

export const FormField: React.FC<FormFieldProps> = ({ children, render, control, name }) => {
    if (render && control && name) {
        // Basic render prop pattern for react-hook-form compatibility
        return render({ field: { name, value: '', onChange: () => { } } })
    }
    return <div className="space-y-2">{children}</div>
}

export const FormItem: React.FC<{
    children: React.ReactNode
    className?: string
}> = ({ children, className }) => {
    return <div className={cn('space-y-2', className)}>{children}</div>
}

export const FormLabel: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({
    children,
    htmlFor
}) => {
    return (
        <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {children}
        </label>
    )
}

export const FormControl: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <div>{children}</div>
}

export const FormDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <p className="text-sm text-muted-foreground">{children}</p>
}

export const FormMessage: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    if (!children) return null
    return <p className="text-sm font-medium text-destructive">{children}</p>
}