'use client';
import { SignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';

export default function SignInCatchallPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
            {/* Header with improved accessibility */}
            <header className="bg-white shadow-sm" role="banner">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <Link 
                                href="/" 
                                className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 rounded-md"
                                aria-label="enwhe.io home page"
                            >
                                <MessageCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
                                <span className="text-xl font-bold text-gray-900">enwhe.io</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="flex flex-grow items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <section 
                    className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg" 
                    aria-labelledby="signin-heading"
                >
                    <div className="mb-6 text-center">
                        <h1 id="signin-heading" className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                        <p className="text-gray-600">Sign in to manage your store</p>
                    </div>
                    
                    <SignIn
                        routing="path"
                        path="/auth/sign-in"
                        fallbackRedirectUrl="/dashboard"
                        appearance={{
                            elements: {
                                formButtonPrimary: 
                                    'bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                                footerActionLink: 'text-green-600 hover:text-green-700',
                            },
                        }}
                    />
                    
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link 
                                href={'/auth/sign-up' as Route}
                                className="font-medium text-green-600 hover:text-green-500 focus:outline-none focus:underline"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}