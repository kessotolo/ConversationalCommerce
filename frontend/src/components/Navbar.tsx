'use client';

import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { isSignedIn, user } = useUser();
    const pathname = usePathname();
    
    // Only show navbar on public pages, not on dashboard
    if (pathname?.startsWith('/dashboard')) {
        return null;
    }

    return (
        <nav className="bg-background border-b border-[#A8D5BA]/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="text-xl font-bold text-[#6C9A8B]">
                            Conversational Commerce
                        </Link>
                    </div>
                    
                    <div className="flex items-center">
                        {isSignedIn ? (
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/dashboard"
                                    className="px-5 py-2 rounded-md font-semibold bg-primary text-white hover:bg-primary/90 transition"
                                >
                                    Dashboard
                                </Link>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/sign-in"
                                    className="px-5 py-2 rounded-md font-semibold border text-[#6C9A8B] bg-white border-[#A8D5BA] hover:bg-[#A8D5BA]/30 transition"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/sign-up"
                                    className="px-5 py-2 rounded-md font-semibold text-white bg-[#A8D5BA] hover:bg-[#6C9A8B] hover:text-white transition"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}