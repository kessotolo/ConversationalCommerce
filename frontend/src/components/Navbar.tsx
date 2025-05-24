'use client';

import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { isSignedIn, user } = useUser();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="bg-[#FFFFF0] shadow-sm border-b border-[#A8D5BA]/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-[#6C9A8B]">
                                Conversational Commerce
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {isSignedIn && (
                                <>
                                    <Link
                                        href="/dashboard"
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/dashboard')
                                            ? 'border-[#6C9A8B] text-[#6C9A8B]'
                                            : 'border-transparent text-gray-500 hover:border-[#A8D5BA] hover:text-[#6C9A8B]'
                                            }`}
                                    >
                                        Dashboard
                                    </Link>
                                    <Link
                                        href="/storefront"
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/storefront')
                                            ? 'border-[#6C9A8B] text-[#6C9A8B]'
                                            : 'border-transparent text-gray-500 hover:border-[#A8D5BA] hover:text-[#6C9A8B]'
                                            }`}
                                    >
                                        Storefront
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center">
                        {isSignedIn ? (
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-[#6C9A8B]">
                                    {user?.firstName || user?.username}
                                </span>
                                <UserButton afterSignOutUrl="/" />
                            </div>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/sign-in"
                                    className={`px-5 py-2 rounded-md font-semibold border text-[#6C9A8B] bg-white border-[#A8D5BA] hover:bg-[#A8D5BA]/30 transition ${isActive('/sign-in') ? 'bg-[#A8D5BA] text-white' : ''}`}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/sign-up"
                                    className={`px-5 py-2 rounded-md font-semibold text-white bg-[#A8D5BA] hover:bg-[#6C9A8B] hover:text-white transition ${isActive('/sign-up') ? 'ring-2 ring-[#6C9A8B] ring-offset-2' : ''}`}
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