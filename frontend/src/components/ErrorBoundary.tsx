import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useToast } from './Toast/ToastContext';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches JavaScript errors in its child component tree
 * and displays a fallback UI instead of crashing the whole application
 * 
 * Includes accessibility considerations for error states
 */
class ErrorBoundaryClass extends Component<ErrorBoundaryProps & { showErrorToast: (message: string) => void }, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps & { showErrorToast: (message: string) => void }) {
    super(props);
    this.state = { 
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI
    return { 
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Show toast notification
    this.props.showErrorToast(`An error occurred: ${error.message}`);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render fallback UI or default error message
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div 
          className="p-4 bg-red-50 text-red-800 rounded-md border border-red-200 m-4"
          role="alert"
          aria-live="assertive"
        >
          <h2 className="text-lg font-medium mb-2">Something went wrong</h2>
          <p className="mb-4">We've encountered an unexpected error. Please try refreshing the page.</p>
          <p className="text-sm font-mono bg-red-100 p-2 rounded">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            onClick={() => window.location.reload()}
            aria-label="Refresh the page"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

/**
 * Wrapper component that connects the ErrorBoundary with the Toast context
 */
export function ErrorBoundary(props: ErrorBoundaryProps): JSX.Element {
  const { showToast } = useToast();
  
  const showErrorToast = (message: string) => {
    showToast(message, 'error', 8000);
  };
  
  return <ErrorBoundaryClass {...props} showErrorToast={showErrorToast} />;
}
