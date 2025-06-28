import React, { createContext, useState, useContext } from 'react';

import type { ToastProps } from '@/components/ui/toast';
import { Toast } from '@/components/ui/toast';

type ToastContextType = {
  toast: (props: ToastProps) => void;
  dismiss: (id: string) => void;
};

/**
 * Toast context for showing and dismissing toasts.
 * Use the useToast hook to access.
 */
export const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  dismiss: () => {},
});

/**
 * Typed hook for toast context.
 * Throws if used outside ToastProvider.
 */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);

  const addToast = (props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...props, id }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss: dismissToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            title={toast.title}
            description={toast.description}
            variant={toast.variant}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
