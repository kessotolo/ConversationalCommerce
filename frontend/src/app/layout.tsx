import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { TokenSaver } from '@/components/TokenSaver'
import Navbar from '@/components/Navbar'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
    display: 'swap',
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
    display: 'swap',
})

export const metadata = {
    title: 'Conversational Commerce',
    description: 'WhatsApp-first e-commerce platform',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ClerkProvider
            appearance={{
                baseTheme: undefined,
                variables: {
                    colorPrimary: '#000000',
                    colorText: '#000000',
                },
            }}
        >
            <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
                <body className="min-h-screen bg-white dark:bg-gray-900" suppressHydrationWarning>
                    <TokenSaver />
                    <Navbar />
                    <main className="pt-16">
                        {children}
                    </main>
                </body>
            </html>
        </ClerkProvider>
    )
}