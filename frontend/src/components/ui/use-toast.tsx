import * as React from "react";
import { Toast, ToastProps } from "./toast";

type ToastActionElement = React.ReactElement;

export type ToastType = ToastProps & {
  id: string;
  dismiss: () => void;
};

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

type ToasterProps = {
  children: React.ReactNode;
};

export function ToastProvider({ children }: ToasterProps) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  const toast = ({ ...props }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    const update = (toast: ToasterToast) =>
      setToasts((toasts) => toasts.map((t) => (t.id === toast.id ? { ...t, ...toast } : t)));
    
    const dismiss = (toastId: string) => {
      setToasts((toasts) => toasts.filter((t) => t.id !== toastId));
    };

    setToasts((toasts) => [
      ...toasts,
      { ...props, id, dismiss: () => dismiss(id) },
    ].slice(-TOAST_LIMIT));

    setTimeout(() => {
      dismiss(id);
    }, TOAST_REMOVE_DELAY);

    return id;
  };

  return (
    <React.createContext.Provider value={{ toast, dismiss: (id) => setToasts((toasts) => toasts.filter((t) => t.id !== id)) }}>
      {children}
      <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 w-full max-w-sm p-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            title={toast.title}
            description={toast.description}
            variant={toast.variant}
            onDismiss={() => toast.dismiss()}
            className="mb-2"
          />
        ))}
      </div>
    </React.createContext.Provider>
  );
}

export const useToast = () => {
  const context = React.useContext(
    React.createContext<{
      toast: (props: ToastProps) => string;
      dismiss: (id: string) => void;
    }>({
      toast: () => "",
      dismiss: () => {},
    })
  );

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};
