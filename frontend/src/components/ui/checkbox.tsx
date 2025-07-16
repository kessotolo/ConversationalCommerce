import * as React from "react"
import { useId } from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
    /**
     * Text label for the checkbox
     */
    label?: string;
    
    /**
     * Description text for additional context
     */
    description?: string;
    
    /**
     * Error message when checkbox validation fails
     */
    error?: string;
}

const Checkbox = React.forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    CheckboxProps
>(({ className, label, description, error, id: propId, ...props }, ref) => {
    // Generate unique IDs for accessibility
    const generatedId = useId();
    const id = propId || `checkbox-${generatedId}`;
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    
    // Determine the ARIA attributes
    const ariaDescribedBy = [descriptionId, errorId]
        .filter(Boolean)
        .join(' ') || undefined;
    
    return (
        <div className="flex items-start space-x-2">
            <CheckboxPrimitive.Root
                ref={ref}
                id={id}
                className={cn(
                    "peer h-4 w-4 shrink-0 rounded-sm border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    error ? "border-red-500 focus-visible:ring-red-500" : "border-primary focus-visible:ring-ring",
                    "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                    className
                )}
                aria-describedby={ariaDescribedBy}
                aria-invalid={error ? true : undefined}
                {...props}
            >
                <CheckboxPrimitive.Indicator
                    className={cn("flex items-center justify-center text-current")}
                >
                    <Check className="h-4 w-4" />
                </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
            
            {(label || description || error) && (
                <div className="grid gap-1.5">
                    {label && (
                        <label
                            htmlFor={id}
                            className={cn(
                                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                                error && "text-red-500"
                            )}
                        >
                            {label}
                        </label>
                    )}
                    {description && (
                        <p id={descriptionId} className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}
                    {error && (
                        <p id={errorId} className="text-sm font-medium text-red-500">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }