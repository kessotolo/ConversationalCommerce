import * as React from "react"
import { createPortal } from "react-dom"
import { Toast, ToastProps } from "./toast"
import { cn } from "@/lib/utils"

interface ToastItem extends ToastProps {
    id: string
    duration?: number
}

interface ToasterContextValue {
    toasts: ToastItem[]
    toast: (props: Omit<ToastProps, 'id'> & { duration?: number }) => string
    dismiss: (id: string) => void
    dismissAll: () => void
}

const ToasterContext = React.createContext<ToasterContextValue | null>(null)

export function useToast() {
    const context = React.useContext(ToasterContext)
    if (!context) {
        throw new Error("useToast must be used within a ToasterProvider")
    }
    return context
}

interface ToasterProviderProps {
    children: React.ReactNode
    maxToasts?: number
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center"
}

export function ToasterProvider({
    children,
    maxToasts = 5,
    position = "top-right"
}: ToasterProviderProps) {
    const [toasts, setToasts] = React.useState<ToastItem[]>([])

    const dismiss = React.useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    const dismissAll = React.useCallback(() => {
        setToasts([])
    }, [])

    const toast = React.useCallback((props: Omit<ToastProps, 'id'> & { duration?: number }) => {
        const id = Math.random().toString(36).substr(2, 9)
        const duration = props.duration ?? (props.variant === 'destructive' ? 6000 : 4000)

        const newToast: ToastItem = {
            ...props,
            id,
            duration,
            onDismiss: () => dismiss(id)
        }

        setToasts(prev => {
            const updated = [newToast, ...prev]
            return updated.slice(0, maxToasts)
        })

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => dismiss(id), duration)
        }

        return id
    }, [dismiss, maxToasts])

    const value = React.useMemo(() => ({
        toasts,
        toast,
        dismiss,
        dismissAll
    }), [toasts, toast, dismiss, dismissAll])

    return (
        <ToasterContext.Provider value={value}>
            {children}
            <Toaster toasts={toasts} position={position} />
        </ToasterContext.Provider>
    )
}

interface ToasterProps {
    toasts: ToastItem[]
    position: string
}

function Toaster({ toasts, position }: ToasterProps) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const positionClasses = {
        "top-right": "top-4 right-4",
        "top-left": "top-4 left-4",
        "bottom-right": "bottom-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "top-center": "top-4 left-1/2 transform -translate-x-1/2",
        "bottom-center": "bottom-4 left-1/2 transform -translate-x-1/2"
    }

    if (typeof window === 'undefined') return null

    return createPortal(
        <div
            className={cn(
                "fixed z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none",
                positionClasses[position as keyof typeof positionClasses]
            )}
        >
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast {...toast} />
                </div>
            ))}
        </div>,
        document.body
    )
}

// Convenience functions
export const toast = {
    success: (message: string, options?: Partial<ToastProps>) => {
        const context = React.useContext(ToasterContext)
        return context?.toast({
            title: "Success",
            description: message,
            variant: "success",
            ...options
        })
    },
    error: (message: string, options?: Partial<ToastProps>) => {
        const context = React.useContext(ToasterContext)
        return context?.toast({
            title: "Error",
            description: message,
            variant: "destructive",
            ...options
        })
    },
    info: (message: string, options?: Partial<ToastProps>) => {
        const context = React.useContext(ToasterContext)
        return context?.toast({
            title: "Info",
            description: message,
            variant: "default",
            ...options
        })
    }
}

export { ToasterProvider as Toaster }