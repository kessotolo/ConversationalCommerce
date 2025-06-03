import '../src/app/globals.css';
import type { AppProps } from 'next/app';
import { SafeClerkProvider } from '@/utils/auth/clerkProvider';
import { AuthProvider } from '@/utils/auth-utils';

// Using SafeClerkProvider for build-time safety without needing build-override scripts
export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SafeClerkProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </SafeClerkProvider>
  );
}
