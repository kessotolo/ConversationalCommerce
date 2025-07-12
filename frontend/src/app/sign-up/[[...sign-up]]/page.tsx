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
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
                <SignUp
                    routing="path"
                    path="/sign-up"
                    redirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/store-setup"}
                    fallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/store-setup"}
                    afterSignUpUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/store-setup"}
                    signInUrl="/sign-in"
                />
            </div>
        </div>
    );
}