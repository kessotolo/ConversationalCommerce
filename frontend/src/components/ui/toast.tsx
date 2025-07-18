import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

const ToastProvider = React.createContext<{
  toast: (props: ToastProps) => void;
  dismiss: (id: string) => void;
}>({
  toast: () => { },
  dismiss: () => { },
});

export const useToast = () => {
  return React.useContext(ToastProvider);
};

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof toastVariants> {
  /**
   * Title content for the toast
   */
  title?: string;

  /**
   * Description content for the toast
   */
  description?: string;

  /**
   * Visual style variant of the toast
   */
  variant?: 'default' | 'destructive' | 'success';

  /**
   * Unique identifier for the toast
   */
  id?: string;

  /**
   * Function called when toast is dismissed
   */
  onDismiss?: () => void;

  /**
   * Duration in milliseconds before auto-dismissing (0 for no auto-dismiss)
   */
  duration?: number;

  /**
   * Whether this toast represents an important announcement that should interrupt the screen reader
   */
  important?: boolean;
}

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full',
  {
    variants: {
      variant: {
        default: 'border-gray-200 bg-white text-gray-900',
        destructive: 'destructive group border-red-500 bg-red-100 text-red-800',
        success: 'border-green-500 bg-green-100 text-green-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export function Toast({
  className,
  title,
  description,
  variant,
  onDismiss,
  important = false,
  duration = 5000, // Default 5 seconds
  ...props
}: ToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss logic
  useEffect(() => {
    if (duration > 0 && onDismiss) {
      const timer = setTimeout(() => onDismiss(), duration);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [duration, onDismiss]);

  // Focus management - focus the toast when it appears for keyboard navigation
  useEffect(() => {
    if (toastRef.current) {
      toastRef.current.focus();
    }
  }, []);

  // Handle escape key press to dismiss
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape' && onDismiss) {
      onDismiss();
    }
  };

  // Determine the appropriate ARIA role and live region attributes
  const ariaLive = important ? "assertive" : "polite";

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live={ariaLive}
      aria-atomic="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <div className="flex-1 grid gap-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="absolute right-2 top-2 rounded-md p-1 text-gray-500 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  );
}

export { ToastProvider };
