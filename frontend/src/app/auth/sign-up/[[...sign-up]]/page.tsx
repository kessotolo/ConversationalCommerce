'use client';
import { SignUp } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUpCatchallPage() {
    const router = useRouter();

    // Debug: Log the current environment
    useEffect(() => {
        console.log('SignUp catchall page loaded');
        console.log('Environment variables:', {
            NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
            NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
        });
    }, []);

    return (
        <main className="min-h-screen flex items-center justify-center bg-white">
            <section className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg" aria-label="Sign up form">
                <SignUp
                    routing="path"
                    path="/auth/sign-up"
                    fallbackRedirectUrl="/store-setup"
                    signInUrl="/auth/sign-in"
                />
            </section>
        </main>
    );
}