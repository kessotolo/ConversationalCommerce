'use client';

import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignUpPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-ivory">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-charcoal-dark">Create Your Account</h1>
                    <p className="text-charcoal-medium mt-2">Join the new way to sell and connect</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <SignUp
                        appearance={{
                            elements: {
                                formButtonPrimary:
                                    'bg-green-sage hover:bg-green-laurel text-charcoal-dark text-sm normal-case rounded-md',
                                card: 'bg-transparent shadow-none',
                                headerTitle: 'hidden',
                                headerSubtitle: 'hidden',
                                socialButtonsBlockButton:
                                    'border border-gray-medium hover:bg-ivory text-sm normal-case',
                                formFieldInput:
                                    'rounded-md border-gray-medium focus:border-green-sage focus:ring-green-sage',
                                footerActionLink: 'text-green-laurel hover:text-charcoal-dark',
                            }
                        }}
                    />
                </div>

                <p className="text-center mt-6 text-sm text-charcoal-medium">
                    Already have an account?{' '}
                    <Link href="/sign-in" className="text-green-laurel hover:text-charcoal-dark font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </main>
    );
}