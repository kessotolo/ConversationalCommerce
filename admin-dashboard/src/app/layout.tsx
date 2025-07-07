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
    return (
        <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
        >
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