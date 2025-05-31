import { ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, ErrorFallback, ErrorFallbackProps } from '@/components/ErrorBoundary';
import { NetworkStatusContext } from '@/contexts/NetworkStatusContext';
import { FC, ReactNode } from 'react';import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/contexts/NetworkStatusContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <ErrorFallback 
          error={this.state.error} 
          onRetry={this.handleRetry} 
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry }) => {
  const { isOnline } = useNetworkStatus();
  
  return (
    <div className="p-6 max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md flex flex-col items-center space-y-4">
      <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-300" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Something went wrong</h3>
        
        {!isOnline ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You appear to be offline. Please check your connection and try again.
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {error?.message || "An unexpected error occurred"}
          </p>
        )}
      </div>
      
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
};

// Create a hook-based wrapper for easier use
export const useErrorBoundary = () => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const showBoundary = (error: Error) => {
    setError(error);
    setHasError(true);
  };

  const resetBoundary = () => {
    setError(null);
    setHasError(false);
  };

  return {
    hasError,
    error,
    showBoundary,
    resetBoundary,
  };
};

export default ErrorBoundaryClass;
