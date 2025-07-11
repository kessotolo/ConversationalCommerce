import { useState, useCallback } from 'react';

interface ToastOptions {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
    duration?: number;
}

export const useToast = () => {
    const [toasts, setToasts] = useState<ToastOptions[]>([]);

    const toast = useCallback((options: ToastOptions) => {
        const newToast = {
            ...options,
            duration: options.duration || 5000,
        };

        setToasts(prev => [...prev, newToast]);

        // Auto remove after duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t !== newToast));
        }, newToast.duration);
    }, []);

    const dismiss = useCallback((toast: ToastOptions) => {
        setToasts(prev => prev.filter(t => t !== toast));
    }, []);

    return {
        toast,
        dismiss,
        toasts,
    };
};