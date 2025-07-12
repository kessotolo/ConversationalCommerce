/**
 * Network utilities for the ConversationalCommerce platform
 * Includes retry mechanisms and offline resilience features
 * Specifically designed for markets with limited connectivity (e.g., Africa)
 */

/**
 * Options for fetch with retry mechanism
 */
export interface FetchWithRetryOptions {
  retries?: number;
  retryDelay?: number;
  retryOn?: (attempt: number, error: Error | null, response: Response | null) => boolean;
}

/**
 * Enhanced fetch function with retry mechanism and offline resilience
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Promise with fetch response
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: FetchWithRetryOptions
): Promise<Response> {
  const { 
    retries = 3, 
    retryDelay = 1000,
    retryOn = defaultShouldRetry 
  } = retryOptions || {};

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Don't wait on first attempt
      if (attempt > 0) {
        // Exponential backoff with jitter
        const delay = retryDelay * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      lastResponse = await fetch(url, options);
      
      // If the retry function says we should retry and we have attempts left
      if (attempt < retries && retryOn(attempt, null, lastResponse)) {
        continue;
      }
      
      // Otherwise return the response (successful or not)
      return lastResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If we're offline, wait for connection restoration (if we have retries left)
      if (attempt < retries && !navigator.onLine) {
        try {
          await waitForOnline();
        } catch (err) {
          // If waiting for online times out, continue with normal retry
          console.warn('Waiting for online timed out, continuing retry sequence');
        }
      }
      
      // If this is the last attempt, throw the error
      if (attempt >= retries || !retryOn(attempt, lastError, null)) {
        throw lastError;
      }
      
      // Otherwise continue to next retry
    }
  }

  // Should never reach here, but TypeScript requires a return
  throw lastError || new Error('Unknown error during fetch retry');
}

/**
 * Default retry decision function
 * Retries on network errors, timeouts, and 5xx server errors
 */
function defaultShouldRetry(
  _attempt: number, 
  error: Error | null, 
  response: Response | null
): boolean {
  // Retry on network errors
  if (error) return true;
  
  // Retry on server errors (5xx)
  if (response && response.status >= 500 && response.status < 600) {
    return true;
  }
  
  // Retry on rate limiting (429)
  if (response && response.status === 429) {
    return true;
  }

  return false;
}

/**
 * Wait for online connectivity with timeout
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns Promise that resolves when online or rejects on timeout
 */
function waitForOnline(timeoutMs: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    // If we're already online, resolve immediately
    if (navigator.onLine) {
      resolve();
      return;
    }

    // Set a timeout to avoid waiting forever
    const timeout = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      reject(new Error('Timed out waiting for online'));
    }, timeoutMs);

    // Listen for online event
    const onlineHandler = () => {
      clearTimeout(timeout);
      window.removeEventListener('online', onlineHandler);
      // Small delay to ensure the connection is stable
      setTimeout(resolve, 500);
    };

    window.addEventListener('online', onlineHandler);
  });
}

/**
 * Check if the browser is currently online
 * @returns Current online status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Create an online/offline event listener
 * @param onOnline - Callback when connection is restored
 * @param onOffline - Callback when connection is lost
 * @returns Cleanup function to remove listeners
 */
export function createNetworkListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
