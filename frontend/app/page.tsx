'use client';

import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
    return (
        <>
            <SignedIn>
                <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24">
                    <div className="w-full max-w-4xl">
                        <h1 className="text-4xl font-bold mb-8 text-center">Welcome to Conversational Commerce</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Link
                                href="/dashboard"
                                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
                            >
                                <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Dashboard</h2>
                                <p className="text-gray-600 dark:text-gray-300">Manage your products and orders</p>
                            </Link>
                            <Link
                                href="/storefront"
                                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
                            >
                                <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Storefront</h2>
                                <p className="text-gray-600 dark:text-gray-300">View your public store</p>
                            </Link>
                        </div>
                    </div>
                </main>
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    )
}