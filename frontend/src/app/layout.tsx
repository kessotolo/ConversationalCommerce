import './globals.css';
import { Inter } from 'next/font/google';

import ClientLayoutShell from '@/components/layout/ClientLayoutShell';

import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'enwhe.io',
  description: 'Mobile-first, chat-native commerce platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`} suppressHydrationWarning={true}>
      <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Providers>
          <ClientLayoutShell>{children}</ClientLayoutShell>
        </Providers>
      </body>
    </html>
  );
}
