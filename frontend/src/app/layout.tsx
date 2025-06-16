import './globals.css';
import { Inter } from 'next/font/google';
import MobileNav from '@/components/MobileNav';
import { Providers } from './providers';
import { UserButton, useClerk } from '@clerk/nextjs';
import { useState } from 'react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Conversational Commerce',
  description: 'WhatsApp-first e-commerce platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useClerk();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Providers>
          <MobileNav />
          {children}
          <div className="fixed bottom-4 left-4 z-50">
            <button
              className="bg-white border border-gray-200 rounded-full shadow-lg p-3 flex items-center gap-2 hover:bg-gray-50 transition"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-label="Open settings menu"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 8.6 15a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 15 8.6a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 15z" /></svg>
              <span className="hidden sm:inline text-gray-700 font-medium">Settings</span>
            </button>
            {settingsOpen && (
              <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[180px] flex flex-col gap-2">
                <UserButton afterSignOutUrl="/" />
                <button
                  className="w-full text-left px-4 py-2 rounded-lg text-base font-medium text-gray-800 bg-gray-100 hover:bg-red-50 active:bg-red-100 transition"
                  onClick={() => signOut()}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </Providers>
      </body>
    </html>
  );
}
