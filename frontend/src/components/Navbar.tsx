'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { isSignedIn, user } = useUser();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-ivory border-b border-gray-medium shadow-sm h-14 flex items-center px-4 sm:px-6">
            <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
                <Link href="/" className="text-lg font-bold text-charcoal-dark tracking-tight">
                    Conversation
                </Link>
                <div className="flex items-center gap-4">
                    {isSignedIn ? (
                        <>
                            <Link
                                href="/dashboard"
                                className="hidden sm:inline text-sm font-medium text-charcoal-medium hover:text-green-laurel transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/storefront"
                                className="hidden sm:inline text-sm font-medium text-charcoal-medium hover:text-green-laurel transition-colors"
                            >
                                Storefront
                            </Link>
                            <span className="hidden sm:inline text-sm text-charcoal-medium">
                                {user?.firstName || user?.username}
                            </span>
                            <UserButton afterSignOutUrl="/" />
                        </>
                    ) : (
                        <>
                            <Link
                                href="/sign-in"
                                className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${pathname === '/sign-in' ? 'bg-green-sage text-white' : 'text-green-laurel hover:text-green-sage'}`}
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/sign-up"
                                className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${pathname === '/sign-up' ? 'bg-green-sage text-white' : 'text-green-laurel hover:text-green-sage'}`}
                            >
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}