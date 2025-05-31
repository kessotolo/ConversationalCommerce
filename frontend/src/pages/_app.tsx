import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { ClerkProvider } from '@clerk/nextjs';
import { ServiceProvider } from '@/modules/core/components';

/**
 * Main application component
 * Wraps the entire application with necessary providers
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider {...pageProps}>
      <ServiceProvider>
        <Component {...pageProps} />
      </ServiceProvider>
    </ClerkProvider>
  );
}
