import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
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
        <html lang="en" className={`${inter.variable} font-sans`}>
            <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <Providers>
                    <Navbar />
                    {children}
                </Providers>
            </body>
        </html>
    )
}