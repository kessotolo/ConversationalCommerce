import React from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    className?: string
    disabled?: boolean
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
        return (
            <label className={cn('inline-flex items-center cursor-pointer', disabled && 'cursor-not-allowed opacity-50', className)}>
                <input
                    type="checkbox"
                    ref={ref}
                    checked={checked}
                    onChange={(e) => onCheckedChange?.(e.target.checked)}
                    disabled={disabled}
                    className="sr-only"
                    {...props}
                />
                <div className={cn(
                    'relative w-11 h-6 bg-gray-200 rounded-full transition-colors',
                    checked && 'bg-blue-600',
                    disabled && 'opacity-50'
                )}>
                    <div className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                        checked && 'translate-x-5'
                    )} />
                </div>
            </label>
        )
    }
)

Switch.displayName = 'Switch'

export { Switch }