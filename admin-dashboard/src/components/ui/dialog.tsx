import React from 'react'
import { cn } from '@/lib/utils'

interface DialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
            <div className="relative z-50">{children}</div>
        </div>
    )
}

export const DialogContent: React.FC<{ className?: string; children: React.ReactNode }> = ({
    className,
    children
}) => {
    return (
        <div className={cn('bg-white rounded-lg p-6 w-full max-w-md', className)}>
            {children}
        </div>
    )
}

export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <div className="mb-4">{children}</div>
}

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <h2 className="text-lg font-semibold">{children}</h2>
}

export const DialogTrigger: React.FC<{
    asChild?: boolean;
    children: React.ReactNode
}> = ({ asChild, children }) => {
    if (asChild) {
        return <>{children}</>
    }
    return <button>{children}</button>
}