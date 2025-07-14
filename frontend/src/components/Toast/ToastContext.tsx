import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from './Toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Custom hook to use the toast notification system
 * 
 * Usage:
 * ```
 * const { showToast } = useToast();
 * showToast('Operation successful!', 'success');
 * ```
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provider component for toast notifications
 * 
 * Provides a global toast notification system with accessibility features
 * Manages multiple toasts with automatic dismissal
 */
export const ToastProvider = ({ children }: ToastProviderProps): JSX.Element => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Add a new toast notification
  const showToast = useCallback((message: string, type: ToastType, duration = 5000): void => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prevToasts) => [...prevToasts, {
      id,
      message,
      type,
      duration
    }]);
  }, []);
  
  // Remove a toast notification by ID
  const hideToast = useCallback((id: string): void => {
    setToasts((prevToasts) => prevToasts.filter(toast => toast.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Render toasts in a portal-like container */}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
