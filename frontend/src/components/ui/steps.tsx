import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const stepVariants = cva(
    "flex items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
    {
        variants: {
            variant: {
                default: "border-muted bg-muted text-muted-foreground",
                active: "border-primary bg-primary text-primary-foreground",
                completed: "border-primary bg-primary text-primary-foreground",
                error: "border-destructive bg-destructive text-destructive-foreground",
            },
            size: {
                default: "h-8 w-8",
                sm: "h-6 w-6 text-xs",
                lg: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

const stepConnectorVariants = cva(
    "flex-1 border-t-2 transition-colors",
    {
        variants: {
            variant: {
                default: "border-muted",
                active: "border-muted",
                completed: "border-primary",
                error: "border-destructive",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface Step {
    id: string
    title: string
    description?: string
    optional?: boolean
}

export interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
    steps: Step[]
    currentStep: number
    orientation?: "horizontal" | "vertical"
    variant?: "default" | "simple"
    size?: "default" | "sm" | "lg"
    onStepClick?: (stepIndex: number) => void
    completedSteps?: number[]
    errorSteps?: number[]
}

const Steps = React.forwardRef<HTMLDivElement, StepsProps>(
    ({
        steps,
        currentStep,
        orientation = "horizontal",
        variant = "default",
        size = "default",
        onStepClick,
        completedSteps = [],
        errorSteps = [],
        className,
        ...props
    }, ref) => {
        const getStepVariant = (stepIndex: number): "default" | "active" | "completed" | "error" => {
            if (errorSteps.includes(stepIndex)) return "error"
            if (completedSteps.includes(stepIndex)) return "completed"
            if (stepIndex === currentStep) return "active"
            return "default"
        }

        const getConnectorVariant = (stepIndex: number): "default" | "active" | "completed" | "error" => {
            if (errorSteps.includes(stepIndex)) return "error"
            if (completedSteps.includes(stepIndex) || stepIndex < currentStep) return "completed"
            return "default"
        }

        if (orientation === "vertical") {
            return (
                <div
                    ref={ref}
                    className={cn("flex flex-col space-y-4", className)}
                    {...props}
                >
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-start space-x-3">
                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={() => onStepClick?.(index)}
                                    disabled={!onStepClick}
                                    className={cn(
                                        stepVariants({ variant: getStepVariant(index), size }),
                                        onStepClick && "cursor-pointer hover:opacity-80",
                                        !onStepClick && "cursor-default"
                                    )}
                                >
                                    {completedSteps.includes(index) ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </button>
                                {index < steps.length - 1 && (
                                    <div
                                        className={cn(
                                            "mt-2 h-8 w-0.5 transition-colors",
                                            getConnectorVariant(index) === "completed" ? "bg-primary" : "bg-muted"
                                        )}
                                    />
                                )}
                            </div>
                            <div className="flex-1 pb-8">
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-sm font-medium">{step.title}</h3>
                                    {step.optional && (
                                        <span className="text-xs text-muted-foreground">(Optional)</span>
                                    )}
                                </div>
                                {step.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )
        }

        return (
            <div
                ref={ref}
                className={cn("flex items-center w-full", className)}
                {...props}
            >
                {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center space-y-2">
                            <button
                                type="button"
                                onClick={() => onStepClick?.(index)}
                                disabled={!onStepClick}
                                className={cn(
                                    stepVariants({ variant: getStepVariant(index), size }),
                                    onStepClick && "cursor-pointer hover:opacity-80",
                                    !onStepClick && "cursor-default"
                                )}
                            >
                                {completedSteps.includes(index) ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </button>
                            <div className="text-center">
                                <div className="flex items-center space-x-1">
                                    <span className="text-sm font-medium">{step.title}</span>
                                    {step.optional && (
                                        <span className="text-xs text-muted-foreground">(Optional)</span>
                                    )}
                                </div>
                                {step.description && variant !== "simple" && (
                                    <p className="text-xs text-muted-foreground mt-1 max-w-24">
                                        {step.description}
                                    </p>
                                )}
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    stepConnectorVariants({ variant: getConnectorVariant(index) }),
                                    "mx-2"
                                )}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        )
    }
)

Steps.displayName = "Steps"

// Simple stepper component for basic use cases
const Stepper = React.forwardRef<HTMLDivElement, Omit<StepsProps, "steps"> & { totalSteps: number }>(
    ({ totalSteps, currentStep, ...props }, ref) => {
        const steps = Array.from({ length: totalSteps }, (_, i) => ({
            id: `step-${i}`,
            title: `Step ${i + 1}`,
        }))

        return <Steps ref={ref} steps={steps} currentStep={currentStep} {...props} />
    }
)

Stepper.displayName = "Stepper"

export { Steps, Stepper, stepVariants }