'use client';
import { SignIn } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInCatchallPage() {
    const router = useRouter();

    // Debug: Log the current environment
    useEffect(() => {
        console.log('SignIn catchall page loaded');
        console.log('Environment variables:', {
            NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
            NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
        });
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
                <SignIn
                    routing="path"
                    path="/sign-in"
                    fallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "/dashboard"}
                />
            </div>
        </div>
    );
}