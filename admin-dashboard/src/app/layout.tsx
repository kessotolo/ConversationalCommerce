import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Admin Dashboard - ConversationalCommerce',
    description: 'Super Admin dashboard for ConversationalCommerce platform',
    robots: 'noindex, nofollow', // Prevent search engine indexing
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

    if (!publishableKey) {
        return (
            <html lang="en">
                <body className={inter.className}>
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Error</h1>
                            <p className="text-gray-600 mb-4">
                                Clerk publishable key is missing. Please add <code className="bg-gray-100 px-2 py-1 rounded">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to your environment variables.
                            </p>
                            <p className="text-sm text-gray-500">
                                Get your key from: <a href="https://dashboard.clerk.com/last-active?path=api-keys" className="text-blue-600 hover:underline">Clerk Dashboard</a>
                            </p>
                        </div>
                    </div>
                </body>
            </html>
        )
    }

    return (
        <ClerkProvider publishableKey={publishableKey}>
            <html lang="en">
                <body className={inter.className}>
                    <div id="root">
                        {children}
                    </div>
                </body>
            </html>
        </ClerkProvider>
    )
}