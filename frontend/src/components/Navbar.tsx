'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { isSignedIn, user } = useUser();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="bg-white shadow-sm dark:bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                                Conversational Commerce
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                href="/dashboard"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/dashboard')
                                        ? 'border-violet-500 text-gray-900 dark:text-white'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                                    }`}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/storefront"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/storefront')
                                        ? 'border-violet-500 text-gray-900 dark:text-white'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                                    }`}
                            >
                                Storefront
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        {isSignedIn ? (
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {user?.firstName || user?.username}
                                </span>
                                <UserButton afterSignOutUrl="/" />
                            </div>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/sign-in"
                                    className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href="/sign-up"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                                >
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}